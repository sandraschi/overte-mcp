# overte-mcp (MCPB Bundle)

Claude Desktop pack root for the Overte domain-server MCP. Targets **Overte** (classic High Fidelity / early Vircadia lineage). Current **Vircadia World** is a different stack.

## Install

1. From the git repo: `just mcpb-pack` → `dist/overte-mcp.mcpb`
2. Drag `overte-mcp.mcpb` into Claude Desktop (needs **Python 3.12+** and **[uv](https://docs.astral.sh/uv/)** on PATH).

Or point a host at `run_server.py` with `PYTHONPATH=src` after unpacking this folder.

## Tools

| Tool | Reality |
|------|---------|
| `overte_domain_status` | Live `/nodes.json` + `/settings.json`; simulated fallback if unreachable |
| `overte_entity_spawn` | Live when `scripts/overte-mcp-bridge.js` is connected to backend WS; else simulated |
| `overte_script_inject` | Same bridge contract as spawn |

## Layout (fleet standard)

- `manifest.json` v0.2 — `uv run --directory ${PWD} run_server.py`
- `.mcpbignore` — exclude venv, webapp, glama, llms, tests, etc.
- `assets/prompts/` — 3-4-100: `system.md`, `user.md`, `examples.json` (not `usage.json`)
- `src/overte_mcp/` — **synced** from repo `src/overte_mcp/` by `scripts/build-mcpb-package.ps1`

Edit canonical code under repo `src/overte_mcp/`, then re-pack. Do not long-term-edit only the mcpb copy.

Homepage: https://github.com/sandraschi/overte-mcp
