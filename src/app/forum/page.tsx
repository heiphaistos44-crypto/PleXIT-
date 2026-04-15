"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Film, Tv, Music, Library, Star, Clock,
  ChevronRight, Scale, TrendingUp, Diamond,
  CalendarDays, Clapperboard, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface PlexItem {
  id:          string;
  title:       string;
  year:        number;
  category:    "movie" | "show" | "anime" | "music" | "exclusive";
  sectionTitle: string;
  thumb?:      string;
  rating?:     number;
  genre:       string[];
  addedAt:     number;
  seasons?:    number;
  episodes?:   number;
}

interface ApiResponse {
  items:      PlexItem[];
  total:      number;
  totalPages: number;
  counts?:    { all: number; movie: number; show: number; anime: number; music: number; exclusive: number };
  demo?:      boolean;
}

// ─── Sorties attendues (curatées) ─────────────────────────────
const UPCOMING: { title: string; year: number; type: string; genre: string[]; date: string; note?: string }[] = [
  { title: "Avatar 3",                              year: 2025, type: "movie", genre: ["Science-Fiction","Aventure"],   date: "Déc. 2025" },
  { title: "Mission: Impossible – The Final Reckoning", year: 2025, type: "movie", genre: ["Action","Thriller"],       date: "Mai 2025"  },
  { title: "Jurassic World Rebirth",                year: 2025, type: "movie", genre: ["Aventure","Science-Fiction"], date: "Juil. 2025" },
  { title: "Thunderbolts*",                         year: 2025, type: "movie", genre: ["Action","Super-Héros"],        date: "Mai 2025",  note: "MCU" },
  { title: "Sinners",                               year: 2025, type: "movie", genre: ["Horreur","Thriller"],          date: "Avr. 2025"  },
  { title: "Final Destination: Bloodlines",         year: 2025, type: "movie", genre: ["Horreur","Thriller"],          date: "Mai 2025"   },
  { title: "Stranger Things — Saison 5",            year: 2025, type: "show",  genre: ["Science-Fiction","Horreur"],   date: "2025"       },
  { title: "The Last of Us — Saison 2",             year: 2025, type: "show",  genre: ["Action","Drame"],              date: "Avr. 2025"  },
  { title: "The Witcher — Saison 4",                year: 2025, type: "show",  genre: ["Fantasy","Action"],            date: "2025"       },
  { title: "Demon Slayer — Arc Final",              year: 2025, type: "anime", genre: ["Action","Shonen"],             date: "2025"       },
  { title: "One Piece (Live Action) — Saison 2",   year: 2025, type: "anime", genre: ["Aventure","Action"],           date: "2025"       },
  { title: "Jujutsu Kaisen — Saison 3",            year: 2025, type: "anime", genre: ["Action","Shonen"],             date: "2025",      note: "Cours actuellement" },
];

// ─── Seuil "récent" : 45 jours ────────────────────────────────
const RECENT_DAYS  = 45;
const RECENT_TS    = () => Math.floor(Date.now() / 1000) - RECENT_DAYS * 86400;

// ─── Couleur par catégorie ────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  movie:     "#ef4444",
  show:      "#3b82f6",
  anime:     "#f59e0b",
  music:     "#22c55e",
  exclusive: "#a855f7",
};

const TYPE_COLOR: Record<string, string> = {
  movie: "#ef4444",
  show:  "#3b82f6",
  anime: "#f59e0b",
};

const TYPE_LABEL: Record<string, string> = {
  movie: "Film",
  show:  "Série",
  anime: "Animé",
};

// ─── Mini-card affiche ────────────────────────────────────────
function ThumbCard({ item }: { item: PlexItem }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "12px 14px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Poster */}
      <div style={{
        width: 44, height: 64, borderRadius: 6, flexShrink: 0,
        background: "rgba(255,255,255,0.06)", overflow: "hidden",
      }}>
        {item.thumb && !err
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.thumb} alt={item.title} onError={() => setErr(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
              {item.category === "music" ? "🎵" : "🎬"}
            </div>
        }
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.83rem", color: "#f9fafb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 2 }}>{item.year || "—"}</div>
        {item.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, fontSize: "0.7rem", color: "#f59e0b" }}>
            <Star size={10} fill="#f59e0b" /> {item.rating.toFixed(1)}
          </div>
        )}
        {item.genre.length > 0 && (
          <div style={{ fontSize: "0.67rem", color: "#4b5563", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.genre.slice(0, 2).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card "À venir" ───────────────────────────────────────────
function UpcomingCard({ item }: { item: typeof UPCOMING[0] }) {
  const color = TYPE_COLOR[item.type] ?? "#9ca3af";
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
        background: color, borderRadius: "3px 0 0 3px",
      }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f9fafb" }}>{item.title}</div>
          <span style={{
            flexShrink: 0, fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 999, background: `${color}18`, color, border: `1px solid ${color}33`,
          }}>
            {item.date}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color, opacity: 0.85 }}>
            {TYPE_LABEL[item.type] ?? item.type}
          </span>
          {item.genre.map(g => (
            <span key={g} style={{ fontSize: "0.65rem", color: "#6b7280" }}>{g}</span>
          ))}
          {item.note && <span style={{ fontSize: "0.65rem", color: "#a855f7", fontWeight: 700 }}>{item.note}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────
export default function ForumPage() {
  const [counts,    setCounts]    = useState({ all: 0, movie: 0, show: 0, anime: 0, music: 0, exclusive: 0 });
  const [recent,    setRecent]    = useState<PlexItem[]>([]);
  const [allItems,  setAllItems]  = useState<PlexItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [demo,      setDemo]      = useState(false);
  const [loadedAt,  setLoadedAt]  = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Récupère 96 items récents + les counts
      const res = await fetch("/api/plex?limit=96&sort=recent&page=1");
      if (!res.ok) throw new Error("API error");
      const data: ApiResponse = await res.json();
      if (data.counts) setCounts(data.counts);
      setDemo(!!data.demo);

      const ts = RECENT_TS();
      const items = data.items ?? [];
      setAllItems(items);
      setRecent(items.filter(i => i.addedAt >= ts));
      setLoadedAt(new Date());

      // Si on a besoin de plus d'items récents, fetch page 2
      if (data.totalPages > 1 && items.filter(i => i.addedAt >= ts).length < 12) {
        const res2 = await fetch("/api/plex?limit=96&sort=recent&page=2");
        const data2: ApiResponse = await res2.json();
        const more = data2.items ?? [];
        const allRecent = [...items, ...more].filter(i => i.addedAt >= ts);
        setRecent(allRecent);
      }
    } catch {
      // Silencieux — les données resteront vides
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats cards config
  const statCards = [
    { label: "Total Contenus", value: counts.all,       color: "#9ca3af", icon: Library,     badge: "badge-gray"   },
    { label: "Films",          value: counts.movie,     color: "#ef4444", icon: Film,        badge: "badge-red"    },
    { label: "Séries",         value: counts.show,      color: "#3b82f6", icon: Tv,          badge: "badge-blue"   },
    { label: "Animés",         value: counts.anime,     color: "#f59e0b", icon: Clapperboard, badge: "badge-gold"  },
    { label: "Musique",        value: counts.music,     color: "#22c55e", icon: Music,       badge: "badge-green"  },
    { label: "Exclusivités",   value: counts.exclusive, color: "#a855f7", icon: Diamond,     badge: "badge-purple" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 100px" }}>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 48 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Forum & Statistiques</p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Tableau de bord
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Vue détaillée de la collection · Sorties récentes · À venir · Mentions légales
            </p>
          </div>
          <button
            onClick={fetchData}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 16px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#9ca3af", fontSize: "0.85rem", fontWeight: 600,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
            Actualiser
          </button>
        </div>
        {demo && (
          <div style={{
            marginTop: 16, padding: "10px 16px", borderRadius: 10,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            color: "#f59e0b", fontSize: "0.82rem",
          }}>
            ⚠️ Mode démo — Plex non configuré. Les données ci-dessous sont fictives.
          </div>
        )}
      </div>

      {/* ─── STATS CARDS ─── */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <TrendingUp size={18} color="#ef4444" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Statistiques de la collection</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              padding: "22px 20px", borderRadius: 16,
              background: `${s.color}08`, border: `1px solid ${s.color}20`,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <s.icon size={20} color={s.color} />
              {loading
                ? <div className="skeleton" style={{ height: 32, width: 64, borderRadius: 6 }} />
                : <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>
                    {s.value.toLocaleString("fr")}
                  </div>
              }
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider-red" style={{ marginBottom: 48 }} />

      {/* ─── AJOUTS RÉCENTS ─── */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} color="#f59e0b" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Ajouts récents</h2>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999,
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b",
            }}>
              {loading ? "…" : `${recent.length} titre${recent.length !== 1 ? "s" : ""} · ${RECENT_DAYS}j`}
            </span>
          </div>
          <Link href="/bibliotheque?sort=recent" style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: "0.8rem", color: "#6b7280", textDecoration: "none",
          }}>
            Voir tout <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <Clock size={32} color="#374151" style={{ marginBottom: 12 }} />
            <p style={{ color: "#4b5563", fontSize: "0.9rem" }}>Aucun ajout récent trouvé dans les {RECENT_DAYS} derniers jours.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {recent.slice(0, 24).map(item => (
              <ThumbCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* ─── PAR CATÉGORIE ─── */}
      {!loading && allItems.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Library size={18} color="#3b82f6" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Aperçu par catégorie</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {(["movie","show","anime","music"] as const).map(cat => {
              const catItems = allItems.filter(i => i.category === cat);
              if (catItems.length === 0) return null;
              const color = CAT_COLOR[cat];
              const labels: Record<string, string> = { movie: "Films", show: "Séries", anime: "Animés", music: "Musique" };
              const icons: Record<string, React.ReactNode> = {
                movie: <Film size={16} color={color} />, show: <Tv size={16} color={color} />,
                anime: <span style={{ fontSize: 16 }}>⛩️</span>, music: <Music size={16} color={color} />,
              };
              return (
                <div key={cat} style={{
                  padding: "20px", borderRadius: 16,
                  background: `${color}06`, border: `1px solid ${color}18`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {icons[cat]}
                      <span style={{ fontWeight: 800, fontSize: "0.9rem", color }}>{labels[cat]}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280" }}>
                      {counts[cat].toLocaleString("fr")} titres
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {catItems.slice(0, 5).map(item => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: "0.8rem", color: "#d1d5db", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#4b5563", flexShrink: 0 }}>{item.year || "—"}</span>
                        {item.rating && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem", color: "#f59e0b", flexShrink: 0 }}>
                            <Star size={9} fill="#f59e0b" /> {item.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
                    {catItems.length > 5 && (
                      <Link href={`/bibliotheque?category=${cat}`} style={{ fontSize: "0.75rem", color: "#4b5563", textDecoration: "none", marginTop: 4 }}>
                        + {(counts[cat] - 5).toLocaleString("fr")} autres…
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="divider-red" style={{ marginBottom: 48 }} />

      {/* ─── SORTIES ATTENDUES ─── */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <CalendarDays size={18} color="#a855f7" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Sorties attendues</h2>
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "2px 10px", borderRadius: 999,
            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7",
          }}>
            💎 Exclusivités
          </span>
        </div>
        <p style={{ color: "#4b5563", fontSize: "0.82rem", marginBottom: 20 }}>
          Titres très attendus qui seront ajoutés dès leur sortie.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {UPCOMING.map((item, i) => (
            <UpcomingCard key={i} item={item} />
          ))}
        </div>
      </section>

      <div className="divider-red" style={{ marginBottom: 48 }} />

      {/* ─── MENTIONS LÉGALES & COPYRIGHT ─── */}
      <section id="legal" style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Scale size={18} color="#6b7280" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#9ca3af" }}>Mentions légales & Copyright</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>

          {/* Usage privé */}
          <LegalCard title="Usage privé exclusif" icon="🔒">
            Cette plateforme est réservée à usage privé et exclusif des membres du serveur Discord.
            Toute diffusion, redistribution ou accès non autorisé est strictement interdit.
            L&apos;accès est conditionné à une invitation explicite.
          </LegalCard>

          {/* Droits d'auteur */}
          <LegalCard title="Droits d'auteur" icon="©">
            Tout le contenu multimédia (films, séries, musiques, animés) accessible via ce site
            appartient à ses ayants droit respectifs. PleXIT ne stocke, ne distribue ni ne reproduit
            aucun contenu protégé. Il ne fait que faciliter l&apos;accès à un serveur Plex personnel et privé.
          </LegalCard>

          {/* Plex */}
          <LegalCard title="Plex Media Server" icon="📺">
            PleXIT est une interface tierce non officielle. Elle n&apos;est pas affiliée, approuvée ou sponsorisée
            par Plex Inc. L&apos;utilisation de Plex est soumise aux{" "}
            <a href="https://www.plex.tv/about/privacy-legal/" target="_blank" rel="noopener noreferrer"
              style={{ color: "#f59e0b", textDecoration: "none" }}>
              Conditions d&apos;utilisation de Plex
            </a>.
          </LegalCard>

          {/* Discord */}
          <LegalCard title="Discord" icon="💬">
            Les demandes sont transmises via webhook Discord à des fins d&apos;organisation interne.
            Aucune donnée personnelle n&apos;est stockée par PleXIT. L&apos;utilisation de Discord
            est soumise aux{" "}
            <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer"
              style={{ color: "#818cf8", textDecoration: "none" }}>
              Conditions d&apos;utilisation de Discord
            </a>.
          </LegalCard>

          {/* Responsabilité */}
          <LegalCard title="Limitation de responsabilité" icon="⚖️">
            L&apos;administrateur de cette plateforme ne saurait être tenu responsable d&apos;un usage
            non conforme. Aucune garantie de disponibilité permanente du service n&apos;est fournie.
            Le contenu affiché provient uniquement du serveur Plex configuré.
          </LegalCard>

          {/* RGPD */}
          <LegalCard title="Données personnelles (RGPD)" icon="🛡️">
            PleXIT ne collecte aucune donnée personnelle identifiable. Les demandes envoyées
            via formulaire sont transmises à Discord et non conservées par cette application.
            Aucun cookie de traçage tiers n&apos;est utilisé.
          </LegalCard>

        </div>

        {/* Footer légal */}
        <div style={{
          marginTop: 28, padding: "18px 24px", borderRadius: 12,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.75rem", color: "#374151", lineHeight: 1.8 }}>
            © {new Date().getFullYear()} PleXIT — Plateforme privée. Tous droits réservés aux ayants droit respectifs de chaque œuvre.
            <br />
            Développé avec ❤️ pour les membres du Discord · Non affilié à Plex Inc.
            <br />
            <span style={{ color: "#1f2937" }}>Usage strictement personnel et non commercial.</span>
          </p>
        </div>
      </section>

      {/* ─── CTA NAVIGATION ─── */}
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
        <Link href="/bibliotheque" style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Library size={15} /> Explorer la bibliothèque <ChevronRight size={14} />
          </button>
        </Link>
        <Link href="/demande" style={{ textDecoration: "none" }}>
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Film size={15} /> Faire une demande <ChevronRight size={14} />
          </button>
        </Link>
      </section>

      {loadedAt && (
        <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#1f2937", marginTop: 24 }}>
          Données chargées le {loadedAt.toLocaleDateString("fr-FR")} à {loadedAt.toLocaleTimeString("fr-FR")}
        </p>
      )}
    </div>
  );
}

// ─── Composant carte légale ───────────────────────────────────
function LegalCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: "18px 20px", borderRadius: 14,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#d1d5db", margin: 0 }}>{title}</h3>
      </div>
      <p style={{ fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.7, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}
