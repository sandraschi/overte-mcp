@echo off
title Vircadia MCP Stack Launcher
echo ===================================================
echo 🛰️  Starting Vircadia MCP Fleet Services...
echo ===================================================

:: Start FastAPI REST Server
echo [1/2] Launching Python FastAPI Server (Port 10989)...
start "Vircadia MCP Backend" cmd /c "uv run python -m src.vircadia_mcp.http_server"

:: Start Vite React Webapp
echo [2/2] Launching Vite React Dashboard (Port 10988)...
start "Vircadia MCP Dashboard" cmd /c "cd webapp && npm run dev"

echo.
echo ===================================================
echo 🎉  Launch commands dispatched!
echo 🔗  Dashboard: http://localhost:10988
echo 🔗  API Base:  http://localhost:10989
echo ===================================================
pause
