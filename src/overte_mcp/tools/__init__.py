"""Overte MCP tools packages."""

from typing import Any


def _error_response(source: str, message: str, **extra: Any) -> dict[str, Any]:
    """Standard tool failure envelope: status error + source + message.

    Every tool implementation returns either its live result or this shape -
    never a simulated success. `source` names the failure origin
    (bridge_not_connected, domain_unreachable, backend_unreachable).
    """
    return {"status": "error", "source": source, "message": message, **extra}
