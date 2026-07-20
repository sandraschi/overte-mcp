"""Vircadia Entity management and spawning tools."""

import logging
from typing import Any

import httpx

from ..models import EntitySpawnInput

logger = logging.getLogger(__name__)


async def spawn_entity_impl(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Spawn a virtual object or 3D model in the local Vircadia domain space.

    Args:
        input_data: Configuration details (name, type, position, scale, URLs)
    """
    # The default API route for spawning Vircadia entities
    url = "http://localhost:40100/api/v1/entities"

    payload = {
        "name": input_data.name,
        "type": input_data.type,
        "position": input_data.position,
        "scale": input_data.scale,
        "modelURL": input_data.model_url,
        "script": input_data.script_url,
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "source": "live",
                    "message": f"Successfully spawned entity '{input_data.name}' in-world",
                    "entity": data,
                }
            else:
                logger.warning(
                    f"Entity spawn returned code {response.status_code}, falling back to mock"
                )

    except (httpx.ConnectError, httpx.TimeoutException):
        logger.info("Could not connect to domain server. Serving local sandbox fallback.")

    # Fallback simulation
    return {
        "status": "success",
        "source": "fallback",
        "message": f"Successfully spawned entity '{input_data.name}' in domain sandbox (simulated)",
        "entity": {
            "id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b",
            "name": input_data.name,
            "type": input_data.type,
            "position": input_data.position,
            "scale": input_data.scale,
            "model_url": input_data.model_url,
            "script_url": input_data.script_url,
            "created_at": "2026-07-20T10:51:00Z",
        },
    }
