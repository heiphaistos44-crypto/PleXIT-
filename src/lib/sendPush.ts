import webpush from "web-push";
import { promises as fs } from "fs";
import path from "path";

const SUBS_PATH = path.join(process.cwd(), "data", "subscriptions.json");

interface PushSub {
  pseudo:       string;
  subscription: webpush.PushSubscription;
  createdAt:    string;
}

webpush.setVapidDetails(
  process.env.VAPID_CONTACT     ?? "mailto:admin@plexit.local",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

async function readSubs(): Promise<PushSub[]> {
  try {
    const raw = await fs.readFile(SUBS_PATH, "utf-8");
    return JSON.parse(raw) as PushSub[];
  } catch {
    return [];
  }
}

/** Écriture atomique via tmp + rename — évite la corruption en cas de crash */
async function writeSubs(list: PushSub[]): Promise<void> {
  const dir = path.dirname(SUBS_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmp = SUBS_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf-8");
  await fs.rename(tmp, SUBS_PATH);
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

/**
 * Envoie une notification push à tous les appareils abonnés d'un pseudo.
 * Les subscriptions expirées sont automatiquement supprimées.
 */
export async function sendPushToPseudo(pseudo: string, payload: PushPayload): Promise<void> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys manquantes — push ignoré");
    return;
  }

  const list    = await readSubs();
  const targets = list.filter(s => s.pseudo.toLowerCase() === pseudo.toLowerCase());

  if (targets.length === 0) return;

  const expired: string[] = [];

  await Promise.allSettled(
    targets.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(payload));
      } catch (err: unknown) {
        // 410 Gone = subscription expirée, 404 = introuvable
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          expired.push(s.subscription.endpoint);
        } else {
          console.error("Push error:", err);
        }
      }
    })
  );

  // Nettoie les subscriptions expirées
  if (expired.length > 0) {
    const cleaned = list.filter(s => !expired.includes(s.subscription.endpoint));
    await writeSubs(cleaned).catch(console.error);
  }
}
