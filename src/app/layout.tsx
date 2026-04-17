import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MaintenanceBanner from "@/components/MaintenanceBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PleXIT — Demandes & Bibliothèque",
  description: "Plateforme de demandes de films et séries connectée à Plex",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PleXIT",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable} style={{ colorScheme: "dark", backgroundColor: "#080808" }}>
      {/* color + background forcés en inline pour éviter tout conflit CSS/Tailwind */}
      <body style={{
        background: "#080808",
        color: "#f9fafb",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}>
        {/* Background ambiance (derrière tout le contenu) */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(220,38,38,0.07) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(245,158,11,0.05) 0%, transparent 60%)"
        }} />
        <Navbar />
        <MaintenanceBanner />
        <main style={{ flex: 1, position: "relative", zIndex: 10 }}>{children}</main>
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "20px", textAlign: "center",
          fontSize: "0.78rem", color: "#6b7280",
          position: "relative", zIndex: 10,
        }}>
          <span style={{ color: "#9ca3af" }}>PleXIT</span>
          <span style={{ margin: "0 8px", color: "#374151" }}>•</span>
          <span style={{ color: "#6b7280" }}>Plateforme privée — Accès réservé aux membres Discord</span>
          <span style={{ margin: "0 8px", color: "#374151" }}>•</span>
          <span style={{ color: "#4b5563" }}>{new Date().getFullYear()}</span>
        </footer>
      </body>
    </html>
  );
}
