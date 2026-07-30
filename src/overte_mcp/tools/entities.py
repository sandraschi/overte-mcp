"""Overte Entity spawning tools.

Entity creation normally happens through the Interface client's JavaScript
API or a headless Assignment Client — not a plain domain-admin HTTP POST.

Live path: FastAPI `/api/overte/ws` + `scripts/overte-mcp-bridge.js`.
When no bridge client is connected, this module returns labeled simulated
results. See ARCHITECTURE.md.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from ..models import EntitySpawnInput

logger = logging.getLogger(__name__)


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
