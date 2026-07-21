# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-beta] - 2026-07-21

### Added
- Stateful **WebSocket Bridge** server at `/api/overte/ws` to connect FastAPI backend with in-world Overte environments.
- head-less/client script [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) to run inside Overte Interface or Server console, enabling live, real-time in-world entity spawning and JS behavior injection.
- Automatic reconnection logic with exponential backoff for the in-world JS script bridge.
- Local Domain Server installation and live status query verification against a real `domain-server.exe` running on default port `40100`.

### Changed
- Refactored `overte_entity_spawn` and `overte_script_inject` tools to attempt local REST API communication first (forwarding to FastAPI backend), falling back to simulated placeholder data when the bridge client is disconnected.

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
