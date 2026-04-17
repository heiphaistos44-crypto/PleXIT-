import { NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";

// Normalise une chaîne pour la comparaison fuzzy (minuscules, sans accents, sans ponctuation)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export async function GET() {
  const requests = await readRequests();

  // ── Récupération de la bibliothèque Plex depuis le cache serveur ──
  const plexTitles: { title: string; addedAt: number }[] = [];
  try {
    const plexBase = process.env.PLEX_URL?.replace(/\/$/, "");
    const plexToken = process.env.PLEX_TOKEN;

    if (plexBase && plexToken) {
      // On lit directement les sections pour éviter de passer par l'API publique
      const sectionsRes = await fetch(
        `${plexBase}/library/sections?X-Plex-Token=${plexToken}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" }
      );
      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        const sections = sectionsData?.MediaContainer?.Directory ?? [];

        // Récupère tous les titres en parallèle (limité aux 3 premières sections pour perf)
        await Promise.all(
          sections.slice(0, 6).map(async (sec: { key: string; type: string }) => {
            try {
              const res = await fetch(
                `${plexBase}/library/sections/${sec.key}/all?X-Plex-Token=${plexToken}`,
                { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000), cache: "no-store" }
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

  // ── Cross-référence : détecte si chaque demande est déjà sur Plex ──
  const enriched = requests.map(req => {
    // Si déjà marqué manuellement, on conserve
    if (req.status === "added" || req.status === "rejected") return req;

    // Sinon on cherche dans Plex
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

  // ── Persistance des auto-détections Plex ─────────────────────
  // Si des demandes "pending" ont été détectées comme "added" dans Plex,
  // on sauvegarde ce changement pour éviter l'incohérence entre API et fichier
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
