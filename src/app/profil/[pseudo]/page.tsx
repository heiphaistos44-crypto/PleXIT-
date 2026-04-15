"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Film, Tv, Music, Clapperboard, Clock,
  CheckCircle2, XCircle, Calendar, ChevronLeft,
  BarChart3, Star,
} from "lucide-react";
import PushSubscribe from "@/components/PushSubscribe";

interface HistoriqueRequest {
  id:           string;
  type:         string;
  titre:        string;
  annee?:       string;
  genres?:      string[];
  priorite:     string;
  pseudo:       string;
  requestedAt:  string;
  status:       "pending" | "added" | "rejected";
  addedAt?:     string;
  note?:        string;
  commentaire?: string;
}

const TYPE_LABELS: Record<string, string> = {
  film:         "Film",
  serie:        "Série",
  anime:        "Animé / Manga",
  dessin_anime: "Dessin Animé",
  musique:      "Artiste Musical",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  film:         <Film size={13} />,
  serie:        <Tv size={13} />,
  anime:        <span style={{ fontSize: 13 }}>⛩️</span>,
  dessin_anime: <Clapperboard size={13} />,
  musique:      <Music size={13} />,
};
const TYPE_COLORS: Record<string, string> = {
  film:         "#ef4444",
  serie:        "#8b5cf6",
  anime:        "#f59e0b",
  dessin_anime: "#06b6d4",
  musique:      "#22c55e",
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "En attente", color: "#f59e0b", icon: <Clock size={12} />        },
  added:    { label: "Ajouté",     color: "#22c55e", icon: <CheckCircle2 size={12} /> },
  rejected: { label: "Non retenu", color: "#ef4444", icon: <XCircle size={12} />      },
};
const PRIO_EMOJI: Record<string, string> = { haute: "🔴", moyenne: "🟡", basse: "🟢" };

export default function ProfilPage() {
  const params = useParams();
  const pseudo = decodeURIComponent(params.pseudo as string);

  const [requests, setRequests] = useState<HistoriqueRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/historique", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const all: HistoriqueRequest[] = data.requests ?? [];
      // Filtre par pseudo (insensible à la casse)
      setRequests(all.filter(r => r.pseudo?.toLowerCase() === pseudo.toLowerCase()));
    } catch (err) {
      console.error("Erreur chargement profil:", err);
    } finally {
      setLoading(false);
    }
  }, [pseudo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === "pending").length,
    added:    requests.filter(r => r.status === "added").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };
  const addRate = counts.total ? Math.round(counts.added / counts.total * 100) : 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 100px" }}>

      {/* ─── BACK ─── */}
      <Link href="/historique" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: "0.8rem", color: "#4b5563", textDecoration: "none",
        marginBottom: 28,
      }}>
        <ChevronLeft size={14} /> Retour à l&apos;historique
      </Link>

      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Profil membre</p>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>
            {pseudo}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-gray">{counts.total} demande{counts.total !== 1 ? "s" : ""}</span>
            {counts.added > 0    && <span className="badge badge-green">{counts.added} ajouté{counts.added !== 1 ? "s" : ""}</span>}
            {counts.pending > 0  && <span className="badge badge-gold">{counts.pending} en attente</span>}
            {counts.rejected > 0 && <span className="badge badge-red">{counts.rejected} non retenu{counts.rejected !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        <PushSubscribe defaultPseudo={pseudo} />
      </div>

      {/* ─── STATS ─── */}
      {!loading && counts.total > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12, marginBottom: 32,
        }}>
          {[
            { label: "Taux d'ajout",  value: `${addRate}%`,            color: "#22c55e", icon: <Star size={16} />         },
            { label: "Ajoutés",       value: counts.added.toString(),   color: "#22c55e", icon: <CheckCircle2 size={16} /> },
            { label: "En attente",    value: counts.pending.toString(), color: "#f59e0b", icon: <Clock size={16} />        },
            { label: "Total",         value: counts.total.toString(),   color: "#6b7280", icon: <BarChart3 size={16} />    },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color }}>
                {icon}
                <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {label}
                </span>
              </div>
              <p style={{ fontSize: "1.7rem", fontWeight: 900, color: "#f9fafb" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── LISTE ─── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16,
          color: "#4b5563",
        }}>
          <p style={{ fontSize: "2rem", marginBottom: 8 }}>📭</p>
          <p style={{ fontSize: "0.9rem" }}>Aucune demande trouvée pour <strong style={{ color: "#6b7280" }}>{pseudo}</strong></p>
          <p style={{ fontSize: "0.78rem", marginTop: 6 }}>Le pseudo est sensible à la casse</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map(req => {
            const statConf  = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
            const typeColor = TYPE_COLORS[req.type] ?? "#9ca3af";
            const dateReq   = new Date(req.requestedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
            const dateAdd   = req.addedAt ? new Date(req.addedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;

            return (
              <div key={req.id} style={{
                borderRadius: 14, overflow: "hidden", position: "relative",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${
                  req.status === "added"    ? "rgba(34,197,94,0.2)"  :
                  req.status === "rejected" ? "rgba(239,68,68,0.15)" :
                  "rgba(255,255,255,0.07)"
                }`,
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: typeColor }} />
                <div style={{ padding: "14px 16px 14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#f9fafb" }}>
                        {req.titre}
                        {req.annee && <span style={{ color: "#4b5563", fontWeight: 400, fontSize: "0.78rem", marginLeft: 6 }}>({req.annee})</span>}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4, fontSize: "0.7rem", color: "#6b7280" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: typeColor }}>
                          {TYPE_ICONS[req.type]} {TYPE_LABELS[req.type] ?? req.type}
                        </span>
                        <span>{PRIO_EMOJI[req.priorite]}</span>
                        {req.genres && req.genres.length > 0 && <span>{req.genres.slice(0, 2).join(" · ")}</span>}
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Calendar size={10} /> {dateReq}
                        </span>
                        {req.status === "added" && dateAdd && (
                          <span style={{ color: "#22c55e" }}>✅ Ajouté le {dateAdd}</span>
                        )}
                      </div>
                      {req.note && req.note !== "Détecté automatiquement dans la bibliothèque Plex" && (
                        <div style={{ fontSize: "0.72rem", color: "#4b5563", marginTop: 6, fontStyle: "italic" }}>
                          📝 {req.note}
                        </div>
                      )}
                    </div>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                      fontSize: "0.7rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                      background: `${statConf.color}15`,
                      border: `1px solid ${statConf.color}30`,
                      color: statConf.color,
                    }}>
                      {statConf.icon} {statConf.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CTA ─── */}
      {!loading && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link href="/demande" style={{ textDecoration: "none" }}>
            <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Film size={14} /> Nouvelle demande
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
