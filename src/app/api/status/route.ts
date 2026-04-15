import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const STATUS_PATH = path.join(process.cwd(), "data", "status.json");

interface SiteStatus {
  maintenance:  boolean;
  message:      string;   // message affiché en maintenance
  updatedAt:    string;   // ISO
}

const DEFAULT_STATUS: SiteStatus = {
  maintenance: false,
  message:     "Le serveur est temporairement indisponible pour maintenance. Revenez bientôt !",
  updatedAt:   new Date().toISOString(),
};

async function readStatus(): Promise<SiteStatus> {
  try {
    const raw = await fs.readFile(STATUS_PATH, "utf-8");
    return JSON.parse(raw) as SiteStatus;
  } catch {
    return { ...DEFAULT_STATUS };
  }
}

async function writeStatus(s: SiteStatus): Promise<void> {
  await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await fs.writeFile(STATUS_PATH, JSON.stringify(s, null, 2), "utf-8");
}

// ── GET : état public du serveur ──────────────────────────────
export async function GET() {
  const status = await readStatus();

  // Teste la connectivité Plex
  const plexUrl   = process.env.PLEX_URL;
  const plexToken = process.env.PLEX_TOKEN;
  let plexOnline  = false;
  let plexLatency = -1;

  if (plexUrl && plexToken) {
    try {
      const t0  = Date.now();
      const res = await fetch(`${plexUrl}/?X-Plex-Token=${plexToken}`, {
        signal: AbortSignal.timeout(4000),
        cache:  "no-store",
      });
      plexOnline  = res.ok;
      plexLatency = Date.now() - t0;
    } catch {
      plexOnline = false;
    }
  }

  return NextResponse.json({
    maintenance:  status.maintenance,
    message:      status.message,
    updatedAt:    status.updatedAt,
    plex: {
      online:  plexOnline,
      latency: plexLatency,
    },
    serverTime: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// ── PATCH : toggle maintenance (admin PIN requis) ─────────────
export async function PATCH(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "ADMIN_PIN non configuré" }, { status: 500 });
  }

  let body: { pin?: string; maintenance?: boolean; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  if (!body.pin || body.pin.trim() !== adminPin.trim()) {
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  const current = await readStatus();
  const updated: SiteStatus = {
    maintenance: body.maintenance ?? current.maintenance,
    message:     body.message    ?? current.message,
    updatedAt:   new Date().toISOString(),
  };

  await writeStatus(updated);
  return NextResponse.json({ success: true, ...updated });
}
