# overte-mcp — Agent Navigation

Overte MCP server: domain-server admin + in-world entity/script ops via WebSocket bridge.

## Quick Reference

| Item | Value |
|------|-------|
| Backend port | 11110 |
| Frontend port | 11111 |
| Domain admin | 40100 (admin/admin) |
| FBX model URL | `http://localhost:11110/models/Nekomimi-chan.fbx` |
| just serve | `./start.ps1` |
| just lint | `ruff + biome` |
| just test | `pytest -q` |

## Key Files

| File | Purpose |
|------|---------|
| `src/overte_mcp/server.py` | FastMCP stdio + dual-transport proxy |
| `src/overte_mcp/http_server.py` | FastAPI REST + WS bridge hub |
| `src/overte_mcp/tools/domain.py` | Domain status (live :40100) |
| `src/overte_mcp/tools/entities.py` | Entity spawn (bridge or simulated) |
| `src/overte_mcp/tools/scripting.py` | Script inject (bridge or simulated) |
| `scripts/overte-mcp-bridge.js` | In-World WS client for Interface |
| `scripts/vrm_to_fbx_converter.py` | Blender VRM->FBX pipeline |
| `webapp/src/pages/` | 10 pages: Dashboard, Avatars, Entities, Scripting, Help, Chat, Settings, Tools, Skills, Logs |

## Tool Patterns

- All tool responses include `"source": "live"` or `"source": "simulated"`
- Entity spawn accepts `permanent=True` for cross-restart persistence
- VRM files NOT supported as Overte Model entities — use FBX or glTF
