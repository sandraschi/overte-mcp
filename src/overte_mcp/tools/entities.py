"""Overte Entity spawning tools.

Entity creation normally happens through the Interface client's JavaScript
API or a headless Assignment Client - not a plain domain-admin HTTP POST.

Live path: FastAPI `/api/overte/ws` + `scripts/overte-mcp-bridge.js`.
When no bridge client is connected, this module returns labeled simulated
results. See ARCHITECTURE.md.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from ..models import (
    EntityAnimateInput,
    EntityDeleteInput,
    EntitySpawnInput,
    EntityUpdateInput,
    NearbyEntitiesInput,
)

logger = logging.getLogger(__name__)

_LOCAL_API = "http://127.0.0.1:11110/api/overte"


async def spawn_entity_impl(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn an entity in Overte. Attempts to use the local WebSocket bridge via REST.

    Args:
        input_data: Configuration details (name, type, position, scale, URLs)

    Returns:
        The result payload (either live via WebSocket bridge or simulated fallback).
    """
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            payload = {
                "name": input_data.name,
                "type": input_data.type,
                "position": input_data.position,
                "scale": input_data.scale,
                "model_url": input_data.model_url,
                "script_url": input_data.script_url,
                "permanent": input_data.permanent,
            }
            # Try to delegate to local running uvicorn REST server
            r = await client.post("http://127.0.0.1:11110/api/overte/spawn", json=payload)
            if r.status_code == 200:
                logger.info("Successfully spawned entity via local REST API bridge")
                return r.json()
            elif r.status_code == 400:
                logger.error(f"Failed to spawn entity via REST API: {r.text}")
                return {
                    "status": "error",
                    "message": r.json().get("detail", "Failed to spawn entity."),
                }
    except Exception as e:
        logger.debug(
            f"HTTP request to local spawn REST server failed: {e}. Falling back to simulation."
        )

    logger.info("vircadia/overte-mcp: entity spawn falling back to simulated result")
    return {
        "status": "success",
        "source": "simulated",
        "warning": (
            "No active WebSocket bridge client connected to the MCP dashboard. "
            "Using simulated fallback. Connect scripts/overte-mcp-bridge.js inside Overte."
        ),
        "message": f"Simulated spawn of entity '{input_data.name}'",
        "entity": {
            "id": str(uuid.uuid4()),
            "name": input_data.name,
            "type": input_data.type,
            "position": input_data.position,
            "scale": input_data.scale,
            "model_url": input_data.model_url,
            "script_url": input_data.script_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    }


async def _post(path: str, json_body: dict[str, Any], timeout: float = 6.0) -> dict[str, Any]:
    """Thin POST to this server's own REST API - these tools have no meaningful "simulated"
    mode of their own (unlike spawn's placeholder object): a failure here means either the
    backend isn't running or the bridge isn't connected, and the REST endpoint already
    reports which honestly via its own error detail."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{_LOCAL_API}{path}", json=json_body)
            if r.status_code == 200:
                return r.json()
            return {"status": "error", "message": r.json().get("detail", r.text)}
    except Exception as e:
        return {"status": "error", "message": f"overte-mcp backend unreachable: {e}"}


async def update_entity_impl(input_data: EntityUpdateInput) -> dict[str, Any]:
    """Move/resize/re-parent/toggle an existing entity."""
    return await _post(
        "/update",
        {
            "entity_id": input_data.entity_id,
            "position": input_data.position,
            "dimensions": input_data.dimensions,
            "parent_id": input_data.parent_id,
            "visible": input_data.visible,
            "intensity": input_data.intensity,
            "color": input_data.color,
        },
    )


async def delete_entity_impl(input_data: EntityDeleteInput) -> dict[str, Any]:
    """Delete an entity from the world."""
    return await _post("/delete", {"entity_id": input_data.entity_id})


async def animate_entity_impl(input_data: EntityAnimateInput) -> dict[str, Any]:
    """Loop-animate an entity (spin/bob) for a fixed duration - blocks for that long."""
    return await _post(
        "/animate",
        {
            "entity_id": input_data.entity_id,
            "mode": input_data.mode,
            "axis": input_data.axis,
            "speed": input_data.speed,
            "amplitude": input_data.amplitude,
            "duration_s": input_data.duration_s,
            "tick_hz": input_data.tick_hz,
        },
        timeout=input_data.duration_s + 10.0,
    )


async def find_nearby_entities_impl(input_data: NearbyEntitiesInput) -> dict[str, Any]:
    """Search real in-world entities near a point (default: the local user)."""
    return await _post("/nearby", {"position": input_data.position, "radius": input_data.radius})
