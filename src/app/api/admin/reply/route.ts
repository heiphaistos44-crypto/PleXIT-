import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { StoredRequest } from "../../request/route";
import { sendPushToPseudo } from "@/lib/sendPush";

const DATA_PATH = path.join(process.cwd(), "data", "requests.json");

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

const STATUS_LABELS: Record<string, string> = {
  added:    "✅ Ajouté à Plex",
  rejected: "❌ Non retenu",
  pending:  "🕐 Remis en attente",
};

const STATUS_COLORS: Record<string, number> = {
  added:    0x22c55e,
  rejected: 0xef4444,
  pending:  0xf59e0b,
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
  status:    "added" | "rejected" | "pending";
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

  // Vérification PIN
  if (!body.pin || body.pin.trim() !== adminPin.trim()) {
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

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
    added:    { title: "✅ Ajouté à Plex !",    body: `"${request.titre}" est maintenant disponible.` },
    rejected: { title: "❌ Demande non retenue", body: `"${request.titre}" n'a pas pu être ajouté.`    },
    pending:  { title: "🕐 Remis en attente",   body: `"${request.titre}" est de nouveau en attente.`  },
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
