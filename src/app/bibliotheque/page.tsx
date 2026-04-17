"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, RefreshCw, Library, ChevronRight, ChevronLeft, ExternalLink, X,
} from "lucide-react";

import CategoryFilter from "@/components/bibliotheque/CategoryFilter";
import MediaCard, { ItemModal } from "@/components/bibliotheque/MediaCard";
import SortBar from "@/components/bibliotheque/SortBar";
import { PlexItem, ApiResponse, Category, SortMode } from "@/components/bibliotheque/types";

const PAGE_SIZE = 48;

function getPaginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

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

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [category, sort, debouncedSearch]);

  const fetchPage = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page:   String(page),
        limit:  String(PAGE_SIZE),
        category,
        sort,
        search: debouncedSearch,
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

  const changePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                color: "#f59e0b", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
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
        <CategoryFilter category={category} counts={counts} onChange={setCategory} />
      </div>

      {/* ── SORT BAR + RÉSULTATS ── */}
      {!loading && !error && (
        <SortBar
          sort={sort}
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          debouncedSearch={debouncedSearch}
          onChange={setSort}
        />
      )}

      {/* ── ERREUR ── */}
      {error && !loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 22px", borderRadius: 14, marginBottom: 24,
          background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
        }}>
          <span style={{ color: "#ef4444", fontSize: 20 }}>⚠</span>
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
                <MediaCard key={item.id} item={item} priority={idx < 10} onClick={() => setSelected(item)} />
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
