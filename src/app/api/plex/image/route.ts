import { NextRequest, NextResponse } from "next/server";

// Cache mémoire côté serveur pour éviter de re-fetcher les mêmes images
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; ts: number }>();
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "");
  if (plexUrl && !url.startsWith(plexUrl)) {
    return NextResponse.json({ error: "URL non autorisée" }, { status: 403 });
  }

  // Vérifie le cache mémoire serveur
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.ts < IMAGE_CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      status: 200,
      headers: {
        "Content-Type":  cached.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Cache":       "HIT",
      },
    });
  }

  try {
    const imgRes = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      // Demande une vignette redimensionnée si possible (Plex supporte ça)
    });

    if (!imgRes.ok) {
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = await imgRes.arrayBuffer();

    // Stocke en cache mémoire (max 500 images ~50MB)
    if (imageCache.size > 500) {
      // Supprime l'entrée la plus ancienne
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) imageCache.delete(oldest[0]);
    }
    imageCache.set(url, { buffer, contentType, ts: Date.now() });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Cache":       "MISS",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de charger l'image" }, { status: 502 });
  }
}
