import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE  = "https://image.tmdb.org/t/p/w92";

export interface TmdbResult {
  id:         number;
  title:      string;
  year:       string;
  poster:     string | null;
  tmdbUrl:    string;
  mediaType:  "movie" | "tv";
  overview?:  string;
}

// Mapping type PleXIT → endpoints TMDB
function getEndpoints(type: string): ("movie" | "tv")[] {
  if (type === "film")         return ["movie"];
  if (type === "musique")      return [];
  return ["tv", "movie"];  // serie, anime, dessin_anime → les deux
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY non configuré" }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const query  = searchParams.get("q")?.trim();
  const type   = searchParams.get("type") ?? "film";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const endpoints = getEndpoints(type);
  if (endpoints.length === 0) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    api_key:       apiKey,
    query,
    language:      "fr-FR",
    include_adult: "false",
    page:          "1",
  });

  try {
    // Lance les deux recherches en parallèle si nécessaire
    const responses = await Promise.all(
      endpoints.map(ep =>
        fetch(`${TMDB_BASE}/search/${ep}?${params}`, { next: { revalidate: 60 } })
          .then(r => r.ok ? r.json() : { results: [] })
          .then(data => (data.results ?? []).map((item: Record<string, unknown>) => ({
            id:        item.id as number,
            title:     (item.title ?? item.name ?? "") as string,
            year:      ((item.release_date ?? item.first_air_date ?? "") as string).slice(0, 4),
            poster:    item.poster_path ? `${IMG_BASE}${item.poster_path}` : null,
            tmdbUrl:   `https://www.themoviedb.org/${ep}/${item.id}`,
            mediaType: ep,
            overview:  (item.overview as string | undefined)?.slice(0, 120),
          } as TmdbResult)))
      )
    );

    // Merge + dédoublonne + garde les 8 premiers
    const seen = new Set<string>();
    const results: TmdbResult[] = [];
    for (const list of responses) {
      for (const item of list) {
        const key = `${item.mediaType}-${item.id}`;
        if (!seen.has(key) && item.title) {
          seen.add(key);
          results.push(item);
          if (results.length >= 8) break;
        }
      }
      if (results.length >= 8) break;
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("TMDB search error:", err);
    return NextResponse.json({ results: [] });
  }
}
