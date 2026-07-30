# Overte MCP — System Architecture & Protocols

Maps architecture, ports, data flow, and the live-vs-simulated contract for the
overte-mcp server. See [STATUS.md](STATUS.md) for current verification status and
[TODO.md](TODO.md) for remaining work.

---

## High-Level System Architecture

```
                      MCP Client Tier
   ┌─────────────────────────────────────────────────────┐
   │  Cursor / Claude Desktop / opencode (Stdio MCP)     │
   │  React SPA Dashboard (REST / WebSocket)             │
   │  Overte Interface Client (in-world bridge script)    │
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
   │      └── /mcp                     — FastMCP HTTP     │
   └──────┬───────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────┐          ┌──────────────────────────┐
   │ Overte       │          │ Overte Interface Client  │
   │ Domain       │          │ (port 11110 WebSocket)   │
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
| WebSocket | `overte-mcp-bridge.js` in Interface | FastAPI `/api/overte/ws` | 11110 | Real when bridge connected |
| HTTP | Python backend | Overte domain-server admin API | 40100 | Real (verified) |
| Entity octree | Bridge JS inside Interface | Overte entity-server | (internal) | Real when bridge active |

## Tool Surface

| Tool | Annotations | Source | Verified | Description |
|------|-------------|--------|----------|-------------|
| `overte_domain_status` | READ_ONLY | Live via :40100 HTTP | ✅ 2026-07-30 | Queries `/nodes.json` + `/settings.json`. Labeled simulated fallback if unreachable. |
| `overte_entity_spawn` | MUTATING | Live via WS bridge | ✅ 2026-07-30 | Spawns Box/Sphere/Web/Model entities via bridge. Labeled simulated fallback. |
| `overte_script_inject` | MUTATING | Live via WS bridge | ✅ 2026-07-30 | Attaches JS behavior to entity via bridge. Labeled simulated fallback. |
| `overte_sampling_assist` | READ_ONLY | Static plan | — | Multi-step guidance via `ctx.sample()` when host supports it. |

Every tool response includes a `"source": "live"` or `"source": "simulated"` field.
No fake green — simulated data is always clearly labeled with warnings.

## Honest Contract (Simulated vs Live)

The server follows a strict honesty policy:

- `source: "live"` — data comes from a real Overte domain-server or WebSocket bridge
- `source: "simulated"` — no domain-server / bridge was reachable; returning placeholder data for UI/tool-shape testing
- Simulated responses always include a `warning` field explaining what's needed for live operation
- 401 errors from the domain-server are propagated as clear auth errors (not silent simulated fallback)

## Why Entity Spawn / Script Inject Need a Bridge

Overte's entity-server communicates via an internal octree protocol — there is no
equivalent of "POST an entity" on the domain-server admin HTTP API. The two paths to
create/modify in-world entities are:

1. **Interface client JavaScript API** — `Entities.addEntity()`, `Entities.editEntity()`
2. **Headless Assignment Client script** — same API, no GUI

This server implements path 1 via the WebSocket bridge:

1. FastAPI exposes `/api/overte/ws` (WebSocket) and REST endpoints that proxy through it
2. `scripts/overte-mcp-bridge.js` runs inside Overte Interface, connects to the WS, and
   calls real entity/script APIs when a command arrives
3. If no bridge client is connected, all entity/script tools return `source: "simulated"`

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

**Critical note:** Only entities with `lifetime: -1` (permanent) are persisted.
Entities created by the current bridge without an explicit lifetime default to
temporary and will NOT survive a domain-server restart. To persist entities,
set `lifetime: -1` in the spawn request or edit the entity after creation.

The current domain-server at `localhost:40100` (Overte 2026.04.1) confirms:
- HTTP Basic Auth enabled (default: admin/admin)
- Empty node list when no Interface clients are connected
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
  "action": "spawn | inject",
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
  "message": "..."        // error only
}
```

### Reconnect Behaviour

- Exponential backoff: 1s → 2s → 4s → ... → 30s max
- Uses `Script.setTimeout` (QtScript-compatible) for reconnect scheduling
- Falls through to poll-based reconnect if `Script.setTimeout` unavailable
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
│   ├── overte-mcp-bridge.js   # In-world WS client (Interface)
│   ├── dance-script.js        # VRM skeletal dance animation
│   ├── build-mcpb-package.ps1 # MCPB pack builder
│   ├── cua-nsis-config.json   # CUA smoke test config
│   └── _gen_prompts.py        # 3-4-100 prompt generator
├── mcpb/                      # Claude Desktop pack root
├── native/                    # Tauri 2.0 NSIS build
├── webapp/                    # Vite React SPA dashboard
├── tests/
│   ├── unit/test_tools.py     # 6 unit tests
│   └── e2e/test_e2e.py        # 4 e2e tests
├── justfile                   # 10+ build recipes
├── start.ps1 / start.bat      # Full stack launcher
├── llms.txt / llms-full.txt   # LLM discovery corpus
└── glama.json                 # Glama registry metadata
```

## Known Issues

See [TODO.md](TODO.md) for the full list. Key architectural items:

1. **VRM joint animation** — `getJointNames()` returns 0 for VRM entities (not a
   supported format). Convert to FBX or use avatar pipeline instead.
2. **Entity persistence** — bridge doesn't set `lifetime: -1`, so spawned entities
   are temporary and won't survive domain-server restart.
3. **World Labs GLB import** — GLB/glTF is supported by Overte Model entities;
   needs testing with an exported scene.
4. **ARCHITECTURE.md** — This file supersedes the stale vircadia-era doc.
