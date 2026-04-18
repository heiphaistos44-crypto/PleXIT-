import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cleanupMap } from "@/lib/security";

const SUBS_PATH = path.join(process.cwd(), "data", "subscriptions.json");
const MAX_SUBS_PER_PSEUDO = 10;

// ─── Rate limiter ─────────────────────────────────────────────
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_REQS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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

/** Écriture atomique via tmp + rename */
async function writeSubs(list: PushSub[]): Promise<void> {
  const dir = path.dirname(SUBS_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmp = SUBS_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf-8");
  await fs.rename(tmp, SUBS_PATH);
}

export async function POST(req: NextRequest) {
  // ── Rate limiting ─────────────────────────────────────────────
  cleanupMap(ipRateLimit);
  const ip  = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const rl  = ipRateLimit.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + WINDOW_MS; }
  rl.count++;
  ipRateLimit.set(ip, rl);
  if (rl.count > MAX_REQS) {
    return NextResponse.json({ message: "Trop de requêtes." }, { status: 429 });
  }

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
  if (pseudo.length > 100) {
    return NextResponse.json({ message: "Pseudo trop long (max 100 caractères)" }, { status: 400 });
  }

  // Validation de l'endpoint push (doit être une URL HTTPS valide)
  const endpoint = body.subscription?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ message: "Subscription invalide" }, { status: 400 });
  }
  if (endpoint.length > 2048) {
    return NextResponse.json({ message: "Endpoint trop long" }, { status: 400 });
  }
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ message: "Endpoint doit être HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ message: "Endpoint invalide" }, { status: 400 });
  }

  const list = await readSubs();

  // Limite max souscriptions par pseudo (anti-spam)
  const pseudoSubs = list.filter(s => s.pseudo.toLowerCase() === pseudo.toLowerCase());
  const existingIdx = list.findIndex(s => s.subscription.endpoint === endpoint);

  if (existingIdx < 0 && pseudoSubs.length >= MAX_SUBS_PER_PSEUDO) {
    return NextResponse.json(
      { message: `Maximum ${MAX_SUBS_PER_PSEUDO} abonnements push par pseudo` },
      { status: 429 }
    );
  }

  const entry: PushSub = {
    pseudo,
    subscription: body.subscription!,
    createdAt:    new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = entry;
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ message: "Endpoint requis" }, { status: 400 });
  }

  const list = await readSubs();
  const filtered = list.filter(s => s.subscription.endpoint !== body.endpoint);
  await writeSubs(filtered);
  return NextResponse.json({ success: true });
}
