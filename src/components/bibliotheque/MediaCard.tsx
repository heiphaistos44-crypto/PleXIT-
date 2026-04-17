"use client";

import { useState } from "react";
import { Film, Tv, Music, Star } from "lucide-react";
import { PlexItem } from "./types";

function CategoryBadge({ cat }: { cat: PlexItem["category"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    movie:     { label: "Film",      cls: "badge-red"    },
    show:      { label: "Série",     cls: "badge-blue"   },
    anime:     { label: "Animé",     cls: "badge-gold"   },
    music:     { label: "Artiste",   cls: "badge-green"  },
    exclusive: { label: "💎 Exclu", cls: "badge-purple" },
  };
  const { label, cls } = map[cat] ?? { label: cat, cls: "badge-gray" };
  return <span className={`badge ${cls}`} style={{ fontSize: "0.6rem" }}>{label}</span>;
}

interface MediaCardProps {
  item:     PlexItem;
  priority: boolean;
  onClick:  () => void;
}

export default function MediaCard({ item, priority, onClick }: MediaCardProps) {
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

// ── Modal détail ──────────────────────────────────────────────
interface ItemModalProps {
  item:    PlexItem;
  onClose: () => void;
}

export function ItemModal({ item, onClose }: ItemModalProps) {
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
                <span style={{ fontSize: 20 }}>✕</span>
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
