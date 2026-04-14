@echo off
title PleXIT — Deploiement Cloudflare Tunnel
color 0E

echo.
echo  ============================================================
echo    PleXIT - Cloudflare Tunnel (acces public internet)
echo  ============================================================
echo.

cd /d "%~dp0"

:: Verifie si cloudflared est deja installe
where cloudflared >nul 2>&1
if not errorlevel 1 (
    echo [OK] cloudflared est deja installe.
    goto :start_server
)

echo [INSTALL] Telechargement de cloudflared...
echo.

:: Cree le dossier tools si necessaire
if not exist "tools" mkdir tools

:: Telecharge cloudflared pour Windows x64
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "tools\cloudflared.exe"

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec du telechargement.
    echo Telecharge manuellement depuis :
    echo https://github.com/cloudflare/cloudflared/releases/latest
    echo et place cloudflared.exe dans le dossier tools\
    echo.
    pause
    exit /b 1
)

echo [OK] cloudflared telecharge dans tools\cloudflared.exe
set "PATH=%PATH%;%~dp0tools"

:start_server
echo.
echo [BUILD] Verification du build...
if not exist ".next" (
    echo [BUILD] Compilation en cours, patiente...
    call npm run build
    if errorlevel 1 (
        echo [ERREUR] La compilation a echoue.
        pause
        exit /b 1
    )
)

echo.
echo [OK] Demarrage du serveur Next.js sur le port 3001...
start "PleXIT Server" cmd /k "cd /d %~dp0 && npm start"

echo.
echo [ATTENTE] Demarrage du serveur (5 secondes)...
timeout /t 5 /nobreak > nul

echo.
echo [TUNNEL] Ouverture du tunnel Cloudflare...
echo.
echo  !! IMPORTANT !!
echo  Dans quelques secondes, une URL publique va apparaitre.
echo  Elle ressemble a : https://xxxx-xxxx-xxxx.trycloudflare.com
echo  COPIE cette URL et partage-la sur ton Discord !
echo.
echo  Pour arreter : ferme les deux fenetres.
echo  ============================================================
echo.

:: Lance le tunnel (utilise cloudflared depuis tools\ si pas dans PATH)
if exist "tools\cloudflared.exe" (
    tools\cloudflared.exe tunnel --url http://localhost:3001
) else (
    cloudflared tunnel --url http://localhost:3001
)

pause
