#!/bin/bash
# ============================================================
#  PleXIT — Script de déploiement automatique pour Debian 13
#  Usage : bash deploy-debian.sh
# ============================================================

set -e

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERREUR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     PleXIT — Déploiement Debian 13      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

INSTALL_DIR="/opt/plexit"
SERVICE_USER="plexit"

# ── 1. Dépendances système ──────────────────────────────────
info "Vérification des dépendances..."
sudo apt-get update -qq

# Node.js 20+
if ! command -v node &>/dev/null || [ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)' 2>&1; echo $?)" = "1" ]; then
    info "Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
    sudo apt-get install -y nodejs -qq
fi
log "Node.js $(node --version) ✓"

# PM2 (gestionnaire de processus)
if ! command -v pm2 &>/dev/null; then
    info "Installation de PM2..."
    sudo npm install -g pm2 -q
fi
log "PM2 $(pm2 --version) ✓"

# ── 2. Créer l'utilisateur système ─────────────────────────
if ! id "$SERVICE_USER" &>/dev/null; then
    info "Création de l'utilisateur $SERVICE_USER..."
    sudo useradd --system --shell /bin/false --home-dir "$INSTALL_DIR" "$SERVICE_USER"
fi
log "Utilisateur $SERVICE_USER ✓"

# ── 3. Dossier d'installation ──────────────────────────────
sudo mkdir -p "$INSTALL_DIR"
sudo chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

info "Copie des fichiers vers $INSTALL_DIR..."
# Copie tout sauf node_modules, .next, .git, tools
sudo rsync -a \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='tools' \
    --exclude='*.bat' \
    --exclude='*.exe' \
    ./ "$INSTALL_DIR/"

sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
log "Fichiers copiés ✓"

# ── 4. Vérification .env.local ─────────────────────────────
if [ ! -f "$INSTALL_DIR/.env.local" ]; then
    warn ".env.local manquant ! Copie du template..."
    sudo cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env.local"
    echo ""
    echo -e "${RED}  !! ACTION REQUISE !!${NC}"
    echo "  Édite le fichier : sudo nano $INSTALL_DIR/.env.local"
    echo "  Remplis PLEX_URL, PLEX_TOKEN et DISCORD_WEBHOOK_URL"
    echo ""
fi

# ── 5. Installation des dépendances npm ───────────────────
info "Installation des dépendances npm..."
sudo -u "$SERVICE_USER" bash -c "cd $INSTALL_DIR && npm install --omit=dev -q"
log "npm install ✓"

# ── 6. Build de production ────────────────────────────────
info "Compilation Next.js (peut prendre 1-2 minutes)..."
sudo -u "$SERVICE_USER" bash -c "cd $INSTALL_DIR && npm run build"
log "Build ✓"

# ── 7. PM2 — lancement et persistance ────────────────────
info "Configuration PM2..."
sudo -u "$SERVICE_USER" bash -c "cd $INSTALL_DIR && pm2 delete plexit 2>/dev/null || true"
sudo -u "$SERVICE_USER" bash -c "cd $INSTALL_DIR && pm2 start npm --name 'plexit' -- start"
sudo -u "$SERVICE_USER" bash -c "pm2 save"

# Démarre PM2 au boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$SERVICE_USER" --hp "$INSTALL_DIR" 2>/dev/null | tail -1 | sudo bash || true
log "PM2 configuré et actif ✓"

# ── 8. Installation cloudflared ───────────────────────────
if ! command -v cloudflared &>/dev/null; then
    info "Installation de cloudflared..."
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list > /dev/null
    sudo apt-get update -qq && sudo apt-get install -y cloudflared -qq
    log "cloudflared installé ✓"
else
    log "cloudflared déjà installé ✓"
fi

# ── 9. Service Cloudflare Tunnel ──────────────────────────
info "Création du service cloudflared..."
sudo tee /etc/systemd/system/plexit-tunnel.service > /dev/null <<EOF
[Unit]
Description=PleXIT — Cloudflare Tunnel
After=network.target plexit.service
Requires=network.target

[Service]
Type=simple
User=$SERVICE_USER
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable plexit-tunnel
sudo systemctl start plexit-tunnel
log "Service tunnel créé ✓"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        DÉPLOIEMENT TERMINÉ ! ✓          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  Commandes utiles :"
echo "  ├─ Voir les logs Next.js  : pm2 logs plexit"
echo "  ├─ Voir les logs tunnel   : sudo journalctl -u plexit-tunnel -f"
echo "  ├─ URL publique           : sudo journalctl -u plexit-tunnel | grep trycloudflare"
echo "  ├─ Redémarrer le site     : pm2 restart plexit"
echo "  └─ Statut                 : pm2 status"
echo ""
echo "  Pour récupérer l'URL publique :"
echo "  sudo journalctl -u plexit-tunnel --no-pager | grep -o 'https://.*trycloudflare.com'"
echo ""
