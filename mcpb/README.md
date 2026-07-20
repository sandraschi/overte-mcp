# overte-mcp (MCPB Bundle)

Claude Desktop bundle for the Overte domain-server MCP. Targets **Overte** (classic High Fidelity / early Vircadia lineage). Current **Vircadia World** (PostgreSQL/Bun) is a different stack.

## Install

1. Drag `overte-mcp.mcpb` into Claude Desktop, or unpack this folder and point the host at `run_server.py`.
2. Requires **Python 3.12+** and **[uv](https://docs.astral.sh/uv/)** on PATH.

## Tools

| Tool | Reality |
|------|---------|
| `overte_domain_status` | Real HTTP against `/nodes.json` + `/settings.json`; simulated fallback if unreachable |
| `overte_entity_spawn` | Simulated until WebSocket bridge |
| `overte_script_inject` | Simulated until WebSocket bridge |

## Source of truth

Canonical package lives in the repo at `src/overte_mcp/`. Pack scripts sync it into `mcpb/src/overte_mcp` before packing. Do not edit only the mcpb copy long-term.

Homepage: https://github.com/sandraschi/overte-mcp
