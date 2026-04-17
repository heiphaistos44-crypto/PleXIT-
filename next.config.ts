import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: process.env.PLEX_HOSTNAME ?? "192.168.1.1",
        port: "32400",
        pathname: "/library/**",
      },
      {
        protocol: "https",
        hostname: process.env.PLEX_HOSTNAME ?? "192.168.1.1",
        pathname: "/library/**",
      },
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
        ],
      },
      // ── Pages : sécurité complète ────────────────────────────
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-inline requis pour Next.js inline scripts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://cdn.jsdelivr.net",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
