# Overte MCP — System Architecture & Protocols

Maps architecture, ports, data flow, and the headless bridge contract for the
overte-mcp server. See [STATUS.md](../STATUS.md) for current verification status and
remaining work.

---

## High-Level System Architecture

```
                      MCP Client Tier
   ┌─────────────────────────────────────────────────────┐
   │  Cursor / Claude Desktop / opencode (Stdio MCP)     │
   │  React SPA Dashboard (REST / WebSocket)             │
   │  Bridge script: headless agent (primary) or Interface │
   └──────────────────────┬──────────────────────────────┘
                          │
          Stdio MCP ──────┤       HTTP REST + WS (port 11110)
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │               Backend Tier (port 11110)              │
   │                                                      │
   │  FastMCP stdio server  ◄── Stdio proxy pattern      │
   │    (overte_mcp.server)      probes /mcp first,       │
   │                             falls back to direct     │
   │  FastAPI HTTP daemon                                  │
   │    (overte_mcp.http_server)                          │
   │      ├── /health, /api/health     — SOTA health      │
   │      ├── /api/tools               — Tool list        │
   │      ├── /api/skills, /api/skill/ — Skills           │
   │      ├── /api/v1/diagnostics      — CUA smoke-test   │
   │      ├── /api/logs                — Ring-buffer log  │
   │      ├── /api/overte/status       — Domain status    │
   │      ├── /api/overte/spawn        — Entity spawn     │
   │      ├── /api/overte/inject       — Script inject    │
   │      ├── /api/overte/ws           — Bridge hub (WS)  │
   │      ├── /api/overte/bridge[...]  - status/install   │
   │      ├── /bridge/overte-mcp-bridge.js - script served │
   │      └── /mcp                     — FastMCP HTTP     │
   └──────┬───────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────┐          ┌──────────────────────────┐
   │ Overte       │          │ assignment-client agent  │
   │ Domain       │          │ (persistent script, no   │
   │              │          │  GUI) or Interface       │
   │ Server       │          │                          │
   │ (port 40100) │          │ overte-mcp-bridge.js     │
   │              │          │  ├── Entities.addEntity  │
   │ /nodes.json  │          │  └── Entities.editEntity │
   │ /settings.json│         │       (script property)  │
   └──────────────┘          └──────────┬───────────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │ Entity Server         │
                              │ (Overte internal,     │
                              │  octree protocol)     │
                              │                       │
                              │ Persists to           │
                              │ models.json.gz        │
                              │ (every 30s)           │
                              └───────────────────────┘
```

## Communication Protocols & Ports

| Protocol | Source | Destination | Port | Status |
|----------|--------|-------------|------|--------|
| Stdio MCP | MCP client | Python FastMCP | N/A | Real |
| HTTP REST | React webapp / MCP tools | FastAPI backend | 11110 | Real |
| WebSocket | `overte-mcp-bridge.js` as agent (persistent script) or in Interface | FastAPI `/api/overte/ws` | 11110 | Real when bridge connected |
| HTTP | assignment-client agent | FastAPI `/bridge/overte-mcp-bridge.js` | 11110 | Script fetch at agent start |
| HTTP | Python backend | Overte domain-server admin API | 40100 | Real (verified) |
| Entity octree | Bridge JS (agent or Interface) | Overte entity-server | (internal) | Real when bridge active |

## Tool Surface

| Tool | Annotations | Needs | Description |
|------|-------------|-------|-------------|
| `overte_domain_status` | READ_ONLY | domain-server | `/nodes.json` + `/settings.json`. Error `domain_unreachable` if nothing answers. |
| `overte_bridge_status` | READ_ONLY | backend | Bridge connected? mode `agent` (headless) or `interface`, `can_rez`. |
| `overte_bridge_install` | MUTATING | domain-server admin API | Registers the bridge as a domain persistent script. Idempotent. |
| `overte_entity_spawn` | MUTATING | bridge | Box/Sphere/Web/Model/Light. Headless: pass a position. |
| `overte_script_inject` | MUTATING | bridge | Sets an entity's `script` + `userData`. |
| `overte_entity_update` / `_delete` / `_animate` | MUTATING | bridge | Edit, remove, loop-animate. |
| `overte_nearby_entities` | READ_ONLY | bridge | `Entities.findEntities` around a point. |
| `overte_fixture_spawn` | MUTATING | bridge | Preset props. Headless: pass a position. |
| `overte_sampling_assist` | READ_ONLY | none | Multi-step guidance via `ctx.sample()`. |

## Honest Contract (no simulated mode)

Until 2026-10-31 spawn, inject, avatar and domain status returned `status: "success"`
with `source: "simulated"` and invented data when nothing was connected. A caller that
only checked `status` believed an entity existed. That mode is gone:

- No bridge: REST returns **503** with detail starting `bridge_not_connected`; MCP tools
  return `success: false` with that message.
- No domain-server: `/api/overte/status` returns **502** `domain_unreachable`.
- Agent mode without a position: **400** `position_required` (there is no avatar).
- Bridge connected but not allowed to create entities: the bridge answers `cannot_rez`.
- 401 from the domain-server stays a clear auth error.

`source: "live"` is still present on successful responses.

## Why Entity Spawn / Script Inject Need a Bridge

Overte's entity-server talks an internal octree protocol; the domain-server admin HTTP
API cannot create entities. Entity work has to run in an Overte script engine. Two
contexts can host `scripts/overte-mcp-bridge.js`:

1. **Agent (primary, headless).** The bridge is registered as a domain *persistent
   script* (`scripts.persistent_scripts` in the domain settings). The domain-server hands
   it to an `assignment-client` as an agent assignment; no GUI, no logged-in user. Per
   the Overte API docs, `Entities` and `WebSocket` are both available to Assignment
   Client scripts.
2. **Interface (optional).** Loaded in the desktop client via Edit > Running Scripts.
   Useful to watch, and the only mode with `MyAvatar` (avatar position, spawning in
   front of the user, parenting to the avatar).

The bridge detects its context (`Agent` defined and no `MyAvatar` means agent) and says
so in a `hello` message on connect: `{"type":"hello","mode":"agent","version":"2.0.0",
"can_rez":true,...}`. `GET /api/overte/bridge` reports it.

Agent-mode differences the bridge handles:

- It waits for `Entities.serversExist()` (up to 30 s) before connecting.
- Agents only *see* entities inside the `EntityViewer` query volume. The bridge keeps a
  standing query (centre 0,0,0, radius 2000 m, refreshed every 5 s) and, for
  `find_nearby` and `get_entity`, re-queries and waits 1 s before reading.
- `get_avatar` returns `no_avatar`; spawn without a position returns `position_required`.

Only one bridge is active at a time: the most recent WebSocket connection wins.

## Headless setup

1. Run `domain-server.exe` and `assignment-client.exe -n 9` (six static assignments
   plus one agent, with headroom).
2. Start the backend (`just serve` or `uv run python run_server.py`).
3. `overte_bridge_install` (or `POST /api/overte/bridge/install`). This reads
   `/settings.json` and posts `{"scripts":{"persistent_scripts":[...]}}` back, adding
   `http://127.0.0.1:11110/bridge/overte-mcp-bridge.js` once. Credentials:
   `OVERTE_ADMIN_USER` / `OVERTE_ADMIN_PASSWORD` (default admin/admin). Override the
   script URL with `OVERTE_BRIDGE_PUBLIC_URL` if the domain runs on another host.
4. Poll `overte_bridge_status` until `connected` and `mode: "agent"`.

Manual alternative: domain admin panel > Content > Scripts > Persistent Scripts > `+`,
paste the URL, Save and restart.

`scripts/headless_e2e.py` does all of this and then checks spawn, read-back, edit,
search, inject, delete and persistence across a domain restart; see
[DEVELOPMENT.md](DEVELOPMENT.md).

## Dual-Transport Stdio Proxy Pattern

The FastMCP server (`server.py:main()`) implements the fleet stdio proxy pattern:

1. On startup, probes `SERVER_API_URL/mcp` (default `http://127.0.0.1:11110/mcp`)
2. If the HTTP daemon responds successfully, creates a lightweight proxy via
   `fastmcp.server.create_proxy()` and forwards all MCP calls to the HTTP daemon
3. If no HTTP daemon is reachable, starts a direct stdio server

This ensures Claude Desktop / Cursor / opencode can all connect via stdio while
the HTTP daemon handles REST API calls and the WebSocket bridge — no port conflicts,
no dual-initialization.

## Entity Persistence (World Building)

Overte's entity-server has built-in persistence:

| Setting | Current value | Meaning |
|---------|--------------|---------|
| `NoPersist` | `false` | Persistence is enabled |
| `persistFilePath` | `models.json.gz` | Entities saved to app data dir |
| `persistInterval` | `30000` | Auto-save every 30 seconds |
| `NoBackup` | `false` | Automatic backups enabled |
| `maxTmpLifetime` | `3600` | Temp entities expire after 1 hour |
| `backupDirectoryPath` | `""` | Backup dir (default = app data) |

**Critical note:** pass `permanent=True` (sets `lifetime: -1`) for anything that must
survive a domain-server restart. Without it the bridge sends no lifetime and Overte's
default applies; the 2026-07-30 investigation found such entities were not persisted.

The current domain-server at `localhost:40100` (Overte 2026.04.1) confirms:
- HTTP Basic Auth enabled (default: admin/admin)
- Node list shows the assignment-client nodes (agent, mixers, entity server) once an
  assignment-client is running; no Interface client is needed
- Full settings schema available at `/settings.json`

## VRM / Model Entity Joint Animation

**Known limitation:** Overte does not support VRM as a Model entity format.
VRM is an avatar format (loaded via `.fst` avatar definition files, not as model
entities). Overte's entity system supports **FBX, glTF, and OBJ** for Model entities.

When a VRM file is loaded as a Model entity:
- The entity renders visually (texture/mesh works)
- `Entities.getJointNames()` returns 0 joints — VRM skeletal data is stored in
  glTF extensions that Overte's entity pipeline does not parse
- Joint animation (`Entities.setJointRotation()`) does not work

**Workarounds:**
1. Convert VRM → FBX (with skeleton) for entity use — joints should work after conversion
2. Load the VRM as an avatar instead of a Model entity (via FST file)
3. Use glTF animation if the model has embedded animation data

## WebSocket Bridge Protocol

The bridge (`scripts/overte-mcp-bridge.js`) communicates with the FastAPI backend
over a single WebSocket connection at `ws://localhost:11110/api/overte/ws`.

### Command Format (backend → bridge)

```json
{
  "action": "ping | spawn | update | delete | inject | get_entity | find_nearby | get_avatar",
  "request_id": "uuid",
  "properties": { ... }  // spawn: entity properties
  "entity_id": "...",     // inject: target entity UUID
  "script_url": "...",    // inject: JS script URL
  "script_data": { ... }  // inject: scope variables
}
```

### Response Format (bridge → backend)

```json
{
  "request_id": "uuid",
  "status": "success | error",
  "entity_id": "uuid",   // spawn only
  "message": "...",       // error only
  "code": "bridge_error | position_required | cannot_rez | not_found | no_avatar | unknown_action"
}
```

On connect the bridge also sends an unsolicited `{"type": "hello", "mode": ..., "version":
..., "can_rez": ...}`; the backend stores it and does not treat it as a response.

### Reconnect Behaviour

- Exponential backoff: 1s → 2s → 4s → ... → 30s max
- Uses `Script.setTimeout` (QtScript-compatible) for reconnect scheduling
- Resets to 1s on successful connection
- Cleanup on `Script.scriptEnding` closes socket and clears timeout

## MCPB Packaging

Claude Desktop bundles are packed **from `mcpb/`**, not the repo root:

```
mcpb/
├── manifest.json          # v0.2
├── run_server.py
├── pyproject.toml         # lean runtime deps
├── .mcpbignore
├── README.md
├── assets/
│   ├── icon.png
│   └── prompts/           # 3-4-100: system.md, user.md, examples.json
└── src/overte_mcp/        # synced from src/overte_mcp by pack script
```

- Build: `just mcpb-pack` → `dist/overte-mcp.mcpb`
- Script: `scripts/build-mcpb-package.ps1` (sync → validate → pack)
- Never use `mcpb init` / `mcpb create` (fleet forbidden)

## Tauri 2.0 Desktop Wrapper

The `native/` directory contains a Tauri 2.0 NSIS build pipeline:

- **Entry**: `native/src/main.rs` — Tauri setup with auto-spawn
- **Backend**: `native/src/backend.rs` — materializes embedded PyInstaller exe,
  multi-layer port kill (240s), health poll (30 attempts × 2s)
- **Config**: `native/tauri.conf.json` — resources (not externalBin), NSIS only
- **Build**: `native/build.ps1` — full pipeline (TS lint → bun build → PyInstaller
  → size gate → Tauri NSIS)
- **Hooks**: `native/windows/hooks.nsh` — kills both processes on install/uninstall

## Workspace Directory Structure

```
overte-mcp/
├── src/overte_mcp/            # Canonical Python package
│   ├── __init__.py            # version
│   ├── models.py              # Pydantic models
│   ├── server.py              # FastMCP 3.4+ stdio + dual transport
│   ├── http_server.py         # FastAPI REST + WS bridge hub
│   ├── tools/
│   │   ├── __init__.py        # Portmanteau imports
│   │   ├── domain.py          # Domain server admin API
│   │   ├── entities.py        # Entity spawn (bridge) 
│   │   └── scripting.py       # Script inject (bridge)
│   └── skills/overte-admin/
│       └── SKILL.md           # Domain administration skill
├── scripts/
│   ├── overte-mcp-bridge.js   # Bridge: headless agent or Interface (served at /bridge/...)
│   ├── headless_e2e.py        # Live headless end-to-end check (no GUI)
│   ├── dance-script.js        # VRM skeletal dance animation
│   ├── build-mcpb-package.ps1 # MCPB pack builder
│   ├── cua-nsis-config.json   # CUA smoke test config
│   └── _gen_prompts.py        # 3-4-100 prompt generator
├── mcpb/                      # Claude Desktop pack root
├── native/                    # Tauri 2.0 NSIS build
├── webapp/                    # Vite React SPA dashboard
├── docs/                      # ONBOARDING, CONFIGURATION, DEVELOPMENT,
│                               # ARCHITECTURE (this file), TOOLS, WRAPPEE,
│                               # TROUBLESHOOTING
├── tests/
│   ├── unit/test_tools.py     # tool impls: honest errors, field forwarding
│   ├── unit/test_bridge.py    # bridge route, 503s, install, WS round trip
│   └── e2e/test_e2e.py        # backend subprocess, no Overte needed
├── justfile                   # 10+ build recipes
├── start.ps1 / start.bat      # Full stack launcher
├── llms.txt / llms-full.txt   # LLM discovery corpus
└── glama.json                 # Glama registry metadata
```

## Known Issues

See [STATUS.md](../STATUS.md) for the full list. Key architectural items:

1. **VRM joint animation** — `getJointNames()` returns 0 for VRM entities (not a
   supported format). Convert to FBX/GLB or use the avatar pipeline instead — see
   STATUS.md's VRM joint animation section for the working conversion pipeline.
2. **Entity persistence** — fixed; `overte_entity_spawn` now accepts `permanent=True`
   which sets `lifetime: -1` so entities survive a domain-server restart. Default
   spawns are still temporary unless this flag is passed.
3. **World Labs GLB import** — GLB/glTF is supported by Overte Model entities;
   an end-to-end in-Interface test is still pending (see STATUS.md Remaining).
4. **This file's location** — moved from repo root to `docs/ARCHITECTURE.md`
   (2026-07-30) per the updated fleet README standard.
