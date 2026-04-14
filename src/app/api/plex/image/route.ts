import { NextRequest, NextResponse } from "next/server";

// Proxy les images Plex pour éviter les problèmes CORS
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Sécurité : n'accepte que les URLs qui contiennent le token Plex configuré
  const plexUrl = process.env.PLEX_URL?.replace(/\/$/, "");
  if (plexUrl && !url.startsWith(plexUrl)) {
    return NextResponse.json({ error: "URL non autorisée" }, { status: 403 });
  }

  try {
    const imgRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = await imgRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de charger l'image" }, { status: 502 });
  }
}
