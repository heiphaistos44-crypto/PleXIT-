import crypto from "crypto";
import type { NextRequest } from "next/server";

// ─── Comparaison PIN en temps constant (anti timing-attack) ───
// Hash SHA-256 des deux valeurs → timingSafeEqual sur 32 octets
export function pinEqual(submitted: string, stored: string): boolean {
  const h1 = crypto.createHash("sha256").update(submitted.trim()).digest();
  const h2 = crypto.createHash("sha256").update(stored.trim()).digest();
  return crypto.timingSafeEqual(h1, h2);
}

// ─── Nettoyage des Maps de rate-limit expirées ────────────────
// Supprime les entrées expirées pour éviter le memory leak
export function cleanupMap<T extends { resetAt: number }>(
  map: Map<string, T>
): void {
  const now = Date.now();
  for (const [key, val] of map.entries()) {
    if (now >= val.resetAt) map.delete(key);
  }
}

// ─── Extraction IP robuste (multi-proxy / multi-plateforme) ──
// Priorité : Cloudflare → Vercel → Nginx/Real-IP → X-Forwarded-For → unknown
// Chaque valeur est validée (format IP) pour prévenir l'injection via header.
export function extractIp(req: NextRequest): string {
  const candidates = [
    req.headers.get("cf-connecting-ip"),           // Cloudflare (non-spoofable derrière CF)
    req.headers.get("x-vercel-ip-address"),         // Vercel Edge Network
    req.headers.get("x-real-ip"),                   // Nginx / Traefik
    req.headers.get("x-forwarded-for")?.split(",")[0], // Standard proxy (1er = client)
  ];

  for (const raw of candidates) {
    const ip = raw?.trim();
    if (ip && isValidIp(ip)) return ip;
  }
  return "unknown";
}

/** Valide qu'une chaîne est une adresse IPv4 ou IPv6 (protection header injection) */
function isValidIp(ip: string): boolean {
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split(".").map(Number).every(n => n >= 0 && n <= 255);
  }
  // IPv6 (format hexadécimal + deux-points + brackets optionnels)
  return /^[0-9a-f:]{2,45}$/i.test(ip.replace(/^\[|\]$/g, ""));
}

// ─── Vérification taille du corps de requête ─────────────────
// Retourne true si le Content-Length est dans la limite, false sinon.
// Si Content-Length est absent, on laisse passer (lu après lecture effective).
export function isBodySizeOk(req: NextRequest, maxBytes: number): boolean {
  const cl = req.headers.get("content-length");
  if (!cl) return true;
  const size = parseInt(cl, 10);
  return !isNaN(size) && size <= maxBytes;
}

// ─── Vérification Content-Type application/json ───────────────
export function isJsonContentType(req: NextRequest): boolean {
  return (req.headers.get("content-type") ?? "").includes("application/json");
}

// ─── Sanitization contenu Discord ────────────────────────────
// Prévient les injections @everyone / @here qui pingueraient tout le serveur Discord.
// Stratégie : zero-width space (U+200B) après @ pour casser le ping.
// COMPLÉMENT : passer allowed_mentions:{parse:[]} dans le payload webhook.
export function sanitizeDiscord(s: string): string {
  if (!s) return s;
  return s
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi,     "@\u200bhere")
    .replace(/@([^\s])/g,   "@\u200b$1"); // casse les autres @mentions
}

// ─── Header Retry-After RFC 7231 ─────────────────────────────
// À joindre aux réponses 429 pour indiquer quand réessayer.
export function retryAfterHeaders(windowMs: number): Record<string, string> {
  return { "Retry-After": String(Math.ceil(windowMs / 1000)) };
}
