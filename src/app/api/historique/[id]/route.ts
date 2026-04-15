import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { StoredRequest } from "@/app/api/request/route";

const DATA_PATH = path.join(process.cwd(), "data", "requests.json");

async function readRequests(): Promise<StoredRequest[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as StoredRequest[];
  } catch {
    return [];
  }
}

async function writeRequests(list: StoredRequest[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf-8");
}

// PATCH /api/historique/[id] — met à jour le statut d'une demande
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: "pending" | "added" | "rejected"; note?: string };

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

// DELETE /api/historique/[id] — supprime une demande de l'historique
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const list  = await readRequests();
  const newList = list.filter(r => r.id !== id);

  if (newList.length === list.length) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }

  await writeRequests(newList);
  return NextResponse.json({ success: true });
}
