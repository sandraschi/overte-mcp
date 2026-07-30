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
| `overte_script_inject` | **Verified live** (2026-07-30) — injected dance-script.js onto entity `{717ad8f1-...}` via WebSocket bridge. Entity bobs up/down + spins. |

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

## Remaining (after v0.2.0)

- [ ] Test bridge reconnection on backend restart
- [ ] Verify graceful disconnect when Interface client disconnects
- [ ] Find a proper nekomimi-chan GLB/VRM model for a more impressive demo

### Explicitly out of scope
- Headless Assignment Client bridge
- Vircadia World / Bun-TypeScript compatibility
- Direct octree/UDP protocol parsing
