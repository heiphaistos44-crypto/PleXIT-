import { NextRequest, NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";
import { cleanupMap, extractIp, retryAfterHeaders } from "@/lib/security";

// Normalise une chaîne pour la comparaison fuzzy
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// ─── Rate-limit : 30 req / 2 min / IP ────────────────────────
const getRequestLimit = new Map<string, { count: number; resetAt: number }>();
const GET_LIMIT_MAX = 30;
const GET_LIMIT_WIN = 2 * 60 * 1000;

export async function GET(req: NextRequest) {
  // ── Rate-limit ────────────────────────────────────────────────
  cleanupMap(getRequestLimit);
  const ip  = extractIp(req);
  const now = Date.now();
  const gl  = getRequestLimit.get(ip) ?? { count: 0, resetAt: now + GET_LIMIT_WIN };
  if (now > gl.resetAt) { gl.count = 0; gl.resetAt = now + GET_LIMIT_WIN; }
  gl.count++;
  getRequestLimit.set(ip, gl);
  if (gl.count > GET_LIMIT_MAX) {
    return NextResponse.json(
      { message: "Trop de requêtes." },
      { status: 429, headers: retryAfterHeaders(gl.resetAt - now) }
    );
  }

  const requests = await readRequests();

  // ── Récupération de la bibliothèque Plex depuis le cache serveur ──
  const plexTitles: { title: string; addedAt: number }[] = [];
  try {
    const plexBase  = process.env.PLEX_URL?.replace(/\/$/, "");
    const plexToken = process.env.PLEX_TOKEN;

    if (plexBase && plexToken) {
      // Token via header — jamais dans l'URL
      const plexHeaders = { Accept: "application/json", "X-Plex-Token": plexToken };

      const sectionsRes = await fetch(
        `${plexBase}/library/sections`,
        { headers: plexHeaders, signal: AbortSignal.timeout(5000), cache: "no-store" }
      );
      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        const sections = sectionsData?.MediaContainer?.Directory ?? [];

        await Promise.all(
          sections.slice(0, 6).map(async (sec: { key: string; type: string }) => {
            try {
              const res = await fetch(
                `${plexBase}/library/sections/${sec.key}/all`,
                { headers: plexHeaders, signal: AbortSignal.timeout(8000), cache: "no-store" }
              );
              if (!res.ok) return;
              const data = await res.json();
              const meta = data?.MediaContainer?.Metadata ?? [];
              meta.forEach((m: { title: string; addedAt?: number }) => {
                if (m.title) plexTitles.push({ title: m.title, addedAt: m.addedAt ?? 0 });
              });
            } catch { /* section ignorée */ }
          })
        );
      }
    }
  } catch { /* Plex inaccessible — pas de cross-référence */ }

  // ── Cross-référence ───────────────────────────────────────────
  const enriched = requests.map(req => {
    if (req.status === "added" || req.status === "rejected") return req;
    const normTitle = normalize(req.titre);
    const match = plexTitles.find(p => normalize(p.title).includes(normTitle) || normTitle.includes(normalize(p.title)));
    if (match) {
      return {
        ...req,
        status:  "added" as const,
        addedAt: match.addedAt > 0
          ? new Date(match.addedAt * 1000).toISOString()
          : new Date().toISOString(),
        note: "Détecté automatiquement dans la bibliothèque Plex",
      };
    }
    return req;
  });

  // ── Persistance des auto-détections ──────────────────────────
  const autoAdded = enriched.filter((r, i) => r.status === "added" && requests[i].status !== "added");
  if (autoAdded.length > 0) {
    const updated = requests.map((_req, i) => enriched[i]);
    await writeRequests(updated).catch(console.error);
  }

  return NextResponse.json(
    { requests: enriched, total: enriched.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
