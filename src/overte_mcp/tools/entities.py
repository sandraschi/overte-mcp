"""Overte Entity spawning tools.

HONESTY NOTE: unlike domain.py's nodes.json/settings.json (which are real,
documented domain-server HTTP endpoints), there is NO equivalent plain-REST
"spawn an entity" endpoint in Overte. Entity creation normally happens
through the Interface client's JavaScript API or a headless Assignment
Client script talking the entity-server's internal octree protocol -- not
an HTTP POST a Python backend can call directly.

This function currently returns SIMULATED results only. It does not talk
to a real domain-server. Making this real requires building a small
headless Overte Assignment Client JS script that opens a WebSocket back to
this MCP server, so that Python-side spawn requests get relayed over that
bridge instead of a fictional REST route. That bridge does not exist yet --
see ARCHITECTURE.md roadmap.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from ..models import EntitySpawnInput

logger = logging.getLogger(__name__)


async def spawn_entity_impl(input_data: EntitySpawnInput) -> dict[str, Any]:
    """Return a simulated entity-spawn result.

    Args:
        input_data: Configuration details (name, type, position, scale, URLs)

    Returns:
        A simulated success payload. NOT a real in-world spawn -- no
        WebSocket bridge to a running Overte domain exists yet.
    """
    logger.info(
        "vircadia/overte-mcp: entity spawn has no live backend yet -- returning simulated result"
    )
    return {
        "status": "success",
        "source": "simulated",
        "warning": (
            "No live entity-spawn bridge exists yet. This does not create a real "
            "in-world entity. See ARCHITECTURE.md for the planned WebSocket bridge."
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
