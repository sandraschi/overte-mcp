@echo off
title Overte MCP Stack Launcher
echo ===================================================
echo Starting Overte MCP Fleet Services...
echo ===================================================

:: Ports registered in mcp-central-docs/operations/WEBAPP_PORTS.md
:: Backend 11110 / Frontend 11111

echo [1/2] Syncing Python deps...
call uv sync
if errorlevel 1 (
  echo uv sync failed
  exit /b 1
)

echo [2/3] Launching FastAPI backend (Port 11110)...
start "Overte MCP Backend" cmd /c "uv run python -m overte_mcp.http_server"

echo [3/3] Launching Vite dashboard (Port 11111)...
start "Overte MCP Dashboard" cmd /c "cd /d %~dp0webapp && if not exist node_modules npm install && npm run dev"

echo.
echo ===================================================
echo Dashboard: http://localhost:11111
echo API Base:  http://localhost:11110
echo Health:    http://localhost:11110/api/health
echo ===================================================
pause
