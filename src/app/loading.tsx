export default function Loading() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "3px solid rgba(220,38,38,0.2)",
        borderTopColor: "#dc2626",
        animation: "spin 0.7s linear infinite",
      }} />
      <p style={{ color: "#4b5563", fontSize: "0.85rem" }}>Chargement…</p>
    </div>
  );
}
