import { NextRequest, NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";
import { sendPushToPseudo } from "@/lib/sendPush";
import { pinEqual, cleanupMap, extractIp, isBodySizeOk, isJsonContentType, sanitizeDiscord, retryAfterHeaders, validateAdminOrigin, isValidUUID } from "@/lib/security";

// ─── Compteur de tentatives par IP ────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  added:     "✅ Ajouté à Plex",
  rejected:  "❌ Non retenu",
  pending:   "🕐 Remis en attente",
  not_found: "🔍 Non trouvé",
};

const STATUS_COLORS: Record<string, number> = {
  added:     0x22c55e,
  rejected:  0xef4444,
  pending:   0xf59e0b,
  not_found: 0x3b82f6,
};

const TYPE_LABELS: Record<string, string> = {
  film:         "🎬 Film",
  serie:        "📺 Série",
  anime:        "⛩️ Animé / Manga",
  dessin_anime: "🎨 Dessin Animé",
  musique:      "🎵 Artiste Musical",
};

interface ReplyBody {
  pin:       string;
  requestId: string;
  status:    "added" | "rejected" | "pending" | "not_found";
  note?:     string;
}

export async function POST(req: NextRequest) {
  const adminPin   = process.env.ADMIN_PIN;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!adminPin || !webhookUrl) {
    return NextResponse.json({ message: "Configuration serveur manquante" }, { status: 500 });
  }

  // ── Validation d'origine (CSRF defense-in-depth) ─────────────
  if (!validateAdminOrigin(req)) {
    return NextResponse.json({ message: "Origine non autorisée" }, { status: 403 });
  }

  // ── Vérification Content-Type ─────────────────────────────────
  if (!isJsonContentType(req)) {
    return NextResponse.json({ message: "Content-Type application/json requis" }, { status: 415 });
  }

  // ── Vérification taille du corps (max 10 Ko) ──────────────────
  if (!isBodySizeOk(req, 10_000)) {
    return NextResponse.json({ message: "Requête trop grande" }, { status: 413 });
  }

  let body: ReplyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  // Nettoyage périodique anti-memory-leak
  cleanupMap(failedAttempts);

  // ── Vérification lockout par IP ──────────────────────────────
  const ip  = extractIp(req);
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  if (attempts && now < attempts.resetAt && attempts.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { message: "Trop de tentatives. Réessaie dans 5 minutes." },
      { status: 429, headers: retryAfterHeaders(attempts.resetAt - now) }
    );
  }

  // Vérification PIN en temps constant (anti timing-attack)
  if (!body.pin || !pinEqual(body.pin, adminPin)) {
    const current = failedAttempts.get(ip) ?? { count: 0, resetAt: now + LOCKOUT_MS };
    failedAttempts.set(ip, {
      count:   current.count + 1,
      resetAt: now < current.resetAt ? current.resetAt : now + LOCKOUT_MS,
    });
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  // PIN correct — réinitialise le compteur
  failedAttempts.delete(ip);

  if (!body.requestId) {
    return NextResponse.json({ message: "requestId manquant" }, { status: 400 });
  }
  // Validation format UUID v4 (anti injection via requestId)
  if (!isValidUUID(body.requestId)) {
    return NextResponse.json({ message: "requestId invalide" }, { status: 400 });
  }

  const VALID_STATUSES = ["added", "rejected", "pending", "not_found"] as const;
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ message: "Statut invalide" }, { status: 400 });
  }

  if ((body.note?.length ?? 0) > 500) {
    return NextResponse.json({ message: "Note trop longue (max 500 caractères)" }, { status: 400 });
  }

  const list = await readRequests();
  const idx  = list.findIndex((r) => r.id === body.requestId);

  if (idx === -1) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  const request = list[idx];
  request.status = body.status;
  if (body.note?.trim()) request.note = body.note.trim();
  if (body.status === "added") request.addedAt = new Date().toISOString();

  try {
    await writeRequests(list);
  } catch (err) {
    console.error("Erreur sauvegarde:", err);
    return NextResponse.json({ message: "Erreur de sauvegarde" }, { status: 500 });
  }

  // ── Sanitisation Discord ──────────────────────────────────────
  const shortId     = request.id.split("-")[0].toUpperCase();
  const statusLabel = STATUS_LABELS[body.status] ?? body.status;
  const typeLabel   = TYPE_LABELS[request.type]  ?? request.type;
  const safeTitre   = sanitizeDiscord(request.titre);
  const safePseudo  = sanitizeDiscord(request.pseudo);
  const safeNote    = body.note?.trim() ? sanitizeDiscord(body.note.trim()) : undefined;

  const descLines: string[] = [
    `**Statut mis à jour :** ${statusLabel}`,
    `**Titre :** ${safeTitre}${request.annee ? ` (${request.annee})` : ""}`,
    `**Type :** ${typeLabel}`,
  ];
  if (safeNote) {
    descLines.push(`\n📝 *${safeNote}*`);
  }

  const embed = {
    title:       `${statusLabel} — Réponse admin`,
    description: descLines.join("\n"),
    color:       STATUS_COLORS[body.status] ?? 0x6b7280,
    footer: {
      text: `PleXIT Admin · Réf. #${shortId} · Demande de ${safePseudo}`,
    },
    timestamp: new Date().toISOString(),
  };

  // ── Mention Discord si userId fourni ──────────────────────────
  // Re-validation du format (defense-in-depth vs données corrompues dans requests.json)
  // discordUserId doit être un entier Discord valide (17–20 chiffres uniquement)
  const safeDiscordId = (request.discordUserId && /^\d{17,20}$/.test(request.discordUserId))
    ? request.discordUserId
    : undefined;
  const discordMention = safeDiscordId ? `<@${safeDiscordId}>` : `**${safePseudo}**`;
  const discordContent = `🔔 ${discordMention} — ta demande **${safeTitre}** → ${statusLabel}`;

  let discordError = false;
  try {
    const discordRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(5000),
      body:    JSON.stringify({
        content:          discordContent,
        embeds:           [embed],
        username:         "PleXIT Admin",
        // ⛔ Seules les mentions @user explicites (<@ID>) sont autorisées, pas @everyone/@here
        allowed_mentions: { parse: ["users"] },
      }),
    });
    if (!discordRes.ok) {
      console.error("Discord webhook error:", await discordRes.text());
      discordError = true;
    }
  } catch (err) {
    console.error("Erreur Discord:", err);
    discordError = true;
  }

  // ── Notification push PWA ─────────────────────────────────────
  const pushMessages: Record<string, { title: string; body: string }> = {
    added:     { title: "✅ Ajouté à Plex !",               body: `"${request.titre}" est maintenant disponible.`          },
    rejected:  { title: "❌ Demande non retenue",            body: `"${request.titre}" n'a pas pu être ajouté.`             },
    pending:   { title: "🕐 Remis en attente",              body: `"${request.titre}" est de nouveau en attente.`           },
    not_found: { title: "🔍 Introuvable pour l'instant",    body: `"${request.titre}" n'a pas été trouvé pour le moment.`   },
  };
  const pushMsg = pushMessages[body.status];
  if (pushMsg) {
    sendPushToPseudo(request.pseudo, {
      ...pushMsg,
      url: `/historique`,
      tag: `plexit-${request.id}`,
    }).catch(console.error);
  }

  return NextResponse.json({
    success: true,
    message: discordError
      ? "Statut mis à jour, push envoyé, Discord injoignable"
      : "Statut mis à jour, Discord notifié, push envoyé",
    discordError,
  });
}
