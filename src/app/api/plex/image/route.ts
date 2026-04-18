import { NextRequest, NextResponse } from "next/server";

// ─── Cache mémoire images ────────────────────────────────────
// Limite : max 500 entrées ET max 80 Mo total (LRU sur taille totale)
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; ts: number }>();
let   imageCacheTotalBytes = 0;
const IMAGE_CACHE_TTL     = 24 * 60 * 60 * 1000; // 24h
const MAX_IMAGE_SIZE      = 10 * 1024 * 1024;     // 10 Mo par image
const MAX_CACHE_TOTAL     = 80 * 1024 * 1024;     // 80 Mo total max

// Types MIME image autorisés (whitelist stricte)
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const plexUrl   = process.env.PLEX_URL?.replace(/\/$/, "");
  const plexToken = process.env.PLEX_TOKEN;

  // ── Mode 1 (sécurisé) : chemin Plex relatif ─────────────────
  // Le token n'est jamais exposé dans les URLs visibles par le navigateur.
  // ?path=/library/metadata/123/thumb/456
  const plexPath = searchParams.get("path");
  let fetchUrl: string;
  let fetchHeaders: HeadersInit;

  if (plexPath !== null) {
    if (!plexUrl || !plexToken) {
      return NextResponse.json({ error: "Plex non configuré" }, { status: 503 });
    }
    // Sécurité : chemin Plex doit commencer par /library/
    if (!plexPath.startsWith("/library/")) {
      return NextResponse.json({ error: "Chemin non autorisé" }, { status: 403 });
    }
    fetchUrl     = `${plexUrl}${plexPath}`;
    fetchHeaders = { Accept: "image/*", "X-Plex-Token": plexToken };

  // ── Mode 2 (legacy) : URL complète – conservé pour rétro-compat ─
  } else {
    const rawUrl = searchParams.get("url") ?? "";
    if (!rawUrl) {
      return NextResponse.json({ error: "Paramètre url ou path manquant" }, { status: 400 });
    }
    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }
    if (!plexUrl || !rawUrl.startsWith(plexUrl)) {
      return NextResponse.json({ error: "URL non autorisée" }, { status: 403 });
    }
    fetchUrl     = rawUrl;
    fetchHeaders = { Accept: "image/*" };
  }

  // ── Cache hit — invalide les entrées expirées ─────────────────
  const cached = imageCache.get(fetchUrl);
  if (cached && Date.now() - cached.ts >= IMAGE_CACHE_TTL) {
    // Entrée expirée : on la retire et on refetch
    imageCacheTotalBytes -= cached.buffer.byteLength;
    imageCache.delete(fetchUrl);
  }
  const validCached = imageCache.get(fetchUrl);
  if (validCached) {
    return new NextResponse(validCached.buffer, {
      status: 200,
      headers: {
        "Content-Type":  validCached.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Cache":       "HIT",
      },
    });
  }

  try {
    const imgRes = await fetch(fetchUrl, {
      headers:  fetchHeaders,
      signal:   AbortSignal.timeout(6000),
      redirect: "error",  // ⛔ Pas de suivi de redirection (anti-SSRF)
    });

    if (!imgRes.ok) {
      return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
    }

    // ── Validation du Content-Type (whitelist image) ──────────
    const rawContentType = imgRes.headers.get("content-type") ?? "";
    const contentType    = rawContentType.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_PREFIXES.some(t => contentType === t)) {
      return NextResponse.json({ error: "Type de contenu non autorisé" }, { status: 403 });
    }

    // ── Vérification de taille annoncée ──────────────────────
    const cl = imgRes.headers.get("content-length");
    if (cl && parseInt(cl, 10) > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image trop grande (max 10 Mo)" }, { status: 413 });
    }

    const buffer = await imgRes.arrayBuffer();

    // ── Vérification de taille réelle ────────────────────────
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image trop grande (max 10 Mo)" }, { status: 413 });
    }

    // ── LRU : évict jusqu'à libérer assez de mémoire ─────────
    // Critère double : taille totale (80 Mo) ET nombre d'entrées (500 max)
    while (
      imageCache.size > 0 &&
      (imageCacheTotalBytes + buffer.byteLength > MAX_CACHE_TOTAL || imageCache.size >= 500)
    ) {
      const oldest = [...imageCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (!oldest) break;
      imageCacheTotalBytes -= oldest[1].buffer.byteLength;
      imageCache.delete(oldest[0]);
    }
    imageCacheTotalBytes += buffer.byteLength;
    imageCache.set(fetchUrl, { buffer, contentType: contentType || "image/jpeg", ts: Date.now() });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":  contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Cache":       "MISS",
      },
    });
  } catch (err) {
    // TypeError = redirect bloqué (redirect:"error")
    const msg = err instanceof TypeError ? "Redirection non autorisée" : "Impossible de charger l'image";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
