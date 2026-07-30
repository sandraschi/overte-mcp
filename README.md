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

**Beta. All 3 tools verified live against Overte 2026.04.1.**

| Tool | Status |
|------|--------|
| `overte_domain_status` | **Verified live** — real domain-server `/nodes.json` + `/settings.json` admin API on port `40100`. |
| `overte_entity_spawn` | **Verified live** — in-world entity spawning via WebSocket bridge. Supports `permanent=True` for cross-restart persistence. |
| `overte_script_inject` | **Verified live** — in-world JS behavior injection via WebSocket bridge. |
| `overte_sampling_assist` | Multi-step planning via `ctx.sample()` when host supports it. |

Every response indicates its `"source"` (either `"live"` or `"simulated"`).

### SOTA Dashboard Pages

| Page | Route | Features |
|------|-------|----------|
| **Dashboard** | `/` | Domain status, node list, settings viewer |
| **Avatars** | `/avatars` | Connected avatar-mixer/agent nodes |
| **Entities** | `/entities` | Spawn form + entity explorer |
| **Scripting** | `/scripting` | JS code editor + script injection |
| **Chat** | `/chat` | Skill-first LLM chat with 4 personalities |
| **Settings** | `/settings` | Backend health + LLM provider detection |
| **Tools** | `/tools` | Dynamic tool discovery + search |
| **Skills** | `/skills` | Skill content viewer (markdown) |
| **Logs** | `/logs` | Ring-buffer log viewer with level filter |
| **Help** | `/help` | Domain setup + JS API reference |

## Setup & Running

### Requirements
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Bun](https://bun.sh) (JS package manager and runtime) — webapp / Biome
- [Overte Client + Server](https://overte.org/downloads.html) installed locally (for live domain + bridge)

### Quick Start (full stack)
1. Double-click `start.bat` or run:
   ```powershell
   ./start.ps1
   ```
2. Launcher syncs deps, starts FastAPI backend (`11110`) and Vite dashboard (`11111`), opens the browser.
3. Start Overte `domain-server.exe`, open Interface, load `scripts/overte-mcp-bridge.js` for live spawn/inject.

### Claude Desktop (`.mcpb`)
1. Build: `just mcpb-pack` → `dist/overte-mcp.mcpb`
2. Drag the `.mcpb` into Claude Desktop (needs Python 3.12+ and `uv` on PATH).
3. Pack root is `mcpb/` (synced from `src/overte_mcp`); see [mcpb/README.md](mcpb/README.md).

Stdio without MCPB: `uv run overte-mcp`

### Lint / test
```powershell
just lint      # Ruff + Biome
just test      # unit + e2e
just mcpb-pack # validate + pack Claude Desktop bundle
```

## MCP Tools Reference
| Tool | Status |
|------|--------|
| `overte_domain_status` | **Verified live** (2026-07-30) — queries real domain-server `/nodes.json` and `/settings.json`. |
| `overte_entity_spawn` | **Verified live** (2026-07-30) — spawns entities via WebSocket bridge into Overte Interface. Supports `permanent=True` for persistence. |
| `overte_script_inject` | **Verified live** (2026-07-30) — injects JS behavior onto entities via WebSocket bridge. |
| `overte_sampling_assist` | Multi-step planning via `ctx.sample()` when host supports it. |

## Documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, ports, WebSocket bridge
- [INSTALL.md](INSTALL.md) — Overte setup, MCPB, Claude Desktop config
- [PROJECT_PAGE.md](PROJECT_PAGE.md) — roadmap and task tracker
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [llms.txt](llms.txt) / [llms-full.txt](llms-full.txt) — LLM index + full corpus
- [mcpb/README.md](mcpb/README.md) — Claude Desktop bundle layout

