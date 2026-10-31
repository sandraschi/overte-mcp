# CLAUDE.md - overte-mcp

Overte VR domain-admin MCP (FastMCP stdio + FastAPI REST + Vite dashboard).

## Entry points
- `src/overte_mcp/server.py` - FastMCP stdio (dual-transport proxy to http://127.0.0.1:11110/mcp)
- `src/overte_mcp/http_server.py` - FastAPI REST (uvicorn overte_mcp.http_server:app, backend 11110)
- `webapp/` - Vite React dashboard (frontend 11111, `bun run dev` / `npm run dev`)
- `start.ps1` / `start.bat` - fleet launcher (BackendOnly + /api/health probe)
- `run_server.py` - PyInstaller sidecar (HTTP only, not the Desktop MCP entry)

## Standards
- Fleet hub: `D:\Dev\repos\mcp-central-docs\`
- Ports: backend 11110, frontend 11111 (`mcp-central-docs/operations/WEBAPP_PORTS.md`, forbidden: 3000/5000/5173/8000/8080)
- Python: `uv run python`, never naked python. Lint: `uv run ruff check src/`, format: `uv run ruff format src/`
- No hardcoded `C:\Users\sandr\...` / `D:\Dev\repos\...` in runtime code (BUG-079)
- Dialogic tool returns `{success, message, data}`; annotations READ_ONLY/MUTATING/DESTRUCTIVE

## Key files
- `src/overte_mcp/tools/` - domain, entities, scripting impls (all responses carry source live|simulated)
- `src/overte_mcp/skills/` - overte-admin + overte-user SKILL.md
- `fleet-start.config.ps1` - Kind uvicorn, HealthPath /api/health
- `mcpb/manifest.json` - Desktop bundle (stdio python -m overte_mcp, ${__dirname} only)
- `docs/` - CONFIGURATION, DEVELOPMENT, TOOLS, TROUBLESHOOTING, ONBOARDING
