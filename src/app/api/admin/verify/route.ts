import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;

  if (!adminPin) {
    return NextResponse.json(
      { message: "ADMIN_PIN non configuré dans .env.local" },
      { status: 500 }
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Corps invalide" }, { status: 400 });
  }

  if (!body.pin || body.pin.trim() !== adminPin.trim()) {
    // Délai anti-brute-force (200ms)
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
