# overte-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Status: alpha, partly simulated](https://img.shields.io/badge/status-alpha%2C%20partly%20simulated-orange.svg)](#status)

A Model Context Protocol (MCP) server for [Overte](https://overte.org), the open-source social-VR/metaverse platform, plus a companion React web dashboard. Complements the fleet's other virtual-world/simulation servers: `resonite-mcp`, `vrchat-mcp`, `godot-mcp`, `unity3d-mcp`, `gazebo-mcp`.

## Why Overte, not Vircadia?

This repo was originally scoped against "Vircadia." That name now covers two unrelated things, and it's worth being precise about which one this targets:

- **Overte** — the active continuation of the *original* Vircadia architecture: a C++ desktop client ("Interface"), a domain-server, an entity-server, avatars, spatial audio, in-world JavaScript scripting. Descended from High Fidelity's 2019 open-sourced codebase. Maintained by the nonprofit Overte e.V. This is what this repo targets.
- **Vircadia** (current) — pivoted to an entirely different stack called **Vircadia World**: PostgreSQL-backed world state, Bun/TypeScript, Docker-first, OAuth2, pitched as a "reactivity layer for games" (anti-cheat state tracking, SQL-defined entities) rather than a social-VR platform. It does not share Overte's wire protocol, admin API, or client. `vircadia-native-core` (the old C++ stack) itself now just points people at Vircadia World.

Two different products wearing family-resembling names. This server talks to Overte's classic domain-server API — nothing here works against current Vircadia World.

## Status

**Beta. Real-time integration active via WebSocket bridge.**

| Tool | Real or simulated | Detail |
|---|---|---|
| `overte_domain_status` | **Real & Verified** | Calls the real domain-server `/nodes.json` + `/settings.json` HTTP admin API (port `40100`). Fully verified against a live local Overte Domain Server. |
| `overte_entity_spawn` | **Real (with active bridge)** | Spawns real in-world entities when the in-world script [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) is loaded inside Overte. Falls back to simulated when disconnected. |
| `overte_script_inject` | **Real (with active bridge)** | Attaches real JavaScript behaviors to entities when the bridge is active. Falls back to simulated when disconnected. |

Every response indicates its `"source"` (either `"live"` or `"simulated"`).

## Setup & Running

### Requirements
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Bun](https://bun.sh) (JS package manager and runtime)
- [Overte Client + Server](https://overte.org/downloads.html) installed locally

### Quick Start
1. Double-click `start.bat` or run the PowerShell script:
   ```powershell
   ./start.ps1
   ```
2. The launcher will resolve port conflicts, sync python and node dependencies, launch the background Python backend (port `11110`), and run the Vite frontend dev server (port `11111`).
3. Your default web browser will open the dashboard.
4. Open the Overte Interface client, start your local domain server (`domain-server.exe`), and load the client script `scripts/overte-mcp-bridge.js` to enable real-time in-world integration.

## MCP Tools Reference
- `overte_domain_status` — connected nodes + settings from a domain-server (real, verified)
- `overte_entity_spawn` — spawn a primitive or GLB/FBX model (real-time when bridge is connected, else simulated)
- `overte_script_inject` — attach JS behavior to an entity (real-time when bridge is connected, else simulated)

## Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, ports, and the implemented WebSocket bridge
- [INSTALL.md](INSTALL.md) — environment variables, local setup, staging caches
- [PROJECT_PAGE.md](PROJECT_PAGE.md) — roadmap and task tracker

