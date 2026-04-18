import { NextRequest, NextResponse } from "next/server";
import { cleanupMap } from "@/lib/security";

export interface PlexSession {
  sessionId:    string;
  user:         string;
  title:        string;
  grandparent?: string;
  type:         "movie" | "episode" | "track";
  thumb?:       string;
  progress:     number; // 0-100
  state:        "playing" | "paused" | "buffering";
  player:       string;
  year?:        number;
}

// ─── Rate-limit : 60 req / 2 min / IP ────────────────────────
const getRequestLimit = new Map<string, { count: number; resetAt: number }>();
const GET_LIMIT_MAX = 60;
const GET_LIMIT_WIN = 2 * 60 * 1000;

export async function GET(req: NextRequest) {
  // ── Rate-limit ────────────────────────────────────────────────
  cleanupMap(getRequestLimit);
  const ip  = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const gl  = getRequestLimit.get(ip) ?? { count: 0, resetAt: now + GET_LIMIT_WIN };
  if (now > gl.resetAt) { gl.count = 0; gl.resetAt = now + GET_LIMIT_WIN; }
  gl.count++;
  getRequestLimit.set(ip, gl);
  if (gl.count > GET_LIMIT_MAX) {
    return NextResponse.json({ message: "Trop de requêtes." }, { status: 429 });
  }

  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "");
  const token   = process.env.PLEX_TOKEN;

  if (!plexUrl || !token) {
    return NextResponse.json({ sessions: [], demo: true });
  }

  try {
    // Token transmis via header — jamais dans l'URL (moins de traces logs)
    const res = await fetch(
      `${plexUrl}/status/sessions`,
      {
        headers: { Accept: "application/json", "X-Plex-Token": token },
        signal:  AbortSignal.timeout(5000),
        cache:   "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ sessions: [], error: `Plex ${res.status}` });
    }

    const data     = await res.json();
    const metadata = data?.MediaContainer?.Metadata ?? [];

    const sessions: PlexSession[] = metadata.map((m: Record<string, unknown>) => {
      const viewOffset  = typeof m.viewOffset === "number" ? m.viewOffset : 0;
      const duration    = typeof m.duration   === "number" ? m.duration   : 1;
      const progress    = Math.round((viewOffset / duration) * 100);

      const player      = (m.Player as Record<string, unknown> | undefined);
      const playerTitle = typeof player?.title === "string" ? player.title : "Appareil inconnu";
      const stateRaw    = typeof player?.state === "string" ? player.state : "playing";
      const state: PlexSession["state"] =
        stateRaw === "paused" ? "paused" :
        stateRaw === "buffering" ? "buffering" : "playing";

      const session   = (m.Session as Record<string, unknown> | undefined);
      const sessionId = typeof session?.id === "string" ? session.id :
                        (typeof m.sessionKey === "string" ? m.sessionKey : String(Math.random()));

      // ⚠️ On utilise ?path= (token jamais dans l'URL navigateur)
      const thumb = typeof m.thumb === "string"
        ? `/api/plex/image?path=${encodeURIComponent(m.thumb)}`
        : undefined;

      return {
        sessionId,
        user:        "Membre",
        title:       typeof m.title === "string" ? m.title : "Inconnu",
        grandparent: typeof m.grandparentTitle === "string" ? m.grandparentTitle : undefined,
        type:        (m.type === "episode" ? "episode" : m.type === "track" ? "track" : "movie") as PlexSession["type"],
        thumb,
        progress,
        state,
        player:      playerTitle,
        year:        typeof m.year === "number" ? m.year : undefined,
      };
    });

    return NextResponse.json(
      { sessions, total: sessions.length },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (err) {
    console.error("Sessions Plex error:", err);
    return NextResponse.json({ sessions: [], error: "Timeout ou Plex inaccessible" });
  }
}
