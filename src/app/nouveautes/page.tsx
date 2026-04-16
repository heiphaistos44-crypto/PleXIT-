"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Tv, Music, Clapperboard, RefreshCw, Sparkles } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface MediaItem {
  id:           string;
  title:        string;
  year:         number;
  category:     string;
  sectionTitle: string;
  thumb?:       string;
  rating?:      number;
  genre:        string[];
  addedAt:      number;
}

// ─── Config catégories ────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  movie:        "#ef4444",
  show:         "#8b5cf6",
  anime:        "#f59e0b",
  dessin_anime: "#06b6d4",
  music:        "#22c55e",
  exclusive:    "#a78bfa",
};

const CATEGORY_LABELS: Record<string, string> = {
  movie:        "Film",
  show:         "Série",
  anime:        "Animé",
  dessin_anime: "Dessin animé",
  music:        "Musique",
  exclusive:    "Exclusivité",
};

function CategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  switch (category) {
    case "movie":        return <Film        size={size} />;
    case "show":         return <Tv          size={size} />;
    case "anime":        return <Clapperboard size={size} />;
    case "dessin_anime": return <Clapperboard size={size} />;
    case "music":        return <Music       size={size} />;
    default:             return <Sparkles    size={size} />;
  }
}

// ─── Skeleton card ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: "pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ height: 240, background: "rgba(255,255,255,0.04)" }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 8, width: "75%" }} />
        <div style={{ height: 11, borderRadius: 6, background: "rgba(255,255,255,0.04)", width: "45%" }} />
      </div>
    </div>
  );
}

// ─── Media card ───────────────────────────────────────────────
function MediaCard({ item, isNew }: { item: MediaItem; isNew: boolean }) {
  const color = CATEGORY_COLORS[item.category] ?? "#6b7280";
  const label = CATEGORY_LABELS[item.category] ?? item.category;

  const addedDate = item.addedAt
    ? new Date(item.addedAt * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderLeft: `3px solid ${color}`,
      transition: "transform 0.15s, box-shadow 0.15s",
      position: "relative",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 240, background: `${color}18`, overflow: "hidden" }}>
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/plex/image?url=${encodeURIComponent(item.thumb)}`}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: `${color}60`,
          }}>
            <CategoryIcon category={item.category} size={40} />
          </div>
        )}

        {/* Badge NOUVEAU */}
        {isNew && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "#ef4444", color: "white",
            fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em",
            padding: "3px 7px", borderRadius: 999,
          }}>
            NOUVEAU
          </div>
        )}

        {/* Rating overlay */}
        {item.rating !== undefined && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            color: "#fbbf24", fontSize: "0.72rem", fontWeight: 700,
            padding: "3px 8px", borderRadius: 6,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            ⭐ {item.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px" }}>
        <p style={{
          fontWeight: 700, fontSize: "0.88rem", color: "#f9fafb",
          marginBottom: 2, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.title}
        </p>

        <p style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 8 }}>
          {item.year > 0 ? item.year : "—"}
        </p>

        {/* Category badge */}
        <span style={{
          display: "inline-block",
          fontSize: "0.62rem", fontWeight: 700,
          padding: "2px 8px", borderRadius: 999,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          color,
          marginBottom: 6,
        }}>
          {label}
        </span>

        {/* Genres */}
        {item.genre.length > 0 && (
          <p style={{ fontSize: "0.68rem", color: "#4b5563", marginBottom: 6, lineHeight: 1.4 }}>
            {item.genre.slice(0, 3).join(" · ")}
          </p>
        )}

        {/* Date ajout */}
        <p style={{ fontSize: "0.65rem", color: "#374151" }}>
          Ajouté le {addedDate}
        </p>
      </div>
    </div>
  );
}

// ─── Page Nouveautés ──────────────────────────────────────────
export default function NouveautesPage() {
  const [items,     setItems]     = useState<MediaItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = `/api/plex?sort=recent&limit=24&category=all${forceRefresh ? "&refresh=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Sparkles size={22} color="#f59e0b" />
            <p className="section-label">Derniers ajouts</p>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>
            Nouveautés
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Les derniers ajouts sur le serveur
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10, cursor: refreshing ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9ca3af", fontSize: "0.84rem", fontWeight: 600,
            opacity: refreshing ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
          Actualiser
        </button>
      </div>

      {/* Skeletons */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          textAlign: "center", padding: "60px 0",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 16,
        }}>
          <p style={{ fontSize: "1.4rem", marginBottom: 8 }}>⚠️</p>
          <p style={{ fontSize: "0.9rem", color: "#ef4444", marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => fetchData()}
            style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontSize: "0.82rem", fontWeight: 600,
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div style={{
          textAlign: "center", padding: "80px 0",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16, color: "#4b5563",
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: "0.9rem" }}>Aucun contenu disponible pour le moment.</p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
          {items.map((item, index) => (
            <MediaCard key={item.id} item={item} isNew={index < 5} />
          ))}
        </div>
      )}
    </div>
  );
}
