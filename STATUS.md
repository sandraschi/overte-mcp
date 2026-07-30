# Status — overte-mcp

**Status**: v0.2.0-beta — Overte installed, domain-server running, `overte_domain_status` verified live. Entity/script bridge still needs Interface client connection. FastAPI backend, React dashboard, Tauri 2.0 native wrapper.

**Repo**: `D:\Dev\repos\overte-mcp`
**Ports**: Backend 11110, Frontend 11111, Overte domain-server admin 40100
**Updated**: 2026-07-30

## Runtime

| Process | Command | Port |
|---------|---------|------|
| MCP gateway + dashboard API | `just serve` or `start.ps1` | 11110 / 11111 |
| Overte Domain Server | Overte `domain-server.exe` external | 40100 |

Verify: `curl http://127.0.0.1:11110/api/health` or open `http://127.0.0.1:11111`

## Architecture

Overte Domain Server HTTP admin API (`/nodes.json`, `/settings.json`) + WebSocket bridge (`overte-mcp-bridge.js` loaded in-world) + Python FastAPI MCP gateway + React SPA dashboard.

## MCP tools

| Tool | Status |
|------|--------|
| `overte_domain_status` | **Real & verified** (2026-07-30) — calls live domain-server at localhost:40100. `/nodes.json` returns `{"nodes":[...]}`, `/settings.json` returns full settings tree. |
| `overte_entity_spawn` | **Real & verified** (2026-07-30) — spawned Box entity in-world via WebSocket bridge. Returns `source: "live"` with real entity UUID. |
| `overte_script_inject` | Implemented, **not yet tested live** — bridge inject action coded but untested. |

## Native app

| Artifact | Path |
|----------|------|
| NSIS installer | `native/target/release/bundle/nsis/Overte MCP_*_x64-setup.exe` |
| MCPB bundle | `dist/overte-mcp.mcpb` |

## Standards compliance

| Standard | Status | Notes |
|----------|--------|-------|
| `glama.json` | ✅ | Root |
| `llms.txt` + `llms-full.txt` | ✅ | Root |
| `justfile` | ✅ | 10 recipes |
| `start.ps1` + `start.bat` | ✅ | SOTA pattern with zombie kill, health poll, browser auto-open |
| Tauri NSIS build | ✅ | `native/build.ps1` full pipeline |
| CORS origins | ✅ | Tauri + Tailscale + LAN |
| Session context injection | ✅ | `.cursorrules` + `.claude-plugin/` |
| STATUS.md | ✅ | This file |

## TODO — Overte install & bridge verification

### Phase 1 — Install Overte on Goliath (✅ 2026-07-30)
- [x] Download Client + Server from overte.org
- [x] Start `domain-server.exe`, admin panel at http://localhost:40100
- [ ] Start Interface, log into local domain, confirm avatar loads

### Phase 2 — Verify `overte_domain_status` (✅ 2026-07-30)
- [x] `/nodes.json` returns `{"nodes":[]}`, `/settings.json` returns full settings tree
- [x] `/api/overte/status` returns `source: "live"` with real data
- [x] `domain.py` parsing correct — no fix needed

### Phase 3 — Wire up the WebSocket bridge (✅ 2026-07-30, partial)
- [x] Load script: Edit > Running Scripts > "+" > Open Script from Disk > `scripts/overte-mcp-bridge.js`
- [x] Backend WebSocket receives connection at `/api/overte/ws`
- [x] `overte_entity_spawn` returns `source: "live"` with real entity UUID `{42501700-f1e3-4e11-b0d5-7b1cb72c9237}`
- [ ] `overte_script_inject` — untested
- [x] Fixed bridge bug: socket readyState check needed `1` not `WebSocket.OPEN` (QtScript compat)
- [ ] Kill/restart backend while Interface runs, confirm bridge reconnects

### Phase 4 — Documentation
- [ ] Update MCP tools table and ARCHITECTURE.md with test results
- [ ] Note any fixes in CHANGELOG.md

### Explicitly out of scope
- Headless Assignment Client bridge
- Vircadia World / Bun-TypeScript compatibility
- Direct octree/UDP protocol parsing
