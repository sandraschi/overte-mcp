"""Overte Entity spawning tools.

Entity creation normally happens through the Interface client's JavaScript
API or a headless Assignment Client - not a plain domain-admin HTTP POST.

Live path: FastAPI `/api/overte/ws` + `scripts/overte-mcp-bridge.js`, running headless
as a domain persistent script (agent mode) or inside Interface. When no bridge is
connected every tool here returns status "error" (bridge_not_connected). There is no
simulated mode. See docs/ARCHITECTURE.md.
"""

import logging
from typing import Any

import httpx

from ..models import (
    EntityAnimateInput,
    EntityDeleteInput,
    EntitySpawnInput,
    EntityUpdateInput,
    FixtureSpawnInput,
    NearbyEntitiesInput,
)
from . import _error_response

logger = logging.getLogger(__name__)

_LOCAL_API = "http://127.0.0.1:11110/api/overte"


async def spawn_entity_impl(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn an entity in Overte through the overte-mcp backend and its bridge.

    There is no simulated mode: if the backend is down or no bridge is connected this
    returns status "error" with the reason, never a made-up entity.
    """
    payload = {
        "name": input_data.name,
        "type": input_data.type,
        "position": input_data.position,
        "scale": input_data.scale,
        "model_url": input_data.model_url,
        "script_url": input_data.script_url,
        "permanent": input_data.permanent,
        "parent_id": input_data.parent_id,
        "color": input_data.color,
        "intensity": input_data.intensity,
        "is_spotlight": input_data.is_spotlight,
        "falloff_radius": input_data.falloff_radius,
        "extra_properties": input_data.extra_properties,
    }
    return await _post("/spawn", payload)


async def _post(path: str, json_body: dict[str, Any], timeout: float = 6.0) -> dict[str, Any]:
    """Thin POST to this server's own REST API. A failure means the backend is not running
    or no bridge is connected; the REST endpoint reports which in its error detail."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{_LOCAL_API}{path}", json=json_body)
            if r.status_code == 200:
                return r.json()
            detail = r.json().get("detail", r.text)
            logger.warning(
                "Backend %s%s returned HTTP %s: %s", _LOCAL_API, path, r.status_code, detail
            )
            return _error_response("backend", detail)
    except Exception as e:
        logger.exception("Backend POST %s%s failed", _LOCAL_API, path)
        return _error_response("backend_unreachable", f"overte-mcp backend unreachable: {e}")


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
    """Loop-animate an entity (spin/bob/bounce) for a fixed duration - blocks for that long."""
    return await _post(
        "/animate",
        {
            "entity_id": input_data.entity_id,
            "mode": input_data.mode,
            "axis": input_data.axis,
            "speed": input_data.speed,
            "amplitude": input_data.amplitude,
            "damping": input_data.damping,
            "duration_s": input_data.duration_s,
            "tick_hz": input_data.tick_hz,
        },
        timeout=input_data.duration_s + 10.0,
    )


async def find_nearby_entities_impl(input_data: NearbyEntitiesInput) -> dict[str, Any]:
    """Search real in-world entities near a point (default: the local user)."""
    return await _post("/nearby", {"position": input_data.position, "radius": input_data.radius})


async def spawn_fixture_impl(input_data: FixtureSpawnInput) -> dict[str, Any]:
    """Spawn a preset test fixture (box/cup/ball/table/chair) for gripper testing."""
    return await _post(
        "/fixture",
        {
            "fixture": input_data.fixture,
            "position": input_data.position,
            "forward_distance": input_data.forward_distance,
            "name": input_data.name,
            "color": input_data.color,
        },
    )
