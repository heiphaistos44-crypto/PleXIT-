import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readRequests, writeRequests } from "@/lib/db";
import type { StoredRequest } from "@/types";
import { cleanupMap, extractIp, readJsonBody, isJsonContentType, sanitizeDiscord, retryAfterHeaders } from "@/lib/security";

// Re-export pour compatibilité avec les anciens imports
export type { StoredRequest };

interface RequestBody {
  type: "film" | "serie" | "anime" | "dessin_anime" | "musique";
  titre: string;
  annee?: string;
  genres?: string[];
  langue?: string;
  qualite?: string;
  saisons?: string;
  episodes?: string;
  enCours?: boolean;
  lienType?: "tmdb" | "imdb" | "allocine" | "youtube" | "";
  lienUrl?: string;
  pseudoDiscord: string;
  discordUserId?: string;
  priorite?: "haute" | "moyenne" | "basse";
  commentaire?: string;
  verifieExistant?: boolean;
  force?: boolean;
}

// ─── Rate limiter par IP ───────────────────────────────────────
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_MAX       = 5;

function normalizeTitle(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ").trim();
}

const TYPE_LABELS: Record<string, string> = {
  film:         "🎬 Film",
  serie:        "📺 Série",
  anime:        "⛩️ Animé / Manga",
  dessin_anime: "🎨 Dessin Animé",
  musique:      "🎵 Artiste Musical",
};

const QUALITE_LABELS: Record<string, string> = {
  "720p":         "720p HD",
  "1080p":        "1080p Full HD",
  "1080p_bluray": "1080p Blu-ray",
  "4k":           "4K Ultra HD",
  "4k_hdr":       "4K HDR",
  "4k_dolby":     "4K Dolby Vision",
};

const LANGUE_LABELS: Record<string, string> = {
  vf:     "VF — Version Française",
  vostfr: "VOSTFR — Sous-titres FR",
  vo:     "VO — Version Originale",
  vofr:   "VOFR — VO + Sous-titres FR",
  multi:  "MULTI — Toutes langues",
};

const LIEN_LABELS: Record<string, string> = {
  tmdb:     "TMDB",
  imdb:     "IMDb",
  allocine: "Allociné",
  youtube:  "YouTube",
};

const PRIORITE_COLORS: Record<string, number> = {
  haute:   0xdc2626,
  moyenne: 0xf59e0b,
  basse:   0x22c55e,
};

const PRIORITE_EMOJIS: Record<string, string> = {
  haute:   "🔴",
  moyenne: "🟡",
  basse:   "🟢",
};

const TYPE_COLORS: Record<string, number> = {
  film:         0xdc2626,
  serie:        0x8b5cf6,
  anime:        0xea580c,
  dessin_anime: 0x06b6d4,
  musique:      0x22c55e,
};

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { message: "Configuration serveur manquante" },
      { status: 500 }
    );
  }

  // ── Vérification Content-Type ─────────────────────────────────
  if (!isJsonContentType(req)) {
    return NextResponse.json({ message: "Content-Type application/json requis" }, { status: 415 });
  }

  // ── Lecture et validation du corps (max 20 Ko) ───────────────
  const parsed = await readJsonBody<RequestBody>(req, 20_000);
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  const body = parsed.data;

  if (!body.titre?.trim()) {
    return NextResponse.json({ message: "Le titre est requis" }, { status: 400 });
  }
  if (!body.pseudoDiscord?.trim()) {
    return NextResponse.json({ message: "Le pseudo Discord est requis" }, { status: 400 });
  }

  // ── Validations de longueur et de format ───────────────────
  if (body.titre.trim().length > 200) {
    return NextResponse.json({ message: "Titre trop long (max 200 caractères)" }, { status: 400 });
  }
  if ((body.pseudoDiscord?.length ?? 0) > 100) {
    return NextResponse.json({ message: "Pseudo trop long" }, { status: 400 });
  }
  if ((body.commentaire?.length ?? 0) > 1000) {
    return NextResponse.json({ message: "Commentaire trop long (max 1000 caractères)" }, { status: 400 });
  }

  const VALID_TYPES = ["film", "serie", "anime", "dessin_anime", "musique"] as const;
  if (!VALID_TYPES.includes(body.type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ message: "Type invalide" }, { status: 400 });
  }

  const VALID_PRIOS = ["haute", "moyenne", "basse"];
  if (body.priorite && !VALID_PRIOS.includes(body.priorite)) {
    return NextResponse.json({ message: "Priorité invalide" }, { status: 400 });
  }

  if (body.discordUserId && !/^\d{17,20}$/.test(body.discordUserId.trim())) {
    return NextResponse.json({ message: "ID Discord invalide (doit être un nombre à 17-20 chiffres)" }, { status: 400 });
  }

  // ── Validation de l'année (4 chiffres, plage 1888–année+5) ───
  if (body.annee) {
    const anneeStr = body.annee.trim();
    if (!/^\d{4}$/.test(anneeStr)) {
      return NextResponse.json({ message: "Année invalide (format attendu : AAAA)" }, { status: 400 });
    }
    const anneeNum = parseInt(anneeStr, 10);
    if (anneeNum < 1888 || anneeNum > new Date().getFullYear() + 5) {
      return NextResponse.json({ message: "Année hors limites" }, { status: 400 });
    }
  }

  // ── Validation des genres ─────────────────────────────────────
  if (body.genres !== undefined) {
    if (!Array.isArray(body.genres)) {
      return NextResponse.json({ message: "Genres invalides" }, { status: 400 });
    }
    if (body.genres.length > 5) {
      return NextResponse.json({ message: "Maximum 5 genres autorisés" }, { status: 400 });
    }
    if (body.genres.some(g => typeof g !== "string" || g.trim().length === 0 || g.length > 50)) {
      return NextResponse.json({ message: "Genre invalide (max 50 caractères par genre)" }, { status: 400 });
    }
  }

  // ── Validation saisons / épisodes ────────────────────────────
  if ((body.saisons?.length ?? 0) > 100) {
    return NextResponse.json({ message: "Saisons trop long (max 100 caractères)" }, { status: 400 });
  }
  if ((body.episodes?.length ?? 0) > 100) {
    return NextResponse.json({ message: "Épisodes trop long (max 100 caractères)" }, { status: 400 });
  }

  // Validation URL lien externe (domaines autorisés uniquement)
  const ALLOWED_LINK_DOMAINS = [
    "www.themoviedb.org", "themoviedb.org",
    "www.imdb.com",       "imdb.com",
    "www.allocine.fr",    "allocine.fr",
    "www.youtube.com",    "youtube.com", "youtu.be",
  ];
  if (body.lienUrl) {
    if (!body.lienUrl.startsWith("https://")) {
      return NextResponse.json({ message: "L'URL du lien doit commencer par https://" }, { status: 400 });
    }
    try {
      const linkDomain = new URL(body.lienUrl).hostname.replace(/^www\./, "");
      if (!ALLOWED_LINK_DOMAINS.some(d => d.replace(/^www\./, "") === linkDomain)) {
        return NextResponse.json(
          { message: "Domaine non autorisé. Utilisez TMDB, IMDb, Allociné ou YouTube." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ message: "URL du lien invalide" }, { status: 400 });
    }
  }

  // ── Rate limiter par IP : max 5 requêtes par 10 minutes ───────
  cleanupMap(ipRateLimit);
  const ip  = extractIp(req);
  const now = Date.now();
  const rl  = ipRateLimit.get(ip) ?? { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + RATE_WINDOW_MS; }
  rl.count++;
  ipRateLimit.set(ip, rl);
  if (rl.count > RATE_MAX) {
    return NextResponse.json(
      { message: "Trop de requêtes. Réessaie dans quelques minutes." },
      { status: 429, headers: retryAfterHeaders(rl.resetAt - now) }
    );
  }

  // ── Anti-spam & anti-doublon ────────────────────────────────
  {
    const allRequests = await readRequests();

    // Anti-spam : max 3 demandes pending par pseudo (TOUJOURS actif, force ne bypass pas ça)
    const pseudoLower  = body.pseudoDiscord.trim().toLowerCase();
    const pendingCount = allRequests.filter(
      r => r.status === "pending" && r.pseudo.toLowerCase() === pseudoLower
    ).length;
    if (pendingCount >= 3) {
      return NextResponse.json(
        { message: "Tu as déjà 3 demandes en attente. Attends qu'elles soient traitées avant d'en ajouter une nouvelle.", code: "SPAM_LIMIT" },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    // Anti-doublon : titre normalisé (bypassable avec force=true — confirmation explicite)
    if (!body.force) {
      const normalizedNew = normalizeTitle(body.titre.trim());
      const existing = allRequests.find(
        r => r.status !== "rejected" && normalizeTitle(r.titre) === normalizedNew
      );
      if (existing) {
        return NextResponse.json(
          {
            message: "Une demande similaire existe déjà.",
            code: "DUPLICATE",
            existing: {
              id:          existing.id,
              titre:       existing.titre,
              status:      existing.status,
              pseudo:      existing.pseudo,
              requestedAt: existing.requestedAt,
            },
          },
          { status: 409 }
        );
      }
    }
  }

  const priorite  = body.priorite || "moyenne";
  const typeLabel = TYPE_LABELS[body.type] || body.type;
  const isSeries  = ["serie", "anime", "dessin_anime"].includes(body.type);
  const hasQuality = body.type !== "musique";

  const requestId = crypto.randomUUID();
  const shortId   = requestId.split("-")[0].toUpperCase();

  // ── Sanitisation Discord (anti @everyone/@here injection) ────
  const safeTitre      = sanitizeDiscord(body.titre.trim());
  const safePseudo     = sanitizeDiscord(body.pseudoDiscord.trim());
  const safeCommentaire = body.commentaire ? sanitizeDiscord(body.commentaire.substring(0, 300)) : undefined;

  type EmbedField = { name: string; value: string; inline?: boolean };
  const fields: EmbedField[] = [];

  if (hasQuality) {
    const langLabel = LANGUE_LABELS[body.langue  || ""] || body.langue  || "Non précisée";
    const qualLabel = QUALITE_LABELS[body.qualite || ""] || body.qualite || "Non précisée";
    fields.push({ name: "📅 Année",    value: body.annee || "—",  inline: true });
    fields.push({ name: "🌐 Langue",   value: langLabel,           inline: true });
    fields.push({ name: "🎞️ Qualité",  value: qualLabel,           inline: true });
  } else {
    if (body.annee) fields.push({ name: "📅 Année", value: body.annee, inline: true });
  }

  if (body.genres && body.genres.length) {
    fields.push({ name: "🎭 Genres", value: body.genres.join(", "), inline: false });
  }

  if (isSeries) {
    if (body.saisons)  fields.push({ name: "🗂️ Saisons",   value: body.saisons,  inline: true });
    if (body.episodes) fields.push({ name: "📝 Épisodes",  value: body.episodes, inline: true });
    if (body.enCours)  fields.push({ name: "📡 Diffusion", value: "En cours",    inline: true });
  }

  fields.push({
    name:  "✅ Sur Plex",
    value: body.verifieExistant ? "Vérifié — non dispo" : "Non vérifié",
    inline: true,
  });

  if (body.lienType && body.lienUrl) {
    const src = LIEN_LABELS[body.lienType] || body.lienType;
    fields.push({ name: "🔗 Référence", value: `[Voir sur ${src}](${body.lienUrl})`, inline: true });
  }

  if (safeCommentaire) {
    fields.push({ name: "💬 Commentaire", value: `*${safeCommentaire}*`, inline: false });
  }

  const prioriteLabel = priorite.charAt(0).toUpperCase() + priorite.slice(1);

  const TYPE_THUMBS: Record<string, string> = {
    film:         "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3ac.png",
    serie:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4fa.png",
    anime:        "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26e9.png",
    dessin_anime: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a8.png",
    musique:      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3b5.png",
  };

  const embed = {
    author: {
      name: `${typeLabel} · Priorité ${prioriteLabel} ${PRIORITE_EMOJIS[priorite]}`,
    },
    title: `${safeTitre}${body.annee ? ` (${body.annee})` : ""}`,
    color: TYPE_COLORS[body.type] ?? PRIORITE_COLORS[priorite],
    thumbnail: { url: TYPE_THUMBS[body.type] ?? TYPE_THUMBS.film },
    fields,
    footer: {
      text: `Demandé par ${safePseudo} · PleXIT · Réf. #${shortId}`,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const discordRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(5000),
      body:    JSON.stringify({
        content: `📬 **${safePseudo}** demande : **${safeTitre}** ${PRIORITE_EMOJIS[priorite]}`,
        embeds:  [embed],
        username: "PleXIT",
        // ⛔ Désactive TOUS les pings @mention dans le webhook (défense en profondeur)
        allowed_mentions: { parse: [] },
      }),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error("Discord webhook error:", errText);
      return NextResponse.json({ message: "Erreur d'envoi vers Discord" }, { status: 502 });
    }

    // ── Sauvegarde dans l'historique local ──────────────────────
    const stored: StoredRequest = {
      id:          requestId,
      type:        body.type,
      titre:       body.titre.trim(),
      annee:       body.annee,
      genres:      body.genres,
      langue:      body.langue,
      qualite:     body.qualite,
      saisons:     body.saisons,
      pseudo:         body.pseudoDiscord.trim(),
      discordUserId:  body.discordUserId?.trim() || undefined,
      lienType:       body.lienType || undefined,
      lienUrl:        body.lienUrl || undefined,
      commentaire:    body.commentaire || undefined,
      priorite:       priorite,
      requestedAt:    new Date().toISOString(),
      status:         "pending",
    };
    try {
      const list = await readRequests();
      list.unshift(stored);
      await writeRequests(list);
    } catch (saveErr) {
      console.error("Historique save error:", saveErr);
    }

    return NextResponse.json({ success: true, message: "Demande envoyée avec succès", id: stored.id });
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json({ message: "Impossible de contacter Discord" }, { status: 503 });
  }
}
