# Overte MCP System Architecture & Protocols

This document maps out the system architecture, protocols, and data-flow pathways of the **Overte MCP Server**. It also explains what's real versus simulated today — see `README.md` "Status" table for the summary.

---

## High-Level System Architecture

```
  ┌───────────────────────────────┐
  │         Client Tier           │
  │  - IDE/Chat AI (Stdio MCP)    │
  │  - React Dashboard (REST API) │
  └───────────────────────────────┘
                 │
                 ▼ [HTTP REST Commands / Port 10989]
  ┌───────────────────────────────┐
  │         Backend Tier          │
  │  - Python FastMCP Server      │
  │  - local HTTP Server          │
  └───────────────────────────────┘
                 │
                 ├─▶ [REAL] Domain-server admin API / Port 40100
                 │    GET /nodes.json, GET /settings.json (Basic Auth)
                 │
                 └─▶ [NOT YET BUILT] Entity/scripting bridge
                      (see "Planned Bridge" below)
```

---

## Communication Protocols & Ports

| Protocol | Source | Destination | Default Port | Status |
| :--- | :--- | :--- | :--- | :--- |
| Stdio | MCP Client | Python Backend | N/A | Real |
| HTTP (REST) | React Webapp | Python Backend | `10989` | Real |
| HTTP (REST) | Python Backend | Overte domain-server `/nodes.json`, `/settings.json` | `40100` | Real, unverified against a live server |
| — | Python Backend | Entity-server (spawn/script) | N/A | **Not implemented** — no REST equivalent exists in Overte |

---

## Why entity spawn/script inject can't just be REST

Overte's entity-server communicates over its own internal (non-HTTP) octree protocol. The only first-class ways to create or modify entities are:
1. The Interface client's JavaScript API (`Entities.addEntity(...)`, run inside a loaded script), or
2. A headless **Assignment Client** script, which is a real Overte concept — a JS process that connects to a domain like any other client but has no visible avatar, used for automation/NPCs/scripted behavior.

There is no documented plain-HTTP "POST an entity" endpoint. The previous version of this repo invented one (`/api/v1/entities`) that doesn't correspond to anything in Overte's real API surface — that's been removed, and the tools now honestly return simulated data instead of pretending to call a real endpoint.

## Planned Bridge (not yet built)

To make `overte_entity_spawn` / `overte_script_inject` real:
1. Write a small headless Assignment Client JS script that connects to a running domain and opens a WebSocket back to this MCP server's Python backend.
2. Python-side spawn/script requests get relayed over that WebSocket to the JS side, which calls the real `Entities.addEntity()` / entity `userData`/`script` property APIs.
3. Results get relayed back over the same socket.

This requires an actual running Overte domain to build and test against — see `INSTALL.md` Step 1.

---

## Workspace Directory Structure

* **`src/overte_mcp/`**: Core backend code.
  - **`tools/`**: domain (real), entities (simulated), scripting (simulated).
  - **`models.py`**: Pydantic models mapping HTTP payloads.
  - **`server.py` & `http_server.py`**: Main MCP stdio and REST API entry points.
* **`README.md`**: Quickstart guide, Overte-vs-Vircadia explainer, status table.
* **`ARCHITECTURE.md`**: This document.
* **`INSTALL.md`**: Build dependencies and environment setup.
