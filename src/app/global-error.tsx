"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ background: "#080808", color: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: "2rem" }}>💥</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Erreur critique</h2>
        <button onClick={reset} style={{ padding: "8px 20px", borderRadius: 8, cursor: "pointer", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#ef4444", fontWeight: 600 }}>
          Relancer
        </button>
      </body>
    </html>
  );
}
