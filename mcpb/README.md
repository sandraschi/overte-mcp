# overte-mcp (MCPB Bundle)

Overte (open-source social-VR metaverse) Model Context Protocol server for domain administration and in-world entity orchestration. Live-only: every tool does the real thing or fails with a reason (`bridge_not_connected`, `domain_unreachable`) — no simulated mode.

## Usage

Claude Desktop: install `dist/overte-mcp.mcpb` (one-liner in README.md), or register the bundle manually. Other clients (Cursor / VS Code / Codex / Opencode):

```json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/sandraschi/overte-mcp.git", "overte-mcp"]
    }
  }
}
```

## Tools (12)

- **overte_domain_status**: live domain-server nodes/settings via `/nodes.json` + `/settings.json`.
- **overte_bridge_status**: bridge presence and mode (agent/interface), `can_rez` flag.
- **overte_bridge_install**: register the headless bridge as a domain persistent script (idempotent).
- **overte_entity_spawn**: spawn Box/Sphere/Web/Model/Light; `permanent=True` survives restarts.
- **overte_entity_update**: move/resize/re-parent/toggle an existing entity.
- **overte_entity_delete**: permanently delete an entity (destructive).
- **overte_entity_animate**: spin/bob/real-bounce animation, server-driven over the bridge.
- **overte_nearby_entities**: live-world search around a position or the local user.
- **overte_fixture_spawn**: gripper test fixtures (box/cup/ball/table/chair).
- **overte_script_inject**: attach a JavaScript behavior script to an entity.
- **overte_sampling_assist**: multi-step Overte guidance via MCP sampling.
- **overte_shutdown**: orderly self-termination (`confirm=True`).

REST-only (dashboard/backend, not MCP tools): model/texture/script depots, backup/restore, avatar read, bridge install/uninstall, health/diagnostics/capabilities, logs, and the `/api/llm/*` local-LLM proxy (discover/providers/models/chat/stream/onboarding).

## Requirements

- Python 3.12+
- The bundle registers `python -m overte_mcp` (stdio); the installer ensures a runtime.
