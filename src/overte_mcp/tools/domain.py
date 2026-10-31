"""Overte Domain-server administration tools.

Targets the real Overte/classic-Vircadia domain-server admin HTTP API:
  GET  http://{host}:{port}/nodes.json     -- connected nodes (agents, avatar-mixer,
                                               entity-server, audio-mixer, etc.)
  GET  http://{host}:{port}/settings.json  -- full settings tree

Both endpoints are typically protected by HTTP Basic Auth once an admin
username/password has been set on the domain-server's local web UI
(http://localhost:40100/settings). Per fleet convention, local dev setups
default to admin/admin.

VERIFIED LIVE (2026-07-30): confirmed against a real Overte 2026.04.1
domain-server on Goliath. /nodes.json and /settings.json both return the
shapes this module expects. See STATUS.md for the verification record.
"""

import logging
from typing import Any

import httpx

from ..models import DomainStatusInput
from . import _error_response

logger = logging.getLogger(__name__)


async def get_domain_status_impl(input_data: DomainStatusInput) -> dict[str, Any]:
    """Retrieve connected-node telemetry and settings from an Overte domain-server.

    Args:
        input_data: Host, port, and optional Basic Auth credentials
    """
    host = input_data.host
    port = input_data.port
    auth = None
    if input_data.username is not None:
        auth = httpx.BasicAuth(input_data.username, input_data.password or "")

    nodes_url = f"http://{host}:{port}/nodes.json"
    settings_url = f"http://{host}:{port}/settings.json"

    try:
        async with httpx.AsyncClient(timeout=3.0, auth=auth) as client:
            nodes_resp = await client.get(nodes_url)
            if nodes_resp.status_code == 401:
                return _error_response(
                    "live",
                    "Domain-server returned 401 Unauthorized. Pass username/password "
                    "(fleet default: admin/admin) matching the credentials set at "
                    f"http://{host}:{port}/settings.",
                )
            if nodes_resp.status_code == 200:
                nodes_data = nodes_resp.json()
                settings_data: dict[str, Any] = {}
                settings_resp = await client.get(settings_url)
                if settings_resp.status_code == 200:
                    settings_data = settings_resp.json()

                return {
                    "status": "success",
                    "source": "live",
                    "domain": {
                        "host": host,
                        "port": port,
                        "nodes": nodes_data.get("nodes", nodes_data),
                        "settings": settings_data,
                    },
                }
            return _error_response("live", f"nodes.json returned HTTP {nodes_resp.status_code}")

    except (httpx.ConnectError, httpx.TimeoutException):
        logger.exception("Could not connect to domain-server at %s.", nodes_url)

    return _error_response(
        "unreachable",
        f"domain_unreachable: no Overte domain-server answered at {nodes_url}. "
        "Start domain-server.exe (and an assignment-client) first.",
    )
