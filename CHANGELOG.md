# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-07-30

### Added
- Tailwind CSS v4 wired (was missing — app rendered unstyled)
- SOTA webapp pages: Chat (skill-first, personalities, localStorage), Settings (LLM provider detection), Tools, Skills, Logs, Apps Hub
- Zustand LLM store with manual "Detect LLM" button (auto-probe removed — was causing connection pool exhaustion)
- Topbar with backend health dot (green/red)
- Sidebar collapse toggle at top (per SOTA standard)
- `overte_sampling_assist` tool with `ctx.sample()` fallback
- `GET /api/tools`, `/api/skills`, `/api/v1/diagnostics`, `/api/logs` endpoints
- Ring-buffer logger in backend
- BUG-007 documented in fleet pitfalls (Tailwind not wired)

### Fixed
- Bridge WebSocket `readyState` check: Overte QtScript engine doesn't have `WebSocket.OPEN` — hardcoded `1`
- Socket race condition: capture socket in `onmessage` closure for response
- `start.ps1`: removed `-NoNewWindow` parameter (PowerShell 5.1 incompatible)
- `start.ps1`: backend entry point uses `run_server.py` (not `-m` module)
- Zombie kill: retry loop for TIME_WAIT ports
- `api-base.ts`: use `127.0.0.1` not `localhost` (IPv6 resolution mismatch)
- Removed oxlint, keep Biome only

### Verified
- `overte_domain_status` — live against `domain-server.exe` on port 40100
- `overte_entity_spawn` — live via WebSocket bridge, entity `{42501700-...}` spawned in-world
- Overte 2026.04.1 installed on Goliath (Client + Server)

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
