# PleXIT 🎬

Plateforme privée de demandes de films, séries, animés et musique pour les membres Discord, connectée en temps réel à un serveur Plex.

---

## Fonctionnalités

- **Formulaire de demande complet** — Film · Série · Animé/Manga · Dessin Animé · Musique
- **Envoi automatique sur Discord** — embed riche avec toutes les infos, couleur par type
- **Bibliothèque Plex en temps réel** — 4000+ titres, pagination, filtres, recherche, modal détail
- **Liens de référence** — TMDB · IMDb · Allociné · YouTube
- **Design cinématique** — dark, rouge, or

---

## Prérequis

| Outil | Version |
|-------|---------|
| Node.js | 20+ |
| npm | 9+ |
| Plex Media Server | local ou distant |

---

## Installation rapide

### Windows

Double-clique sur **`install.bat`** — il installe tout et lance le site automatiquement.

Ou en ligne de commande :
```bat
install.bat
```

### Linux / Debian

```bash
bash install.sh
```

Le script détecte automatiquement ton OS (Debian, Ubuntu, Fedora, Arch) et installe Node.js si besoin.

---

## Configuration

Copie `.env.example` vers `.env.local` et remplis les valeurs :

```env
# Ton serveur Plex
PLEX_URL=http://192.168.1.102:32400
PLEX_TOKEN=ton_token_plex

# Webhook Discord (salon de réception des demandes)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Liens publics (affichés dans la navbar)
NEXT_PUBLIC_PLEX_URL=http://192.168.1.102:32400/web
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/...
```

### Trouver ton token Plex
1. Ouvre Plex Web → clique sur un film → `···` → **Obtenir infos** → **Afficher le XML**
2. Dans l'URL de la page XML, copie la valeur après `X-Plex-Token=`

### Créer le webhook Discord
1. Discord → salon → **Paramètres** → **Intégrations** → **Webhooks** → **Nouveau webhook**
2. Copie l'URL du webhook

---

## Démarrage

### Mode développement (hot-reload)
```bash
npm run dev
# → http://localhost:3001
```

### Mode production
```bash
npm run build
npm start
# → http://localhost:3001
```

---

## Déploiement sur Debian 13

### 1. Cloner le projet sur le serveur
```bash
ssh user@IP_SERVEUR
git clone https://github.com/heiphaistos44-crypto/PleXIT-.git /home/user/plexit
cd /home/user/plexit
```

### 2. Configurer l'environnement
```bash
cp .env.example .env.local
nano .env.local   # Remplis les valeurs
```

### 3. Déployer automatiquement
```bash
bash deploy-debian.sh
```

Ce script fait tout automatiquement :
- ✅ Installe Node.js 20 et PM2
- ✅ Build Next.js
- ✅ Lance PleXIT avec PM2 (redémarre au boot)
- ✅ Installe cloudflared
- ✅ Ouvre un tunnel Cloudflare (URL publique HTTPS)

### 4. Récupérer l'URL publique
```bash
sudo journalctl -u plexit-tunnel --no-pager | grep -o 'https://.*trycloudflare.com'
```

### Mises à jour

```bash
git pull
bash update-debian.sh
```

---

## Structure du projet

```
PleXIT/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Accueil
│   │   ├── demande/page.tsx      # Formulaire de demande
│   │   ├── bibliotheque/page.tsx # Bibliothèque Plex
│   │   ├── globals.css           # Design PleXIT
│   │   ├── layout.tsx            # Layout global + Navbar
│   │   └── api/
│   │       ├── request/route.ts  # Envoi webhook Discord
│   │       ├── plex/route.ts     # API Plex (bibliothèque)
│   │       └── plex/image/route.ts # Proxy affiches Plex
│   └── components/
│       └── Navbar.tsx            # Barre de navigation
├── install.bat                   # Installation Windows
├── install.sh                    # Installation Linux/Debian
├── deploy-debian.sh              # Déploiement Debian + Cloudflare
├── update-debian.sh              # Mise à jour rapide Debian
├── start-dev.bat                 # Dev Windows (hot-reload)
├── start-plexit.bat              # Production Windows
├── .env.example                  # Template de configuration
└── DEPLOY.md                     # Guide de déploiement détaillé
```

---

## Commandes utiles (Debian / PM2)

```bash
pm2 status                        # État du serveur
pm2 logs plexit                   # Logs en direct
pm2 restart plexit                # Redémarrer
pm2 stop plexit                   # Arrêter
sudo systemctl status plexit-tunnel   # État du tunnel Cloudflare
```

---

## Architecture

```
Internet
   │  HTTPS (Cloudflare)
   ▼
Cloudflare Tunnel
   │
   ▼
Debian — PleXIT Next.js :3001
   ├── /api/plex ──────► Plex Media Server :32400
   ├── /api/plex/image ► Proxy affiches Plex
   └── /api/request ───► Discord Webhook
```

---

Plateforme privée — Accès réservé aux membres Discord.
