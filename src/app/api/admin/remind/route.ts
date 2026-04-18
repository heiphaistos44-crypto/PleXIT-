import { NextRequest, NextResponse } from "next/server";
import { readRequests } from "@/lib/db";
import type { StoredRequest } from "@/lib/db";
import { pinEqual, cleanupMap, extractIp, isBodySizeOk, isJsonContentType, sanitizeDiscord, retryAfterHeaders } from "@/lib/security";

// ─── Brute-force protection ────────────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const adminPin   = process.env.ADMIN_PIN;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!adminPin || !webhookUrl) {
    return NextResponse.json({ message: "Configuration serveur manquante" }, { status: 500 });
  }

  // ── Vérification Content-Type ─────────────────────────────────
  if (!isJsonContentType(req)) {
    return NextResponse.json({ message: "Content-Type application/json requis" }, { status: 415 });
  }

  // ── Vérification taille du corps (max 2 Ko — juste un PIN) ───
  if (!isBodySizeOk(req, 2_000)) {
    return NextResponse.json({ message: "Requête trop grande" }, { status: 413 });
  }

  let body: { pin?: string };
  try {
    body = await req.json().catch(() => ({})) as { pin?: string };
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

  // Vérification PIN en temps constant
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

  try {
    const requests: StoredRequest[] = await readRequests();
    const pending = requests.filter(r => r.status === "pending");

    if (pending.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Aucune demande en attente" });
    }

    const haute   = pending.filter(r => r.priorite === "haute");
    const moyenne = pending.filter(r => r.priorite === "moyenne");
    const basse   = pending.filter(r => r.priorite === "basse");

    // Discord field value limit = 1024 chars — tronqué si nécessaire
    // Sanitise chaque titre/pseudo pour éviter les injections Discord
    const fmt = (list: StoredRequest[]) => {
      const lines = list.map(r => {
        const safeTitre  = sanitizeDiscord(r.titre);
        const safePseudo = sanitizeDiscord(r.pseudo);
        return `• **${safeTitre}**${r.annee ? ` (${r.annee})` : ""} — *${safePseudo}*`;
      });
      let result = "";
      for (const line of lines) {
        if ((result + "\n" + line).length > 950) { result += "\n*… et plus*"; break; }
        result += (result ? "\n" : "") + line;
      }
      return result || "—";
    };

    const fields = [
      ...(haute.length   ? [{ name: `🔴 Haute priorité — ${haute.length}`,   value: fmt(haute),   inline: false }] : []),
      ...(moyenne.length ? [{ name: `🟡 Normale — ${moyenne.length}`,         value: fmt(moyenne), inline: false }] : []),
      ...(basse.length   ? [{ name: `🟢 Basse — ${basse.length}`,             value: fmt(basse),   inline: false }] : []),
    ];

    const embed = {
      title:       `📋 ${pending.length} demande${pending.length > 1 ? "s" : ""} en attente de traitement`,
      description: "Voici le récapitulatif des demandes qui n'ont pas encore été traitées.",
      color:       0xf59e0b,
      fields,
      footer:    { text: "PleXIT · Rappel manuel" },
      timestamp: new Date().toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(5000),
      body:    JSON.stringify({
        embeds:           [embed],
        username:         "PleXIT",
        allowed_mentions: { parse: [] }, // ⛔ Pas de pings @everyone/@here
      }),
    });

    if (!discordRes.ok) throw new Error(`Discord ${discordRes.status}`);
    return NextResponse.json({ success: true, count: pending.length });

  } catch (err) {
    console.error("Remind error:", err);
    return NextResponse.json({ message: "Erreur lors de l'envoi du rappel" }, { status: 500 });
  }
}
