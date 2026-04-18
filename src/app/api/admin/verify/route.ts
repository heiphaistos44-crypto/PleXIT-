import { NextRequest, NextResponse } from "next/server";
import { pinEqual, cleanupMap } from "@/lib/security";

// ─── Compteur de tentatives par IP ────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;

  if (!adminPin) {
    return NextResponse.json(
      { message: "ADMIN_PIN non configuré dans .env.local" },
      { status: 500 }
    );
  }

  // Nettoyage périodique anti-memory-leak
  cleanupMap(failedAttempts);

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

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  // Comparaison en temps constant (anti timing-attack)
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
  return NextResponse.json({ success: true });
}
