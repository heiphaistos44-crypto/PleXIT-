import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Génère un nonce cryptographique par requête (anti-XSS inline script)
  const nonce   = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProd  = process.env.NODE_ENV === "production";
  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "") ?? "";

  // ── Extraction hostname Plex pour img-src (même logique que next.config.ts) ──
  let plexHost = "localhost";
  try {
    if (plexUrl) plexHost = new URL(plexUrl).hostname;
  } catch { /* hostname invalide → localhost */ }

  const csp = [
    "default-src 'self'",
    // 'nonce-xxx' remplace 'unsafe-inline' pour les scripts — XSS mitigation forte
    `script-src 'self' 'nonce-${nonce}'${isProd ? "" : " 'unsafe-eval'"}`,
    // Les styles inline de Next.js/Tailwind nécessitent toujours unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // data: pour SVG inline, blob: pour SW, Plex pour les images de bibliothèque
    `img-src 'self' data: blob: https://cdn.jsdelivr.net http://${plexHost}:32400 http://${plexHost} https://${plexHost}`,
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  // Injecte le nonce dans les headers de la requête (lisible par layout.tsx via headers())
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Écrit la CSP dans la réponse HTTP (visible par le navigateur)
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// Matcher : toutes les pages sauf _next/static, _next/image, favicon, et assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)).*)",
  ],
};
