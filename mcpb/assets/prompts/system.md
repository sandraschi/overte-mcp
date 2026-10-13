# overte-mcp - MCP Server Capabilities

**Instructions for LLM:** This file must contain 3,000+ words describing the server's complete capabilities.
Include: all tools with parameters, all prompts, all resources, configuration options, environment variables,
data sources, and integration points. Every tool must have its purpose, parameters, and return format documented.

## Server Overview

[Write 2-3 paragraphs describing what this MCP server does, its domain, and key features.]

## Tools

- **health_check**: Retrieve SOTA standard health telemetry. - **list_tools**: List MCP tools with descriptions and input schemas. - **list_skills**: List available Overte skills. - **get_overte_skill**: Return the overte-admin skill content. - **diagnostics**: CUA smoke-test required endpoint: tool list + system info. - **get_logs**: Query the ring-buffer log. - **get_domain_status**: Query domain-server status telemetry. - **detect_app**: Detect Overte installation and running processes. - **start_app**: Launch an Overte binary (domain-server or interface). - **stop_app**: Kill an Overte binary (domain-server or interface). - **list_scripts**: List all entity scripts with descriptions and metadata. - **get_script**: Get a script's content by name. - **create_script**: Create a new entity script. - **update_script**: Update a script's content and/or metadata. - **delete_script**: Delete a script and remove it from the manifest. - **list_tracked_entities**: Return all entities tracked by this server (spawned via bridge). - **clear_tracked_entities**: Clear the tracked entity list. - **post_entity_spawn**: Spawn an in-world entity (via WebSocket bridge if connected, else falls back to simulated). - **post_script_inject**: Inject a JavaScript entity script (via WebSocket bridge if connected, else falls back to simulated). - **overte_domain_status**: overte_domain_status - **overte_entity_spawn**: overte_entity_spawn - **overte_script_inject**: overte_script_inject - **overte_sampling_assist**: overte_sampling_assist

## Configuration

[Document all environment variables, their defaults, and purposes.]

## Data Sources

[Document any databases, APIs, or files the server reads.]
