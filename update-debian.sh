#!/bin/bash
# ============================================================
#  PleXIT — Mise à jour rapide sur Debian (sans réinstaller)
#  Usage : bash update-debian.sh
# ============================================================

set -e
GREEN="\033[0;32m"; CYAN="\033[0;36m"; NC="\033[0m"
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

INSTALL_DIR="/opt/plexit"
SERVICE_USER="plexit"

info "Mise à jour des fichiers..."
sudo rsync -a \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='tools' \
    --exclude='*.bat' \
    --exclude='.env.local' \
    ./ "$INSTALL_DIR/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
log "Fichiers mis à jour ✓"

info "Rebuild..."
sudo -u "$SERVICE_USER" bash -c "cd $INSTALL_DIR && npm install --omit=dev -q && npm run build"
log "Build ✓"

info "Redémarrage..."
sudo -u "$SERVICE_USER" pm2 restart plexit
log "PleXIT redémarré ✓"

echo ""
echo "  Mise à jour terminée ! pm2 logs plexit pour voir les logs."
