"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Film, Tv, Search, RefreshCw, Star,
  AlertCircle, Library, ChevronRight, ChevronLeft,
  ExternalLink, X, Music
} from "lucide-react";

interface PlexItem {
  id:            string;
  title:         string;
  year:          number;
  type:          "movie" | "show";
  category:      "movie" | "show" | "anime" | "music" | "exclusive";
  sectionTitle:  string;
  thumb?:        string;
  rating?:       number;
  summary?:      string;
  duration?:     number;
  seasons?:      number;
  episodes?:     number;
  contentRating?: string;
  genre:         string[];
}

interface ApiResponse {
  items:      PlexItem[];
  total:      number;
  page:       number;
  totalPages: number;
  counts?:    { all: number; movie: number; show: number; anime: number; music: number; exclusive: number };
  demo?:      boolean;
}

type Category = "all" | "movie" | "show" | "anime" | "music" | "exclusive";
type SortMode  = "recent" | "alpha" | "rating" | "year";

const PAGE_SIZE = 48;

const CATEGORIES: { value: Category; label: string; icon: React.ReactNode; badge: string }[] = [
  { value: "all",       label: "Tout",         icon: <Library size={14} />,                     badge: "badge-gray"    },
  { value: "movie",     label: "Films",        icon: <Film size={14} />,                        badge: "badge-red"     },
  { value: "show",      label: "Séries",       icon: <Tv size={14} />,                          badge: "badge-blue"    },
  { value: "anime",     label: "Animé",        icon: <span style={{ fontSize: 14 }}>⛩️</span>, badge: "badge-gold"    },
  { value: "music",     label: "Artiste Musical", icon: <Music size={14} />,                    badge: "badge-green"   },
  { value: "exclusive", label: "Exclusivités", icon: <span style={{ fontSize: 14 }}>💎</span>, badge: "badge-purple"  },
];

function BibliothequeInner() {
  const searchParams = useSearchParams();

  const [items,      setItems]      = useState<PlexItem[]>([]);
  const [counts,     setCounts]     = useState({ all: 0, movie: 0, show: 0, anime: 0, music: 0, exclusive: 0 });
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const [search,   setSearch]   = useState("");
  const initCat = (searchParams.get("category") as Category) ?? "all";
  const [category, setCategory] = useState<Category>(
    ["all","movie","show","anime","music","exclusive"].includes(initCat) ? initCat : "all"
  );
  const [sort,     setSort]     = useState<SortMode>("recent");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<PlexItem | null>(null);

  // Debounce de la recherche
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Reset page si les filtres changent
  useEffect(() => { setPage(1); }, [category, sort, debouncedSearch]);

  // Fetch paginé côté serveur
  const fetchPage = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page:     String(page),
        limit:    String(PAGE_SIZE),
        category,
        sort,
        search:   debouncedSearch,
        ...(opts?.refresh ? { refresh: "1" } : {}),
      });
      const res = await fetch(`/api/plex?${params}`);
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data: ApiResponse = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion Plex impossible");
    } finally {
      setLoading(false);
    }
  }, [page, category, sort, debouncedSearch]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const changePage = (p: number) => {
    setPage(p);
    scrollTop();
  };

  const categoryColor: Record<Category, string> = {
    all:       "#9ca3af",
    movie:     "#ef4444",
    show:      "#3b82f6",
    anime:     "#f59e0b",
    music:     "#22c55e",
    exclusive: "#a855f7",
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 32 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Bibliothèque Plex</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>
              Collection
            </h1>
            {!loading && !error && counts.all > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge badge-gray">{counts.all.toLocaleString("fr")} Total</span>
                <span className="badge badge-red">{counts.movie.toLocaleString("fr")} Films</span>
                <span className="badge badge-blue">{counts.show.toLocaleString("fr")} Séries</span>
                {counts.anime > 0 && <span className="badge badge-gold">{counts.anime.toLocaleString("fr")} Animés</span>}
                {counts.music > 0 && <span className="badge badge-green">{counts.music.toLocaleString("fr")} Artistes</span>}
                {counts.exclusive > 0 && <span className="badge badge-purple">{counts.exclusive.toLocaleString("fr")} Exclus</span>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href={process.env.NEXT_PUBLIC_PLEX_URL || "https://watch.plex.tv/fr/me"}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "rgba(229,127,13,0.1)", border: "1px solid rgba(229,127,13,0.25)",
                color: "#f59e0b", fontSize: "0.85rem", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} /> Ouvrir Plex
            </a>
            <button
              onClick={() => fetchPage({ refresh: true })}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#9ca3af", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTRES ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>

          {/* Barre de recherche */}
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
            <input
              className="input-plexit"
              placeholder="Rechercher un titre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Catégories */}
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${category === c.value ? categoryColor[c.value] : "rgba(255,255,255,0.07)"}`,
              background: category === c.value ? `${categoryColor[c.value]}15` : "rgba(255,255,255,0.02)",
              color: category === c.value ? categoryColor[c.value] : "#9ca3af",
              fontSize: "0.83rem", fontWeight: 600, transition: "all 0.2s",
            }}>
              {c.icon} {c.label}
              {counts.all > 0 && (
                <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                  {c.value === "all" ? counts.all : counts[c.value] > 0 ? counts[c.value] : ""}
                </span>
              )}
            </button>
          ))}

          {/* Tri */}
          <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
            className="input-plexit" style={{ width: "auto", paddingLeft: 12, cursor: "pointer" }}>
            <option value="recent">Plus récents</option>
            <option value="alpha">A → Z</option>
            <option value="rating">Mieux notés</option>
            <option value="year">Année</option>
          </select>
        </div>
      </div>

      {/* ── INFO RÉSULTATS ── */}
      {!loading && !error && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 6 }}>
          <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
            {total.toLocaleString("fr")} résultat{total !== 1 ? "s" : ""}
            {debouncedSearch && ` pour "${debouncedSearch}"`}
          </p>
          {totalPages > 1 && (
            <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
              Page <strong style={{ color: "#9ca3af" }}>{page}</strong> / {totalPages}
              <span style={{ marginLeft: 8, color: "#374151" }}>
                ({((page - 1) * PAGE_SIZE + 1).toLocaleString("fr")}–{Math.min(page * PAGE_SIZE, total).toLocaleString("fr")})
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── ERREUR ── */}
      {error && !loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 22px", borderRadius: 14, marginBottom: 24,
          background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
        }}>
          <AlertCircle size={20} color="#ef4444" />
          <div>
            <p style={{ fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Connexion Plex impossible</p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── SKELETON ── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "2/3" }}>
              <div className="skeleton" style={{ width: "100%", height: "100%" }} />
            </div>
          ))}
        </div>
      )}

      {/* ── GRILLE ── */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Library size={48} style={{ margin: "0 auto 16px", opacity: 0.2, display: "block" }} />
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#6b7280" }}>Aucun résultat</p>
              <p style={{ fontSize: "0.85rem", color: "#4b5563", marginTop: 6 }}>
                {debouncedSearch ? `Aucun titre pour "${debouncedSearch}"` : "Essaie un autre filtre"}
              </p>
              {debouncedSearch && (
                <div style={{ marginTop: 20 }}>
                  <a href="/demande" style={{ textDecoration: "none" }}>
                    <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px" }}>
                      Faire une demande <ChevronRight size={15} />
                    </button>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14 }}>
              {items.map((item, idx) => (
                <PosterCard key={item.id} item={item} priority={idx < 10} onClick={() => setSelected(item)} />
              ))}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 48, flexWrap: "wrap" }}>
              <button
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10, cursor: page === 1 ? "not-allowed" : "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: page === 1 ? "#374151" : "#9ca3af", fontWeight: 600, fontSize: "0.85rem",
                  opacity: page === 1 ? 0.4 : 1, transition: "all 0.2s",
                }}
              >
                <ChevronLeft size={16} /> Précédent
              </button>

              {getPaginationRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} style={{ color: "#374151", fontSize: "0.85rem" }}>…</span>
                ) : (
                  <button key={p} onClick={() => changePage(p as number)} style={{
                    width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${page === p ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.07)"}`,
                    background: page === p ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.02)",
                    color: page === p ? "#ef4444" : "#9ca3af",
                    fontWeight: page === p ? 700 : 500, fontSize: "0.88rem", transition: "all 0.2s",
                  }}>
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10, cursor: page === totalPages ? "not-allowed" : "pointer",
                  background: page === totalPages ? "rgba(255,255,255,0.02)" : "rgba(220,38,38,0.1)",
                  border: `1px solid ${page === totalPages ? "rgba(255,255,255,0.06)" : "rgba(220,38,38,0.3)"}`,
                  color: page === totalPages ? "#374151" : "#ef4444",
                  fontWeight: 600, fontSize: "0.85rem",
                  opacity: page === totalPages ? 0.4 : 1, transition: "all 0.2s",
                }}
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {selected && <ItemModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function BibliothequeePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}><div className="skeleton" style={{ height: 400, borderRadius: 16 }} /></div>}>
      <BibliothequeInner />
    </Suspense>
  );
}

// ── Pagination helper ──────────────────────────────────────────
function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ── Badge couleur par catégorie ───────────────────────────────
function CategoryBadge({ cat }: { cat: PlexItem["category"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    movie:     { label: "Film",        cls: "badge-red"    },
    show:      { label: "Série",       cls: "badge-blue"   },
    anime:     { label: "Animé",       cls: "badge-gold"   },
    music:     { label: "Artiste",      cls: "badge-green"  },
    exclusive: { label: "💎 Exclu",   cls: "badge-purple" },
  };
  const { label, cls } = map[cat] ?? { label: cat, cls: "badge-gray" };
  return <span className={`badge ${cls}`} style={{ fontSize: "0.6rem" }}>{label}</span>;
}

// ── Poster card ───────────────────────────────────────────────
function PosterCard({ item, priority, onClick }: { item: PlexItem; priority: boolean; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="poster-card" onClick={onClick} style={{ cursor: "pointer" }}>
      {item.thumb && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/plex/image?url=${encodeURIComponent(item.thumb)}`}
          alt={item.title}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          background: "linear-gradient(135deg, #1a1a1a, #111)",
        }}>
          {item.category === "music" ? <Music size={28} color="#374151" /> :
           item.category === "anime" ? <span style={{ fontSize: 28 }}>⛩️</span> :
           item.type === "movie"     ? <Film size={28} color="#374151" /> :
                                       <Tv size={28} color="#374151" />}
          <span style={{ fontSize: "0.7rem", color: "#374151", textAlign: "center", padding: "0 8px" }}>
            {item.title}
          </span>
        </div>
      )}

      <div style={{ position: "absolute", top: 8, left: 8 }}>
        <CategoryBadge cat={item.category} />
      </div>

      {item.rating && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          display: "flex", alignItems: "center", gap: 3,
          background: "rgba(0,0,0,0.78)", borderRadius: 6, padding: "3px 7px",
        }}>
          <Star size={10} color="#f59e0b" fill="#f59e0b" />
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f9fafb" }}>
            {item.rating.toFixed(1)}
          </span>
        </div>
      )}

      <div className="poster-overlay">
        <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "#f9fafb", lineHeight: 1.3, marginBottom: 3 }}>
          {item.title}
        </p>
        <p style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{item.year > 0 ? item.year : ""}</p>
      </div>
    </div>
  );
}

// ── Modal détail ───────────────────────────────────────────────
function ItemModal({ item, onClose }: { item: PlexItem; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: 24, backdropFilter: "blur(8px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#161616", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, maxWidth: 620, width: "100%", overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.85)",
      }}>
        <div style={{ display: "flex" }}>
          <div style={{ width: 185, flexShrink: 0, background: "#111" }}>
            {item.thumb && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/plex/image?url=${encodeURIComponent(item.thumb)}`}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 260, display: "block" }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div style={{ width: 185, minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.category === "music" ? <Music size={40} color="#374151" /> :
                 item.category === "anime" ? <span style={{ fontSize: 40 }}>⛩️</span> :
                 item.type === "movie"     ? <Film size={40} color="#374151" /> :
                                             <Tv size={40} color="#374151" />}
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: "22px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <CategoryBadge cat={item.category} />
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.3 }}>
              {item.title}
            </h2>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              {item.year > 0 && <span style={{ fontSize: "0.82rem", color: "#9ca3af" }}>{item.year}</span>}
              {item.contentRating && <span className="badge badge-gray" style={{ fontSize: "0.63rem" }}>{item.contentRating}</span>}
              {item.rating && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", color: "#f59e0b" }}>
                  <Star size={12} fill="#f59e0b" /> {item.rating.toFixed(1)}
                </span>
              )}
              {item.category !== "music" && item.type === "show" && item.seasons && (
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                  {item.seasons} saison{item.seasons > 1 ? "s" : ""}
                  {item.episodes ? ` · ${item.episodes} épisodes` : ""}
                </span>
              )}
              {item.type === "movie" && item.duration && (
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>{Math.floor(item.duration / 60000)} min</span>
              )}
              {item.sectionTitle && (
                <span style={{ fontSize: "0.72rem", color: "#374151", fontStyle: "italic" }}>{item.sectionTitle}</span>
              )}
            </div>

            {item.genre && item.genre.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {item.genre.slice(0, 5).map(g => (
                  <span key={g} className="badge badge-gray" style={{ fontSize: "0.63rem" }}>{g}</span>
                ))}
              </div>
            )}

            {item.summary && (
              <p style={{
                fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.6,
                display: "-webkit-box", WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {item.summary}
              </p>
            )}

            <div style={{ marginTop: 18 }}>
              <a href="/demande" style={{ textDecoration: "none" }}>
                <button className="btn-primary" style={{ padding: "9px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Film size={14} /> Faire une demande
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
