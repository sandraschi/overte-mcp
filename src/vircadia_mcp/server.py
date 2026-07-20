"""FastMCP Stdio server interface for Vircadia agent orchestration."""

import logging
from typing import Any
from mcp.server.fastmcp import FastMCP

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput

logger = logging.getLogger(__name__)

# Initialize FastMCP Server
mcp = FastMCP(
    "vircadia-mcp",
    title="Vircadia MCP Server",
    description="Agent-based metaverse scripting, spawning, and domain orchestration",
)


@mcp.tool()
async def vircadia_domain_status(input_data: DomainStatusInput) -> dict[str, Any]:
    """Retrieve runtime telemetry, active avatars, and uptime of the self-hosted Vircadia Domain.

    Args:
        input_data: Connection parameters (host, port)
    """
    host = input_data.host
    port = input_data.port

    logger.info(f"Querying Vircadia domain status on {host}:{port}")

    # Mock response aligned with SOTA standards for offline simulation
    return {
        "status": "success",
        "domain": {
            "name": "Local Agent Lab Grid",
            "host": host,
            "port": port,
            "uptime_seconds": 86400,
            "active_avatars": [
                {"name": "Miko-Agent-01", "uuid": "da7d-4f2a-b62e", "position": [1.5, 0.0, -2.4]},
                {"name": "Sandra", "uuid": "4f2d-908b-62d2", "position": [0.0, 0.0, 0.0]}
            ],
            "settings": {
                "max_concurrency": 200,
                "audio_spatialization": "server-mix",
                "physics_engine": "Bullet"
            }
        }
    }


@mcp.tool()
async def vircadia_entity_spawn(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn a virtual object or 3D GLB model in-world at the specified coordinates.

    Args:
        input_data: Entity spawn details (name, type, position, scale, URLs)
    """
    logger.info(f"Spawning Vircadia entity: {input_data.name} ({input_data.type})")

    # Offline simulation returns standard success structure
    return {
        "status": "success",
        "message": f"Successfully spawned entity '{input_data.name}' in domain space",
        "entity": {
            "id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b",
            "name": input_data.name,
            "type": input_data.type,
            "position": input_data.position,
            "scale": input_data.scale,
            "model_url": input_data.model_url,
            "script_url": input_data.script_url,
            "created_at": "2026-07-20T10:44:00Z"
        }
    }


@mcp.tool()
async def vircadia_script_inject(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Inject a JavaScript script to govern behavior of an in-world entity.

    Args:
        input_data: Target UUID, script URL, and scope variables
    """
    logger.info(f"Injecting JS script into entity {input_data.entity_id}: {input_data.script_url}")

    return {
        "status": "success",
        "message": f"Successfully updated script property on entity {input_data.entity_id}",
        "script": {
            "entity_id": input_data.entity_id,
            "url": input_data.script_url,
            "scope": input_data.script_data,
            "compiled": True
        }
    }


def main():
    """Main entry point for command-line execution."""
    mcp.run()


if __name__ == "__main__":
    main()
