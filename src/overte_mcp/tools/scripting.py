"""Overte in-world JavaScript scripting tools.

Same bridge contract as entities.py: live via `/api/overte/ws` +
`scripts/overte-mcp-bridge.js`; without a bridge the tool returns an error, never a
simulated success. See docs/ARCHITECTURE.md.
"""

import logging
from typing import Any

from ..models import ScriptInjectInput
from .entities import _post

logger = logging.getLogger(__name__)


async def inject_script_impl(input_data: ScriptInjectInput) -> dict[str, Any]:
    """Attach a JavaScript entity script through the backend and its bridge.

    No simulated mode: without a connected bridge this returns status "error".
    """
    payload = {
        "entity_id": input_data.entity_id,
        "script_url": input_data.script_url,
        "script_data": input_data.script_data,
    }
    return await _post("/inject", payload)
