import { NextRequest, NextResponse } from "next/server";
import { readRequests } from "@/lib/db";
import type { StoredRequest } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { pin?: string };
    if (!body.pin || body.pin !== process.env.ADMIN_PIN) {
      return NextResponse.json({ message: "PIN invalide" }, { status: 401 });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return NextResponse.json({ message: "Webhook non configuré" }, { status: 500 });

    const requests: StoredRequest[] = await readRequests();
    const pending = requests.filter(r => r.status === "pending");

    if (pending.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Aucune demande en attente" });
    }

    const haute   = pending.filter(r => r.priorite === "haute");
    const moyenne = pending.filter(r => r.priorite === "moyenne");
    const basse   = pending.filter(r => r.priorite === "basse");

    // Discord field value limit = 1024 chars — on tronque si nécessaire
    const fmt = (list: StoredRequest[]) => {
      const lines = list.map(r => `• **${r.titre}**${r.annee ? ` (${r.annee})` : ""} — *${r.pseudo}*`);
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
      title: `📋 ${pending.length} demande${pending.length > 1 ? "s" : ""} en attente de traitement`,
      description: "Voici le récapitulatif des demandes qui n'ont pas encore été traitées.",
      color: 0xf59e0b,
      fields,
      footer: { text: "PleXIT · Rappel manuel" },
      timestamp: new Date().toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(5000),
      body:    JSON.stringify({ embeds: [embed], username: "PleXIT" }),
    });

    if (!discordRes.ok) throw new Error(`Discord ${discordRes.status}`);
    return NextResponse.json({ success: true, count: pending.length });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
