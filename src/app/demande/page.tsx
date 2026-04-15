"use client";

import { useState, useCallback } from "react";
import {
  Film, Tv, Send, AlertCircle, CheckCircle2,
  Link2, User, MessageSquare,
  Star, Zap, Clock, Info, Search, X
} from "lucide-react";

type MediaType = "film" | "serie" | "anime" | "dessin_anime" | "musique";
type Priorite = "haute" | "moyenne" | "basse";
type Qualite = "720p" | "1080p" | "1080p_bluray" | "4k" | "4k_dolby" | "4k_hdr";
type Langue = "vf" | "vostfr" | "vo" | "vofr" | "multi";

interface FormData {
  type: MediaType;
  titre: string;
  annee: string;
  genres: string[];
  langue: Langue;
  qualite: Qualite;
  // Série / Animé
  saisons: string;
  episodes: string;
  enCours: boolean;
  // Lien
  lienType: "tmdb" | "imdb" | "allocine" | "youtube" | "";
  lienUrl: string;
  // Extra
  pseudoDiscord: string;
  priorite: Priorite;
  commentaire: string;
  verifieExistant: boolean;
}

const MEDIA_TYPES: {
  value: MediaType;
  label: string;
  emoji: string;
  color: string;
  border: string;
  bg: string;
}[] = [
  { value: "film",        label: "Film",          emoji: "🎬", color: "#ef4444", border: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  { value: "serie",       label: "Série",          emoji: "📺", color: "#a78bfa", border: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  { value: "anime",       label: "Animé / Manga",  emoji: "⛩️", color: "#f97316", border: "#ea580c", bg: "rgba(234,88,12,0.08)" },
  { value: "dessin_anime",label: "Dessin Animé",   emoji: "🎨", color: "#22d3ee", border: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  { value: "musique",     label: "Artiste Musical", emoji: "🎵", color: "#4ade80", border: "#22c55e", bg: "rgba(34,197,94,0.08)" },
];

const GENRES_PAR_TYPE: Record<MediaType, string[]> = {
  film:         ["Action", "Aventure", "Animation", "Comédie", "Crime", "Documentaire", "Drame", "Fantaisie", "Horreur", "Mystère", "Romance", "Science-Fiction", "Thriller", "Guerre", "Western", "Historique", "Biopic"],
  serie:        ["Action", "Aventure", "Comédie", "Crime", "Documentaire", "Drame", "Fantaisie", "Horreur", "Mystère", "Romance", "Science-Fiction", "Thriller", "Historique", "Reality"],
  anime:        ["Shonen", "Shojo", "Seinen", "Isekai", "Mecha", "Slice of Life", "Magical Girl", "Sports", "Horreur", "Romance", "Action", "Aventure", "Comédie", "Fantaisie", "Science-Fiction"],
  dessin_anime: ["Aventure", "Comédie", "Fantaisie", "Super-héros", "Famille", "Action", "Science-Fiction", "Éducatif"],
  musique:      ["Pop", "Rock", "Hip-Hop / Rap", "R&B / Soul", "Électronique", "Jazz", "Classique", "Metal", "Country", "Reggae", "K-Pop", "Bande Originale"],
};

const QUALITES: { value: Qualite; label: string; badge: string; color: string }[] = [
  { value: "720p",        label: "720p HD",          badge: "HD",  color: "#6b7280" },
  { value: "1080p",       label: "1080p Full HD",     badge: "FHD", color: "#3b82f6" },
  { value: "1080p_bluray",label: "1080p Blu-ray",     badge: "BLU", color: "#06b6d4" },
  { value: "4k",          label: "4K Ultra HD",       badge: "4K",  color: "#f59e0b" },
  { value: "4k_hdr",      label: "4K HDR",            badge: "HDR", color: "#f97316" },
  { value: "4k_dolby",    label: "4K Dolby Vision",   badge: "DV",  color: "#ef4444" },
];

const LANGUES: { value: Langue; label: string; desc: string }[] = [
  { value: "vf",     label: "VF",     desc: "Version Française" },
  { value: "vostfr", label: "VOSTFR", desc: "Sous-titres FR" },
  { value: "vo",     label: "VO",     desc: "Version Originale" },
  { value: "vofr",   label: "VOFR",   desc: "VO + Sous-titres FR" },
  { value: "multi",  label: "MULTI",  desc: "Toutes les langues" },
];

const LIEN_TYPES = [
  { value: "tmdb",     label: "TMDB",     placeholder: "https://www.themoviedb.org/movie/...", color: "#22c55e" },
  { value: "imdb",     label: "IMDb",     placeholder: "https://www.imdb.com/title/...", color: "#f59e0b" },
  { value: "allocine", label: "Allociné", placeholder: "https://www.allocine.fr/film/fichefilm_gen_cfilm=...", color: "#f97316" },
  { value: "youtube",  label: "YouTube",  placeholder: "https://www.youtube.com/watch?v=...", color: "#ef4444" },
] as const;

const initialForm: FormData = {
  type: "film",
  titre: "",
  annee: "",
  genres: [],
  langue: "vf",
  qualite: "1080p",
  saisons: "",
  episodes: "",
  enCours: false,
  lienType: "",
  lienUrl: "",
  pseudoDiscord: "",
  priorite: "moyenne",
  commentaire: "",
  verifieExistant: false,
};

const isSeries = (t: MediaType) => t === "serie" || t === "anime" || t === "dessin_anime";
const hasQuality = (t: MediaType) => t !== "musique";

export default function DemandePage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const setType = (t: MediaType) => {
    setForm(prev => ({ ...prev, type: t, genres: [] }));
  };

  const toggleGenre = (genre: string) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.pseudoDiscord.trim()) return;
    if (!form.verifieExistant) {
      setStatus("error");
      setErrorMsg("⚠️ Tu dois d'abord vérifier que le contenu n'est pas déjà dans la bibliothèque Plex.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de l'envoi");
      }
      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const currentMedia = MEDIA_TYPES.find(m => m.value === form.type)!;

  if (status === "success") return <SuccessScreen onNew={() => setStatus("idle")} />;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Formulaire de demande</p>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>
          Nouvelle demande
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Remplis le formulaire avec le maximum de détails. Ta demande sera envoyée sur Discord et traitée dans les meilleurs délais.
        </p>
      </div>

      {/* Error */}
      {status === "error" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderRadius: 12, marginBottom: 24,
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#ef4444",
        }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: "0.9rem" }}>{errorMsg || "Une erreur est survenue."}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── SECTION 1 : TYPE ── */}
        <FormSection step={1} title="Type de contenu" icon={<Film size={16} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {MEDIA_TYPES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setType(m.value)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "16px 10px", borderRadius: 14, cursor: "pointer",
                  border: `2px solid ${form.type === m.value ? m.border : "rgba(255,255,255,0.07)"}`,
                  background: form.type === m.value ? m.bg : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{m.emoji}</span>
                <span style={{
                  fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.2, textAlign: "center",
                  color: form.type === m.value ? m.color : "#9ca3af",
                }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </FormSection>

        {/* ── SECTION 2 : IDENTIFICATION ── */}
        <FormSection step={2} title="Identification" icon={<Search size={16} />}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                className="input-plexit"
                placeholder={
                  form.type === "film" ? "Ex: Dune Part Two" :
                  form.type === "serie" ? "Ex: Breaking Bad" :
                  form.type === "anime" ? "Ex: Attack on Titan" :
                  form.type === "dessin_anime" ? "Ex: Avatar: The Last Airbender" :
                  "Ex: Daft Punk - Random Access Memories"
                }
                value={form.titre}
                onChange={e => set("titre", e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Année</label>
              <input
                className="input-plexit"
                placeholder="2024"
                value={form.annee}
                onChange={e => set("annee", e.target.value)}
                maxLength={4}
              />
            </div>
          </div>
        </FormSection>

        {/* ── SECTION 3 : GENRES ── */}
        <FormSection step={3} title="Genres" icon={<Star size={16} />}>
          <label style={labelStyle}>
            Sélectionne jusqu&apos;à 3 genres
            {form.genres.length > 0 && (
              <span style={{ marginLeft: 10, color: currentMedia.color, fontWeight: 700 }}>
                {form.genres.length}/3
              </span>
            )}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {GENRES_PAR_TYPE[form.type].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`tag-chip ${form.genres.includes(g) ? "active" : ""}`}
                disabled={!form.genres.includes(g) && form.genres.length >= 3}
                style={{ opacity: (!form.genres.includes(g) && form.genres.length >= 3) ? 0.3 : 1 }}
              >
                {g}
              </button>
            ))}
          </div>
        </FormSection>

        {/* ── SECTION 4 : LANGUE & QUALITÉ (pas pour musique) ── */}
        {hasQuality(form.type) && (
          <FormSection step={4} title="Langue & Qualité" icon={<Zap size={16} />}>
            <label style={labelStyle}>Langue souhaitée</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {LANGUES.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("langue", l.value)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer", minWidth: 68,
                    border: `1px solid ${form.langue === l.value ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.07)"}`,
                    background: form.langue === l.value ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: "0.85rem", color: form.langue === l.value ? "#ef4444" : "#f9fafb" }}>
                    {l.label}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#6b7280", marginTop: 2 }}>{l.desc}</span>
                </button>
              ))}
            </div>

            <label style={labelStyle}>Qualité minimale</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {QUALITES.map(q => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => set("qualite", q.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${form.qualite === q.value ? q.color : "rgba(255,255,255,0.07)"}`,
                    background: form.qualite === q.value ? `${q.color}15` : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.04em",
                    padding: "2px 6px", borderRadius: 4,
                    background: form.qualite === q.value ? q.color : "rgba(255,255,255,0.08)",
                    color: form.qualite === q.value ? "white" : "#9ca3af",
                    flexShrink: 0,
                  }}>
                    {q.badge}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: form.qualite === q.value ? "#f9fafb" : "#6b7280" }}>
                    {q.label}
                  </span>
                </button>
              ))}
            </div>
          </FormSection>
        )}

        {/* ── SECTION 5 : SAISONS (série / animé / dessin animé) ── */}
        {isSeries(form.type) && (
          <FormSection step={hasQuality(form.type) ? 5 : 4} title="Détails" icon={<Tv size={16} />}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Saisons demandées</label>
                <input
                  className="input-plexit"
                  placeholder="Ex: S01, S02, S01-S03, Complète"
                  value={form.saisons}
                  onChange={e => set("saisons", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Épisodes spécifiques</label>
                <input
                  className="input-plexit"
                  placeholder="Ex: S02E01-E06"
                  value={form.episodes}
                  onChange={e => set("episodes", e.target.value)}
                />
              </div>
            </div>
            <label style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <input
                type="checkbox"
                checked={form.enCours}
                onChange={e => set("enCours", e.target.checked)}
                style={{ accentColor: "#dc2626", width: 16, height: 16 }}
              />
              <span style={{ fontSize: "0.9rem", color: "#d1d5db" }}>
                Encore en cours de diffusion
              </span>
            </label>
          </FormSection>
        )}

        {/* ── SECTION LIEN ── */}
        <FormSection step={form.type === "musique" ? 4 : isSeries(form.type) ? 6 : 5} title="Lien de référence" icon={<Link2 size={16} />}>
          <label style={labelStyle}>
            Source du lien
            <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#4b5563" }}>(recommandé pour éviter les doublons)</span>
          </label>

          {/* Sélecteur de type de lien */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {LIEN_TYPES.map(l => (
              <button
                key={l.value}
                type="button"
                onClick={() => set("lienType", form.lienType === l.value ? "" : l.value)}
                style={{
                  padding: "7px 16px", borderRadius: 9, cursor: "pointer",
                  border: `1px solid ${form.lienType === l.value ? l.color : "rgba(255,255,255,0.07)"}`,
                  background: form.lienType === l.value ? `${l.color}15` : "rgba(255,255,255,0.02)",
                  color: form.lienType === l.value ? l.color : "#9ca3af",
                  fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s",
                }}
              >
                {l.label}
              </button>
            ))}
            {form.lienType && (
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, lienType: "", lienUrl: "" }))}
                style={{
                  padding: "7px 10px", borderRadius: 9, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "transparent", color: "#4b5563", transition: "all 0.2s",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Input URL selon le type */}
          {form.lienType && (
            <input
              className="input-plexit"
              placeholder={LIEN_TYPES.find(l => l.value === form.lienType)?.placeholder || ""}
              value={form.lienUrl}
              onChange={e => set("lienUrl", e.target.value)}
              type="url"
            />
          )}

          {!form.lienType && (
            <p style={{ fontSize: "0.8rem", color: "#4b5563", padding: "10px 0" }}>
              Sélectionne une source ci-dessus pour ajouter un lien.
            </p>
          )}
        </FormSection>

        {/* ── SECTION PRIORITÉ ── */}
        <FormSection step={form.type === "musique" ? 5 : isSeries(form.type) ? 7 : 6} title="Priorité" icon={<Clock size={16} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {([
              { value: "haute",   label: "Haute",   emoji: "🔴", desc: "Urgent",         color: "#dc2626" },
              { value: "moyenne", label: "Moyenne", emoji: "🟡", desc: "Normal",         color: "#f59e0b" },
              { value: "basse",   label: "Basse",   emoji: "🟢", desc: "Quand possible", color: "#22c55e" },
            ] as const).map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("priorite", p.value)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "16px 12px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${form.priorite === p.value ? p.color : "rgba(255,255,255,0.07)"}`,
                  background: form.priorite === p.value ? `${p.color}12` : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{p.emoji}</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: form.priorite === p.value ? "#f9fafb" : "#9ca3af" }}>
                  {p.label}
                </span>
                <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{p.desc}</span>
              </button>
            ))}
          </div>
        </FormSection>

        {/* ── SECTION INFOS ── */}
        <FormSection step={form.type === "musique" ? 6 : isSeries(form.type) ? 8 : 7} title="Tes informations" icon={<User size={16} />}>
          <label style={labelStyle}>
            Pseudo Discord *
            <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#4b5563" }}>pour te notifier quand c&apos;est dispo</span>
          </label>
          <input
            className="input-plexit"
            placeholder="TonPseudo ou TonPseudo#1234"
            value={form.pseudoDiscord}
            onChange={e => set("pseudoDiscord", e.target.value)}
            style={{ marginBottom: 16 }}
            required
          />

          <label style={{ ...labelStyle, marginTop: 4 }}>
            <MessageSquare size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            Commentaire / Précisions
          </label>
          <textarea
            className="input-plexit"
            placeholder="Version spécifique, détails supplémentaires, contexte..."
            value={form.commentaire}
            onChange={e => set("commentaire", e.target.value)}
            rows={4}
            style={{ resize: "vertical", minHeight: 90, fontFamily: "inherit" }}
          />
        </FormSection>

        {/* ── VÉRIFICATION OBLIGATOIRE ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "16px 20px", borderRadius: 12, marginBottom: 28,
          background: form.verifieExistant
            ? "rgba(34,197,94,0.06)"
            : (status === "error" && errorMsg.includes("bibliothèque"))
              ? "rgba(220,38,38,0.08)"
              : "rgba(245,158,11,0.06)",
          border: form.verifieExistant
            ? "1px solid rgba(34,197,94,0.3)"
            : (status === "error" && errorMsg.includes("bibliothèque"))
              ? "1px solid rgba(220,38,38,0.35)"
              : "1px solid rgba(245,158,11,0.18)",
          transition: "all 0.2s",
        }}>
          <Info size={18}
            color={form.verifieExistant ? "#22c55e" : "#f59e0b"}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", flex: 1 }}>
            <input
              type="checkbox"
              required
              checked={form.verifieExistant}
              onChange={e => {
                set("verifieExistant", e.target.checked);
                if (e.target.checked) setErrorMsg("");
              }}
              style={{ accentColor: "#22c55e", width: 17, height: 17, marginTop: 2, flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.88rem", color: "#d1d5db", lineHeight: 1.5 }}>
              <strong style={{ color: form.verifieExistant ? "#22c55e" : "#f59e0b" }}>Obligatoire</strong>
              {" — "}J&apos;ai vérifié dans la{" "}
              <a href="/bibliotheque" target="_blank" rel="noopener noreferrer"
                style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>
                bibliothèque Plex
              </a>
              {" "}et ce contenu n&apos;est <strong>pas encore disponible</strong>.
            </span>
          </label>
        </div>

        {/* ── SUBMIT ── */}
        <button
          type="submit"
          className="btn-primary"
          disabled={status === "loading" || !form.titre.trim() || !form.pseudoDiscord.trim() || !form.verifieExistant}
          title={!form.verifieExistant ? "Coche d'abord la case de vérification Plex" : undefined}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px", fontSize: "1rem",
            opacity: (!form.titre.trim() || !form.pseudoDiscord.trim() || !form.verifieExistant) ? 0.45 : 1,
            cursor: (!form.titre.trim() || !form.pseudoDiscord.trim() || !form.verifieExistant) ? "not-allowed" : "pointer",
          }}
        >
          {status === "loading" ? (
            <><div className="spinner" /> Envoi en cours...</>
          ) : (
            <><Send size={18} /> Envoyer la demande sur Discord</>
          )}
        </button>
      </form>
    </div>
  );
}

function FormSection({ step, title, icon, children }: {
  step: number; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: 24, padding: "22px 24px", borderRadius: 16,
      background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div className="step-indicator">{step}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#9ca3af" }}>
          {icon}
          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#f9fafb" }}>{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600,
  color: "#9ca3af", marginBottom: 8, letterSpacing: "0.02em",
};

function SuccessScreen({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px",
      }}>
        <CheckCircle2 size={36} color="#22c55e" />
      </div>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 14, letterSpacing: "-0.02em" }}>
        Demande envoyée !
      </h2>
      <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
        Ta demande a été transmise sur Discord. Tu seras notifié dès que le contenu est disponible.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button className="btn-primary" onClick={onNew} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Film size={16} /> Nouvelle demande
        </button>
        <a href="/bibliotheque" style={{ textDecoration: "none" }}>
          <button className="btn-ghost">Voir la bibliothèque</button>
        </a>
      </div>
    </div>
  );
}
