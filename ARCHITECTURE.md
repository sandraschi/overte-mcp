# Overte MCP System Architecture & Protocols

Maps architecture, ports, and live-vs-simulated pathways. Summary table: `README.md` Status.

---

## High-Level System Architecture

```
  ┌────────────────────────────────────┐
  │            Client Tier             │
  │  - IDE/Chat AI (Stdio MCP / MCPB)  │
  │  - React Dashboard (REST)          │
  │  - Overte Interface (bridge JS)    │
  └────────────────────────────────────┘
                 │
                 ▼  HTTP REST + WS  (port 11110)
  ┌────────────────────────────────────┐
  │           Backend Tier             │
  │  - FastMCP stdio (`overte-mcp`)    │
  │  - FastAPI (`http_server`)         │
  │  - WS `/api/overte/ws` bridge hub  │
  └────────────────────────────────────┘
                 │
                 ├─▶ [LIVE] Domain-server admin HTTP :40100
                 │    GET /nodes.json, GET /settings.json
                 │
                 └─▶ [LIVE when bridge connected] Entity/script ops
                      Interface script → WS → Entities.* APIs
                      (else clearly labeled simulated fallback)
```

---

## Communication Protocols & Ports

| Protocol | Source | Destination | Default Port | Status |
| :--- | :--- | :--- | :--- | :--- |
| Stdio | MCP client / Claude Desktop MCPB | Python FastMCP | N/A | Real |
| HTTP REST | React webapp / MCP tools (via local REST) | FastAPI backend | `11110` | Real |
| WebSocket | `scripts/overte-mcp-bridge.js` | FastAPI `/api/overte/ws` | `11110` | Real when script loaded |
| HTTP | Python backend | Overte domain-server `/nodes.json`, `/settings.json` | `40100` | Real (verified locally) |
| Entity octree | Bridge JS inside Interface | Overte entity-server | (Overte internal) | Real when bridge active |

---

## Why spawn/inject need a bridge (not plain domain admin REST)

Overte's entity-server uses an internal (non-HTTP) octree protocol. First-class create/modify paths:

1. Interface JavaScript API (`Entities.addEntity(...)`, etc.) inside a loaded script, or
2. A headless Assignment Client script.

There is no documented plain-HTTP "POST an entity" on the domain admin port. This repo does **not** invent fake REST entity routes. Instead:

1. FastAPI exposes `/api/overte/ws` and REST helpers that forward spawn/inject when a bridge client is connected.
2. [scripts/overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) runs in Interface (or suitable script host), connects to the backend WS, and calls real entity/script APIs.
3. If no bridge client is connected, tools return **`source: "simulated"`** with an explicit message.

---

## MCPB packaging layout

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
- Root `.mcpbignore` exists for mistaken root packs; prefer packing from `mcpb/`
- Exclude from bundle: `glama.json`, `llms.txt`, `llms-full.txt`, `.venv`, `webapp/`, tests, etc.

Never use `mcpb init` / `mcpb create` (fleet forbidden — broken legacy manifests).

---

## Workspace Directory Structure

* **`src/overte_mcp/`** — canonical package
  - `tools/domain.py` — live admin API + simulated fallback
  - `tools/entities.py` / `tools/scripting.py` — bridge via local REST, else simulated
  - `server.py` — FastMCP stdio
  - `http_server.py` — FastAPI + WS bridge hub
* **`mcpb/`** — Claude Desktop pack root
* **`scripts/overte-mcp-bridge.js`** — in-world WS client
* **`scripts/build-mcpb-package.ps1`** — MCPB builder
* **`webapp/`** — Vite React dashboard (Biome)
* **`llms.txt` / `llms-full.txt`** — LLM discovery corpus
* **`glama.json`** — Glama registry metadata (repo only)
