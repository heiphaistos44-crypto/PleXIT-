"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Film, Tv, Music, Clock, CheckCircle2, XCircle,
  RefreshCw, Filter, ChevronRight, Clapperboard,
  Star, Calendar,
} from "lucide-react";
import PushSubscribe from "@/components/PushSubscribe";

// ─── Types ────────────────────────────────────────────────────
interface HistoriqueRequest {
  id:          string;
  type:        string;
  titre:       string;
  annee?:      string;
  genres?:     string[];
  langue?:     string;
  qualite?:    string;
  saisons?:    string;
  pseudo:      string;
  commentaire?: string;
  priorite:    string;
  requestedAt: string;
  status:      "pending" | "added" | "rejected";
  addedAt?:    string;
  note?:       string;
}

type FilterStatus = "all" | "pending" | "added" | "rejected";
type FilterType   = "all" | "film" | "serie" | "anime" | "dessin_anime" | "musique";

// ─── Config ───────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  film:         "Film",
  serie:        "Série",
  anime:        "Animé / Manga",
  dessin_anime: "Dessin Animé",
  musique:      "Artiste Musical",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  film:         <Film size={14} />,
  serie:        <Tv size={14} />,
  anime:        <span style={{ fontSize: 14 }}>⛩️</span>,
  dessin_anime: <Clapperboard size={14} />,
  musique:      <Music size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  film:         "#ef4444",
  serie:        "#8b5cf6",
  anime:        "#f59e0b",
  dessin_anime: "#06b6d4",
  musique:      "#22c55e",
};

const PRIORITE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  haute:   { label: "Haute",   color: "#ef4444", emoji: "🔴" },
  moyenne: { label: "Moyenne", color: "#f59e0b", emoji: "🟡" },
  basse:   { label: "Basse",   color: "#22c55e", emoji: "🟢" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "En attente",  color: "#f59e0b", icon: <Clock size={13} />         },
  added:    { label: "Ajouté",      color: "#22c55e", icon: <CheckCircle2 size={13} />   },
  rejected: { label: "Non retenu",  color: "#ef4444", icon: <XCircle size={13} />       },
};

// ─── Carte de demande ─────────────────────────────────────────
function RequestCard({
  req,
}: {
  req: HistoriqueRequest;
}) {
  const typeColor  = TYPE_COLORS[req.type]  ?? "#9ca3af";
  const statConf   = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const prioConf   = PRIORITE_LABELS[req.priorite] ?? PRIORITE_LABELS.moyenne;

  const dateReq = new Date(req.requestedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const dateAdd = req.addedAt
    ? new Date(req.addedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${req.status === "added" ? "rgba(34,197,94,0.2)" : req.status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
      transition: "border-color 0.2s",
      position: "relative",
    }}>
      {/* Bande colorée à gauche */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: typeColor }} />

      <div style={{ padding: "16px 16px 16px 20px" }}>
        {/* Ligne 1 : titre + status */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f9fafb", lineHeight: 1.3, marginBottom: 2 }}>
              {req.titre}
              {req.annee && <span style={{ color: "#6b7280", fontWeight: 400, fontSize: "0.82rem", marginLeft: 6 }}>({req.annee})</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Type */}
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: typeColor, fontWeight: 600 }}>
                {TYPE_ICONS[req.type]} {TYPE_LABELS[req.type] ?? req.type}
              </span>
              {/* Priorité */}
              <span style={{ fontSize: "0.7rem", color: prioConf.color }}>
                {prioConf.emoji} {prioConf.label}
              </span>
              {/* Genres */}
              {req.genres && req.genres.length > 0 && (
                <span style={{ fontSize: "0.68rem", color: "#4b5563" }}>
                  {req.genres.slice(0, 2).join(" · ")}
                </span>
              )}
            </div>
          </div>

          {/* Badge status */}
          <span style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: `${statConf.color}15`, border: `1px solid ${statConf.color}35`, color: statConf.color,
          }}>
            {statConf.icon} {statConf.label}
          </span>
        </div>

        {/* Ligne 2 : méta */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: "0.72rem", color: "#4b5563", marginBottom: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} /> {dateReq}
          </span>
          <Link href={`/profil/${encodeURIComponent(req.pseudo)}`} style={{
            display: "flex", alignItems: "center", gap: 4,
            color: "#4b5563", textDecoration: "none",
            transition: "color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4b5563")}
          >
            🎭 {req.pseudo}
          </Link>
          {req.saisons && <span>📁 {req.saisons}</span>}
          {req.qualite && <span style={{ color: "#6b7280" }}>{req.qualite}</span>}
          {req.langue && <span style={{ color: "#6b7280" }}>{req.langue.toUpperCase()}</span>}
        </div>

        {/* Si ajouté — date */}
        {req.status === "added" && dateAdd && (
          <div style={{
            fontSize: "0.72rem", color: "#22c55e", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <CheckCircle2 size={11} /> Ajouté le {dateAdd}
            {req.note && req.note !== "Détecté automatiquement dans la bibliothèque Plex"
              && <span style={{ color: "#4b5563", marginLeft: 4 }}>· {req.note}</span>}
            {req.note === "Détecté automatiquement dans la bibliothèque Plex"
              && <span style={{ color: "#374151", marginLeft: 4 }}>· Détecté automatiquement</span>}
          </div>
        )}

        {/* Commentaire */}
        {req.commentaire && (
          <div style={{
            fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic",
            padding: "6px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.02)", marginBottom: 10,
          }}>
            « {req.commentaire} »
          </div>
        )}

        {/* Pas d'actions de modification côté public — voir /admin pour la gestion */}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────
export default function HistoriquePage() {
  const [requests,     setRequests]     = useState<HistoriqueRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType,   setFilterType]   = useState<FilterType>("all");
  const [search,       setSearch]       = useState("");
  // Lecture seule côté public — pas de modification de statut ni suppression

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/historique", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtrage
  const filtered = requests.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterType   !== "all" && r.type   !== filterType)   return false;
    if (search) {
      const q = search.toLowerCase();
      return r.titre.toLowerCase().includes(q) || r.pseudo.toLowerCase().includes(q);
    }
    return true;
  });

  // Compteurs
  const countByStatus = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === "pending").length,
    added:    requests.filter(r => r.status === "added").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 100px" }}>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 36 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Historique public</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Demandes
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-gray">{countByStatus.all} Total</span>
              <span className="badge badge-gold">{countByStatus.pending} En attente</span>
              <span className="badge badge-green">{countByStatus.added} Ajoutés</span>
              <span className="badge badge-red">{countByStatus.rejected} Non retenus</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <PushSubscribe />
            <Link href="/demande" style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Film size={14} /> Nouvelle demande <ChevronRight size={13} />
              </button>
            </Link>
            <button onClick={fetchData} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#9ca3af", fontSize: "0.85rem", fontWeight: 600,
            }}>
              <RefreshCw size={14} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── FILTRES ─── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Recherche */}
        <input
          className="input-plexit"
          placeholder="🔍 Rechercher un titre ou pseudo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />

        {/* Filtre statut */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["all","pending","added","rejected"] as FilterStatus[]).map(s => {
            const ALL_STATUS: Record<string, { label: string; color: string }> = {
              all:      { label: "Tout",        color: "#9ca3af" },
              pending:  { label: "En attente",  color: "#f59e0b" },
              added:    { label: "Ajouté",      color: "#22c55e" },
              rejected: { label: "Non retenu",  color: "#ef4444" },
            };
            const conf = ALL_STATUS[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                border: `1px solid ${filterStatus === s ? conf.color : "rgba(255,255,255,0.07)"}`,
                background: filterStatus === s ? `${conf.color}12` : "rgba(255,255,255,0.02)",
                color: filterStatus === s ? conf.color : "#6b7280",
              }}>
                {conf.label}
                {" "}<span style={{ opacity: 0.7, fontSize: "0.7rem" }}>{countByStatus[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Filtre type */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setFilterType("all")} style={{
            padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
            border: `1px solid ${filterType === "all" ? "#9ca3af" : "rgba(255,255,255,0.07)"}`,
            background: filterType === "all" ? "rgba(156,163,175,0.08)" : "rgba(255,255,255,0.02)",
            color: filterType === "all" ? "#9ca3af" : "#4b5563",
          }}>
            <Filter size={12} />
          </button>
          {(["film","serie","anime","dessin_anime","musique"] as FilterType[]).map(t => {
            const color = TYPE_COLORS[t] ?? "#9ca3af";
            return (
              <button key={t} onClick={() => setFilterType(t)} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 12px", borderRadius: 9, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                border: `1px solid ${filterType === t ? color : "rgba(255,255,255,0.07)"}`,
                background: filterType === t ? `${color}12` : "rgba(255,255,255,0.02)",
                color: filterType === t ? color : "#4b5563",
              }}>
                {TYPE_ICONS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── LÉGENDE ─── */}
      <div style={{
        fontSize: "0.72rem", color: "#374151", marginBottom: 20,
        padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.01)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}>
        💡 Les statuts se mettent à jour automatiquement si le titre est détecté dans la bibliothèque Plex.
      </div>

      {/* ─── LISTE ─── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <Clock size={40} color="#1f2937" style={{ marginBottom: 16 }} />
          {requests.length === 0 ? (
            <>
              <p style={{ fontSize: "1rem", color: "#4b5563", marginBottom: 8, fontWeight: 600 }}>
                Aucune demande pour l&apos;instant
              </p>
              <p style={{ fontSize: "0.85rem", color: "#374151", marginBottom: 24 }}>
                Sois le premier à soumettre une demande !
              </p>
              <Link href="/demande">
                <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Film size={15} /> Faire une demande
                </button>
              </Link>
            </>
          ) : (
            <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
              Aucune demande ne correspond aux filtres sélectionnés.
            </p>
          )}
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.78rem", color: "#374151", marginBottom: 14 }}>
            {filtered.length} demande{filtered.length !== 1 ? "s" : ""}
            {search && ` pour "${search}"`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(req => (
              <RequestCard
                key={req.id}
                req={req}
              />
            ))}
          </div>

          {/* CTA bas de page */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/demande" style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Film size={15} /> Faire une nouvelle demande <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </>
      )}

      {/* ─── LIEN VERS BIBLIOTHEQUE ─── */}
      <div style={{ marginTop: 48, padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#9ca3af", marginBottom: 4 }}>
            Tu veux vérifier si un titre est déjà disponible ?
          </p>
          <p style={{ fontSize: "0.78rem", color: "#374151" }}>
            Consulte la bibliothèque Plex avant de faire une demande.
          </p>
        </div>
        <Link href="/bibliotheque" style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Star size={14} /> Voir la bibliothèque <ChevronRight size={13} />
          </button>
        </Link>
      </div>
    </div>
  );
}
