# overte-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Status: beta, core tools verified live](https://img.shields.io/badge/status-beta%2C%20verified%20live-brightgreen.svg)](#what-you-can-do)

## What this wraps

An MCP server for **[Overte](https://overte.org)**, the open-source social-VR
platform — a C++ desktop client ("Interface") + domain-server + entity-server,
descended from High Fidelity's codebase. **Not the same thing as current
"Vircadia"** — see [docs/WRAPPEE.md](docs/WRAPPEE.md) for the full
disambiguation and official links (site, docs, community). Complements the
fleet's other virtual-world servers: `resonite-mcp`, `vrchat-mcp`,
`godot-mcp`, `unity3d-mcp`, `gazebo-mcp`.

Plus a companion React web dashboard.

## What You Can Do

**How it runs**: Overte (domain-server + Interface) is a separate
application you install yourself — never bundled. `overte_domain_status`
works against just the domain-server (no GUI needed). `overte_entity_spawn`
and `overte_script_inject` need a running Interface client with
`scripts/overte-mcp-bridge.js` loaded, because Overte's entity-server has no
plain HTTP "create entity" endpoint — only Interface's JavaScript API can do
that. See [docs/ONBOARDING.md](docs/ONBOARDING.md) for first-time setup.

| Direction | Artifacts | Notes |
|-----------|-----------|-------|
| **Hands-in** | Entity properties (position, scale, type), JS behavior scripts, GLB/FBX/OBJ model URLs | Via MCP tool calls or the dashboard's Entities/Scripting pages |
| **Hands-out** | Live domain-server telemetry, spawned in-world entities, animated/scripted entities | Every response labeled `source: "live"` or `source: "simulated"` — never a silent fake success |

**Tools** — all three core tools verified live against Overte 2026.04.1 (2026-07-30):

| Tool | Status |
|------|--------|
| `overte_domain_status` | **Verified live** — real domain-server `/nodes.json` + `/settings.json` admin API on port `40100` |
| `overte_entity_spawn` | **Verified live** — in-world entity spawning via WebSocket bridge; `permanent=True` for cross-restart persistence |
| `overte_script_inject` | **Verified live** — in-world JS behavior injection via WebSocket bridge |
| `overte_sampling_assist` | Multi-step planning via `ctx.sample()` when host supports it |

**Dashboard pages**:

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | Domain status, node list, settings viewer |
| Avatars | `/avatars` | Connected avatar-mixer/agent nodes |
| Entities | `/entities` | Spawn form + entity explorer |
| Scripting | `/scripting` | JS code editor + script injection |
| Chat | `/chat` | Skill-first LLM chat with 4 personalities |
| Settings | `/settings` | Backend health + LLM provider detection |
| Tools | `/tools` | Dynamic tool discovery + search |
| Skills | `/skills` | Skill content viewer (markdown) |
| Logs | `/logs` | Ring-buffer log viewer with level filter |
| Help | `/help` | Domain setup + JS API reference |

## Quick Install

### Claude Desktop (`.mcpb`)
1. Build: `just mcpb-pack` → `dist/overte-mcp.mcpb`
2. Drag the `.mcpb` into Claude Desktop (needs Python 3.12+ and `uv` on PATH).

Stdio without MCPB: `uv run overte-mcp`. Full install paths: [INSTALL.md](INSTALL.md).

### Full stack (dashboard + bridge)
```powershell
./start.ps1
```
Syncs deps, starts FastAPI backend (`11110`) and Vite dashboard (`11111`),
opens the browser. Then start Overte `domain-server.exe`, open Interface,
load `scripts/overte-mcp-bridge.js` for live spawn/inject — see
[docs/ONBOARDING.md](docs/ONBOARDING.md).

## Example Prompts

- "What's the status of my Overte domain?"
- "Spawn a permanent box entity at the origin"
- "Attach the dance script to that entity"

## Lint / test
```powershell
just lint      # Ruff + Biome
just test      # unit + e2e
just mcpb-pack # validate + pack Claude Desktop bundle
```

## Documentation
- [docs/WRAPPEE.md](docs/WRAPPEE.md) — what Overte is, disambiguation from Vircadia, official links
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data flow, ports, WebSocket bridge
- [INSTALL.md](INSTALL.md) — Overte setup, MCPB, Claude Desktop config
- [STATUS.md](STATUS.md) — current verification status, remaining work
- [ASSESSMENT.md](ASSESSMENT.md) — fleet audit findings and improvement plan
- [PROJECT_PAGE.md](PROJECT_PAGE.md) — roadmap and task tracker
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [docs/ONBOARDING.md](docs/ONBOARDING.md) — first-time Overte + bridge setup
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md) — env vars, ports
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — dev setup, contributing
- [docs/TOOLS.md](docs/TOOLS.md) — full MCP tool reference
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common issues
- [llms.txt](llms.txt) / [llms-full.txt](llms-full.txt) — LLM index + full corpus
- [mcpb/README.md](mcpb/README.md) — Claude Desktop bundle layout

## Requirements
- Python 3.12+ with `uv`
- [Bun](https://bun.sh) (webapp + Biome)
- [Overte Client + Server](https://overte.org/downloads.html) installed separately for live domain + bridge features

## License
MIT
