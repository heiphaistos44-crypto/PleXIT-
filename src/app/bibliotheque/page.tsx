"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Film, Tv, Search, RefreshCw, Star,
  AlertCircle, Library, ChevronRight, ChevronLeft,
  ExternalLink, SlidersHorizontal, X
} from "lucide-react";

interface PlexItem {
  id: string;
  title: string;
  year: number;
  type: "movie" | "show";
  thumb?: string;
  rating?: number;
  summary?: string;
  genre?: string[];
  duration?: number;
  seasons?: number;
  episodes?: number;
  contentRating?: string;
  addedAt?: number;
}

type SortMode = "recent" | "alpha" | "rating" | "year";
type FilterType = "all" | "movie" | "show";

const PAGE_SIZE = 48;
const GENRES_FILTER = [
  "Action", "Aventure", "Animation", "Comédie", "Crime",
  "Drame", "Fantaisie", "Horreur", "Science-Fiction", "Thriller",
  "Documentaire", "Romance", "Mystère", "Historique",
];

export default function BibliothequeePage() {
  const [items, setItems] = useState<PlexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [selected, setSelected] = useState<PlexItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/plex");
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion Plex impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1); }, [search, filterType, sortMode, genreFilter]);

  const filtered = useMemo(() => items
    .filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (genreFilter && !item.genre?.some(g =>
        g.toLowerCase().includes(genreFilter.toLowerCase())
      )) return false;
      if (search) return item.title.toLowerCase().includes(search.toLowerCase());
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "alpha") return a.title.localeCompare(b.title, "fr");
      if (sortMode === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortMode === "year") return (b.year || 0) - (a.year || 0);
      return (b.addedAt || 0) - (a.addedAt || 0);
    }), [items, filterType, genreFilter, search, sortMode]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const movies = items.filter(i => i.type === "movie").length;
  const shows = items.filter(i => i.type === "show").length;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 36 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Bibliothèque Plex</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 6 }}>
              Collection
            </h1>
            {!loading && !error && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span className="badge badge-red">{movies.toLocaleString("fr")} Films</span>
                <span className="badge badge-blue">{shows.toLocaleString("fr")} Séries</span>
                <span className="badge badge-gray">{items.length.toLocaleString("fr")} Total</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href={process.env.NEXT_PUBLIC_PLEX_URL || "http://localhost:32400/web"}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "rgba(229,127,13,0.1)", border: "1px solid rgba(229,127,13,0.25)",
                color: "#f59e0b", fontSize: "0.85rem", fontWeight: 600,
                textDecoration: "none", transition: "all 0.2s",
              }}
            >
              <ExternalLink size={14} /> Ouvrir Plex
            </a>
            <button
              onClick={fetchLibrary}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#9ca3af", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTERS ─── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
            <input
              className="input-plexit"
              placeholder="Rechercher un titre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type */}
          {(["all", "movie", "show"] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${filterType === t ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.07)"}`,
              background: filterType === t ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.02)",
              color: filterType === t ? "#ef4444" : "#9ca3af",
              fontSize: "0.85rem", fontWeight: 600, transition: "all 0.2s",
            }}>
              {t === "all" ? <Library size={14} /> : t === "movie" ? <Film size={14} /> : <Tv size={14} />}
              {t === "all" ? "Tout" : t === "movie" ? "Films" : "Séries"}
            </button>
          ))}

          {/* Sort */}
          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
            className="input-plexit" style={{ width: "auto", paddingLeft: 12, cursor: "pointer" }}>
            <option value="recent">Plus récents</option>
            <option value="alpha">A → Z</option>
            <option value="rating">Mieux notés</option>
            <option value="year">Année</option>
          </select>

          {/* Genre toggle */}
          <button onClick={() => setShowFilters(!showFilters)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 10, cursor: "pointer",
            background: showFilters ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${showFilters ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.07)"}`,
            color: showFilters ? "#ef4444" : "#9ca3af", transition: "all 0.2s",
          }}>
            <SlidersHorizontal size={15} />
            {genreFilter && <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{genreFilter}</span>}
          </button>
        </div>

        {/* Genre chips */}
        {showFilters && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingBottom: 8 }}>
            <button onClick={() => setGenreFilter("")} className={`tag-chip ${genreFilter === "" ? "active" : ""}`}>
              Tous
            </button>
            {GENRES_FILTER.map(g => (
              <button key={g} onClick={() => setGenreFilter(genreFilter === g ? "" : g)}
                className={`tag-chip ${genreFilter === g ? "active" : ""}`}>
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── RESULT INFO ─── */}
      {!loading && !error && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
            {filtered.length.toLocaleString("fr")} résultat{filtered.length !== 1 ? "s" : ""}
            {search && ` pour "${search}"`}
            {genreFilter && ` — ${genreFilter}`}
          </p>
          {totalPages > 1 && (
            <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
              Page {page} / {totalPages}
              <span style={{ marginLeft: 8, color: "#374151" }}>
                ({((page - 1) * PAGE_SIZE + 1).toLocaleString("fr")}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString("fr")})
              </span>
            </p>
          )}
        </div>
      )}

      {/* ─── ERROR ─── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "20px 24px", borderRadius: 14, marginBottom: 24,
          background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
        }}>
          <AlertCircle size={20} color="#ef4444" />
          <div>
            <p style={{ fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Connexion Plex impossible</p>
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ─── LOADING SKELETON ─── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "2/3" }}>
              <div className="skeleton" style={{ width: "100%", height: "100%" }} />
            </div>
          ))}
        </div>
      )}

      {/* ─── GRID ─── */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Library size={48} style={{ margin: "0 auto 16px", opacity: 0.2, display: "block" }} />
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#6b7280" }}>Aucun résultat</p>
              <p style={{ fontSize: "0.85rem", color: "#4b5563", marginTop: 6 }}>
                {search ? `Aucun titre ne correspond à "${search}"` : "Essaie un autre filtre"}
              </p>
              {search && (
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
              {paginated.map(item => (
                <PosterCard key={item.id} item={item} onClick={() => setSelected(item)} />
              ))}
            </div>
          )}

          {/* ─── PAGINATION ─── */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, marginTop: 48, flexWrap: "wrap",
            }}>
              {/* Précédent */}
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); scrollTop(); }}
                disabled={page === 1}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10, cursor: page === 1 ? "not-allowed" : "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: page === 1 ? "#374151" : "#9ca3af", fontWeight: 600, fontSize: "0.85rem",
                  transition: "all 0.2s", opacity: page === 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={16} /> Précédent
              </button>

              {/* Pages numérotées */}
              {getPaginationRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} style={{ color: "#374151", padding: "0 4px", fontSize: "0.85rem" }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => { setPage(p as number); scrollTop(); }}
                    style={{
                      width: 40, height: 40, borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${page === p ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.07)"}`,
                      background: page === p ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.02)",
                      color: page === p ? "#ef4444" : "#9ca3af",
                      fontWeight: page === p ? 700 : 500, fontSize: "0.88rem",
                      transition: "all 0.2s",
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Suivant */}
              <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); scrollTop(); }}
                disabled={page === totalPages}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10, cursor: page === totalPages ? "not-allowed" : "pointer",
                  background: page === totalPages ? "rgba(255,255,255,0.02)" : "rgba(220,38,38,0.1)",
                  border: `1px solid ${page === totalPages ? "rgba(255,255,255,0.06)" : "rgba(220,38,38,0.3)"}`,
                  color: page === totalPages ? "#374151" : "#ef4444",
                  fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── MODAL ─── */}
      {selected && <ItemModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Génère la plage de pages à afficher (ex: 1 … 4 5 6 … 99)
function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}

function PosterCard({ item, onClick }: { item: PlexItem; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="poster-card" onClick={onClick} style={{ cursor: "pointer" }}>
      {item.thumb && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/plex/image?url=${encodeURIComponent(item.thumb)}`}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          background: "linear-gradient(135deg, #1a1a1a, #111)",
        }}>
          {item.type === "movie" ? <Film size={32} color="#374151" /> : <Tv size={32} color="#374151" />}
          <span style={{ fontSize: "0.7rem", color: "#374151", textAlign: "center", padding: "0 10px" }}>
            {item.title}
          </span>
        </div>
      )}

      <div style={{ position: "absolute", top: 8, left: 8 }}>
        <span className={`badge ${item.type === "movie" ? "badge-red" : "badge-blue"}`} style={{ fontSize: "0.6rem" }}>
          {item.type === "movie" ? "Film" : "Série"}
        </span>
      </div>

      {item.rating && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          display: "flex", alignItems: "center", gap: 3,
          background: "rgba(0,0,0,0.75)", borderRadius: 6, padding: "3px 7px",
        }}>
          <Star size={10} color="#f59e0b" fill="#f59e0b" />
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f9fafb" }}>
            {item.rating.toFixed(1)}
          </span>
        </div>
      )}

      <div className="poster-overlay">
        <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f9fafb", lineHeight: 1.3, marginBottom: 4 }}>
          {item.title}
        </p>
        <p style={{ fontSize: "0.73rem", color: "#9ca3af" }}>{item.year}</p>
      </div>
    </div>
  );
}

function ItemModal({ item, onClose }: { item: PlexItem; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.82)", display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: 24, backdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#161616", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, maxWidth: 620, width: "100%", overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
        }}
      >
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
                {item.type === "movie" ? <Film size={40} color="#374151" /> : <Tv size={40} color="#374151" />}
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: "24px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span className={`badge ${item.type === "movie" ? "badge-red" : "badge-blue"}`}>
                {item.type === "movie" ? "Film" : "Série"}
              </span>
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
              {item.type === "show" && item.seasons && (
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                  {item.seasons} saison{item.seasons > 1 ? "s" : ""}
                  {item.episodes ? ` · ${item.episodes} épisodes` : ""}
                </span>
              )}
              {item.type === "movie" && item.duration && (
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                  {Math.floor(item.duration / 60000)} min
                </span>
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

            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <a href="/demande" style={{ textDecoration: "none" }}>
                <button className="btn-primary" style={{ padding: "9px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Film size={14} /> Signaler un problème
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
