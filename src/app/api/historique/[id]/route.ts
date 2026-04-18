import { NextRequest, NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";
import { pinEqual, cleanupMap, extractIp, retryAfterHeaders, isValidUUID } from "@/lib/security";

// ─── Brute-force protection ───────────────────────────────────
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

// ─── PATCH : met à jour le statut d'une demande (admin) ───────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "ADMIN_PIN non configuré" }, { status: 500 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: "pending" | "added" | "rejected" | "not_found"; note?: string; pin?: string };

  // ── Brute-force lockout ───────────────────────────────────────
  cleanupMap(failedAttempts);
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
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  // PIN correct — réinitialise le compteur
  failedAttempts.delete(ip);

  // Validation format UUID v4 (anti path traversal / injection)
  if (!isValidUUID(id)) {
    return NextResponse.json({ message: "Identifiant invalide" }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ message: "status requis" }, { status: 400 });
  }

  const VALID_STATUSES = ["pending", "added", "rejected", "not_found"] as const;
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ message: "Statut invalide" }, { status: 400 });
  }

  if ((body.note?.length ?? 0) > 500) {
    return NextResponse.json({ message: "Note trop longue (max 500 caractères)" }, { status: 400 });
  }

  const list = await readRequests();
  const idx  = list.findIndex(r => r.id === id);

  if (idx === -1) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  list[idx] = {
    ...list[idx],
    status:  body.status,
    addedAt: body.status === "added" ? new Date().toISOString() : list[idx].addedAt,
    note:    body.note ?? list[idx].note,
  };

  await writeRequests(list);
  return NextResponse.json({ success: true, request: list[idx] });
}

// ─── DELETE : supprime une demande (admin) ────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "ADMIN_PIN non configuré" }, { status: 500 });
  }

  // ── Brute-force lockout ───────────────────────────────────────
  cleanupMap(failedAttempts);
  const ip  = extractIp(_req);
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  if (attempts && now < attempts.resetAt && attempts.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { message: "Trop de tentatives. Réessaie dans 5 minutes." },
      { status: 429, headers: retryAfterHeaders(attempts.resetAt - now) }
    );
  }

  // PIN via body JSON (header x-admin-pin exposé dans les logs proxy)
  let body: { pin?: string } = {};
  try { body = await _req.json(); } catch { /* corps vide ou invalide → pin vide */ }
  const pin = body.pin ?? "";
  if (!pin || !pinEqual(pin, adminPin)) {
    const current = failedAttempts.get(ip) ?? { count: 0, resetAt: now + LOCKOUT_MS };
    failedAttempts.set(ip, {
      count:   current.count + 1,
      resetAt: now < current.resetAt ? current.resetAt : now + LOCKOUT_MS,
    });
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  failedAttempts.delete(ip);

  const { id } = await params;

  // Validation format UUID v4 (anti path traversal / injection)
  if (!isValidUUID(id)) {
    return NextResponse.json({ message: "Identifiant invalide" }, { status: 400 });
  }

  const list  = await readRequests();
  const newList = list.filter(r => r.id !== id);

  if (newList.length === list.length) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  await writeRequests(newList);
  return NextResponse.json({ success: true });
}
