import { NextRequest, NextResponse } from "next/server";
import { readRequests, writeRequests } from "@/lib/db";

// PATCH /api/historique/[id] — met à jour le statut d'une demande (admin uniquement)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "ADMIN_PIN non configuré" }, { status: 500 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: "pending" | "added" | "rejected" | "not_found"; note?: string; pin?: string };

  // Vérification PIN obligatoire
  if (!body.pin || body.pin.trim() !== adminPin.trim()) {
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  if (!body.status) {
    return NextResponse.json({ message: "status requis" }, { status: 400 });
  }

  const list = await readRequests();
  const idx  = list.findIndex(r => r.id === id);

  if (idx === -1) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  list[idx] = {
    ...list[idx],
    status:  body.status,
    addedAt: body.status === "added" ? new Date().toISOString() : list[idx].addedAt,
    note:    body.note ?? list[idx].note,
  };

  await writeRequests(list);
  return NextResponse.json({ success: true, request: list[idx] });
}

// DELETE /api/historique/[id] — supprime une demande de l'historique (admin uniquement)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ message: "ADMIN_PIN non configuré" }, { status: 500 });
  }

  // Vérification PIN depuis les headers (DELETE n'a pas de body par convention REST)
  const pin = _req.headers.get("x-admin-pin") ?? "";
  if (!pin || pin.trim() !== adminPin.trim()) {
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ message: "PIN incorrect" }, { status: 401 });
  }

  const { id } = await params;
  const list  = await readRequests();
  const newList = list.filter(r => r.id !== id);

  if (newList.length === list.length) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  await writeRequests(newList);
  return NextResponse.json({ success: true });
}
