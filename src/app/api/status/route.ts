import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { pinEqual, cleanupMap, extractIp, isBodySizeOk, isJsonContentType, retryAfterHeaders } from "@/lib/security";

const STATUS_PATH = path.join(process.cwd(), "data", "status.json");

interface SiteStatus {
  maintenance:  boolean;
  message:      string;
  updatedAt:    string;
}

const DEFAULT_STATUS: SiteStatus = {
  maintenance: false,
  message:     "Le serveur est temporairement indisponible pour maintenance. Revenez bientôt !",
  updatedAt:   new Date().toISOString(),
};

async function readStatus(): Promise<SiteStatus> {
  try {
    const raw    = await fs.readFile(STATUS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SiteStatus;
    // Validation basique de structure
    if (typeof parsed.maintenance !== "boolean") return { ...DEFAULT_STATUS };
    return parsed;
  } catch {
    return { ...DEFAULT_STATUS };
  }
}

/** Écriture atomique via tmp + rename — évite la corruption en cas de crash */
async function writeStatus(s: SiteStatus): Promise<void> {
  const dir = path.dirname(STATUS_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmp = STATUS_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(s, null, 2), "utf-8");
  await fs.rename(tmp, STATUS_PATH);
}

// ── GET : état public du serveur ──────────────────────────────
export async function GET() {
  const status = await readStatus();

  const plexUrl   = process.env.PLEX_URL;
  const plexToken = process.env.PLEX_TOKEN;
  let plexOnline  = false;
  let plexLatency = -1;

  if (plexUrl && plexToken) {
    try {
      const t0  = Date.now();
      // Token via header — jamais dans l'URL
      const res = await fetch(`${plexUrl}/`, {
        headers: { "X-Plex-Token": plexToken },
        signal:  AbortSignal.timeout(4000),
        cache:   "no-store",
      });
      plexOnline  = res.ok;
      plexLatency = Date.now() - t0;
    } catch {
      plexOnline = false;
    }
  }

  return NextResponse.json({
    maintenance:  status.maintenance,
    message:      status.message,
    updatedAt:    status.updatedAt,
    plex: {
      online:  plexOnline,
      latency: plexLatency,
    },
    serverTime: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// ─── Brute-force protection ────────────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

// ── PATCH : toggle maintenance (admin PIN requis) ─────────────
export async function PATCH(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "Configuration serveur manquante" }, { status: 500 });
  }

  // ── Vérification Content-Type ─────────────────────────────────
  if (!isJsonContentType(req)) {
    return NextResponse.json({ message: "Content-Type application/json requis" }, { status: 415 });
  }

  // ── Vérification taille du corps (max 5 Ko) ───────────────────
  if (!isBodySizeOk(req, 5_000)) {
    return NextResponse.json({ message: "Requête trop grande" }, { status: 413 });
  }

  let body: { pin?: string; maintenance?: boolean; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  // Nettoyage périodique anti-memory-leak
  cleanupMap(failedAttempts);

  // ── Brute-force lockout ───────────────────────────────────────
  const ip  = extractIp(req);
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  if (attempts && now < attempts.resetAt && attempts.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { message: "Trop de tentatives. Réessaie dans 5 minutes." },
      { status: 429, headers: retryAfterHeaders(attempts.resetAt - now) }
    );
  }

  if (!body.pin || !pinEqual(body.pin, adminPin)) {
    const current = failedAttempts.get(ip) ?? { count: 0, resetAt: now + LOCKOUT_MS };
    failedAttempts.set(ip, {
      count:   current.count + 1,
      resetAt: now < current.resetAt ? current.resetAt : now + LOCKOUT_MS,
    });
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  failedAttempts.delete(ip);

  // Validation du message de maintenance (longueur)
  if (body.message && body.message.length > 500) {
    return NextResponse.json({ message: "Message de maintenance trop long (max 500 caractères)" }, { status: 400 });
  }

  const current = await readStatus();
  const updated: SiteStatus = {
    maintenance: body.maintenance ?? current.maintenance,
    message:     body.message    ?? current.message,
    updatedAt:   new Date().toISOString(),
  };

  await writeStatus(updated);
  return NextResponse.json({ success: true, ...updated });
}
