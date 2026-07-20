"""Overte in-world JavaScript scripting tools.

HONESTY NOTE: same limitation as entities.py -- there is no plain-REST
"attach script to entity" endpoint in Overte. This is SIMULATED only,
pending the same WebSocket bridge described in entities.py and
ARCHITECTURE.md.
"""

import logging
from typing import Any

from ..models import ScriptInjectInput

logger = logging.getLogger(__name__)


async def inject_script_impl(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Return a simulated script-injection result.

    Args:
        input_data: Target UUID, script URL, and scope variables

    Returns:
        A simulated success payload. NOT a real in-world script attach --
        no WebSocket bridge to a running Overte domain exists yet.
    """
    entity_id = input_data.entity_id
    logger.info(
        f"overte-mcp: script injection has no live backend yet -- simulated for entity {entity_id}"
    )
    return {
        "status": "success",
        "source": "simulated",
        "warning": (
            "No live scripting bridge exists yet. This does not attach a real script "
            "to an in-world entity. See ARCHITECTURE.md for the planned WebSocket bridge."
        ),
        "message": f"Simulated script update on entity {entity_id}",
        "script": {
            "entity_id": entity_id,
            "url": input_data.script_url,
            "scope": input_data.script_data,
            "compiled": False,
        },
    }
