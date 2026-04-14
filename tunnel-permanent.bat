@echo off
title PleXIT — Tunnel permanent (meme URL a chaque demarrage)
color 0B

echo.
echo  ============================================================
echo    PleXIT - Tunnel Cloudflare PERMANENT
echo    (necessite un compte Cloudflare gratuit)
echo  ============================================================
echo.
echo  Cette methode te donne une URL FIXE (pas aleatoire).
echo  Ex: https://plexit.tondomaine.com
echo.

cd /d "%~dp0"

:: Verifie si cloudflared est installe
if exist "tools\cloudflared.exe" (
    set CLOUDFLARED=tools\cloudflared.exe
) else (
    where cloudflared >nul 2>&1
    if errorlevel 1 (
        echo [ERREUR] cloudflared non trouve. Lance d'abord deploy-cloudflare.bat
        pause
        exit /b 1
    )
    set CLOUDFLARED=cloudflared
)

:: Verifie si deja connecte
%CLOUDFLARED% tunnel list >nul 2>&1
if errorlevel 1 (
    echo [AUTH] Connexion a ton compte Cloudflare...
    echo Une fenetre de navigateur va s'ouvrir. Connecte-toi a Cloudflare.
    echo.
    %CLOUDFLARED% login
)

echo.
echo [OK] Connecte a Cloudflare.
echo.

:: Cree le tunnel si pas encore fait
%CLOUDFLARED% tunnel list | find "plexit" >nul 2>&1
if errorlevel 1 (
    echo [SETUP] Creation du tunnel "plexit"...
    %CLOUDFLARED% tunnel create plexit
    echo.
)

echo [OK] Tunnel "plexit" pret.
echo.
echo [SERVER] Demarrage de PleXIT...
if not exist ".next" call npm run build

start "PleXIT Server" cmd /k "cd /d %~dp0 && npm start"
timeout /t 4 /nobreak > nul

echo [TUNNEL] Connexion du tunnel...
%CLOUDFLARED% tunnel run --url http://localhost:3001 plexit

pause
