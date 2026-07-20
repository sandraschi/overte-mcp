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

**Alpha. Partly real, partly honestly-labeled simulation. Read this before trusting any tool output.**

| Tool | Real or simulated | Detail |
|---|---|---|
| `overte_domain_status` | **Real**, unverified against a live server | Calls the real domain-server `/nodes.json` + `/settings.json` HTTP admin API with optional Basic Auth. No Overte instance has been installed/run yet to confirm the response shapes match. |
| `overte_entity_spawn` | **Simulated only** | Overte has no plain-REST "spawn an entity" endpoint. Real entity creation goes through the Interface client's JS API or a headless Assignment Client script over the entity-server's internal protocol. This tool returns clearly-labeled fake data (`source: "simulated"`) until a WebSocket bridge is built — see `ARCHITECTURE.md`. |
| `overte_script_inject` | **Simulated only** | Same limitation and same plan as entity spawn. |

Every simulated response includes `"source": "simulated"` and a `"warning"` field explaining what's missing. If you see either of those, nothing actually happened in a virtual world.

## Setup & Running

### Requirements
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Bun](https://bun.sh) (JS package manager and runtime)
- [Overte Client + Server](https://overte.org/downloads.html) installed locally to test against (not yet installed as of this writing)

### Quick Start
1. Double-click `start.bat` or run the PowerShell script:
   ```powershell
   ./start.ps1
   ```
2. The launcher will resolve port conflicts, sync python and node dependencies, launch the background Python backend, and run the Vite frontend dev server.
3. Your default web browser will open the dashboard.

After the rename, run once to fix the stale editable install:
```powershell
uv sync
Set-Location webapp; npm install
```

## MCP Tools Reference
- `overte_domain_status` — connected nodes + settings from a domain-server (real, once tested)
- `overte_entity_spawn` — spawn a primitive or GLB/FBX model (simulated)
- `overte_script_inject` — attach JS behavior to an entity (simulated)

## Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, ports, and the planned WebSocket bridge for real entity/script control
- [INSTALL.md](INSTALL.md) — environment variables, local setup, staging caches
- [PROJECT_PAGE.md](PROJECT_PAGE.md) — roadmap and task tracker
