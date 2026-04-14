import { NextRequest, NextResponse } from "next/server";

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
  priorite?: "haute" | "moyenne" | "basse";
  commentaire?: string;
  verifieExistant?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  film:         "🎬 Film",
  serie:        "📺 Série",
  anime:        "⛩️ Animé / Manga",
  dessin_anime: "🎨 Dessin Animé",
  musique:      "🎵 Musique",
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
      { message: "Webhook Discord non configuré (DISCORD_WEBHOOK_URL manquant dans .env.local)" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps de requête invalide" }, { status: 400 });
  }

  if (!body.titre?.trim()) {
    return NextResponse.json({ message: "Le titre est requis" }, { status: 400 });
  }
  if (!body.pseudoDiscord?.trim()) {
    return NextResponse.json({ message: "Le pseudo Discord est requis" }, { status: 400 });
  }

  const priorite = body.priorite || "moyenne";
  const typeLabel = TYPE_LABELS[body.type] || body.type;
  const isSeries = ["serie", "anime", "dessin_anime"].includes(body.type);
  const hasQuality = body.type !== "musique";

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // Type
  fields.push({ name: "📋 Type", value: typeLabel, inline: true });

  // Année
  fields.push({ name: "📅 Année", value: body.annee || "Non précisée", inline: true });

  // Genres
  if (body.genres && body.genres.length > 0) {
    fields.push({ name: "🎭 Genres", value: body.genres.join(", "), inline: true });
  }

  // Langue + Qualité (pas pour musique)
  if (hasQuality) {
    fields.push({
      name: "🌐 Langue",
      value: LANGUE_LABELS[body.langue || ""] || body.langue || "Non précisée",
      inline: true,
    });
    fields.push({
      name: "🎞️ Qualité",
      value: QUALITE_LABELS[body.qualite || ""] || body.qualite || "Non précisée",
      inline: true,
    });
  }

  // Saisons / épisodes (séries, animés, dessins animés)
  if (isSeries) {
    if (body.saisons) {
      fields.push({ name: "🗂️ Saisons", value: body.saisons, inline: true });
    }
    if (body.episodes) {
      fields.push({ name: "📝 Épisodes", value: body.episodes, inline: true });
    }
    if (body.enCours) {
      fields.push({ name: "📡 Diffusion", value: "Encore en cours", inline: true });
    }
  }

  // Lien externe
  if (body.lienType && body.lienUrl) {
    const sourceName = LIEN_LABELS[body.lienType] || body.lienType;
    fields.push({
      name: `🔗 ${sourceName}`,
      value: `[Voir la fiche sur ${sourceName}](${body.lienUrl})`,
      inline: false,
    });
  }

  // Commentaire
  if (body.commentaire) {
    fields.push({
      name: "💬 Commentaire",
      value: body.commentaire.substring(0, 1024),
      inline: false,
    });
  }

  // Vérifié sur Plex
  fields.push({
    name: "✅ Vérifié sur Plex",
    value: body.verifieExistant ? "Oui — non disponible" : "Non vérifié",
    inline: true,
  });

  const embed = {
    title: `${PRIORITE_EMOJIS[priorite]} ${body.titre}${body.annee ? ` (${body.annee})` : ""}`,
    color: TYPE_COLORS[body.type] ?? PRIORITE_COLORS[priorite],
    fields,
    footer: {
      text: `Demandé par ${body.pseudoDiscord} • PleXIT`,
    },
    timestamp: new Date().toISOString(),
    author: {
      name: `${typeLabel} — Priorité ${priorite.charAt(0).toUpperCase() + priorite.slice(1)}`,
    },
  };

  try {
    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `📬 **${body.pseudoDiscord}** demande : **${body.titre}** ${PRIORITE_EMOJIS[priorite]}`,
        embeds: [embed],
        username: "PleXIT",
      }),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error("Discord webhook error:", errText);
      return NextResponse.json({ message: "Erreur d'envoi vers Discord" }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Demande envoyée avec succès" });
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json({ message: "Impossible de contacter Discord" }, { status: 503 });
  }
}
