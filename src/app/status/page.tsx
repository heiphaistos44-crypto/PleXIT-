"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Shield, CheckCircle2, XCircle, AlertTriangle, Zap, Users, MonitorPlay } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface StatusData {
  maintenance:  boolean;
  message:      string;
  updatedAt:    string;
  plex: {
    online:  boolean;
    latency: number;
  };
  serverTime: string;
}

interface SessionsData {
  total:    number;
  sessions: { state: string }[];
}

// ─── Indicateur de latence ────────────────────────────────────
function LatencyBadge({ ms }: { ms: number }) {
  if (ms < 0) return null;
  const color = ms < 150 ? "#22c55e" : ms < 400 ? "#f59e0b" : "#ef4444";
  const label = ms < 150 ? "Excellent" : ms < 400 ? "Correct" : "Lent";
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      background: `${color}15`, border: `1px solid ${color}30`, color,
    }}>
      {ms} ms · {label}
    </span>
  );
}

// ─── Ligne de service ─────────────────────────────────────────
function ServiceRow({
  label, description, online, latency, icon,
}: {
  label:       string;
  description: string;
  online:      boolean;
  latency?:    number;
  icon:        React.ReactNode;
}) {
  const color = online ? "#22c55e" : "#ef4444";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "18px 20px", borderRadius: 14,
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${online ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
    }}>
      {/* Icône service */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `${color}12`,
        border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>
        {icon}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#f9fafb", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: "0.74rem", color: "#4b5563" }}>
          {description}
        </div>
      </div>

      {/* Badge latence */}
      {latency !== undefined && online && <LatencyBadge ms={latency} />}

      {/* Statut */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: color,
          boxShadow: online ? `0 0 8px ${color}` : "none",
          animation: online ? "pulse 2s ease-in-out infinite" : "none",
        }} />
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color }}>
          {online ? "En ligne" : "Hors ligne"}
        </span>
      </div>
    </div>
  );
}

// ─── Panneau admin intégré ────────────────────────────────────
function AdminPanel({ onUpdate }: { onUpdate: () => void }) {
  const [open,        setOpen]        = useState(false);
  const [pin,         setPin]         = useState("");
  const [message,     setMessage]     = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [feedback,    setFeedback]    = useState<string | null>(null);

  const handleToggle = async (maint: boolean) => {
    if (!pin.trim()) { setFeedback("❌ PIN requis"); return; }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/status", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin, maintenance: maint, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setFeedback(`✅ ${maint ? "Maintenance activée" : "Serveur remis en ligne"}`);
      setMaintenance(maint);
      onUpdate();
    } catch (err: unknown) {
      setFeedback(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 9, cursor: "pointer",
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
          color: "#8b5cf6", fontSize: "0.78rem", fontWeight: 600,
        }}
      >
        <Shield size={13} /> Admin
      </button>
    );
  }

  return (
    <div style={{
      padding: "20px", borderRadius: 14,
      background: "rgba(139,92,246,0.04)",
      border: "1px solid rgba(139,92,246,0.15)",
      marginTop: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={15} /> Contrôle admin
        </span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: "1rem" }}>✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN admin"
          value={pin}
          onChange={e => setPin(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 12px",
            color: "#f9fafb", fontSize: "0.84rem",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <textarea
          placeholder="Message de maintenance (optionnel)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={2}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 12px",
            color: "#f9fafb", fontSize: "0.82rem",
            resize: "vertical", fontFamily: "inherit",
            outline: "none",
          }}
        />

        {feedback && (
          <div style={{
            fontSize: "0.76rem", padding: "6px 10px", borderRadius: 7,
            background: feedback.startsWith("✅") ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            color: feedback.startsWith("✅") ? "#22c55e" : "#ef4444",
          }}>
            {feedback}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleToggle(true)}
            disabled={loading || maintenance}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#f59e0b", fontSize: "0.78rem", fontWeight: 700,
              opacity: (loading || maintenance) ? 0.4 : 1,
            }}
          >
            ⚠️ Activer maintenance
          </button>
          <button
            onClick={() => handleToggle(false)}
            disabled={loading || !maintenance}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
              color: "#22c55e", fontSize: "0.78rem", fontWeight: 700,
              opacity: (loading || !maintenance) ? 0.4 : 1,
            }}
          >
            ✅ Remettre en ligne
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────
export default function StatusPage() {
  const [data,           setData]           = useState<StatusData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [lastCheck,      setLastCheck]      = useState<Date | null>(null);
  const [sessionsData,   setSessionsData]   = useState<SessionsData | null>(null);
  const [sessLoading,    setSessLoading]    = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StatusData = await res.json();
      setData(json);
      setLastCheck(new Date());
    } catch {
      // Laisse l'état précédent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const res = await fetch("/api/plex/sessions", { cache: "no-store" });
      if (!res.ok) return;
      const json: SessionsData = await res.json();
      setSessionsData(json);
    } catch {
      // ignore
    } finally {
      setSessLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSessions();
    const id = setInterval(() => { fetchStatus(); fetchSessions(); }, 30_000); // refresh 30s
    return () => clearInterval(id);
  }, [fetchStatus, fetchSessions]);

  const siteOnline = !data?.maintenance;
  const plexOnline = data?.plex.online ?? false;
  const allGood    = siteOnline && plexOnline;

  const globalColor = data?.maintenance
    ? "#f59e0b"
    : allGood ? "#22c55e" : "#ef4444";

  const globalLabel = data?.maintenance
    ? "Maintenance"
    : allGood ? "Tous les systèmes opérationnels" : "Dégradé";

  const globalIcon = data?.maintenance
    ? <AlertTriangle size={28} />
    : allGood ? <CheckCircle2 size={28} /> : <XCircle size={28} />;

  const updatedStr = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 100px" }}>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 40 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>État du serveur</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
            Statut
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {lastCheck && (
              <span style={{ fontSize: "0.72rem", color: "#4b5563" }}>
                Vérifié à {lastCheck.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <button
              onClick={fetchStatus}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 9, cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b7280", fontSize: "0.8rem",
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── BANDEAU GLOBAL ─── */}
      <div style={{
        padding: "28px 28px", borderRadius: 18, marginBottom: 32,
        background: `${globalColor}08`,
        border: `1px solid ${globalColor}25`,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, flexShrink: 0,
          background: `${globalColor}12`, border: `1px solid ${globalColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: globalColor,
        }}>
          {loading
            ? <RefreshCw size={26} style={{ animation: "spin 0.8s linear infinite" }} />
            : globalIcon
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1.2rem", color: globalColor, marginBottom: 4 }}>
            {loading ? "Vérification en cours…" : globalLabel}
          </div>
          {data?.maintenance && (
            <div style={{ fontSize: "0.84rem", color: "#d97706" }}>
              {data.message}
            </div>
          )}
          {!data?.maintenance && !loading && (
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              Tous les services fonctionnent normalement.
            </div>
          )}
          {updatedStr && (
            <div style={{ fontSize: "0.72rem", color: "#374151", marginTop: 8 }}>
              Dernière mise à jour : {updatedStr}
            </div>
          )}
        </div>
      </div>

      {/* ─── ACTIVITÉ EN DIRECT ─── */}
      {(() => {
        const total   = sessionsData?.total ?? 0;
        const playing = sessionsData?.sessions.filter(s => s.state === "playing").length ?? 0;
        const paused  = sessionsData?.sessions.filter(s => s.state === "paused").length ?? 0;
        const isOnline = data?.plex.online ?? false;

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {/* Membres en ligne (sessions actives) */}
            <div style={{
              padding: "20px 22px", borderRadius: 14,
              background: total > 0 ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
              border: total > 0 ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Users size={15} color={total > 0 ? "#22c55e" : "#4b5563"} />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#4b5563" }}>
                  En ligne
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: total > 0 ? "#22c55e" : "#6b7280", lineHeight: 1 }}>
                {sessLoading ? "—" : total}
              </div>
              <div style={{ fontSize: "0.73rem", color: "#4b5563", marginTop: 6 }}>
                {sessLoading
                  ? "Chargement…"
                  : total === 0
                    ? "Aucune lecture en cours"
                    : `membre${total > 1 ? "s" : ""} en train de regarder`
                }
              </div>
            </div>

            {/* Détail lecture / pause */}
            <div style={{
              padding: "20px 22px", borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MonitorPlay size={15} color="#6b7280" />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#4b5563" }}>
                  Hors ligne
                </span>
              </div>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#6b7280", lineHeight: 1 }}>
                {sessLoading ? "—" : (isOnline ? "∞" : "—")}
              </div>
              <div style={{ fontSize: "0.73rem", color: "#4b5563", marginTop: 6 }}>
                {sessLoading
                  ? "Chargement…"
                  : !isOnline
                    ? "Serveur inaccessible"
                    : playing > 0 || paused > 0
                      ? `${playing} en lecture · ${paused} en pause`
                      : "Tous les membres sont libres"
                }
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── SERVICES ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        <ServiceRow
          label="PleXIT"
          description="Application web · Demandes, Bibliothèque, Forum, Historique"
          online={!data?.maintenance}
          icon={
            <span style={{ fontWeight: 900, fontSize: "0.9rem", fontStyle: "italic" }}>P</span>
          }
        />
        <ServiceRow
          label="Serveur Plex"
          description="Streaming vidéo · Bibliothèque multimédia · Sessions actives"
          online={plexOnline}
          latency={data?.plex.latency}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.5 2.1L9 7.6 4.5 3.1 3 4.6l4.5 4.5L3 13.6l1.5 1.5 4.5-4.5 5.5 5.5 1.5-1.5-5.5-5.5 5.5-5.5-1.5-1.5z M21 3.6L19.5 2.1 14 7.6l1.5 1.5L21 3.6z"/>
            </svg>
          }
        />
        <ServiceRow
          label="API"
          description="Webhooks Discord · Endpoints données · Proxy images Plex"
          online={!loading && data !== null}
          icon={<Zap size={18} />}
        />
      </div>

      {/* ─── HISTORIQUE INCIDENTS (placeholder) ─── */}
      <div style={{
        padding: "20px", borderRadius: 14, marginBottom: 32,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#9ca3af", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} color="#22c55e" />
          Historique des 30 derniers jours
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 28, borderRadius: 4,
                background: i === 12 ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.35)",
              }}
              title={i === 12 ? "Maintenance planifiée" : "Opérationnel"}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#374151" }}>
          <span>Il y a 30 jours</span>
          <span style={{ color: "#22c55e", fontWeight: 600 }}>100% uptime (hors maintenances)</span>
          <span>Aujourd&apos;hui</span>
        </div>
      </div>

      {/* ─── ADMIN PANEL ─── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <AdminPanel onUpdate={fetchStatus} />
      </div>

      {/* ─── LIENS ─── */}
      <div style={{
        marginTop: 40, paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap",
      }}>
        {[
          { href: "/",           label: "← Accueil"      },
          { href: "/demande",    label: "Faire une demande" },
          { href: "/historique", label: "Historique"     },
        ].map(({ href, label }) => (
          <Link key={href} href={href} style={{
            fontSize: "0.8rem", color: "#4b5563", textDecoration: "none",
            transition: "color 0.15s",
          }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
