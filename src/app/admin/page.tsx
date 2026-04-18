"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, LogOut, RefreshCw, Film, Tv, Music,
  Clapperboard, Clock, CheckCircle2, XCircle,
  ChevronRight, Send, Trash2, X, Check, BarChart3,
  Calendar, Star, Filter, Bell, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface AdminRequest {
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
  status:      "pending" | "added" | "rejected" | "not_found";
  addedAt?:    string;
  note?:       string;
}

// ─── Config ───────────────────────────────────────────────────
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

const PRIO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  haute:   { label: "Haute",   color: "#ef4444", emoji: "🔴" },
  moyenne: { label: "Moyenne", color: "#f59e0b", emoji: "🟡" },
  basse:   { label: "Basse",   color: "#22c55e", emoji: "🟢" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "En attente",  color: "#f59e0b", icon: <Clock size={12} />       },
  added:     { label: "Ajouté",      color: "#22c55e", icon: <CheckCircle2 size={12} /> },
  rejected:  { label: "Non retenu",  color: "#ef4444", icon: <XCircle size={12} />     },
  not_found: { label: "Non trouvé",  color: "#3b82f6", icon: <Search size={12} />      },
};

// ─── Composant carte demande admin ────────────────────────────
function AdminCard({
  req,
  pin,
  onUpdate,
}: {
  req:      AdminRequest;
  pin:      string;
  onUpdate: (id: string, status: "pending" | "added" | "rejected" | "not_found", note?: string) => void;
}) {
  const [note,       setNote]       = useState(req.note ?? "");
  const [sending,    setSending]    = useState(false);
  const [feedback,   setFeedback]   = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const typeColor  = TYPE_COLORS[req.type]    ?? "#9ca3af";
  const statConf   = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const prioConf   = PRIO_CONFIG[req.priorite] ?? PRIO_CONFIG.moyenne;
  const shortId    = req.id.split("-")[0].toUpperCase();

  const sendReply = async (status: "added" | "rejected" | "pending" | "not_found") => {
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/reply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin, requestId: req.id, status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setFeedback(data.discordError ? "✅ Statut sauvegardé (Discord injoignable)" : "✅ Envoyé sur Discord !");
      onUpdate(req.id, status as "pending" | "added" | "rejected" | "not_found", note || undefined);
    } catch (err: unknown) {
      setFeedback(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setSending(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/historique/${req.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onUpdate(req.id, req.status, "__deleted__");
    } catch (err) {
      console.error("Erreur suppression:", err);
      setConfirmDel(false);
    } finally {
      setDeleting(false);
    }
  };

  const dateReq = new Date(req.requestedAt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${
        req.status === "added"    ? "rgba(34,197,94,0.25)"  :
        req.status === "rejected" ? "rgba(239,68,68,0.18)"  :
        "rgba(255,255,255,0.08)"
      }`,
      position: "relative",
    }}>
      {/* Bande colorée gauche */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: typeColor }} />

      {/* Header cliquable */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: "14px 14px 14px 20px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        {/* Infos principales */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#f9fafb" }}>
              {req.titre}
            </span>
            {req.annee && (
              <span style={{ color: "#4b5563", fontSize: "0.78rem" }}>({req.annee})</span>
            )}
            <span style={{
              fontSize: "0.65rem", fontWeight: 700,
              padding: "2px 7px", borderRadius: 999,
              background: `${statConf.color}18`,
              border: `1px solid ${statConf.color}30`,
              color: statConf.color,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {statConf.icon} {statConf.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: "0.7rem", color: "#6b7280" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: typeColor }}>
              {TYPE_ICONS[req.type]} {TYPE_LABELS[req.type] ?? req.type}
            </span>
            <span>{prioConf.emoji} {prioConf.label}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={10} /> {dateReq}
            </span>
            <span>👤 {req.pseudo}</span>
            <span style={{ fontSize: "0.62rem", color: "#374151", fontFamily: "monospace" }}>#{shortId}</span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          size={16}
          style={{
            color: "#4b5563", flexShrink: 0,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Panneau expandé */}
      {expanded && (
        <div style={{
          padding: "0 14px 14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {/* Détails */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12,
            fontSize: "0.72rem", color: "#6b7280", paddingTop: 12, marginBottom: 14,
          }}>
            {req.genres && req.genres.length > 0 && (
              <span>🎭 {req.genres.join(", ")}</span>
            )}
            {req.langue && <span>🌐 {req.langue.toUpperCase()}</span>}
            {req.qualite && <span>🎞️ {req.qualite}</span>}
            {req.saisons && <span>🗂️ {req.saisons}</span>}
          </div>

          {/* Commentaire utilisateur */}
          {req.commentaire && (
            <div style={{
              fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic",
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.025)",
              marginBottom: 14,
            }}>
              💬 « {req.commentaire} »
            </div>
          )}

          {/* Zone note admin */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: "0.72rem", color: "#9ca3af", display: "block", marginBottom: 6 }}>
              📝 Note admin (optionnel — envoyée sur Discord)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Disponible sur Plex depuis le 01/04 · Qualité 1080p ajoutée..."
              rows={2}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px",
                color: "#f9fafb", fontSize: "0.78rem",
                resize: "vertical", fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{
              fontSize: "0.75rem", padding: "6px 10px", borderRadius: 8,
              marginBottom: 10,
              background: feedback.startsWith("✅") ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border:     feedback.startsWith("✅") ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
              color:      feedback.startsWith("✅") ? "#22c55e" : "#ef4444",
            }}>
              {feedback}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {req.status !== "added" && (
              <button
                onClick={() => sendReply("added")}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer",
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e", fontSize: "0.73rem", fontWeight: 700,
                  opacity: sending ? 0.5 : 1,
                }}
              >
                <Check size={12} /> Marquer Ajouté + Notifier Discord
              </button>
            )}
            {req.status !== "rejected" && (
              <button
                onClick={() => sendReply("rejected")}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer",
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
                  color: "#ef4444", fontSize: "0.73rem", fontWeight: 700,
                  opacity: sending ? 0.5 : 1,
                }}
              >
                <X size={12} /> Non retenu + Notifier Discord
              </button>
            )}
            {req.status !== "pending" && (
              <button
                onClick={() => sendReply("pending")}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer",
                  background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)",
                  color: "#f59e0b", fontSize: "0.73rem", fontWeight: 700,
                  opacity: sending ? 0.5 : 1,
                }}
              >
                <Clock size={12} /> Remettre en attente
              </button>
            )}
            {req.status !== "not_found" && (
              <button
                onClick={() => sendReply("not_found")}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer",
                  background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)",
                  color: "#3b82f6", fontSize: "0.73rem", fontWeight: 700,
                  opacity: sending ? 0.5 : 1,
                }}
              >
                <Search size={12} /> Non trouvé
              </button>
            )}
            {/* Bouton juste envoyer note sans changer statut */}
            <button
              onClick={() => sendReply(req.status as "added" | "rejected" | "pending" | "not_found")}
              disabled={sending || !note.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                cursor: (sending || !note.trim()) ? "not-allowed" : "pointer",
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
                color: "#8b5cf6", fontSize: "0.73rem", fontWeight: 700,
                opacity: (sending || !note.trim()) ? 0.4 : 1,
              }}
            >
              <Send size={11} /> Envoyer note
            </button>

            {/* Supprimer */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                background: confirmDel ? "rgba(239,68,68,0.12)" : "transparent",
                border: `1px solid ${confirmDel ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: confirmDel ? "#ef4444" : "#374151", fontSize: "0.73rem", fontWeight: 600,
                marginLeft: "auto", opacity: deleting ? 0.5 : 1,
              }}
              onBlur={() => setConfirmDel(false)}
              title={confirmDel ? "Cliquer à nouveau pour confirmer" : "Supprimer définitivement"}
            >
              <Trash2 size={11} /> {confirmDel ? "Confirmer ?" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Écran de login ───────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (pin: string) => void }) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "PIN incorrect");
        setPin("");
      } else {
        onLogin(pin);
      }
    } catch {
      setError("Impossible de vérifier le PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#080808",
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "40px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Shield size={26} style={{ color: "#8b5cf6" }} />
        </div>

        <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f9fafb", marginBottom: 8 }}>
          Administration
        </h1>
        <p style={{ fontSize: "0.82rem", color: "#4b5563", marginBottom: 28 }}>
          Entrez votre PIN pour accéder au tableau de bord
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="text"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Mot de passe admin"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "12px 16px",
              color: "#f9fafb", fontSize: "1.2rem",
              textAlign: "center", letterSpacing: "0.3em",
              outline: "none", marginBottom: 12,
              fontFamily: "monospace",
            }}
          />

          {error && (
            <p style={{ fontSize: "0.78rem", color: "#ef4444", marginBottom: 10 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            style={{
              width: "100%", padding: "12px",
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.35)",
              borderRadius: 10, color: "#a78bfa",
              fontWeight: 700, fontSize: "0.88rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: (loading || !pin.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? "Vérification..." : "Accéder →"}
          </button>
        </form>

        <Link href="/" style={{
          display: "block", marginTop: 20,
          fontSize: "0.76rem", color: "#374151", textDecoration: "none",
        }}>
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

// ─── Dashboard admin ──────────────────────────────────────────
function Dashboard({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const [requests,     setRequests]     = useState<AdminRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "added" | "rejected" | "not_found">("all");
  const [filterType,   setFilterType]   = useState("all");
  const [search,       setSearch]       = useState("");
  const [remindState,  setRemindState]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [remindMsg,    setRemindMsg]    = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/historique", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch (err) {
      console.error("Erreur chargement admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemind = async () => {
    setRemindState("loading");
    setRemindMsg(null);
    try {
      const res = await fetch("/api/admin/remind", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setRemindState("success");
      setRemindMsg(
        data.count === 0
          ? "Aucune demande en attente"
          : `✅ Rappel envoyé — ${data.count} demande${data.count > 1 ? "s" : ""} en attente`
      );
    } catch (err: unknown) {
      setRemindState("error");
      setRemindMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setTimeout(() => { setRemindState("idle"); setRemindMsg(null); }, 4000);
    }
  };

  const handleUpdate = (id: string, status: "pending" | "added" | "rejected" | "not_found", note?: string) => {
    if (note === "__deleted__") {
      setRequests(prev => prev.filter(r => r.id !== id));
      return;
    }
    setRequests(prev => prev.map(r =>
      r.id === id
        ? { ...r, status, note: note ?? r.note, addedAt: status === "added" ? new Date().toISOString() : r.addedAt }
        : r
    ));
  };

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

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status === "pending").length,
    added:     requests.filter(r => r.status === "added").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
    not_found: requests.filter(r => r.status === "not_found").length,
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 100px" }}>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={18} style={{ color: "#8b5cf6" }} />
          </div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "#6b7280", textTransform: "uppercase" }}>
            Tableau de bord Admin
          </p>
          <button
            onClick={onLogout}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "#4b5563", fontSize: "0.73rem", cursor: "pointer",
            }}
          >
            <LogOut size={12} /> Déconnexion
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 12 }}>
              Gestion des demandes
            </h1>
            {/* Stats rapides */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "all",       label: "Total",        color: "#6b7280" },
                { key: "pending",   label: "En attente",   color: "#f59e0b" },
                { key: "added",     label: "Ajoutés",      color: "#22c55e" },
                { key: "rejected",  label: "Non retenus",  color: "#ef4444" },
                { key: "not_found", label: "Non trouvés",  color: "#3b82f6" },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key as typeof filterStatus)}
                  style={{
                    padding: "4px 12px", borderRadius: 999, cursor: "pointer",
                    background: filterStatus === key ? `${color}20` : "transparent",
                    border: `1px solid ${filterStatus === key ? `${color}40` : "rgba(255,255,255,0.08)"}`,
                    color: filterStatus === key ? color : "#4b5563",
                    fontSize: "0.73rem", fontWeight: 700, transition: "all 0.15s",
                  }}
                >
                  {counts[key as keyof typeof counts]} {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/historique" style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#6b7280", fontSize: "0.8rem", fontWeight: 600,
                }}>
                  <BarChart3 size={13} /> Vue publique
                </button>
              </Link>
              <button
                onClick={handleRemind}
                disabled={remindState === "loading"}
                title="Envoyer un rappel Discord des demandes en attente"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 14px", borderRadius: 10, cursor: remindState === "loading" ? "not-allowed" : "pointer",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                  color: "#f59e0b", fontSize: "0.8rem", fontWeight: 600,
                  opacity: remindState === "loading" ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                <Bell size={13} style={{ animation: remindState === "loading" ? "spin 0.7s linear infinite" : "none" }} />
                📋 Rappel Discord
              </button>
              <button onClick={fetchData} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b7280", fontSize: "0.8rem",
              }}>
                <RefreshCw size={13} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
              </button>
            </div>
            {/* Feedback rappel */}
            {remindMsg && (
              <span style={{
                fontSize: "0.73rem", padding: "4px 10px", borderRadius: 8,
                background: remindState === "success" || remindMsg.startsWith("Aucune")
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
                border: remindState === "success" || remindMsg.startsWith("Aucune")
                  ? "1px solid rgba(34,197,94,0.2)"
                  : "1px solid rgba(239,68,68,0.2)",
                color: remindState === "success" || remindMsg.startsWith("Aucune") ? "#22c55e" : "#ef4444",
              }}>
                {remindMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── FILTRES ─── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          placeholder="🔍 Titre ou pseudo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 14px",
            color: "#f9fafb", fontSize: "0.84rem",
            outline: "none", fontFamily: "inherit",
          }}
        />

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 14px",
            color: filterType !== "all" ? "#f9fafb" : "#6b7280",
            fontSize: "0.84rem", cursor: "pointer",
            outline: "none", fontFamily: "inherit",
          }}
        >
          <option value="all">Tous types</option>
          <option value="film">Films</option>
          <option value="serie">Séries</option>
          <option value="anime">Animés</option>
          <option value="dessin_anime">Dessins Animés</option>
          <option value="musique">Artiste Musical</option>
        </select>

        {(search || filterType !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "#4b5563", fontSize: "0.8rem",
            }}
          >
            <Filter size={12} /> Effacer filtres
          </button>
        )}
      </div>

      {/* ─── STATS RAPIDES ─── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: "Taux d'ajout",      value: counts.all ? `${Math.round(counts.added / counts.all * 100)}%` : "—", color: "#22c55e", icon: <Star size={16} /> },
          { label: "En attente",        value: counts.pending.toString(),  color: "#f59e0b", icon: <Clock size={16} /> },
          { label: "Ajoutés ce mois",   value: requests.filter(r => r.status === "added" && r.addedAt && new Date(r.addedAt).getMonth() === new Date().getMonth()).length.toString(), color: "#22c55e", icon: <CheckCircle2 size={16} /> },
          { label: "Demandes totales",  value: counts.all.toString(),      color: "#6b7280", icon: <BarChart3 size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f9fafb" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ─── LISTE ─── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563", fontSize: "0.88rem" }}>
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 0",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16, color: "#4b5563",
        }}>
          <p style={{ fontSize: "1.4rem", marginBottom: 8 }}>📭</p>
          <p style={{ fontSize: "0.88rem" }}>Aucune demande correspondante</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(req => (
            <AdminCard key={req.id} req={req} pin={pin} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page export default ───────────────────────────────────────
export default function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);

  const handleLogin = (p: string) => {
    setPin(p);
  };

  const handleLogout = () => {
    setPin(null);
  };

  if (!pin) return <LoginScreen onLogin={handleLogin} />;

  return <Dashboard pin={pin} onLogout={handleLogout} />;
}
