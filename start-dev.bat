@echo off
title PleXIT - Mode developpement
color 0A

echo.
echo  ==========================================
echo    PleXIT - Mode DEV (hot-reload)
echo  ==========================================
echo.

cd /d "%~dp0"

echo [OK] Demarrage sur http://localhost:3001
echo.

call npm run dev

pause
