"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", flexDirection: "column", gap: 16, padding: "0 24px",
    }}>
      <p style={{ fontSize: "2rem" }}>⚠️</p>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f9fafb" }}>Une erreur est survenue</h2>
      <p style={{ fontSize: "0.85rem", color: "#4b5563", textAlign: "center" }}>
        {error.message || "Erreur inattendue. Réessaie."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px", borderRadius: 8, cursor: "pointer",
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
          color: "#ef4444", fontWeight: 600, fontSize: "0.85rem",
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
