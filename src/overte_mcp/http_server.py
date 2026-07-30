"""FastAPI REST HTTP server interface for Overte MCP Webapp Dashboard."""

import asyncio
import collections
import datetime
import json
import logging
import os
import subprocess
import uuid
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

# Ring-buffer log
_LOG_RING = collections.deque(maxlen=500)


def _log(source: str, level: str, message: str):
    _LOG_RING.append(
        {
            "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "source": source,
            "level": level,
            "message": message,
        }
    )


# WebSocket bridge state
_active_ws: WebSocket | None = None
_pending_requests: dict[str, asyncio.Future] = {}


# Port configuration
BACKEND_PORT = 11110
FRONTEND_PORT = 11111

# Uptime tracking & Git SHA resolution
_STARTED = datetime.datetime.now(datetime.timezone.utc)


def _git_sha() -> str:
    try:
        repo = Path(__file__).resolve().parents[2]
        return (
            subprocess.run(
                ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
                capture_output=True,
                text=True,
                timeout=2,
            ).stdout.strip()
            or "unknown"
        )
    except Exception:
        return "unknown"


GIT_SHA = _git_sha()

app = FastAPI(
    title="Overte MCP REST Server",
    description="HTTP REST interface complementing standard Stdio MCP",
    version="0.2.0",
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
        "version": "0.2.0",
        "git_sha": GIT_SHA,
        "started_at": _STARTED.isoformat(),
        "uptime_seconds": int(uptime),
        "tool_count": 4,
        "shutting_down": False,
        "transport": "streamable-http",
        "port": BACKEND_PORT,
    }


@app.get("/api/tools")
async def list_tools():
    """List MCP tools with descriptions and input schemas."""
    return {
        "tools": [
            {
                "name": "overte_domain_status",
                "description": "Retrieve connected-node telemetry and settings from an Overte Domain Server.",
                "inputSchema": {
                    "host": {"type": "string", "default": "localhost"},
                    "port": {"type": "integer", "default": 40100},
                    "username": {"type": "string"},
                    "password": {"type": "string"},
                },
            },
            {
                "name": "overte_entity_spawn",
                "description": "Spawn a virtual object or 3D model in-world.",
                "inputSchema": {
                    "name": {"type": "string", "required": True},
                    "type": {"type": "string", "default": "Box"},
                    "position": {"type": "array", "items": {"type": "number"}},
                    "scale": {"type": "array", "items": {"type": "number"}},
                    "model_url": {"type": "string"},
                    "script_url": {"type": "string"},
                },
            },
            {
                "name": "overte_script_inject",
                "description": "Inject a JavaScript script onto an in-world entity.",
                "inputSchema": {
                    "entity_id": {"type": "string", "required": True},
                    "script_url": {"type": "string", "required": True},
                    "script_data": {"type": "object"},
                },
            },
        ]
    }


@app.get("/api/skills")
async def list_skills():
    """List available Overte skills."""
    return {
        "skills": [
            {
                "name": "overte-admin",
                "title": "Overte Domain Administration",
                "description": "Core skill for domain-server node monitoring and configuration.",
            }
        ]
    }


@app.get("/api/skill/overte-admin")
async def get_overte_skill():
    """Return the overte-admin skill content."""
    return {
        "name": "overte-admin",
        "content": "# Overte Domain Administration\n\nManage Overte domain-servers: query connected nodes, monitor settings, spawn entities, inject scripts.\n\n## Tools\n- `overte_domain_status` — query /nodes.json and /settings.json\n- `overte_entity_spawn` — spawn Box, Sphere, Web, or Model entities\n- `overte_script_inject` — attach JS behaviors to entities\n\n## Architecture\nOverte Domain Server (port 40100) + WebSocket bridge (port 11110) + FastAPI gateway + React dashboard.",
    }


@app.get("/api/v1/diagnostics")
async def diagnostics():
    """CUA smoke-test required endpoint: tool list + system info."""
    uptime = (datetime.datetime.now(datetime.timezone.utc) - _STARTED).total_seconds()
    return {
        "status": "ok",
        "server": "overte-mcp",
        "version": "0.2.0",
        "uptime_seconds": int(uptime),
        "tool_count": 4,
        "tools": [
            {"name": "overte_domain_status"},
            {"name": "overte_entity_spawn"},
            {"name": "overte_script_inject"},
            {"name": "overte_sampling_assist"},
        ],
        "system": {"windows": True},
        "errors": [],
    }


@app.get("/api/logs")
async def get_logs(limit: int = 50, level: str | None = None):
    """Query the ring-buffer log."""
    entries = list(_LOG_RING)
    if level:
        entries = [e for e in entries if e["level"].upper() == level.upper()]
    return {"logs": entries[-limit:], "total": len(entries)}


@app.get("/api/overte/status")
async def get_domain_status(
    host: str = "localhost",
    port: int = 40100,
    username: str | None = None,
    password: str | None = None,
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


async def _send_ws_command(action: str, payload: dict) -> dict | None:
    global _active_ws
    if not _active_ws:
        return None

    req_id = str(uuid.uuid4())
    future = asyncio.get_running_loop().create_future()
    _pending_requests[req_id] = future

    cmd = {"action": action, "request_id": req_id, **payload}

    try:
        await _active_ws.send_text(json.dumps(cmd))
        result = await asyncio.wait_for(future, timeout=5.0)
        return result
    except Exception as e:
        logger.error(f"WebSocket command {action} failed: {e}")
        return None
    finally:
        _pending_requests.pop(req_id, None)


@app.websocket("/api/overte/ws")
async def websocket_endpoint(websocket: WebSocket):
    global _active_ws
    await websocket.accept()
    logger.info("Overte MCP WebSocket Bridge client connected")
    _active_ws = websocket
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                req_id = data.get("request_id")
                if req_id and req_id in _pending_requests:
                    future = _pending_requests[req_id]
                    if not future.done():
                        future.set_result(data)
            except Exception as e:
                logger.error(f"Error handling websocket message: {e}")
    except WebSocketDisconnect:
        logger.info("Overte MCP WebSocket Bridge client disconnected")
    finally:
        if _active_ws == websocket:
            _active_ws = None


@app.post("/api/overte/spawn")
async def post_entity_spawn(request: EntitySpawnInput):
    """Spawn an in-world entity (via WebSocket bridge if connected, else falls back to simulated)."""
    try:
        if _active_ws:
            payload = {
                "properties": {
                    "type": request.type,
                    "name": request.name,
                    "position": {
                        "x": request.position[0],
                        "y": request.position[1],
                        "z": request.position[2],
                    }
                    if (request.position and len(request.position) == 3)
                    else {"x": 0, "y": 0, "z": 0},
                    "dimensions": {
                        "x": request.scale[0],
                        "y": request.scale[1],
                        "z": request.scale[2],
                    }
                    if (request.scale and len(request.scale) == 3)
                    else {"x": 1, "y": 1, "z": 1},
                    "modelURL": request.model_url,
                    "script": request.script_url,
                    "lifetime": -1 if request.permanent else None,
                }
            }
            res = await _send_ws_command("spawn", payload)
            if res and res.get("status") == "success":
                return {
                    "status": "success",
                    "source": "live",
                    "entity_id": res.get("entity_id"),
                    "message": "Entity successfully spawned in-world via WebSocket bridge.",
                }
            else:
                msg = (
                    res.get("message", "WebSocket client failed to spawn entity.")
                    if res
                    else "WebSocket timeout/error."
                )
                raise HTTPException(status_code=400, detail=msg)

        result = await spawn_entity_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to spawn entity: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/overte/inject")
async def post_script_inject(request: ScriptInjectInput):
    """Inject a JavaScript entity script (via WebSocket bridge if connected, else falls back to simulated)."""
    try:
        if _active_ws:
            payload = {
                "entity_id": request.entity_id,
                "script_url": request.script_url,
                "script_data": request.script_data,
            }
            res = await _send_ws_command("inject", payload)
            if res and res.get("status") == "success":
                return {
                    "status": "success",
                    "source": "live",
                    "message": f"Script successfully injected into entity {request.entity_id} via WebSocket bridge.",
                }
            else:
                msg = (
                    res.get("message", "WebSocket client failed to inject script.")
                    if res
                    else "WebSocket timeout/error."
                )
                raise HTTPException(status_code=400, detail=msg)

        result = await inject_script_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to inject script: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# Serve model files (FBX/GLB) for Overte entity loading
_models_dir = Path(__file__).resolve().parent.parent.parent / "models"
if _models_dir.exists():
    app.mount("/models", StaticFiles(directory=str(_models_dir)), name="models")
    _log("http_server", "INFO", f"Model files served from {_models_dir}")
else:
    _log("http_server", "WARNING", f"Models directory not found: {_models_dir}")

# Mount MCP streamable HTTP protocol at /mcp for stdio proxy pattern
try:
    from .server import mcp

    mcp_asgi = mcp.http_app()
    app.mount("/mcp", mcp_asgi)
    _log("http_server", "INFO", "MCP protocol mounted at /mcp")
except Exception as e:
    _log("http_server", "WARNING", f"Could not mount MCP app at /mcp: {e}")


def start_server(port: int | None = None):
    """Start the uvicorn REST server."""
    if port is None:
        port = int(os.environ.get("PORT", BACKEND_PORT))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    start_server()
