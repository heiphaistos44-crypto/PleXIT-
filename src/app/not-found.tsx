import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", flexDirection: "column", gap: 16, padding: "0 24px",
    }}>
      <p style={{ fontSize: "3rem", fontWeight: 900, color: "rgba(220,38,38,0.4)" }}>404</p>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f9fafb" }}>Page introuvable</h2>
      <p style={{ fontSize: "0.85rem", color: "#4b5563" }}>Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" style={{
        padding: "8px 20px", borderRadius: 8,
        background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
        color: "#ef4444", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none",
      }}>
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}
