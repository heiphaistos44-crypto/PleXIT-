# PleXIT — Déploiement sur Debian 13

## Prérequis
- Serveur Debian 13 accessible en SSH (même machine que Plex ou autre)
- IP du serveur Debian connue (ex: `192.168.1.102`)

---

## Étape 1 — Transférer les fichiers sur le Debian

### Option A : Depuis Windows avec WinSCP (interface graphique)
1. Télécharge **WinSCP** : https://winscp.net/
2. Connecte-toi à ton serveur Debian (IP, port 22, user/password)
3. Copie le dossier `PleXIT` vers `/home/ton_user/plexit`
4. Passe à l'étape 2

### Option B : Via ligne de commande (Git Bash / PowerShell)
```bash
scp -r C:/Users/momo/Desktop/PleXIT user@192.168.1.102:/home/user/plexit
```

### Option C : Git (recommandé pour les mises à jour futures)
```bash
# Sur Windows — initialise un dépôt local
cd C:/Users/momo/Desktop/PleXIT
git init
git add -A
git commit -m "Initial PleXIT"

# Sur le serveur Debian
ssh user@192.168.1.102
git clone /home/user/plexit /opt/plexit
```

---

## Étape 2 — Lancer le déploiement automatique

```bash
# Connexion SSH au serveur
ssh user@192.168.1.102

# Va dans le dossier PleXIT
cd /home/user/plexit   # ou là où tu as copié les fichiers

# Lance le script (fait TOUT automatiquement)
bash deploy-debian.sh
```

Le script va :
- ✅ Installer Node.js 20
- ✅ Installer PM2 (gestionnaire de processus)
- ✅ Builder le projet Next.js
- ✅ Lancer PleXIT sur le port 3001
- ✅ Configurer le démarrage automatique au boot
- ✅ Installer cloudflared
- ✅ Ouvrir un tunnel Cloudflare public

---

## Étape 3 — Configurer le .env.local sur le serveur

```bash
sudo nano /opt/plexit/.env.local
```

Contenu à remplir :
```env
PLEX_URL=http://192.168.1.102:32400
PLEX_TOKEN=Fsxpxh-QTx18FEpY6E42
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1493684853034586364/CMcruzU3noqyP_HHfZqqfgv_E6eK6zUMd-VvKJ0k36nAKSO4fM6NAzb1-IryPv1RrKrn
NEXT_PUBLIC_PLEX_URL=http://192.168.1.102:32400/web
NEXT_PUBLIC_DISCORD_INVITE=
```

Puis redémarre :
```bash
pm2 restart plexit
```

---

## Étape 4 — Récupérer l'URL publique

```bash
sudo journalctl -u plexit-tunnel --no-pager | grep -o 'https://.*trycloudflare.com'
```

Tu verras quelque chose comme :
```
https://abc-def-ghi-jkl.trycloudflare.com
```

**→ Partage cette URL sur Discord !**

---

## Commandes utiles au quotidien

```bash
# Voir le statut
pm2 status

# Voir les logs du site
pm2 logs plexit

# Redémarrer le site
pm2 restart plexit

# Voir l'URL du tunnel
sudo journalctl -u plexit-tunnel -f

# Mettre à jour après modifications
bash update-debian.sh
```

---

## URL fixe (domaine personnalisé) — Optionnel

Si tu as un domaine (ex: `plexit.ton-domaine.com`) :
1. Crée un compte Cloudflare gratuit sur https://cloudflare.com
2. Ajoute ton domaine dans Cloudflare
3. Lance : `cloudflared login` puis `cloudflared tunnel create plexit`
4. Configure `~/.cloudflared/config.yml` avec ton domaine
5. L'URL sera permanente et professionnelle

---

## Architecture finale

```
Internet
   │
   ▼
Cloudflare Tunnel (HTTPS automatique)
   │
   ▼
Debian 13 — PleXIT Next.js :3001
   │
   ├── /api/plex ──────────► Plex :32400 (même réseau)
   └── /api/request ────────► Discord Webhook
```
