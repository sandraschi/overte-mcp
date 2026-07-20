"""FastAPI REST HTTP server interface for Overte MCP Webapp Dashboard."""

import datetime
import logging
import os
import subprocess
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

# Port configuration
BACKEND_PORT = 11110
FRONTEND_PORT = 11111

# Uptime tracking & Git SHA resolution
_STARTED = datetime.datetime.now(datetime.timezone.utc)


def _git_sha() -> str:
    try:
        repo = Path(__file__).resolve().parents[2]
        return subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=2,
        ).stdout.strip() or "unknown"
    except Exception:
        return "unknown"


GIT_SHA = _git_sha()

app = FastAPI(
    title="Overte MCP REST Server",
    description="HTTP REST interface complementing standard Stdio MCP",
    version="0.1.0",
)

# Enable CORS for frontend dashboard connection per CORS_STANDARD.md
_cors_origins = [
    f"http://localhost:{FRONTEND_PORT}",
    f"http://127.0.0.1:{FRONTEND_PORT}",
    f"http://localhost:{BACKEND_PORT}",
    f"http://127.0.0.1:{BACKEND_PORT}",
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]

_cors_regex = r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Retrieve SOTA standard health telemetry."""
    uptime = (datetime.datetime.now(datetime.timezone.utc) - _STARTED).total_seconds()
    return {
        "status": "ok",
        "server": "overte-mcp",
        "version": "0.1.0",
        "git_sha": GIT_SHA,
        "started_at": _STARTED.isoformat(),
        "uptime_seconds": int(uptime),
        "shutting_down": False,
        "transport": "streamable-http",
        "port": BACKEND_PORT,
    }


@app.get("/api/overte/status")
async def get_domain_status(
    host: str = "localhost", port: int = 40100, username: str | None = None, password: str | None = None
):
    """Query domain-server status telemetry."""
    try:
        result = await get_domain_status_impl(
            DomainStatusInput(host=host, port=port, username=username, password=password)
        )
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to query domain status: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/overte/spawn")
async def post_entity_spawn(request: EntitySpawnInput):
    """Spawn an in-world entity (currently simulated only -- see tools/entities.py)."""
    try:
        result = await spawn_entity_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to spawn entity: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/overte/inject")
async def post_script_inject(request: ScriptInjectInput):
    """Inject a JavaScript entity script (currently simulated only -- see tools/scripting.py)."""
    try:
        result = await inject_script_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to inject script: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


def start_server(port: int | None = None):
    """Start the uvicorn REST server."""
    if port is None:
        port = int(os.environ.get("PORT", BACKEND_PORT))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    start_server()
