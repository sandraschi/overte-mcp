"""FastMCP Stdio server interface for Vircadia agent orchestration."""

import logging
from typing import Any

from mcp.server.fastmcp import FastMCP

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

# Initialize FastMCP Server
mcp = FastMCP(
    "vircadia-mcp",
    title="Vircadia MCP Server",
    description="Agent-based metaverse scripting, spawning, and domain orchestration",
)


@mcp.tool()
async def vircadia_domain_status(input_data: DomainStatusInput) -> dict[str, Any]:
    """Retrieve runtime telemetry, active avatars, and settings from Vircadia Domain Server.

    Args:
        input_data: Connection parameters (host, port)
    """
    return await get_domain_status_impl(input_data)


@mcp.tool()
async def vircadia_entity_spawn(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn a virtual object or 3D GLB model in-world at the specified coordinates.

    Args:
        input_data: Entity spawn details (name, type, position, scale, URLs)
    """
    return await spawn_entity_impl(input_data)


@mcp.tool()
async def vircadia_script_inject(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Inject a JavaScript script to govern behavior of an in-world entity.

    Args:
        input_data: Target UUID, script URL, and scope variables
    """
    return await inject_script_impl(input_data)


def main():
    """Main entry point for command-line execution."""
    mcp.run()


if __name__ == "__main__":
    main()
