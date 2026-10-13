# overte-mcp (MCPB Bundle)

Overte (open-source Vircadia-lineage metaverse) Model Context Protocol server for domain administration and in-world entity orchestration

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "overte_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **health_check**: Retrieve SOTA standard health telemetry.
- **list_tools**: List MCP tools with descriptions and input schemas.
- **list_skills**: List available Overte skills.
- **get_overte_skill**: Return the overte-admin skill content.
- **diagnostics**: CUA smoke-test required endpoint: tool list + system info.
- **get_logs**: Query the ring-buffer log.
- **get_domain_status**: Query domain-server status telemetry.
- **detect_app**: Detect Overte installation and running processes.
- **start_app**: Launch an Overte binary (domain-server or interface).
- **stop_app**: Kill an Overte binary (domain-server or interface).
- **list_scripts**: List all entity scripts with descriptions and metadata.
- **get_script**: Get a script's content by name.
- **create_script**: Create a new entity script.
- **update_script**: Update a script's content and/or metadata.
- **delete_script**: Delete a script and remove it from the manifest.
- **list_tracked_entities**: Return all entities tracked by this server (spawned via bridge).
- **clear_tracked_entities**: Clear the tracked entity list.
- **post_entity_spawn**: Spawn an in-world entity (via WebSocket bridge if connected, else falls back to simulated).
- **post_script_inject**: Inject a JavaScript entity script (via WebSocket bridge if connected, else falls back to simulated).
- **overte_domain_status**: overte_domain_status
- **overte_entity_spawn**: overte_entity_spawn
- **overte_script_inject**: overte_script_inject
- **overte_sampling_assist**: overte_sampling_assist

## Requirements

- Python 3.12+
- uv
