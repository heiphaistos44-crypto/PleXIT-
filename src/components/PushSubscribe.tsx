"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

type SubState = "unknown" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export default function PushSubscribe({ defaultPseudo = "" }: { defaultPseudo?: string }) {
  const [state,   setState]   = useState<SubState>("unknown");
  const [pseudo,  setPseudo]  = useState(defaultPseudo);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? "subscribed" : "unsubscribed");
      });
    }).catch(() => setState("unsubscribed"));
  }, []);

  const subscribe = async () => {
    if (!pseudo.trim()) { setMsg("Entre ton pseudo Discord d'abord"); return; }
    setLoading(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); setMsg("Permission refusée par le navigateur"); setLoading(false); return; }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const res = await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pseudo: pseudo.trim(), subscription: sub }),
      });
      if (!res.ok) throw new Error("Erreur serveur");

      setState("subscribed");
      setMsg("✅ Notifications activées !");
      setOpen(false);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
      setMsg("🔕 Notifications désactivées");
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (state === "unsupported" || state === "unknown") return null;

  return (
    <div style={{ position: "relative" }}>
      {/* Bouton principal */}
      {state === "subscribed" ? (
        <button
          onClick={unsubscribe}
          disabled={loading}
          title="Désactiver les notifications"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 9, cursor: "pointer",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "#22c55e", fontSize: "0.78rem", fontWeight: 600,
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Bell size={13} fill="#22c55e" /> Notifié
        </button>
      ) : state === "denied" ? (
        <span style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 12px", borderRadius: 9,
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.15)",
          color: "#4b5563", fontSize: "0.75rem",
        }} title="Autorise les notifications dans les paramètres de ton navigateur">
          <BellOff size={13} /> Bloqué
        </span>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 9, cursor: "pointer",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#9ca3af", fontSize: "0.78rem", fontWeight: 600,
          }}
        >
          <Bell size={13} /> Notifications
        </button>
      )}

      {/* Feedback flottant */}
      {msg && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          padding: "8px 14px", borderRadius: 9, whiteSpace: "nowrap",
          fontSize: "0.78rem", fontWeight: 600,
          background: msg.startsWith("✅") ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.startsWith("✅") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
          color: msg.startsWith("✅") ? "#22c55e" : "#ef4444",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {msg}
        </div>
      )}

      {/* Panneau de saisie pseudo */}
      {open && state === "unsubscribed" && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
          padding: "16px", borderRadius: 12, width: 280,
          background: "rgba(18,18,18,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "#f9fafb", display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={14} /> Activer les notifications
            </span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#4b5563", marginBottom: 12, lineHeight: 1.5 }}>
            Reçois une notification dès que ta demande est traitée.
          </p>
          <input
            placeholder="Ton pseudo Discord"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && subscribe()}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "8px 10px",
              color: "#f9fafb", fontSize: "0.82rem",
              outline: "none", marginBottom: 10,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={subscribe}
            disabled={loading || !pseudo.trim()}
            style={{
              width: "100%", padding: "9px",
              borderRadius: 8, cursor: "pointer",
              background: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "#ef4444", fontWeight: 700, fontSize: "0.82rem",
              opacity: (loading || !pseudo.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? "Activation…" : "🔔 Activer"}
          </button>
        </div>
      )}
    </div>
  );
}
