"use client";

import { useEffect, useState, useCallback } from "react";
import type { PlexSession } from "@/app/api/plex/sessions/route";

const REFRESH_INTERVAL = 30_000; // 30 secondes

// ─── Barre de progression ─────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      width: "100%", height: 3, borderRadius: 999,
      background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 8,
    }}>
      <div style={{
        height: "100%", borderRadius: 999,
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: "linear-gradient(90deg, #e5811d, #f59e0b)",
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ─── Indicateur d'état ────────────────────────────────────────
function StateIndicator({ state }: { state: PlexSession["state"] }) {
  const color = state === "playing" ? "#22c55e" : state === "paused" ? "#f59e0b" : "#6b7280";
  const label = state === "playing" ? "En lecture" : state === "paused" ? "En pause" : "Chargement";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color, fontWeight: 600 }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
        boxShadow: state === "playing" ? `0 0 6px ${color}` : "none",
        animation: state === "playing" ? "pulse 1.8s ease-in-out infinite" : "none",
        display: "inline-block",
      }} />
      {label}
    </span>
  );
}

// ─── Carte session ────────────────────────────────────────────
function SessionCard({ s }: { s: PlexSession }) {
  const displayTitle = s.type === "episode" && s.grandparent
    ? s.grandparent
    : s.title;
  const subtitle = s.type === "episode" ? s.title : s.year ? String(s.year) : null;

  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "center",
      padding: "14px 16px", borderRadius: 14,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      transition: "border-color 0.2s",
      minWidth: 0,
    }}>
      {/* Poster */}
      <div style={{
        width: 52, height: 76, borderRadius: 8, flexShrink: 0,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden", position: "relative",
      }}>
        {s.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.thumb}
            alt={displayTitle}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem",
          }}>
            {s.type === "track" ? "🎵" : "🎬"}
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Titre */}
        <div style={{
          fontWeight: 700, fontSize: "0.88rem", color: "#f9fafb",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {displayTitle}
        </div>

        {/* Sous-titre */}
        {subtitle && (
          <div style={{
            fontSize: "0.75rem", color: "#6b7280", marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {subtitle}
          </div>
        )}

        {/* Infos utilisateur + état */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            {s.user}
          </span>
          <StateIndicator state={s.state} />
        </div>

        {/* Barre de progression */}
        <ProgressBar value={s.progress} />

        {/* Appareil */}
        <div style={{ fontSize: "0.7rem", color: "#4b5563", marginTop: 5 }}>
          📺 {s.player} · {s.progress}%
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────
export default function NowWatching() {
  const [sessions, setSessions]   = useState<PlexSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res  = await fetch("/api/plex/sessions", { cache: "no-store" });
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setLastUpdate(new Date());
    } catch {
      // silencieux — pas de sessions si erreur réseau
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchSessions]);

  // Ne rien afficher si aucun utilisateur (et pas en cours de chargement initial)
  if (!loading && sessions.length === 0) return null;

  return (
    <section style={{ marginBottom: 64 }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#22c55e", boxShadow: "0 0 8px #22c55e",
            animation: "pulse 1.8s ease-in-out infinite",
          }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f9fafb", margin: 0 }}>
            En ce moment sur Plex
          </h2>
          {!loading && (
            <span style={{
              fontSize: "0.72rem", fontWeight: 700,
              padding: "2px 10px", borderRadius: 999,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
              color: "#22c55e",
            }}>
              {sessions.length} actif{sessions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {lastUpdate && (
          <span style={{ fontSize: "0.72rem", color: "#4b5563" }}>
            Mis à jour {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {/* Skeleton pendant le premier chargement */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 108, borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {sessions.map(s => (
            <SessionCard key={s.sessionId} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}
