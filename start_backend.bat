@echo off
title Smart Granite - Backend Server
cd /d "%~dp0backend"

echo ======================================================================
echo           Starting Smart Granite FastAPI Backend [Port 8000]
echo ======================================================================
echo.

set "PYTHON_EXE="
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\venv\Scripts\python.exe"
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo Using Python: %PYTHON_EXE%
echo Starting Uvicorn...
"%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --timeout-keep-alive 300
pause
