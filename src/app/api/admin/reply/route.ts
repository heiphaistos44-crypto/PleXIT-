import { NextRequest, NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";
import { sendPushToPseudo } from "@/lib/sendPush";

// ─── Compteur de tentatives par IP ────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

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
  const adminPin    = process.env.ADMIN_PIN;
  const webhookUrl  = process.env.DISCORD_WEBHOOK_URL;

  if (!adminPin || !webhookUrl) {
    return NextResponse.json(
      { message: "Configuration manquante (ADMIN_PIN ou DISCORD_WEBHOOK_URL)" },
      { status: 500 }
    );
  }

  let body: ReplyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  // ── Vérification lockout par IP ──────────────────────────────
  const ip  = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  if (attempts && now < attempts.resetAt && attempts.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { message: "Trop de tentatives. Réessaie dans 5 minutes." },
      { status: 429 }
    );
  }

  // Vérification PIN
  if (!body.pin || body.pin.trim() !== adminPin.trim()) {
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

  // Lecture + mise à jour du fichier JSON
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

  // Envoi de la réponse Discord
  const shortId    = request.id.split("-")[0].toUpperCase();
  const statusLabel = STATUS_LABELS[body.status] ?? body.status;
  const typeLabel   = TYPE_LABELS[request.type]  ?? request.type;

  const descLines: string[] = [
    `**Statut mis à jour :** ${statusLabel}`,
    `**Titre :** ${request.titre}${request.annee ? ` (${request.annee})` : ""}`,
    `**Type :** ${typeLabel}`,
  ];
  if (body.note?.trim()) {
    descLines.push(`\n📝 *${body.note.trim()}*`);
  }

  const embed = {
    title:       `${statusLabel} — Réponse admin`,
    description: descLines.join("\n"),
    color:       STATUS_COLORS[body.status] ?? 0x6b7280,
    footer: {
      text: `PleXIT Admin · Réf. #${shortId} · Demande de ${request.pseudo}`,
    },
    timestamp: new Date().toISOString(),
  };

  // ── Mention Discord si userId fourni ──────────────────────
  const discordMention = request.discordUserId ? `<@${request.discordUserId}>` : `**${request.pseudo}**`;
  const discordContent = `🔔 ${discordMention} — ta demande **${request.titre}** → ${statusLabel}`;

  let discordError = false;
  try {
    const discordRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(5000),
      body:    JSON.stringify({
        content:  discordContent,
        embeds:   [embed],
        username: "PleXIT Admin",
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

  // ── Notification push PWA ─────────────────────────────────
  const pushMessages: Record<string, { title: string; body: string }> = {
    added:     { title: "✅ Ajouté à Plex !",      body: `"${request.titre}" est maintenant disponible.`          },
    rejected:  { title: "❌ Demande non retenue",   body: `"${request.titre}" n'a pas pu être ajouté.`             },
    pending:   { title: "🕐 Remis en attente",     body: `"${request.titre}" est de nouveau en attente.`           },
    not_found: { title: "🔍 Introuvable pour l'instant", body: `"${request.titre}" n'a pas été trouvé pour le moment.` },
  };
  const pushMsg = pushMessages[body.status];
  if (pushMsg) {
    sendPushToPseudo(request.pseudo, {
      ...pushMsg,
      url: `/historique`,
      tag: `plexit-${request.id}`,
    }).catch(console.error); // fire & forget
  }

  return NextResponse.json({
    success: true,
    message: discordError
      ? "Statut mis à jour, push envoyé, Discord injoignable"
      : "Statut mis à jour, Discord notifié, push envoyé",
    discordError,
  });
}
