#!/bin/bash
# ============================================================
#  PleXIT — Installation & Lancement (Linux / Debian)
#  Testé sur : Debian 12/13, Ubuntu 22.04+, Fedora 38+
#  Usage     : bash install.sh
# ============================================================

set -e

# Couleurs
RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"
CYAN="\033[0;36m"; BOLD="\033[1m"; NC="\033[0m"

log()     { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()     { echo -e "${RED}[ERREUR]${NC} $1"; exit 1; }
info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
section() { echo -e "\n${BOLD}${CYAN}── $1 ──${NC}"; }

clear
echo -e "${RED}"
echo "  ██████╗ ██╗     ███████╗██╗  ██╗██╗████████╗"
echo "  ██╔══██╗██║     ██╔════╝╚██╗██╔╝██║╚══██╔══╝"
echo "  ██████╔╝██║     █████╗   ╚███╔╝ ██║   ██║   "
echo "  ██╔═══╝ ██║     ██╔══╝   ██╔██╗ ██║   ██║   "
echo "  ██║     ███████╗███████╗██╔╝ ██╗██║   ██║   "
echo "  ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝   "
echo -e "${NC}"
echo -e "  ${BOLD}Installation et lancement automatique — Linux / Debian${NC}"
echo "  ============================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Détection OS ──────────────────────────────────────────
section "1/6 — Détection du système"
OS="unknown"
PKG_MANAGER=""

if [ -f /etc/debian_version ]; then
    OS="debian"
    PKG_MANAGER="apt"
    DEBIAN_VERSION=$(cat /etc/debian_version)
    info "Debian/Ubuntu détecté ($DEBIAN_VERSION)"
elif [ -f /etc/fedora-release ]; then
    OS="fedora"
    PKG_MANAGER="dnf"
    info "Fedora détecté"
elif [ -f /etc/arch-release ]; then
    OS="arch"
    PKG_MANAGER="pacman"
    info "Arch Linux détecté"
else
    warn "OS non reconnu, installation manuelle de Node.js peut être nécessaire."
fi

# ── 2. Node.js ───────────────────────────────────────────────
section "2/6 — Node.js"
NEED_NODE=false
if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" 2>/dev/null; echo $?)
    if [ "$NODE_MAJOR" = "1" ]; then
        warn "Node.js $(node --version) détecté mais version < 20 requise."
        NEED_NODE=true
    else
        log "Node.js $(node --version) ✓"
    fi
else
    NEED_NODE=true
fi

if [ "$NEED_NODE" = true ]; then
    info "Installation de Node.js 20..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        sudo apt-get update -qq
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
        sudo apt-get install -y nodejs -qq
    elif [ "$PKG_MANAGER" = "dnf" ]; then
        sudo dnf install -y nodejs npm
    elif [ "$PKG_MANAGER" = "pacman" ]; then
        sudo pacman -S --noconfirm nodejs npm
    else
        err "Installe manuellement Node.js 20+ depuis https://nodejs.org/ puis relance ce script."
    fi
    log "Node.js $(node --version) installé ✓"
fi

# ── 3. Configuration .env.local ──────────────────────────────
section "3/6 — Configuration"
if [ ! -f ".env.local" ]; then
    warn ".env.local manquant, création depuis le template..."
    cp .env.example .env.local

    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ACTION REQUISE — Configure ton .env.local           ║${NC}"
    echo -e "${YELLOW}╠══════════════════════════════════════════════════════╣${NC}"
    echo -e "${YELLOW}║                                                       ║${NC}"
    echo -e "${YELLOW}║  PLEX_URL=http://IP_DE_TON_PLEX:32400                ║${NC}"
    echo -e "${YELLOW}║  PLEX_TOKEN=ton_token_plex                           ║${NC}"
    echo -e "${YELLOW}║  DISCORD_WEBHOOK_URL=https://discord.com/api/...     ║${NC}"
    echo -e "${YELLOW}║  NEXT_PUBLIC_PLEX_URL=http://IP:32400/web            ║${NC}"
    echo -e "${YELLOW}║  NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/...   ║${NC}"
    echo -e "${YELLOW}║                                                       ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Ouvre l'éditeur disponible
    if command -v nano &>/dev/null; then
        read -rp "  Appuie sur ENTRÉE pour ouvrir nano et configurer .env.local..."
        nano .env.local
    elif command -v vim &>/dev/null; then
        read -rp "  Appuie sur ENTRÉE pour ouvrir vim et configurer .env.local..."
        vim .env.local
    else
        echo -e "  Édite le fichier manuellement : ${CYAN}nano .env.local${NC}"
        read -rp "  Appuie sur ENTRÉE quand c'est fait..."
    fi
else
    log ".env.local trouvé ✓"
fi

# Vérifie les variables essentielles
source .env.local 2>/dev/null || true
[ -z "$PLEX_TOKEN" ]           && warn "PLEX_TOKEN non défini dans .env.local"
[ -z "$DISCORD_WEBHOOK_URL" ]  && warn "DISCORD_WEBHOOK_URL non défini dans .env.local"

# ── 4. Dépendances npm ───────────────────────────────────────
section "4/6 — Dépendances npm"
if [ -d "node_modules" ]; then
    info "node_modules existant, mise à jour si nécessaire..."
    npm install --prefer-offline 2>&1 | grep -v "^npm warn" | grep -v "^$" || true
else
    info "Première installation (1-2 minutes)..."
    npm install
fi
log "Dépendances installées ✓"

# ── 5. Build ─────────────────────────────────────────────────
section "5/6 — Compilation Next.js"
info "Build de production en cours..."
npm run build
log "Compilation réussie ✓"

# ── 6. Lancement ─────────────────────────────────────────────
section "6/6 — Lancement"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  PleXIT est accessible sur :                        ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  ► Local    : http://localhost:3001                 ║${NC}"
echo -e "${GREEN}║  ► Réseau   : http://$(hostname -I | awk '{print $1}'):3001            ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Ctrl+C pour arrêter le serveur                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Ouvre le navigateur si disponible
if command -v xdg-open &>/dev/null; then
    (sleep 3 && xdg-open http://localhost:3001) &
fi

npm start
