import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SUBS_PATH = path.join(process.cwd(), "data", "subscriptions.json");

interface PushSub {
  pseudo:       string;
  subscription: PushSubscriptionJSON;
  createdAt:    string;
}

async function readSubs(): Promise<PushSub[]> {
  try {
    const raw = await fs.readFile(SUBS_PATH, "utf-8");
    return JSON.parse(raw) as PushSub[];
  } catch {
    return [];
  }
}

async function writeSubs(list: PushSub[]): Promise<void> {
  await fs.mkdir(path.dirname(SUBS_PATH), { recursive: true });
  await fs.writeFile(SUBS_PATH, JSON.stringify(list, null, 2), "utf-8");
}

export async function POST(req: NextRequest) {
  let body: { pseudo?: string; subscription?: PushSubscriptionJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  const pseudo = body.pseudo?.trim();
  if (!pseudo) {
    return NextResponse.json({ message: "Pseudo requis" }, { status: 400 });
  }
  if (!body.subscription?.endpoint) {
    return NextResponse.json({ message: "Subscription invalide" }, { status: 400 });
  }

  const list = await readSubs();

  // Remplace si même endpoint existe déjà (renouvellement)
  const idx = list.findIndex(s => s.subscription.endpoint === body.subscription!.endpoint);
  const entry: PushSub = {
    pseudo,
    subscription: body.subscription,
    createdAt:    new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }

  try {
    await writeSubs(list);
  } catch (err) {
    console.error("Erreur sauvegarde subscription:", err);
    return NextResponse.json({ message: "Erreur de sauvegarde" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  let body: { endpoint?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Corps invalide" }, { status: 400 }); }

  if (!body.endpoint) return NextResponse.json({ message: "Endpoint requis" }, { status: 400 });

  const list = await readSubs();
  const filtered = list.filter(s => s.subscription.endpoint !== body.endpoint);
  await writeSubs(filtered);
  return NextResponse.json({ success: true });
}
