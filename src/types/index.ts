// ─── Types partagés PleXIT ─────────────────────────────────────

export interface StoredRequest {
  id:             string;
  type:           string;
  titre:          string;
  annee?:         string;
  genres?:        string[];
  langue?:        string;
  qualite?:       string;
  saisons?:       string;
  pseudo:         string;
  discordUserId?: string; // ID numérique Discord pour les mentions
  lienType?:      string;
  lienUrl?:       string;
  commentaire?:   string;
  priorite:       string;
  requestedAt:    string; // ISO
  status:         "pending" | "added" | "rejected" | "not_found";
  addedAt?:       string; // ISO, si status === "added"
  note?:          string; // note de l'admin
}

export interface PushSub {
  pseudo:       string;
  subscription: {
    endpoint: string;
    keys:     { p256dh: string; auth: string };
  };
  createdAt:    string;
}

export interface SiteStatus {
  maintenance: boolean;
  message:     string;  // message affiché en maintenance
  updatedAt:   string;  // ISO
}
