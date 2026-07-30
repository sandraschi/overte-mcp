"""FastMCP 3.4+ server with dual transport (stdio proxy + direct), annotations, prompts, resources, sampling, and lifespan."""

import asyncio
import datetime
import logging
import os
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastmcp import FastMCP
from pydantic import Field

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

_READ_ONLY: dict[str, bool] = {"readonly": True}
_MUTATING: dict[str, bool] = {}
_DESTRUCTIVE: dict[str, bool] = {}

_STARTED = datetime.datetime.now(datetime.timezone.utc)

mcp = FastMCP("overte-mcp")


# -- Lifespan --
@mcp.lifespan()
def lifespan():
    logger.info("overte-mcp server starting")
    yield
    logger.info("overte-mcp server stopping")


# -- Resources --
@mcp.resource("skill://overte-admin")
def get_overte_skill() -> str:
    """Skill content for Overte domain administration."""
    skill_path = Path(__file__).parent / "skills" / "overte-admin" / "SKILL.md"
    if skill_path.exists():
        return skill_path.read_text(encoding="utf-8")
    return "# Overte Admin\n\nSkill content not available."


@mcp.resource("server://info")
def get_server_info() -> dict:
    """Server metadata and uptime."""
    return {
        "name": "overte-mcp",
        "version": "0.2.0",
        "started_at": _STARTED.isoformat(),
        "uptime_seconds": int((datetime.datetime.now(datetime.timezone.utc) - _STARTED).total_seconds()),
    }


# -- Prompts --
@mcp.prompt()
def domain_help(topic: str = "overview") -> str:
    """Context-aware help for Overte domain operations.

    ## Return Format
    str — help text for the requested topic.

    ## Examples
    domain_help(topic="status")
    """
    topics = {
        "overview": (
            "Overte is an open-source VR/metaverse platform descended from High Fidelity. "
            "This MCP server provides domain-server administration (node monitoring, settings), "
            "in-world entity spawning, and JavaScript script injection."
        ),
        "status": (
            "Use overte_domain_status to check connected nodes and settings from the domain-server. "
            "Accessible at port 40100 by default."
        ),
        "spawn": (
            "Use overte_entity_spawn to create Box, Sphere, Web, or Model entities in-world. "
            "Requires the WebSocket bridge for live operation."
        ),
        "script": (
            "Use overte_script_inject to attach JavaScript behaviors to existing entities. "
            "Requires the WebSocket bridge for live operation."
        ),
    }
    return topics.get(topic, topics["overview"])


# -- Tools --
@mcp.tool(annotations=_READ_ONLY)
async def overte_domain_status(
    host: Annotated[str, Field(description="Overte domain server host.")] = "localhost",
    port: Annotated[int, Field(description="Overte domain administration port.", ge=1, le=65535)] = 40100,
    username: Annotated[str | None, Field(description="HTTP Basic Auth username for the domain-server admin API.")] = None,
    password: Annotated[str | None, Field(description="HTTP Basic Auth password for the domain-server admin API.")] = None,
    ctx: Any = None,
) -> dict:
    """Retrieve connected-node telemetry and settings from an Overte Domain Server.

    Real live path against /nodes.json and /settings.json. Falls back to clearly
    labeled simulated data if no domain-server is reachable.

    ## Return Format
    {"success": bool, "message": str, "data": {"source": str, "domain": {...}}}

    ## Examples
    overte_domain_status(host="localhost", port=40100)
    overte_domain_status(host="192.168.1.100", port=40100, username="admin", password="admin")
    """
    result = await get_domain_status_impl(
        DomainStatusInput(host=host, port=port, username=username, password=password)
    )
    success = result.get("status") == "success"
    return {
        "success": success,
        "message": result.get("message") or ("Domain status retrieved." if success else "Failed to query domain-server."),
        "data": {
            "source": result.get("source"),
            "domain": result.get("domain"),
        },
    }


@mcp.tool(annotations=_MUTATING)
async def overte_entity_spawn(
    name: Annotated[str, Field(description="Name of the entity to spawn.")],
    entity_type: Annotated[str, Field(description="Entity type: Box, Sphere, Web, or Model.", alias="type")] = "Box",
    position: Annotated[list[float], Field(description="X, Y, Z translation coordinates.")] = [0.0, 0.0, 0.0],
    scale: Annotated[list[float], Field(description="X, Y, Z dimensions.")] = [1.0, 1.0, 1.0],
    model_url: Annotated[str | None, Field(description="GLB/FBX model resource URL if type is Model.")] = None,
    script_url: Annotated[str | None, Field(description="Optional JavaScript behavior script URL to attach.")] = None,
    ctx: Any = None,
) -> dict:
    """Spawn a virtual object or 3D GLB model in-world at the specified coordinates.

    Live when scripts/overte-mcp-bridge.js is connected to the FastAPI WS hub;
    otherwise returns a clearly labeled simulated confirmation.

    ## Return Format
    {"success": bool, "message": str, "data": {"source": str, "entity": {...}}}

    ## Examples
    overte_entity_spawn(name="MyBox")
    overte_entity_spawn(name="Tree", entity_type="Model", model_url="https://example.com/tree.glb", position=[10, 0, -5])
    """
    result = await spawn_entity_impl(
        EntitySpawnInput(
            name=name,
            type=entity_type,
            position=position,
            scale=scale,
            model_url=model_url,
            script_url=script_url,
        )
    )
    success = result.get("status") == "success"
    return {
        "success": success,
        "message": result.get("message") or ("Entity spawned." if success else "Failed to spawn entity."),
        "data": {
            "source": result.get("source"),
            "entity": result.get("entity"),
            "warning": result.get("warning"),
        },
    }


@mcp.tool(annotations=_MUTATING)
async def overte_script_inject(
    entity_id: Annotated[str, Field(description="Overte target entity UUID.")],
    script_url: Annotated[str, Field(description="JavaScript behavior script URL.")],
    script_data: Annotated[dict[str, Any] | None, Field(description="Metadata parameters to inject into the script scope.")] = None,
    ctx: Any = None,
) -> dict:
    """Inject a JavaScript script to govern behavior of an in-world entity.

    Live when the Overte bridge WebSocket client is connected; otherwise
    returns a clearly labeled simulated confirmation.

    ## Return Format
    {"success": bool, "message": str, "data": {"source": str, "script": {...}}}

    ## Examples
    overte_script_inject(entity_id="abc-123-def", script_url="https://example.com/behavior.js")
    overte_script_inject(entity_id="abc-123-def", script_url="https://example.com/click.js", script_data={"color": "red"})
    """
    result = await inject_script_impl(
        ScriptInjectInput(
            entity_id=entity_id,
            script_url=script_url,
            script_data=script_data or {},
        )
    )
    success = result.get("status") == "success"
    return {
        "success": success,
        "message": result.get("message") or ("Script injected." if success else "Failed to inject script."),
        "data": {
            "source": result.get("source"),
            "script": result.get("script"),
            "warning": result.get("warning"),
        },
    }


# -- Sampling-enabled help --
@mcp.tool(annotations=_READ_ONLY)
async def overte_sampling_assist(
    goal: Annotated[str, Field(description="What you want to accomplish with Overte.")],
    ctx: Any = None,
) -> dict:
    """Get multi-step Overte operation guidance via MCP sampling (FastMCP 3.1+).

    Uses ctx.sample when the host exposes sampling; returns structured error otherwise.
    Recommends tool calls and sequencing for complex goals.

    ## Return Format
    {"success": bool, "message": str, "data": {"plan": str, "sampling_used": bool}}

    ## Examples
    overte_sampling_assist(goal="Set up a domain-server and spawn a welcome entity")
    """
    plan = (
        f"Goal: {goal}\n\n"
        "Recommended steps:\n"
        "1. overte_domain_status(host='localhost', port=40100) — verify server is reachable\n"
        "2. overte_entity_spawn(name='Welcome', type='Web', position=[0, 1, -3]) — create welcome sign\n"
        "3. overte_script_inject(entity_id='...', script_url='...') — attach behavior"
    )

    if ctx and hasattr(ctx, "sample"):
        try:
            sampling_result = await ctx.sample(f"Create a step-by-step plan for: {goal}")
            if sampling_result:
                plan = str(sampling_result)
                return {"success": True, "message": "Sampling-assisted plan generated.", "data": {"plan": plan, "sampling_used": True}}
        except Exception as e:
            logger.debug(f"Sampling failed, using static plan: {e}")

    return {"success": True, "message": "Static plan (sampling not available on this host).", "data": {"plan": plan, "sampling_used": False}}


def main():
    """Entry point with stdio proxy pattern — probes HTTP daemon first, falls back to direct stdio."""
    http_url = os.getenv("SERVER_API_URL", "http://127.0.0.1:11110")
    mcp_url = f"{http_url}/mcp"

    try:
        r = httpx.post(
            mcp_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {},
                    "clientInfo": {"name": "probe", "version": "1"},
                },
            },
            headers={"Accept": "application/json, text/event-stream"},
            timeout=3,
        )
        if r.status_code == 200:
            from fastmcp.server import create_proxy

            proxy = create_proxy(mcp_url, name="overte-mcp")
            asyncio.run(proxy.run_stdio_async(show_banner=False))
            return
    except Exception:
        logger.info("No HTTP daemon at %s — starting direct stdio server.", mcp_url)

    mcp.run()


if __name__ == "__main__":
    main()
