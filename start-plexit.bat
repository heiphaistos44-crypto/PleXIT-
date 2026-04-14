@echo off
title PleXIT - Serveur de production
color 0C

echo.
echo  ==========================================
echo    PleXIT - Demarrage du serveur
echo  ==========================================
echo.

cd /d "%~dp0"

:: Verifie que Node est dispo
where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
    pause
    exit /b 1
)

:: Build si le dossier .next n'existe pas
if not exist ".next" (
    echo [BUILD] Compilation en cours...
    call npm run build
    if errorlevel 1 (
        echo [ERREUR] La compilation a echoue.
        pause
        exit /b 1
    )
)

echo [OK] Demarrage sur http://localhost:3001
echo [OK] Acces local : http://192.168.1.102:3001
echo.
echo  Ferme cette fenetre pour arreter le serveur.
echo  ==========================================
echo.

call npm start

pause
