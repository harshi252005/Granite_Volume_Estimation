@echo off
setlocal enabledelayedexpansion
title Smart Granite System Launcher
cd /d "%~dp0"

echo ======================================================================
echo           SMART GRANITE SYSTEM - AP MINES ^& GEOLOGY
echo ======================================================================
echo.

:: 1. Clear any stuck background processes holding port 8000 or 5173
echo [1/4] Checking and clearing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
    echo       Freeing port 8000 ^(PID: %%a^)...
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do (
    echo       Freeing port 5173 ^(PID: %%a^)...
    taskkill /f /pid %%a >nul 2>&1
)
echo       Ports cleared.
echo.

:: 2. Resolve Python Executable
echo [2/4] Locating Python environment...
set "PYTHON_EXE="
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\venv\Scripts\python.exe"
    echo       Found: backend\venv\Scripts\python.exe
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    echo       Found: venv\Scripts\python.exe
) else (
    set "PYTHON_EXE=python"
    echo       Using global system Python
)
echo.

:: 3. Launch Backend in its own window
echo [3/4] Launching FastAPI Backend on http://0.0.0.0:8000 ...
start "Smart Granite Backend" /D "%~dp0backend" cmd /k "%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 300
timeout /t 2 /nobreak >nul
echo       Backend window opened.
echo.

:: 4. Launch Frontend in its own window
echo [4/4] Launching Vite Frontend on http://localhost:5173 ...
start "Smart Granite Frontend" /D "%~dp0frontend" cmd /k npm run dev -- --force
echo       Frontend window opened.
echo.

echo ======================================================================
echo   Waiting 5 seconds for servers to start...
echo ======================================================================
timeout /t 5 /nobreak >nul

echo.
echo   Opening Smart Granite in your browser...
start http://localhost:5173

echo.
echo ======================================================================
echo   READY!
echo   Web Portal  : http://localhost:5173
echo   Backend API : http://127.0.0.1:8000/docs
echo ======================================================================
echo.
echo   Keep both terminal windows open while working.
echo   You may close this launcher window.
echo.
pause
