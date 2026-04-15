import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────
type Category = "movie" | "show" | "anime" | "music";
type SortMode  = "recent" | "alpha" | "rating" | "year";

interface PlexSection {
  key: string;
  title: string;
  type: string; // movie | show | artist
}

interface PlexMediaItem {
  ratingKey:    string;
  title:        string;
  year?:        number;
  type:         string;
  thumb?:       string;
  rating?:      number;
  summary?:     string;
  duration?:    number;
  contentRating?: string;
  addedAt?:     number;
  Genre?:       { tag: string }[];
  leafCount?:   number;
  childCount?:  number;
}

export interface MappedItem {
  id:            string;
  title:         string;
  year:          number;
  type:          "movie" | "show";
  category:      Category;
  sectionTitle:  string;
  thumb?:        string;
  rating?:       number;
  summary?:      string;
  duration?:     number;
  contentRating?: string;
  addedAt:       number;
  genre:         string[];
  seasons?:      number;
  episodes?:     number;
}

// ─── Cache serveur (5 min TTL) ────────────────────────────────
interface CacheEntry {
  items:     MappedItem[];
  timestamp: number;
}
let serverCache: CacheEntry | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return !!serverCache && Date.now() - serverCache.timestamp < CACHE_TTL;
}

// ─── Détection de catégorie par titre de section ──────────────
function detectCategory(sectionType: string, sectionTitle: string): Category {
  if (sectionType === "artist") return "music";
  const t = sectionTitle.toLowerCase();
  if (t.includes("animé") || t.includes("anime") || t.includes("manga")) return "anime";
  return sectionType === "movie" ? "movie" : "show";
}

// ─── Mapping d'un item Plex ───────────────────────────────────
function mapItem(
  item:    PlexMediaItem,
  section: PlexSection,
  plexUrl: string,
  token:   string,
): MappedItem {
  const category = detectCategory(section.type, section.title);
  return {
    id:           item.ratingKey,
    title:        item.title,
    year:         item.year ?? 0,
    type:         section.type === "artist" ? "show" : (item.type === "movie" ? "movie" : "show"),
    category,
    sectionTitle: section.title,
    thumb:        item.thumb ? `${plexUrl}${item.thumb}?X-Plex-Token=${token}` : undefined,
    rating:       item.rating ? parseFloat(item.rating.toFixed(1)) : undefined,
    summary:      item.summary,
    duration:     item.duration,
    contentRating: item.contentRating,
    addedAt:      item.addedAt ?? 0,
    genre:        item.Genre?.map(g => g.tag) ?? [],
    seasons:      item.childCount,
    episodes:     item.leafCount,
  };
}

// ─── Fetch complet depuis Plex (remplit le cache) ─────────────
async function fetchAllFromPlex(plexUrl: string, token: string): Promise<MappedItem[]> {
  // 1. Sections
  const sectionsRes = await fetch(
    `${plexUrl}/library/sections?X-Plex-Token=${token}`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
  );
  if (!sectionsRes.ok) throw new Error(`Plex sections: ${sectionsRes.status}`);
  const sectionsData = await sectionsRes.json();
  const sections: PlexSection[] = (sectionsData?.MediaContainer?.Directory ?? [])
    .filter((s: PlexSection) => ["movie", "show", "artist"].includes(s.type));

  // 2. Items de chaque section en parallèle
  const all: MappedItem[] = [];
  await Promise.all(sections.map(async (section) => {
    try {
      const res = await fetch(
        `${plexUrl}/library/sections/${section.key}/all?X-Plex-Token=${token}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const media: PlexMediaItem[] = data?.MediaContainer?.Metadata ?? [];
      media.forEach(item => all.push(mapItem(item, section, plexUrl, token)));
    } catch { /* section ignorée si timeout */ }
  }));

  return all;
}

// ─── Tri ──────────────────────────────────────────────────────
function sortItems(items: MappedItem[], sort: SortMode): MappedItem[] {
  return [...items].sort((a, b) => {
    if (sort === "alpha")  return a.title.localeCompare(b.title, "fr");
    if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sort === "year")   return (b.year ?? 0) - (a.year ?? 0);
    return (b.addedAt ?? 0) - (a.addedAt ?? 0); // recent
  });
}

// ─── Filtrage ─────────────────────────────────────────────────
function filterItems(
  items:    MappedItem[],
  category: string,
  search:   string,
): MappedItem[] {
  return items.filter(item => {
    if (category !== "all" && item.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q);
    }
    return true;
  });
}

// ─── Route GET ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
  const limit    = Math.min(96, Math.max(12, parseInt(searchParams.get("limit") ?? "48")));
  const category = searchParams.get("category") ?? "all";
  const sort     = (searchParams.get("sort") ?? "recent") as SortMode;
  const search   = (searchParams.get("search") ?? "").trim();
  const refresh  = searchParams.get("refresh") === "1";

  const plexUrl  = process.env.PLEX_URL?.replace(/\/$/, "");
  const token    = process.env.PLEX_TOKEN;

  // ── Mode démo ──
  if (!plexUrl || !token) {
    const demo = generateDemoData();
    const filtered = filterItems(demo, category, search);
    const sorted   = sortItems(filtered, sort);
    const total    = sorted.length;
    const start    = (page - 1) * limit;
    return NextResponse.json({
      items:      sorted.slice(start, start + limit),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      cached:     false,
      demo:       true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // ── Remplit le cache si nécessaire ──
    if (!isCacheValid() || refresh) {
      const items = await fetchAllFromPlex(plexUrl, token);
      serverCache = { items, timestamp: Date.now() };
    }

    const all      = serverCache!.items;
    const filtered = filterItems(all, category, search);
    const sorted   = sortItems(filtered, sort);
    const total    = sorted.length;
    const start    = (page - 1) * limit;

    // Compteurs par catégorie
    const counts = {
      all:   all.length,
      movie: all.filter(i => i.category === "movie").length,
      show:  all.filter(i => i.category === "show").length,
      anime: all.filter(i => i.category === "anime").length,
      music: all.filter(i => i.category === "music").length,
    };

    return NextResponse.json({
      items:      sorted.slice(start, start + limit),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      counts,
      cached:     true,
      demo:       false,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });

  } catch (err) {
    console.error("Plex API error:", err);
    // Si le cache est dispo (même expiré), on l'utilise en fallback
    if (serverCache) {
      const filtered = filterItems(serverCache.items, category, search);
      const sorted   = sortItems(filtered, sort);
      const total    = sorted.length;
      const start    = (page - 1) * limit;
      return NextResponse.json({
        items: sorted.slice(start, start + limit),
        total, page,
        totalPages: Math.ceil(total / limit),
        cached: true, demo: false, stale: true,
      });
    }
    return NextResponse.json(
      { message: "Impossible de contacter Plex", items: [], total: 0, page: 1, totalPages: 0 },
      { status: 502 }
    );
  }
}

// ─── Données de démo ──────────────────────────────────────────
function generateDemoData(): MappedItem[] {
  const base = (id: string, title: string, year: number, category: Category, rating: number, genre: string[], extra = {}): MappedItem => ({
    id, title, year, type: category === "movie" ? "movie" : "show", category,
    sectionTitle: category, addedAt: Date.now() / 1000 - Math.random() * 1e6,
    rating, genre, ...extra,
  });

  return [
    base("1", "Dune: Part Two", 2024, "movie", 8.5, ["Science-Fiction","Aventure"]),
    base("2", "Oppenheimer", 2023, "movie", 8.9, ["Historique","Drame"]),
    base("3", "The Dark Knight", 2008, "movie", 9.0, ["Action","Crime"]),
    base("4", "Interstellar", 2014, "movie", 8.6, ["Science-Fiction"]),
    base("5", "House of the Dragon", 2022, "show", 8.5, ["Fantaisie"], {seasons:2}),
    base("6", "The Last of Us", 2023, "show", 8.8, ["Action","Drame"], {seasons:2}),
    base("7", "Attack on Titan", 2013, "anime", 9.0, ["Action","Shonen"], {seasons:4}),
    base("8", "Demon Slayer", 2019, "anime", 8.7, ["Action","Shonen"], {seasons:3}),
    base("9", "One Piece", 1999, "anime", 8.9, ["Aventure","Shonen"], {seasons:21}),
    base("10", "Daft Punk - Random Access Memories", 2013, "music", 9.2, ["Électronique","Pop"]),
    base("11", "The Weeknd - After Hours", 2020, "music", 8.8, ["R&B","Pop"]),
    base("12", "Inception", 2010, "movie", 8.8, ["Science-Fiction","Action"]),
    base("13", "Severance", 2022, "show", 8.7, ["Science-Fiction","Drame"], {seasons:2}),
    base("14", "Jujutsu Kaisen", 2020, "anime", 8.6, ["Action","Shonen"], {seasons:2}),
  ];
}
