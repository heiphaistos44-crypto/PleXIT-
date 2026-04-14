"use client";

import Link from "next/link";
import {
  Film,
  Tv,
  Library,
  MessageCircle,
  ChevronRight,
  Clapperboard,
  Star,
  Clock,
} from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      {/* ─── HERO ─── */}
      <section style={{ paddingTop: 80, paddingBottom: 60, textAlign: "center" }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 999,
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
          marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444" }}>
            Plateforme Privée
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 20, fontStyle: "italic" }}>
          <span className="text-gradient-red">PleX</span>
          <span className="text-gradient-gold">IT</span>
        </h1>

        <p style={{ fontSize: "1.2rem", color: "#9ca3af", maxWidth: 560, margin: "0 auto 16px", lineHeight: 1.6 }}>
          Demande tes films et séries préférés, consulte la bibliothèque Plex
          — directement depuis Discord.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 36 }}>
          <Link href="/demande" style={{ textDecoration: "none" }}>
            <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 28px" }}>
              <Film size={18} />
              Faire une demande
              <ChevronRight size={16} />
            </button>
          </Link>
          <Link href="/bibliotheque" style={{ textDecoration: "none" }}>
            <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Library size={16} />
              Voir la bibliothèque
            </button>
          </Link>
        </div>
      </section>

      {/* ─── DIVIDER ─── */}
      <div className="divider-red" style={{ marginBottom: 60 }} />

      {/* ─── FEATURE CARDS ─── */}
      <section style={{ marginBottom: 70 }}>
        <p className="section-label" style={{ textAlign: "center", marginBottom: 40 }}>Comment ça marche</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="card-plexit" style={{ padding: "28px 24px", animationDelay: `${i * 0.08}s` }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.bg, border: f.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <f.icon size={20} color={f.color} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8, color: "#f9fafb" }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA CARDS ─── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 80 }}>
        {/* Demande */}
        <Link href="/demande" style={{ textDecoration: "none" }}>
          <div style={{
            borderRadius: 20, padding: "36px 32px",
            background: "linear-gradient(135deg, rgba(220,38,38,0.1) 0%, rgba(220,38,38,0.03) 100%)",
            border: "1px solid rgba(220,38,38,0.2)",
            transition: "all 0.25s ease", cursor: "pointer",
            position: "relative", overflow: "hidden",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(220,38,38,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(220,38,38,0.08)" }} />
            <Film size={32} color="#ef4444" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f9fafb", marginBottom: 8 }}>Faire une demande</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
              Formulaire complet — film, série, qualité, langue, saisons. Ta demande arrive directement sur Discord.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontWeight: 600, fontSize: "0.88rem" }}>
              Soumettre <ChevronRight size={16} />
            </div>
          </div>
        </Link>

        {/* Bibliothèque */}
        <Link href="/bibliotheque" style={{ textDecoration: "none" }}>
          <div style={{
            borderRadius: 20, padding: "36px 32px",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)",
            border: "1px solid rgba(245,158,11,0.2)",
            transition: "all 0.25s ease", cursor: "pointer",
            position: "relative", overflow: "hidden",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(245,158,11,0.15)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(245,158,11,0.06)" }} />
            <Library size={32} color="#f59e0b" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f9fafb", marginBottom: 8 }}>Bibliothèque Plex</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
              Parcours toute la collection — films et séries — en temps réel depuis le serveur Plex.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", fontWeight: 600, fontSize: "0.88rem" }}>
              Explorer <ChevronRight size={16} />
            </div>
          </div>
        </Link>

        {/* Discord */}
        <a
          href={process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/WPjFythcH5"}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <div style={{
            borderRadius: 20, padding: "36px 32px",
            background: "linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(88,101,242,0.02) 100%)",
            border: "1px solid rgba(88,101,242,0.2)",
            transition: "all 0.25s ease", cursor: "pointer",
            position: "relative", overflow: "hidden",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(88,101,242,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(88,101,242,0.06)" }} />
            <MessageCircle size={32} color="#818cf8" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f9fafb", marginBottom: 8 }}>Rejoindre Discord</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
              Accède aux demandes, aux mises à jour et à la communauté directement sur le serveur Discord.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#818cf8", fontWeight: 600, fontSize: "0.88rem" }}>
              Rejoindre <ChevronRight size={16} />
            </div>
          </div>
        </a>
      </section>

      {/* ─── STATS ─── */}
      <section style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20, padding: "32px 40px", marginBottom: 80,
        display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

const features = [
  {
    icon: Film,
    title: "Demande rapide",
    desc: "Remplis le formulaire en 2 minutes. Titre, qualité, langue, priorité — tout est là.",
    color: "#ef4444",
    bg: "rgba(220,38,38,0.1)",
    border: "1px solid rgba(220,38,38,0.2)",
  },
  {
    icon: Clapperboard,
    title: "Envoi sur Discord",
    desc: "Ta demande est envoyée automatiquement sous forme d'embed riche sur ton serveur Discord.",
    color: "#818cf8",
    bg: "rgba(88,101,242,0.1)",
    border: "1px solid rgba(88,101,242,0.2)",
  },
  {
    icon: Library,
    title: "Bibliothèque live",
    desc: "Vérifie si le contenu est déjà disponible avant de faire une demande. Données en temps réel depuis Plex.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.2)",
  },
  {
    icon: Star,
    title: "Qualité 4K",
    desc: "Demande jusqu'à la 4K Dolby Vision. Spécifie tes préférences de langue (VF, VOSTFR, VO).",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  {
    icon: Tv,
    title: "Séries complètes",
    desc: "Demande une saison précise ou la série entière. Spécifie les épisodes manquants.",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.2)",
  },
  {
    icon: Clock,
    title: "Suivi des demandes",
    desc: "Chaque demande arrive horodatée sur Discord avec toutes les infos pour le traitement.",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "1px solid rgba(6,182,212,0.2)",
  },
];

const stats = [
  { value: "4K", label: "Qualité max", color: "#ef4444" },
  { value: "∞", label: "Demandes possibles", color: "#f59e0b" },
  { value: "VF/VOST", label: "Langues disponibles", color: "#22c55e" },
  { value: "24h", label: "Délai de traitement", color: "#818cf8" },
];
