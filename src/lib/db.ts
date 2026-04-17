import { promises as fs } from "fs";
import path from "path";
import type { StoredRequest } from "@/types";

export const DATA_PATH  = path.join(process.cwd(), "data", "requests.json");
export const SUBS_PATH  = path.join(process.cwd(), "data", "subscriptions.json");
export const STATUS_PATH = path.join(process.cwd(), "data", "status.json");

/** Lecture atomique — retourne [] si fichier absent ou JSON invalide */
export async function readRequests(): Promise<StoredRequest[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_PATH, "utf-8")) as StoredRequest[];
  } catch {
    return [];
  }
}

/** Écriture atomique via fichier temporaire + rename pour éviter la corruption */
export async function writeRequests(list: StoredRequest[]): Promise<void> {
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmp = DATA_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf-8");
  await fs.rename(tmp, DATA_PATH); // atomique sur même fs
}

export type { StoredRequest };
