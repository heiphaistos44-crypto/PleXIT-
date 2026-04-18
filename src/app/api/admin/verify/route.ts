import { NextRequest, NextResponse } from "next/server";
import { pinEqual, cleanupMap, extractIp, readJsonBody, isJsonContentType, retryAfterHeaders, validateAdminOrigin } from "@/lib/security";

// ─── Compteur de tentatives par IP ────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;

  if (!adminPin) {
    // ⚠️ Ne pas révéler le nom de la variable d'environnement dans le message d'erreur
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

  // ── Lecture et validation du corps (max 1 Ko — juste un PIN) ─
  const parsed = await readJsonBody<{ pin?: string }>(req, 1_000);
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  const body = parsed.data;

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
