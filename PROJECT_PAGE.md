# Overte MCP Project Page

Project dashboard, design notes, and task tracker for the **Overte MCP Server**.

---

## High-Level Purpose & Mission

Overte MCP is a Model Context Protocol bridge into **Overte** (classic High Fidelity / early Vircadia lineage — not current Vircadia World). Agents can:

- Query live domain-server telemetry (`/nodes.json`, `/settings.json`)
- Spawn entities and inject scripts when [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) is connected; otherwise get labeled simulated results
- Use a React dashboard and optional Claude Desktop `.mcpb` install

**2026-07-20:** renamed from `vircadia-mcp` → `overte-mcp`. See `README.md` for the Overte vs Vircadia World split.

---

## Platform Architecture & Deployment Options

### 1. Primary Path: Local Sandbox (recommended)

* Native Overte domain-server + Interface + MCP backend on one machine.
* Admin: `http://localhost:40100/settings`
* MCP backend / bridge WS: `11110`; dashboard: `11111`
* Status: domain status **verified live**; bridge path **implemented** (requires script load)

### 2. Secondary Path: Remote (Goliath)

* Host domain-server on workstation `Goliath`.
* Status: **On hold** pending lighter container engine (Podman / `podman-mcp`).

### 3. Claude Desktop (`.mcpb`)

* `just mcpb-pack` → `dist/overte-mcp.mcpb`
* Pack from `mcpb/` with 3-4-100 prompts and `.mcpbignore`
* Stdio MCP only — does not replace the full dashboard stack

---

## Tool Integration Scope

### Domain Management (`tools/domain.py`) — live + fallback

* `/nodes.json` + `/settings.json`, optional Basic Auth.
* Verified against local domain-server (2026-07-21).

### Entity Spawning (`tools/entities.py`) — live when bridge connected

* Forwards via FastAPI/WS to Interface script; otherwise `source: "simulated"`.

### JavaScript Injection (`tools/scripting.py`) — live when bridge connected

* Same bridge path and honesty contract as spawn.

---

## Development Roadmap

- `[x]` **Phase 1: Scaffolding** — under old `vircadia-mcp` name
- `[x]` **Phase 2: Rename & re-scope to Overte** — 2026-07-20
- `[x]` **Phase 3: Verify `overte_domain_status` live** — 2026-07-21
- `[x]` **Phase 4: WebSocket bridge** — FastAPI `/api/overte/ws` + `scripts/overte-mcp-bridge.js`
- `[x]` **Phase 4b: MCPB packaging** — `mcpb/` layout, pack script, 3-4-100 prompts, `just mcpb-pack`
- `[~]` **Phase 5: Webapp dashboard** — routes scaffolded; deepen Entity Tree / JS editor UX
- `[ ]` **Phase 6: Goliath / Podman domain deploy** — after `podman-mcp` migration

---

## Doc map

| Doc | Role |
|-----|------|
| `README.md` | Status + quick start |
| `INSTALL.md` | Overte + MCP + MCPB install |
| `ARCHITECTURE.md` | Ports, bridge, mcpb layout |
| `llms.txt` / `llms-full.txt` | LLM index + full corpus |
| `mcpb/README.md` | Bundle-specific notes |
| `CHANGELOG.md` | Releases |
