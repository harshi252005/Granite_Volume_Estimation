@echo off
title Smart Granite - Frontend Dev Server
cd /d "%~dp0frontend"

echo ======================================================================
echo           Starting Smart Granite Vite Frontend [Port 5173]
echo ======================================================================
echo.

npm run dev
pause
