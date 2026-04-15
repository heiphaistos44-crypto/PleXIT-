import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// ─── Helpers fichier JSON ──────────────────────────────────────
const DATA_PATH = path.join(process.cwd(), "data", "requests.json");

export interface StoredRequest {
  id:             string;
  type:           string;
  titre:          string;
  annee?:         string;
  genres?:        string[];
  langue?:        string;
  qualite?:       string;
  saisons?:       string;
  pseudo:         string;
  discordUserId?: string; // ID numérique Discord pour les mentions
  lienType?:      string;
  lienUrl?:       string;
  commentaire?:   string;
  priorite:       string;
  requestedAt:    string; // ISO
  status:         "pending" | "added" | "rejected";
  addedAt?:       string; // ISO, si status === "added"
  note?:          string; // note de l'admin
}

async function readRequests(): Promise<StoredRequest[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as StoredRequest[];
  } catch {
    return [];
  }
}

async function writeRequests(list: StoredRequest[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf-8");
}

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

  const priorite  = body.priorite || "moyenne";
  const typeLabel = TYPE_LABELS[body.type] || body.type;
  const isSeries  = ["serie", "anime", "dessin_anime"].includes(body.type);
  const hasQuality = body.type !== "musique";

  // ── Génère l'ID immédiatement (utilisé dans le footer Discord) ──
  const requestId = crypto.randomUUID();
  const shortId   = requestId.split("-")[0].toUpperCase();

  // ── Description richement formatée ────────────────────────────
  const descLines: string[] = [];

  // Type + priorité
  descLines.push(
    `**${typeLabel}** · Priorité **${priorite.charAt(0).toUpperCase() + priorite.slice(1)}** ${PRIORITE_EMOJIS[priorite]}`
  );

  // Année + genres
  const metaParts: string[] = [];
  if (body.annee)                        metaParts.push(`📅 ${body.annee}`);
  if (body.genres && body.genres.length) metaParts.push(`🎭 ${body.genres.join(", ")}`);
  if (metaParts.length)                  descLines.push(metaParts.join("  ·  "));

  // Langue + qualité
  if (hasQuality) {
    const langLabel = LANGUE_LABELS[body.langue  || ""] || body.langue  || "Non précisée";
    const qualLabel = QUALITE_LABELS[body.qualite || ""] || body.qualite || "Non précisée";
    descLines.push(`🌐 ${langLabel}  ·  🎞️ ${qualLabel}`);
  }

  // Saisons / épisodes
  if (isSeries) {
    const seriesParts: string[] = [];
    if (body.saisons)  seriesParts.push(`🗂️ Saisons : ${body.saisons}`);
    if (body.episodes) seriesParts.push(`📝 Épisodes : ${body.episodes}`);
    if (body.enCours)  seriesParts.push("📡 En cours de diffusion");
    if (seriesParts.length) descLines.push(seriesParts.join("  ·  "));
  }

  // Vérifié sur Plex
  descLines.push(
    `\n✅ Vérifié sur Plex : **${body.verifieExistant ? "Oui — non disponible" : "Non vérifié"}**`
  );

  // Lien externe
  if (body.lienType && body.lienUrl) {
    const src = LIEN_LABELS[body.lienType] || body.lienType;
    descLines.push(`🔗 [Voir la fiche sur ${src}](${body.lienUrl})`);
  }

  // Commentaire
  if (body.commentaire) {
    descLines.push(`\n💬 *${body.commentaire.substring(0, 300)}*`);
  }

  const description = descLines.join("\n");

  // ── Embed Discord ──────────────────────────────────────────────
  const embed = {
    title: `${PRIORITE_EMOJIS[priorite]} ${body.titre}${body.annee ? ` (${body.annee})` : ""}`,
    description,
    color: TYPE_COLORS[body.type] ?? PRIORITE_COLORS[priorite],
    footer: {
      text: `Demandé par ${body.pseudoDiscord} · PleXIT · Réf. #${shortId}`,
    },
    timestamp: new Date().toISOString(),
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
      lienUrl:     body.lienUrl || undefined,
      commentaire: body.commentaire || undefined,
      priorite:    priorite,
      requestedAt: new Date().toISOString(),
      status:      "pending",
    };
    try {
      const list = await readRequests();
      list.unshift(stored); // plus récent en premier
      await writeRequests(list);
    } catch (saveErr) {
      // Ne pas bloquer la réponse si la sauvegarde échoue
      console.error("Historique save error:", saveErr);
    }

    return NextResponse.json({ success: true, message: "Demande envoyée avec succès", id: stored.id });
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json({ message: "Impossible de contacter Discord" }, { status: 503 });
  }
}
