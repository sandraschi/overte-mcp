# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-beta] - 2026-07-21

### Added
- Stateful **WebSocket Bridge** server at `/api/overte/ws` to connect FastAPI backend with in-world Overte environments.
- In-world script [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) for live entity spawn and JS behavior injection (reconnect with exponential backoff).
- Local domain-server verification for live `/nodes.json` + `/settings.json` on port `40100`.
- **MCPB (Claude Desktop) packaging**: `mcpb/` pack root, `scripts/build-mcpb-package.ps1`, `just mcpb-pack`, `.mcpbignore`, 3-4-100 prompts (`system.md` / `user.md` / `examples.json`), output `dist/overte-mcp.mcpb`.
- Fleet docs refresh: `INSTALL.md`, `ARCHITECTURE.md`, `PROJECT_PAGE.md`, `llms.txt`, new required `llms-full.txt`.

### Changed
- Refactored `overte_entity_spawn` and `overte_script_inject` to prefer local bridge/REST when connected, falling back to labeled simulated data when the bridge client is disconnected.

---

## [0.1.0-alpha] - 2026-07-20

### Changed
- Renamed project from stale `vircadia-mcp` to `overte-mcp` to focus on the active Overte VR lineage.
- Re-aligned service ports across the entire fleet to prevent conflicts with Vienna Life Assistant:
  - Backend API: port **11110**
  - Frontend Vite Dashboard: port **11111**
- Upgraded Python backend dependencies to **FastMCP 3.4.4+** and **prefab-ui 0.14.0**.
- Migrated Vite React dashboard frontend package manager from `npm` to `bun`.
- Implemented `/health` and `/api/health` endpoints returning uptime, Bound Port, and Git SHA metadata.
- Configured local CORS origin whitelist regex patterns according to `CORS_STANDARD.md` (supporting localhost, tailnets, and LAN domains).
- Created a robust startup launcher `start.ps1` with zombie-process killing, command prerequisite checking, and health status polling.
