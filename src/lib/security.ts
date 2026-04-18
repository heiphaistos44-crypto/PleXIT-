import crypto from "crypto";

// ─── Comparaison PIN en temps constant (anti timing-attack) ──────
// Hash SHA-256 des deux valeurs → timingSafeEqual sur 32 octets
export function pinEqual(submitted: string, stored: string): boolean {
  const h1 = crypto.createHash("sha256").update(submitted.trim()).digest();
  const h2 = crypto.createHash("sha256").update(stored.trim()).digest();
  return crypto.timingSafeEqual(h1, h2);
}

// ─── Nettoyage périodique des Maps rate-limit ────────────────────
// Supprime les entrées expirées pour éviter le memory leak
export function cleanupMap<T extends { resetAt: number }>(
  map: Map<string, T>
): void {
  const now = Date.now();
  for (const [key, val] of map.entries()) {
    if (now >= val.resetAt) map.delete(key);
  }
}
