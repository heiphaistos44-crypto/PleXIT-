import { NextResponse } from "next/server";

interface PlexSection {
  key: string;
  title: string;
  type: string;
}

interface PlexMediaItem {
  ratingKey: string;
  title: string;
  year?: number;
  type: string;
  thumb?: string;
  art?: string;
  rating?: number;
  summary?: string;
  duration?: number;
  studio?: string;
  contentRating?: string;
  addedAt?: number;
  Genre?: { tag: string }[];
  leafCount?: number;
  childCount?: number;
}

export async function GET() {
  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "");
  const plexToken = process.env.PLEX_TOKEN;

  if (!plexUrl || !plexToken) {
    return NextResponse.json(
      { items: generateDemoData(), demo: true },
      { status: 200 }
    );
  }

  try {
    // Récupère les sections (bibliothèques)
    const sectionsRes = await fetch(
      `${plexUrl}/library/sections?X-Plex-Token=${plexToken}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!sectionsRes.ok) {
      throw new Error(`Plex sections error: ${sectionsRes.status}`);
    }

    const sectionsData = await sectionsRes.json();
    const sections: PlexSection[] = sectionsData?.MediaContainer?.Directory || [];

    // Filtre films et séries
    const mediaSections = sections.filter(
      (s) => s.type === "movie" || s.type === "show"
    );

    const allItems: ReturnType<typeof mapPlexItem>[] = [];

    // Pour chaque section, récupère les éléments
    await Promise.all(
      mediaSections.map(async (section) => {
        try {
          const itemsRes = await fetch(
            `${plexUrl}/library/sections/${section.key}/all?X-Plex-Token=${plexToken}`,
            {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(10000),
            }
          );

          if (!itemsRes.ok) return;

          const itemsData = await itemsRes.json();
          const mediaItems: PlexMediaItem[] =
            itemsData?.MediaContainer?.Metadata || [];

          const mapped = mediaItems.map((item) =>
            mapPlexItem(item, plexUrl, plexToken)
          );
          allItems.push(...mapped);
        } catch {
          // Ignore individual section errors
        }
      })
    );

    return NextResponse.json({ items: allItems, demo: false });
  } catch (err) {
    console.error("Plex API error:", err);
    return NextResponse.json(
      { message: "Impossible de contacter le serveur Plex", items: [], demo: false },
      { status: 502 }
    );
  }
}

function mapPlexItem(
  item: PlexMediaItem,
  plexUrl: string,
  plexToken: string
) {
  return {
    id: item.ratingKey,
    title: item.title,
    year: item.year || 0,
    type: (item.type === "movie" ? "movie" : "show") as "movie" | "show",
    thumb: item.thumb
      ? `${plexUrl}${item.thumb}?X-Plex-Token=${plexToken}`
      : undefined,
    rating: item.rating ? parseFloat(item.rating.toFixed(1)) : undefined,
    summary: item.summary,
    duration: item.duration,
    studio: item.studio,
    contentRating: item.contentRating,
    addedAt: item.addedAt,
    genre: item.Genre?.map((g) => g.tag) || [],
    seasons: item.childCount,
    episodes: item.leafCount,
  };
}

function generateDemoData() {
  const demoMovies = [
    { title: "Dune: Part Two", year: 2024, rating: 8.5, genre: ["Science-Fiction", "Aventure"] },
    { title: "Oppenheimer", year: 2023, rating: 8.9, genre: ["Historique", "Drame"] },
    { title: "The Dark Knight", year: 2008, rating: 9.0, genre: ["Action", "Crime", "Thriller"] },
    { title: "Interstellar", year: 2014, rating: 8.6, genre: ["Science-Fiction", "Drame"] },
    { title: "Inception", year: 2010, rating: 8.8, genre: ["Science-Fiction", "Action"] },
    { title: "Parasite", year: 2019, rating: 8.5, genre: ["Thriller", "Drame"] },
    { title: "Avatar: The Way of Water", year: 2022, rating: 7.6, genre: ["Science-Fiction", "Aventure"] },
    { title: "Everything Everywhere All at Once", year: 2022, rating: 7.8, genre: ["Action", "Comédie"] },
    { title: "John Wick: Chapter 4", year: 2023, rating: 7.7, genre: ["Action", "Thriller"] },
    { title: "The Batman", year: 2022, rating: 7.8, genre: ["Action", "Crime"] },
    { title: "Top Gun: Maverick", year: 2022, rating: 8.2, genre: ["Action", "Drame"] },
    { title: "No Way Home", year: 2021, rating: 8.2, genre: ["Action", "Aventure"] },
    { title: "Tár", year: 2022, rating: 7.5, genre: ["Drame", "Mystère"] },
    { title: "The Banshees of Inisherin", year: 2022, rating: 7.7, genre: ["Comédie", "Drame"] },
    { title: "Bullet Train", year: 2022, rating: 7.3, genre: ["Action", "Comédie"] },
  ];

  const demoShows = [
    { title: "House of the Dragon", year: 2022, rating: 8.5, genre: ["Drame", "Fantaisie"], seasons: 2 },
    { title: "The Last of Us", year: 2023, rating: 8.8, genre: ["Action", "Drame"], seasons: 2 },
    { title: "Succession", year: 2018, rating: 8.8, genre: ["Drame"], seasons: 4 },
    { title: "Andor", year: 2022, rating: 8.5, genre: ["Science-Fiction", "Action"], seasons: 1 },
    { title: "The Bear", year: 2022, rating: 8.6, genre: ["Comédie", "Drame"], seasons: 3 },
    { title: "Severance", year: 2022, rating: 8.7, genre: ["Drame", "Science-Fiction"], seasons: 2 },
    { title: "Peaky Blinders", year: 2013, rating: 8.8, genre: ["Crime", "Drame"], seasons: 6 },
    { title: "Better Call Saul", year: 2015, rating: 8.9, genre: ["Crime", "Drame"], seasons: 6 },
    { title: "Dark", year: 2017, rating: 8.8, genre: ["Drame", "Science-Fiction"], seasons: 3 },
    { title: "The Boys", year: 2019, rating: 8.7, genre: ["Action", "Comédie"], seasons: 4 },
    { title: "Chernobyl", year: 2019, rating: 9.4, genre: ["Historique", "Drame"], seasons: 1 },
    { title: "Shogun", year: 2024, rating: 9.0, genre: ["Aventure", "Drame"], seasons: 1 },
  ];

  const movies = demoMovies.map((m, i) => ({
    id: `demo-movie-${i}`,
    title: m.title,
    year: m.year,
    type: "movie" as const,
    rating: m.rating,
    genre: m.genre,
    addedAt: Date.now() / 1000 - i * 86400,
    summary: `${m.title} est un film ${m.genre[0].toLowerCase()} sorti en ${m.year}. (Données de démonstration — configure ton token Plex pour voir la vraie bibliothèque)`,
  }));

  const shows = demoShows.map((s, i) => ({
    id: `demo-show-${i}`,
    title: s.title,
    year: s.year,
    type: "show" as const,
    rating: s.rating,
    genre: s.genre,
    seasons: s.seasons,
    addedAt: Date.now() / 1000 - i * 86400 * 2,
    summary: `${s.title} est une série ${s.genre[0].toLowerCase()} commencée en ${s.year}. (Données de démonstration — configure ton token Plex pour voir la vraie bibliothèque)`,
  }));

  return [...movies, ...shows];
}
