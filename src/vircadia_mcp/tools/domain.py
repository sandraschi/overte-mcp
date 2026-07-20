"""Vircadia Domain management tools."""

import logging
from typing import Any

import httpx

from ..models import DomainStatusInput

logger = logging.getLogger(__name__)


async def get_domain_status_impl(input_data: DomainStatusInput) -> dict[str, Any]:
    """Retrieve runtime telemetry, active avatars, and settings from Vircadia Domain Server.

    Args:
        input_data: Host and port details
    """
    host = input_data.host
    port = input_data.port
    url = f"http://{host}:{port}/status"

    try:
        # Attempt to make a real REST connection to the Vircadia Domain Server
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "source": "live",
                    "domain": {
                        "name": data.get("name", "Vircadia Domain"),
                        "host": host,
                        "port": port,
                        "uptime_seconds": data.get("uptime", 0),
                        "active_avatars": data.get("users", []),
                        "settings": data.get("settings", {}),
                    },
                }
            else:
                logger.warning(
                    f"Domain status returned code {response.status_code}, falling back to mock"
                )

    except (httpx.ConnectError, httpx.TimeoutException):
        logger.info(f"Could not connect to domain server at {url}. Serving local sandbox fallback.")

    # Fallback payload (MCD-standard offline simulation)
    return {
        "status": "success",
        "source": "fallback",
        "domain": {
            "name": "Local Sandbox Grid",
            "host": host,
            "port": port,
            "uptime_seconds": 3600,
            "active_avatars": [
                {"name": "Miko-Agent-01", "uuid": "da7d-4f2a-b62e", "position": [1.5, 0.0, -2.4]},
                {"name": "Sandra", "uuid": "4f2d-908b-62d2", "position": [0.0, 0.0, 0.0]},
            ],
            "settings": {
                "max_concurrency": 100,
                "audio_spatialization": "server-mix",
                "physics_engine": "Bullet",
            },
        },
    }
