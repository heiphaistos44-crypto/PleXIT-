@echo off
chcp 65001 >nul
title PleXIT — Installation & Lancement (Windows)
color 0C

echo.
echo  ██████╗ ██╗     ███████╗██╗  ██╗██╗████████╗
echo  ██╔══██╗██║     ██╔════╝╚██╗██╔╝██║╚══██╔══╝
echo  ██████╔╝██║     █████╗   ╚███╔╝ ██║   ██║
echo  ██╔═══╝ ██║     ██╔══╝   ██╔██╗ ██║   ██║
echo  ██║     ███████╗███████╗██╔╝ ██╗██║   ██║
echo  ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝
echo.
echo  Installation et lancement automatique — Windows
echo  ============================================================
echo.

cd /d "%~dp0"

:: ── Vérification Node.js ──────────────────────────────────────
echo [1/5] Vérification de Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERREUR] Node.js n'est pas installe !
    echo.
    echo  Telecharge et installe Node.js 20+ depuis :
    echo  https://nodejs.org/
    echo.
    echo  Relance ce script apres l'installation.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER% detecte.

:: ── Vérification .env.local ───────────────────────────────────
echo.
echo [2/5] Vérification de la configuration...
if not exist ".env.local" (
    echo  [SETUP] Création du fichier de configuration...
    copy ".env.example" ".env.local" >nul
    echo.
    echo  ╔══════════════════════════════════════════════════════╗
    echo  ║  ACTION REQUISE — Configure ton .env.local          ║
    echo  ╠══════════════════════════════════════════════════════╣
    echo  ║  Ouvre le fichier .env.local et remplis :           ║
    echo  ║                                                      ║
    echo  ║  PLEX_URL=http://IP_DE_TON_PLEX:32400               ║
    echo  ║  PLEX_TOKEN=ton_token_ici                           ║
    echo  ║  DISCORD_WEBHOOK_URL=https://discord.com/...        ║
    echo  ╚══════════════════════════════════════════════════════╝
    echo.
    start notepad ".env.local"
    echo  Le fichier .env.local s'est ouvert dans le Bloc-notes.
    echo  Remplis les valeurs, sauvegarde, puis appuie sur une touche.
    pause
) else (
    echo  [OK] .env.local trouvé.
)

:: ── Installation des dépendances ──────────────────────────────
echo.
echo [3/5] Installation des dépendances npm...
if exist "node_modules" (
    echo  [OK] node_modules déjà présent, vérification des mises à jour...
    call npm install --prefer-offline 2>&1 | findstr /v "npm warn" | findstr /v "^$"
) else (
    echo  [INSTALL] Première installation, patiente (1-2 min)...
    call npm install
    if errorlevel 1 (
        echo  [ERREUR] npm install a échoué.
        pause
        exit /b 1
    )
)
echo  [OK] Dépendances installées.

:: ── Build de production ───────────────────────────────────────
echo.
echo [4/5] Compilation du projet...
if exist ".next" (
    echo  [OK] Build existant trouvé. Reconstruction...
)
call npm run build
if errorlevel 1 (
    echo.
    echo  [ERREUR] La compilation a échoué.
    echo  Vérifie que .env.local est bien configuré.
    pause
    exit /b 1
)
echo  [OK] Compilation réussie.

:: ── Lancement ─────────────────────────────────────────────────
echo.
echo [5/5] Démarrage de PleXIT...
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  PleXIT est accessible sur :                        ║
echo  ║                                                      ║
echo  ║  ► Local    : http://localhost:3001                 ║
echo  ║  ► Réseau   : http://[TON-IP]:3001                  ║
echo  ║                                                      ║
echo  ║  Ferme cette fenêtre pour arrêter le serveur.       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: Ouvre le navigateur après 3 secondes
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3001"

call npm start
pause
