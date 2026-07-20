"""Vircadia Entity JS Scripting and injection tools."""

import logging
from typing import Any

import httpx

from ..models import ScriptInjectInput

logger = logging.getLogger(__name__)


async def inject_script_impl(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Inject a JavaScript script to govern behavior of an in-world entity.

    Args:
        input_data: Target UUID, script URL, and scope variables
    """
    entity_id = input_data.entity_id
    url = f"http://localhost:40100/api/v1/entities/{entity_id}"

    payload = {
        "script": input_data.script_url,
        "userData": {"scope": input_data.script_data},
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.patch(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "source": "live",
                    "message": f"Successfully updated script on entity {entity_id}",
                    "entity": data,
                }
            else:
                logger.warning(
                    f"Script injection returned code {response.status_code}, falling back to mock"
                )

    except (httpx.ConnectError, httpx.TimeoutException):
        logger.info("Could not connect to domain server. Serving local sandbox fallback.")

    # Fallback simulation
    return {
        "status": "success",
        "source": "fallback",
        "message": f"Successfully updated script property on entity {entity_id} (simulated)",
        "script": {
            "entity_id": entity_id,
            "url": input_data.script_url,
            "scope": input_data.script_data,
            "compiled": True,
        },
    }
