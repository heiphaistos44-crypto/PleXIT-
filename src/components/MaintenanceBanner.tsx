"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState(false);
  const [message,     setMessage]     = useState("");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const res  = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setMaintenance(data.maintenance ?? false);
          setMessage(data.message ?? "");
        }
      } catch {
        // silencieux
      }
    };

    check();
    const id = setInterval(check, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!maintenance) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid rgba(245,158,11,0.4)",
      padding: "10px 24px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <AlertTriangle size={15} style={{ color: "#1c1917", flexShrink: 0 }} />
      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1c1917", textAlign: "center" }}>
        🔧 Maintenance en cours —{" "}
        {message || "Le service est temporairement indisponible. Revenez bientôt !"}
      </span>
    </div>
  );
}
