import { NextResponse } from "next/server";

export interface PlexSession {
  sessionId:    string;
  user:         string;
  title:        string;
  grandparent?: string; // série parente si épisode
  type:         "movie" | "episode" | "track";
  thumb?:       string;
  progress:     number; // 0-100
  state:        "playing" | "paused" | "buffering";
  player:       string; // nom de l'appareil
  year?:        number;
}

export async function GET() {
  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "");
  const token   = process.env.PLEX_TOKEN;

  if (!plexUrl || !token) {
    // Mode démo — aucune session active
    return NextResponse.json({ sessions: [], demo: true });
  }

  try {
    const res = await fetch(
      `${plexUrl}/status/sessions?X-Plex-Token=${token}`,
      {
        headers: { Accept: "application/json" },
        signal:  AbortSignal.timeout(5000),
        // Ne pas mettre en cache côté Next.js — c'est du live
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ sessions: [], error: `Plex ${res.status}` });
    }

    const data = await res.json();
    const metadata = data?.MediaContainer?.Metadata ?? [];

    const sessions: PlexSession[] = metadata.map((m: Record<string, unknown>) => {
      const viewOffset  = typeof m.viewOffset === "number" ? m.viewOffset : 0;
      const duration    = typeof m.duration   === "number" ? m.duration   : 1;
      const progress    = Math.round((viewOffset / duration) * 100);

      const player = (m.Player as Record<string, unknown> | undefined);
      const playerTitle = typeof player?.title === "string" ? player.title : "Appareil inconnu";
      const stateRaw    = typeof player?.state === "string" ? player.state : "playing";
      const state: PlexSession["state"] =
        stateRaw === "paused" ? "paused" :
        stateRaw === "buffering" ? "buffering" : "playing";

      const user = (m.User as Record<string, unknown> | undefined);
      const userName = typeof user?.title === "string" ? user.title : "Utilisateur";

      const session = (m.Session as Record<string, unknown> | undefined);
      const sessionId = typeof session?.id === "string" ? session.id :
                        (typeof m.sessionKey === "string" ? m.sessionKey : String(Math.random()));

      const thumb = typeof m.thumb === "string"
        ? `/api/plex/image?url=${encodeURIComponent(`${plexUrl}${m.thumb}?X-Plex-Token=${token}`)}`
        : undefined;

      return {
        sessionId,
        user:        userName,
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
