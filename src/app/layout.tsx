import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PleXIT — Demandes & Bibliothèque",
  description: "Plateforme de demandes de films et séries connectée à Plex",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ background: "#080808" }}>
        {/* Background ambiance */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(220,38,38,0.07) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(245,158,11,0.05) 0%, transparent 60%)"
        }} />
        <Navbar />
        <main className="flex-1 relative z-10">{children}</main>
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px", textAlign: "center", fontSize: "0.78rem", color: "#4b5563", position: "relative", zIndex: 10 }}>
          <span>PleXIT</span>
          <span style={{ margin: "0 8px", color: "#1f2937" }}>•</span>
          <span>Plateforme privée — Accès réservé aux membres Discord</span>
          <span style={{ margin: "0 8px", color: "#1f2937" }}>•</span>
          <span style={{ color: "#374151" }}>2024</span>
        </footer>
      </body>
    </html>
  );
}
