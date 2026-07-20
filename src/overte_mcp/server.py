"""FastMCP Stdio server interface for Overte domain administration and orchestration."""

import logging
from typing import Any

from fastmcp import FastMCP

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

# Initialize FastMCP Server
# NOTE: this installed `mcp` version's FastMCP.__init__ only accepts `name` --
# title/description kwargs (present in the original vircadia-mcp scaffold) raised
# a TypeError. Caught during the 2026-07-20 rename verification; not a rename bug,
# pre-existing and never actually run before now.
mcp = FastMCP("overte-mcp")


@mcp.tool()
async def overte_domain_status(input_data: DomainStatusInput) -> dict[str, Any]:
    """Retrieve connected-node telemetry and settings from an Overte Domain Server.

    Real live path against /nodes.json and /settings.json. Falls back to clearly
    labeled simulated data if no domain-server is reachable.

    Args:
        input_data: Connection parameters (host, port, optional Basic Auth credentials)
    """
    return await get_domain_status_impl(input_data)


@mcp.tool()
async def overte_entity_spawn(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn a virtual object or 3D GLB model in-world at the specified coordinates.

    SIMULATED ONLY at present -- see tools/entities.py docstring. No live
    domain bridge exists yet.

    Args:
        input_data: Entity spawn details (name, type, position, scale, URLs)
    """
    return await spawn_entity_impl(input_data)


@mcp.tool()
async def overte_script_inject(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Inject a JavaScript script to govern behavior of an in-world entity.

    SIMULATED ONLY at present -- see tools/scripting.py docstring. No live
    domain bridge exists yet.

    Args:
        input_data: Target UUID, script URL, and scope variables
    """
    return await inject_script_impl(input_data)


def main():
    """Main entry point for command-line execution."""
    mcp.run()


if __name__ == "__main__":
    main()
