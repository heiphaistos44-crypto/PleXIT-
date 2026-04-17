"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Library, Home, ExternalLink, BarChart3, ClipboardList, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(8,8,8,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 15px rgba(220,38,38,0.4)",
          }}>
            <span style={{ color: "white", fontWeight: 900, fontSize: "1rem", fontStyle: "italic" }}>P</span>
          </div>
          <span style={{
            fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.02em",
            fontStyle: "italic",
          }}>
            <span className="text-gradient-red">PleX</span>
            <span style={{ color: "#f59e0b" }}>IT</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavItem href="/" icon={<Home size={15} />} label="Accueil" active={pathname === "/"} />
          <NavItem href="/demande" icon={<Film size={15} />} label="Demande" active={pathname === "/demande"} />
          <NavItem href="/bibliotheque" icon={<Library size={15} />} label="Bibliothèque" active={pathname === "/bibliotheque"} />
          <NavItem href="/nouveautes" icon={<Sparkles size={15} />} label="Nouveautés" active={pathname === "/nouveautes"} />
          <NavItem href="/historique" icon={<ClipboardList size={15} />} label="Historique" active={pathname === "/historique"} />
          <NavItem href="/forum" icon={<BarChart3 size={15} />} label="Forum" active={pathname === "/forum"} />
          <NavItem href="/status" icon={<span style={{ fontSize: 11 }}>🟢</span>} label="Statut" active={pathname === "/status"} />
        </div>

        {/* Right side — Plex quick access */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/22B5u7R7g2"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9,
              background: "rgba(88,101,242,0.12)",
              border: "1px solid rgba(88,101,242,0.25)",
              color: "#818cf8", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(88,101,242,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(88,101,242,0.12)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.004.048.026.093.058.125a19.905 19.905 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Discord
          </a>
          <a
            href="https://app.plex.tv"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9,
              background: "rgba(229,127,13,0.12)",
              border: "1px solid rgba(229,127,13,0.25)",
              color: "#f59e0b", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(229,127,13,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(229,127,13,0.12)";
            }}
          >
            <ExternalLink size={13} />
            Plex
          </a>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 9,
        textDecoration: "none", fontSize: "0.87rem",
        fontWeight: active ? 600 : 500,
        color: active ? "#f9fafb" : "#9ca3af",
        background: active ? "rgba(220,38,38,0.1)" : "transparent",
        border: `1px solid ${active ? "rgba(220,38,38,0.25)" : "transparent"}`,
        transition: "all 0.2s",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
