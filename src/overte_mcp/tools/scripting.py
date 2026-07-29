"""Overte in-world JavaScript scripting tools.

Same bridge contract as entities.py: live via `/api/overte/ws` +
`scripts/overte-mcp-bridge.js`, otherwise labeled simulated. See ARCHITECTURE.md.
"""

import logging
from typing import Any

import httpx

from ..models import ScriptInjectInput

logger = logging.getLogger(__name__)


async def inject_script_impl(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Inject a JavaScript entity script. Attempts to use the local WebSocket bridge via REST.

    Args:
        input_data: Target UUID, script URL, and scope variables

    Returns:
        The result payload (either live via WebSocket bridge or simulated fallback).
    """
    entity_id = input_data.entity_id
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            payload = {
                "entity_id": input_data.entity_id,
                "script_url": input_data.script_url,
                "script_data": input_data.script_data,
            }
            # Try to delegate to local running uvicorn REST server
            r = await client.post("http://127.0.0.1:11110/api/overte/inject", json=payload)
            if r.status_code == 200:
                logger.info(
                    f"Successfully injected script into entity {entity_id} via local REST API bridge"
                )
                return r.json()
            elif r.status_code == 400:
                logger.error(f"Failed to inject script via REST API: {r.text}")
                return {
                    "status": "error",
                    "message": r.json().get("detail", "Failed to inject script."),
                }
    except Exception as e:
        logger.debug(
            f"HTTP request to local inject REST server failed: {e}. Falling back to simulation."
        )

    logger.info(f"overte-mcp: script injection falling back to simulated for entity {entity_id}")
    return {
        "status": "success",
        "source": "simulated",
        "warning": (
            "No active WebSocket bridge client connected to the MCP dashboard. "
            "Using simulated fallback. Connect scripts/overte-mcp-bridge.js inside Overte."
        ),
        "message": f"Simulated script update on entity {entity_id}",
        "script": {
            "entity_id": entity_id,
            "url": input_data.script_url,
            "scope": input_data.script_data,
            "compiled": False,
        },
    }
