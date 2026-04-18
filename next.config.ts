import type { NextConfig } from "next";

// Extrait le hostname depuis PLEX_URL (évite une variable env supplémentaire)
function plexHostname(): string {
  try {
    const raw = process.env.PLEX_URL;
    if (raw) return new URL(raw).hostname;
  } catch {}
  return "localhost";
}

const PLEX_HOST = plexHostname();
const isProd    = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Désactive le header X-Powered-By (fingerprinting serveur)
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "http",  hostname: PLEX_HOST, port: "32400", pathname: "/library/**" },
      { protocol: "http",  hostname: PLEX_HOST, pathname: "/library/**" },
      { protocol: "https", hostname: PLEX_HOST, pathname: "/library/**" },
    ],
  },

  async headers() {
    return [
      // ── APIs : CORS restreint à la même origine ──────────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-admin-pin" },
          { key: "X-Content-Type-Options",       value: "nosniff" },
          { key: "Cache-Control",                value: "no-store" },
        ],
      },
      // ── Pages & assets : sécurité renforcée ──────────────────
      {
        source: "/(.*)",
        headers: [
          // Clickjacking
          { key: "X-Frame-Options",  value: "DENY" },
          // MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referer leak
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Isolement fenêtre (prev cross-origin window access, Spectre mitigation)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Protection des ressources cross-origin
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          // Désactive les features inutiles (réduction surface d'attaque)
          {
            key:   "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "screen-wake-lock=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "clipboard-read=()",
              "interest-cohort=()",  // FLoC opt-out
            ].join(", "),
          },
          // HSTS — force HTTPS pour 1 an (production uniquement)
          ...(isProd ? [{
            key:   "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          }] : []),
          // Content-Security-Policy déplacé dans src/middleware.ts (nonces par requête)
        ],
      },
    ];
  },
};

export default nextConfig;
