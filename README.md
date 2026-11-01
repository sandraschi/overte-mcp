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

## Local sandbox or join a domain

Two ways to be in a world — the dashboard keeps them separate on purpose:

- **Local sandbox** (default): your own `domain-server` on this machine
  (`localhost:40100`). Private, free, and the only setup where the dashboard's
  Start/Stop buttons can launch things for you.
- **Join a domain**: point the dashboard's **Watching** switcher at someone
  else's domain-server (host + admin port) to monitor it, and join it in
  Interface with *Connect to Domain…*. You get admin/scripting power there only
  if they gave you credentials.

One rule for both: spawning, injecting, and animating always act through the
**bridge**, which lives in whatever domain your assignment-client or Interface
joined. The Watching switcher changes which domain you *look at*; your spawns
land where you *stand*. See [docs/ONBOARDING.md](docs/ONBOARDING.md).

## What You Can Do

**How it runs**: Overte (domain-server + assignment-client, optionally Interface) is a
separate application you install yourself, never bundled. Entity work runs through a
bridge script inside Overte's script engine. Since 2026-10-31 the bridge runs **headless**
as a domain persistent script on an assignment-client: no GUI, no logged-in user
(`overte_bridge_install` sets it up). Loading it in the desktop Interface client still
works when you want to watch. See [docs/ONBOARDING.md](docs/ONBOARDING.md).

| Direction | Artifacts | Notes |
|-----------|-----------|-------|
| **Hands-in** | Entity properties (position, scale, type), JS behavior scripts, GLB/FBX/OBJ model URLs | Via MCP tool calls or the dashboard's Entities/Scripting pages |
| **Hands-out** | Live domain-server telemetry, spawned in-world entities, animated/scripted entities | Real result or an error saying why (`bridge_not_connected`, `domain_unreachable`, ...); no simulated mode |

**Tools** — all three core tools verified live against Overte 2026.04.1 (2026-07-30):

| Tool | Status |
|------|--------|
| `overte_domain_status` | **Verified live** (2026-07-30): domain-server `/nodes.json` + `/settings.json` on port `40100` |
| `overte_bridge_status` / `overte_bridge_install` | New 2026-10-31: bridge mode (agent/interface) and headless install as a persistent script. See STATUS.md for live verification state. |
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

### Claude Desktop (`.mcpb`) — Claude-only one-liner
```powershell
irm https://github.com/sandraschi/overte-mcp/releases/latest/download/install.ps1 | iex
```
One command: downloads the latest `.mcpb`, installs Python/`uv` if missing, and registers the bundle. Claude Desktop only.

Other clients (Cursor / VS Code / Codex / Opencode) — no bundle needed:
```json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/sandraschi/overte-mcp.git", "overte-mcp"]
    }
  }
}
```

From source: `just mcpb-pack` → `dist/overte-mcp.mcpb`, then drag the `.mcpb` into Claude Desktop. Full install paths: [INSTALL.md](INSTALL.md).

### Full stack (dashboard + bridge)
```powershell
./start.ps1
```
Syncs deps, starts FastAPI backend (`11110`) and Vite dashboard (`11111`),
opens the browser. Then start Overte `domain-server.exe` and
`assignment-client.exe -n 9`, and run `overte_bridge_install` once. Or let
`just e2e-headless` do it all and report pass/fail. See
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
