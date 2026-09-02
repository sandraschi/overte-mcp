"""FastAPI REST HTTP server interface for Overte MCP Webapp Dashboard."""

import asyncio
import collections
import datetime
import json
import logging
import math
import os
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .models import (
    DomainStatusInput,
    EntityAnimateInput,
    EntityDeleteInput,
    EntitySpawnInput,
    EntityUpdateInput,
    FixtureSpawnInput,
    NearbyEntitiesInput,
    ScriptInjectInput,
)
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
# Tracked entities (spawned via bridge, survives server restarts via log)
_tracked_entities: dict[str, dict] = {}


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
        "tool_count": 9,
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
            {
                "name": "overte_entity_update",
                "description": "Move, resize, re-parent, or toggle an existing in-world entity.",
                "inputSchema": {
                    "entity_id": {"type": "string", "required": True},
                    "position": {"type": "array", "items": {"type": "number"}},
                    "dimensions": {"type": "array", "items": {"type": "number"}},
                    "parent_id": {"type": "string"},
                    "visible": {"type": "boolean"},
                    "intensity": {"type": "number"},
                    "color": {"type": "array", "items": {"type": "number"}},
                },
            },
            {
                "name": "overte_entity_delete",
                "description": "Permanently delete an in-world entity.",
                "inputSchema": {"entity_id": {"type": "string", "required": True}},
            },
            {
                "name": "overte_entity_animate",
                "description": "Loop-animate an entity in place (spin or bob) for a fixed duration.",
                "inputSchema": {
                    "entity_id": {"type": "string", "required": True},
                    "mode": {"type": "string", "default": "spin"},
                    "axis": {"type": "array", "items": {"type": "number"}},
                    "speed": {"type": "number", "default": 1.0},
                    "amplitude": {"type": "number", "default": 0.1},
                    "duration_s": {"type": "number", "default": 5.0},
                },
            },
            {
                "name": "overte_nearby_entities",
                "description": "Find real in-world entities near a point (default: the local user).",
                "inputSchema": {
                    "position": {"type": "array", "items": {"type": "number"}},
                    "radius": {"type": "number", "default": 20.0},
                },
            },
            {
                "name": "overte_fixture_spawn",
                "description": "Spawn a preset test fixture (box, cup, ball, table, chair) for gripper/manipulation testing.",
                "inputSchema": {
                    "fixture": {"type": "string", "required": True},
                    "position": {"type": "array", "items": {"type": "number"}},
                    "forward_distance": {"type": "number", "default": 1.5},
                    "name": {"type": "string"},
                },
            },
            {
                "name": "overte_sampling_assist",
                "description": "Get multi-step Overte operation guidance via MCP sampling.",
                "inputSchema": {"goal": {"type": "string", "required": True}},
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
        "content": "# Overte Domain Administration\n\nManage Overte domain-servers: query connected nodes, monitor settings, spawn entities, inject scripts.\n\n## Tools\n- `overte_domain_status` - query /nodes.json and /settings.json\n- `overte_entity_spawn` - spawn Box, Sphere, Web, or Model entities\n- `overte_script_inject` - attach JS behaviors to entities\n\n## Architecture\nOverte Domain Server (port 40100) + WebSocket bridge (port 11110) + FastAPI gateway + React dashboard.",
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
        "tool_count": 9,
        "tools": [
            {"name": "overte_domain_status"},
            {"name": "overte_entity_spawn"},
            {"name": "overte_script_inject"},
            {"name": "overte_entity_update"},
            {"name": "overte_entity_delete"},
            {"name": "overte_entity_animate"},
            {"name": "overte_nearby_entities"},
            {"name": "overte_fixture_spawn"},
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


@app.get("/api/overte/avatar")
async def get_avatar_state():
    """Query the local user's avatar position/orientation via the WebSocket bridge.

    No domain-server admin API involved - this goes through the same bridge script as
    spawn/inject, so it needs Interface running with overte-mcp-bridge.js loaded.
    """
    if not _active_ws:
        return {
            "status": "success",
            "source": "simulated",
            "warning": (
                "No active WebSocket bridge client connected. Using placeholder data. "
                "Connect scripts/overte-mcp-bridge.js inside Overte."
            ),
            "position": {"x": 0.0, "y": 0.0, "z": 0.0},
            "orientation": {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0},
        }
    res = await _send_ws_command("get_avatar", {})
    if not res or res.get("status") != "success":
        msg = res.get("message", "WebSocket timeout/error.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    return {
        "status": "success",
        "source": "live",
        "position": res["position"],
        "orientation": res["orientation"],
    }


# ---------------------------------------------------------------------------
# Overte WinApp detection & lifecycle
# ---------------------------------------------------------------------------

_OVERTE_PATHS = [
    Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Overte",
    Path("C:/Program Files/Overte"),
    Path("C:/Program Files (x86)/Overte"),
]

_OVERTE_BINS = {
    "domain-server": "domain-server.exe",
    "interface": "interface.exe",
}


def _find_overte_install() -> dict[str, str | None]:
    """Check known paths for Overte binaries. Returns {name: path | None}."""
    found: dict[str, str | None] = {}
    for name, exe in _OVERTE_BINS.items():
        found[name] = None
        for base in _OVERTE_PATHS:
            candidate = base / exe
            if candidate.exists():
                found[name] = str(candidate)
                break
    return found


def _check_overte_processes() -> dict[str, bool]:
    """Check if Overte processes are running via tasklist."""
    running: dict[str, bool] = {}
    for name, exe in _OVERTE_BINS.items():
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"IMAGENAME eq {exe}", "/NH"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            running[name] = exe.lower() in result.stdout.lower()
        except Exception:
            running[name] = False
    return running


@app.get("/api/overte/app/detect")
async def detect_app():
    """Detect Overte installation and running processes."""
    installed = _find_overte_install()
    running = _check_overte_processes()
    any_installed = any(v is not None for v in installed.values())
    return {
        "installed": any_installed,
        "paths": installed,
        "running": running,
    }


@app.post("/api/overte/app/start")
async def start_app(data: dict):
    """Launch an Overte binary (domain-server or interface)."""
    target = data.get("target", "").strip().lower()
    if target not in _OVERTE_BINS:
        raise HTTPException(
            status_code=400, detail=f"Unknown target: {target}. Use 'domain-server' or 'interface'."
        )
    installed = _find_overte_install()
    path = installed.get(target)
    if not path:
        raise HTTPException(status_code=404, detail=f"{target} not found. Install Overte first.")
    try:
        proc = subprocess.Popen(
            [path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        _log("app", "INFO", f"Launched {target} (PID {proc.pid})")
        return {
            "status": "success",
            "message": f"{target} launched (PID {proc.pid})",
            "pid": proc.pid,
        }
    except Exception as e:
        logger.error(f"Failed to launch {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/overte/app/stop")
async def stop_app(data: dict):
    """Kill an Overte binary (domain-server or interface)."""
    target = data.get("target", "").strip().lower()
    if target not in _OVERTE_BINS:
        raise HTTPException(
            status_code=400, detail=f"Unknown target: {target}. Use 'domain-server' or 'interface'."
        )
    exe = _OVERTE_BINS[target]
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", exe, "/T"],
            capture_output=True,
            timeout=10,
        )
        _log("app", "INFO", f"Stopped {target} ({exe})")
        return {"status": "success", "message": f"{target} stopped"}
    except Exception as e:
        logger.error(f"Failed to stop {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ---------------------------------------------------------------------------


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


# Scripts depot root - entity scripts stored under data/scripts/
_SCRIPTS_DEPOT = Path(__file__).resolve().parent.parent.parent / "data" / "scripts"
_SCRIPTS_MANIFEST_PATH = _SCRIPTS_DEPOT / "manifest.json"


def _load_script_manifest() -> list[dict]:
    if _SCRIPTS_MANIFEST_PATH.exists():
        try:
            with open(_SCRIPTS_MANIFEST_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_script_manifest(manifest: list[dict]):
    _SCRIPTS_DEPOT.mkdir(parents=True, exist_ok=True)
    with open(_SCRIPTS_MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)


@app.get("/api/overte/scripts")
async def list_scripts():
    """List all entity scripts with descriptions and metadata."""
    manifest = _load_script_manifest()
    result = []
    for s in manifest:
        sp = _SCRIPTS_DEPOT / s["name"]
        entry = dict(s)
        entry["exists"] = sp.exists()
        entry["url"] = f"http://localhost:{BACKEND_PORT}/scripts/{s['name']}"
        if sp.exists():
            entry["size"] = sp.stat().st_size
        result.append(entry)
    return {"scripts": result, "count": len(result)}


@app.get("/api/overte/scripts/{name}")
async def get_script(name: str):
    """Get a script's content by name."""
    sp = _SCRIPTS_DEPOT / name
    if not sp.exists() or not sp.name.endswith(".js"):
        raise HTTPException(status_code=404, detail="Script not found")
    manifest = _load_script_manifest()
    meta = next((s for s in manifest if s["name"] == name), {})
    return {
        "name": name,
        "content": sp.read_text(encoding="utf-8"),
        "description": meta.get("description", ""),
        "category": meta.get("category", "uncategorized"),
    }


@app.post("/api/overte/scripts")
async def create_script(data: dict):
    """Create a new entity script."""
    name = data.get("name", "").strip()
    content = data.get("content", "").strip()
    if not name.endswith(".js"):
        name += ".js"
    if not name or not content:
        raise HTTPException(status_code=400, detail="name and content required")
    sp = _SCRIPTS_DEPOT / name
    if sp.exists():
        raise HTTPException(status_code=409, detail="Script already exists")
    _SCRIPTS_DEPOT.mkdir(parents=True, exist_ok=True)
    sp.write_text(content, encoding="utf-8")
    manifest = _load_script_manifest()
    manifest.append(
        {
            "name": name,
            "description": data.get("description", ""),
            "category": data.get("category", "uncategorized"),
        }
    )
    _save_script_manifest(manifest)
    _log("scripts", "INFO", f"Created script: {name}")
    return {"status": "success", "name": name}


@app.put("/api/overte/scripts")
async def update_script(data: dict):
    """Update a script's content and/or metadata."""
    name = data.get("name", "").strip()
    if not name.endswith(".js"):
        name += ".js"
    sp = _SCRIPTS_DEPOT / name
    if not sp.exists():
        raise HTTPException(status_code=404, detail="Script not found")
    if "content" in data:
        sp.write_text(data["content"], encoding="utf-8")
    manifest = _load_script_manifest()
    for s in manifest:
        if s["name"] == name:
            if "description" in data:
                s["description"] = data["description"]
            if "category" in data:
                s["category"] = data["category"]
            break
    _save_script_manifest(manifest)
    _log("scripts", "INFO", f"Updated script: {name}")
    return {"status": "success", "name": name}


@app.delete("/api/overte/scripts/{name}")
async def delete_script(name: str):
    """Delete a script and remove it from the manifest."""
    sp = _SCRIPTS_DEPOT / name
    if sp.exists():
        sp.unlink()
    manifest = _load_script_manifest()
    manifest = [s for s in manifest if s["name"] != name]
    _save_script_manifest(manifest)
    _log("scripts", "INFO", f"Deleted script: {name}")
    return {"status": "success", "name": name}


@app.get("/api/overte/entities")
async def list_tracked_entities():
    """Return all entities tracked by this server (spawned via bridge)."""
    return {
        "status": "success",
        "source": "live" if _active_ws else "simulated",
        "items": list(_tracked_entities.values()),
        "count": len(_tracked_entities),
    }


@app.delete("/api/overte/entities")
async def clear_tracked_entities():
    """Clear the tracked entity list."""
    _tracked_entities.clear()
    return {"status": "success", "message": "Entity list cleared."}


def _rgb01_to_overte(rgb: list[float]) -> dict[str, int]:
    """Overte/HiFi entity `color` is a byte-range {red,green,blue} 0-255, not the 0.0-1.0
    floats used everywhere else in this API - convert once at the boundary."""
    r, g, b = rgb
    return {
        "red": max(0, min(255, round(r * 255))),
        "green": max(0, min(255, round(g * 255))),
        "blue": max(0, min(255, round(b * 255))),
    }


@app.post("/api/overte/spawn")
async def post_entity_spawn(request: EntitySpawnInput):
    """Spawn an in-world entity (via WebSocket bridge if connected, else falls back to simulated)."""
    try:
        if _active_ws:
            properties: dict[str, Any] = {
                "type": request.type,
                "name": request.name,
                "position": {
                    "x": request.position[0],
                    "y": request.position[1],
                    "z": request.position[2],
                }
                if (request.position and len(request.position) == 3)
                else {"x": 0, "y": 0, "z": 0},
                "modelURL": request.model_url,
                "script": request.script_url,
                "lifetime": -1 if request.permanent else None,
            }
            # "dimensions" stretches/squishes the model to fit that exact bounding box - it is
            # NOT a uniform scale multiplier. Omit it entirely (rather than defaulting to
            # 1x1x1) so Overte sizes the entity from the model's own natural dimensions
            # unless the caller explicitly asks for a specific box.
            if request.scale and len(request.scale) == 3:
                properties["dimensions"] = {
                    "x": request.scale[0],
                    "y": request.scale[1],
                    "z": request.scale[2],
                }
            if request.parent_id:
                properties["parentID"] = request.parent_id
            if request.color and len(request.color) == 3:
                properties["color"] = _rgb01_to_overte(request.color)
            if request.intensity is not None:
                properties["intensity"] = request.intensity
            if request.is_spotlight is not None:
                properties["isSpotlight"] = request.is_spotlight
            if request.falloff_radius is not None:
                properties["falloffRadius"] = request.falloff_radius
            payload = {"properties": properties}
            res = await _send_ws_command("spawn", payload)
            if res and res.get("status") == "success":
                entity_id = res.get("entity_id", "")
                _tracked_entities[entity_id] = {
                    "id": entity_id,
                    "name": request.name,
                    "type": request.type,
                    "position": list(request.position),
                    "scale": list(request.scale) if request.scale else None,
                    "model_url": request.model_url,
                    "script_url": request.script_url,
                    "permanent": request.permanent,
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
                return {
                    "status": "success",
                    "source": "live",
                    "entity_id": entity_id,
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


@app.post("/api/overte/update")
async def post_entity_update(request: EntityUpdateInput):
    """Move/resize an existing entity in-world (via WebSocket bridge, live-only - no
    simulated fallback since there's nothing meaningful to simulate for an edit)."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    properties: dict[str, Any] = {}
    if request.position and len(request.position) == 3:
        properties["position"] = {"x": request.position[0], "y": request.position[1], "z": request.position[2]}
    if request.dimensions and len(request.dimensions) == 3:
        properties["dimensions"] = {
            "x": request.dimensions[0],
            "y": request.dimensions[1],
            "z": request.dimensions[2],
        }
    if request.parent_id is not None:
        properties["parentID"] = request.parent_id
    if request.visible is not None:
        properties["visible"] = request.visible
    if request.intensity is not None:
        properties["intensity"] = request.intensity
    if request.color and len(request.color) == 3:
        properties["color"] = _rgb01_to_overte(request.color)
    if not properties:
        raise HTTPException(status_code=400, detail="Nothing to update - pass position and/or dimensions.")

    res = await _send_ws_command("update", {"entity_id": request.entity_id, "properties": properties})
    if not res or res.get("status") != "success":
        msg = res.get("message", "WebSocket client failed to update entity.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    if request.entity_id in _tracked_entities:
        if "position" in properties:
            _tracked_entities[request.entity_id]["position"] = request.position
    return {
        "status": "success",
        "source": "live",
        "message": f"Entity {request.entity_id} updated via WebSocket bridge.",
    }


def _quat_mul(a: tuple, b: tuple) -> tuple:
    """Hamilton product a*b, both (x,y,z,w) - same convention as Overte/HiFi's rotation property."""
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def _axis_angle_quat(axis: tuple, angle: float) -> tuple:
    half = angle / 2.0
    s = math.sin(half)
    return (axis[0] * s, axis[1] * s, axis[2] * s, math.cos(half))


def _rotate_vector(quat_xyzw: tuple, v: tuple) -> tuple:
    """Rotate vector v by quaternion q (x,y,z,w): v' = v + 2*w*(qxyz x v) + 2*(qxyz x (qxyz x v))."""
    qx, qy, qz, qw = quat_xyzw
    vx, vy, vz = v
    tx = 2 * (qy * vz - qz * vy)
    ty = 2 * (qz * vx - qx * vz)
    tz = 2 * (qx * vy - qy * vx)
    cx = qy * tz - qz * ty
    cy = qz * tx - qx * tz
    cz = qx * ty - qy * tx
    return (vx + qw * tx + cx, vy + qw * ty + cy, vz + qw * tz + cz)


# Box/Sphere primitive approximations, sized for realistic grip-testing dimensions - Overte
# has no native cylinder/mesh-library primitive and this doesn't fabricate fake model URLs
# for objects no GLB actually exists for. Each preset is one or more parts with an offset
# from the fixture's placement point (its base, roughly floor-of-object level).
FIXTURE_PRESETS: dict[str, list[dict[str, Any]]] = {
    "box": [
        {"type": "Box", "offset": (0, 0.05, 0), "dimensions": (0.1, 0.1, 0.1), "color": (0.6, 0.45, 0.3)},
    ],
    "cup": [
        {"type": "Box", "offset": (0, 0.05, 0), "dimensions": (0.08, 0.10, 0.08), "color": (0.95, 0.95, 0.98)},
    ],
    "ball": [
        {"type": "Sphere", "offset": (0, 0.035, 0), "dimensions": (0.07, 0.07, 0.07), "color": (0.9, 0.35, 0.1)},
    ],
    "table": [
        {"type": "Box", "offset": (0, 0.715, 0), "dimensions": (1.2, 0.05, 0.6), "color": (0.45, 0.30, 0.18)},
        {"type": "Box", "offset": (0, 0.35, 0), "dimensions": (0.08, 0.70, 0.08), "color": (0.35, 0.22, 0.12)},
    ],
    "chair": [
        {"type": "Box", "offset": (0, 0.45, 0), "dimensions": (0.4, 0.05, 0.4), "color": (0.4, 0.25, 0.15)},
        {"type": "Box", "offset": (0, 0.70, -0.18), "dimensions": (0.4, 0.5, 0.05), "color": (0.4, 0.25, 0.15)},
        {"type": "Box", "offset": (0, 0.225, 0), "dimensions": (0.35, 0.45, 0.35), "color": (0.35, 0.22, 0.12)},
    ],
}


@app.post("/api/overte/fixture")
async def post_fixture_spawn(request: FixtureSpawnInput):
    """Spawn a preset test fixture (box/cup/ball/table/chair) for gripper testing. Multi-part
    fixtures (table, chair) spawn as several independent Box entities near each other - not
    parented, since they're static set-dressing that never needs to move as a unit."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    parts = FIXTURE_PRESETS.get(request.fixture)
    if not parts:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown fixture {request.fixture!r}. Known: {sorted(FIXTURE_PRESETS)}",
        )

    if request.position and len(request.position) == 3:
        base = tuple(request.position)
    else:
        avatar_res = await _send_ws_command("get_avatar", {})
        if not avatar_res or avatar_res.get("status") != "success":
            raise HTTPException(status_code=400, detail="Could not read avatar position to place the fixture.")
        pos = avatar_res["position"]
        rot = avatar_res["orientation"]
        forward = _rotate_vector((rot["x"], rot["y"], rot["z"], rot["w"]), (0.0, 0.0, -1.0))
        base = (
            pos["x"] + forward[0] * request.forward_distance,
            pos["y"],
            pos["z"] + forward[2] * request.forward_distance,
        )

    base_name = request.name or request.fixture
    entity_ids = []
    for i, part in enumerate(parts):
        ox, oy, oz = part["offset"]
        dx, dy, dz = part["dimensions"]
        cr, cg, cb = part["color"]
        properties = {
            "type": part["type"],
            "name": f"{base_name}_{i}" if len(parts) > 1 else base_name,
            "position": {"x": base[0] + ox, "y": base[1] + oy, "z": base[2] + oz},
            "dimensions": {"x": dx, "y": dy, "z": dz},
            "color": _rgb01_to_overte([cr, cg, cb]),
        }
        res = await _send_ws_command("spawn", {"properties": properties})
        if not res or res.get("status") != "success":
            msg = res.get("message", "spawn failed") if res else "WebSocket timeout/error."
            raise HTTPException(status_code=400, detail=f"Fixture part {i} failed: {msg}")
        entity_id = res.get("entity_id", "")
        entity_ids.append(entity_id)
        _tracked_entities[entity_id] = {
            "id": entity_id,
            "name": properties["name"],
            "type": part["type"],
            "position": list(properties["position"].values()),
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

    return {
        "status": "success",
        "source": "live",
        "fixture": request.fixture,
        "entity_ids": entity_ids,
        "position": {"x": base[0], "y": base[1], "z": base[2]},
        "message": f"Spawned {request.fixture} ({len(parts)} part{'s' if len(parts) != 1 else ''}).",
    }


@app.post("/api/overte/animate")
async def post_entity_animate(request: EntityAnimateInput):
    """Loop-animate an entity in place: 'spin' (continuous rotation) or 'bob' (vertical
    oscillation). Server-driven, same pattern as norirobotics-mcp's Resonite wave-demo
    script - repeated 'update' calls over the bridge, not a client-side animation clip."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    if request.mode not in ("spin", "bob"):
        raise HTTPException(status_code=400, detail="mode must be 'spin' or 'bob'")

    start_res = await _send_ws_command("get_entity", {"entity_id": request.entity_id})
    if not start_res or start_res.get("status") != "success":
        raise HTTPException(status_code=400, detail=f"Could not read entity {request.entity_id} - does it exist?")
    props = start_res["properties"]
    rest_rot = props.get("rotation") or {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0}
    rest_rot_t = (rest_rot["x"], rest_rot["y"], rest_rot["z"], rest_rot["w"])
    rest_pos = props.get("position") or {"x": 0.0, "y": 0.0, "z": 0.0}
    axis = tuple(request.axis) if len(request.axis) == 3 else (0.0, 1.0, 0.0)

    start = time.monotonic()
    tick_interval = 1.0 / max(request.tick_hz, 0.1)
    ticks = 0
    while (t := time.monotonic() - start) < request.duration_s:
        if request.mode == "spin":
            delta = _axis_angle_quat(axis, request.speed * t)
            x, y, z, w = _quat_mul(rest_rot_t, delta)
            properties = {"rotation": {"x": x, "y": y, "z": z, "w": w}}
        else:  # bob
            offset = request.amplitude * math.sin(2 * math.pi * request.speed * t)
            properties = {
                "position": {"x": rest_pos["x"], "y": rest_pos["y"] + offset, "z": rest_pos["z"]}
            }
        res = await _send_ws_command("update", {"entity_id": request.entity_id, "properties": properties})
        if not res or res.get("status") != "success":
            raise HTTPException(status_code=400, detail="Bridge update failed mid-animation.")
        ticks += 1
        await asyncio.sleep(tick_interval)

    return {
        "status": "success",
        "source": "live",
        "message": f"Animated entity {request.entity_id} ({request.mode}) for {request.duration_s}s, {ticks} ticks.",
    }


@app.post("/api/overte/nearby")
async def post_nearby_entities(request: NearbyEntitiesInput):
    """Find real in-world entities near a point (default: the local user) via
    Entities.findEntities - unlike GET /api/overte/entities, this queries the live world
    instead of this server's own spawn-tracking memory."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    payload: dict[str, Any] = {"radius": request.radius}
    if request.position and len(request.position) == 3:
        payload["position"] = {"x": request.position[0], "y": request.position[1], "z": request.position[2]}
    res = await _send_ws_command("find_nearby", payload)
    if not res or res.get("status") != "success":
        msg = res.get("message", "WebSocket client failed to search.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "source": "live", "items": res.get("items", []), "count": len(res.get("items", []))}


@app.get("/api/overte/entity/{entity_id}")
async def get_entity_properties(entity_id: str):
    """Read one entity's live properties (position/rotation/dimensions/parent/etc)."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    res = await _send_ws_command("get_entity", {"entity_id": entity_id})
    if not res or res.get("status") != "success":
        msg = res.get("message", "Entity not found.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "source": "live", "properties": res["properties"]}


@app.post("/api/overte/delete")
async def post_entity_delete(request: EntityDeleteInput):
    """Delete an entity from the world (via WebSocket bridge, live-only)."""
    if not _active_ws:
        raise HTTPException(
            status_code=400,
            detail="No active WebSocket bridge client connected. Connect scripts/overte-mcp-bridge.js inside Overte.",
        )
    res = await _send_ws_command("delete", {"entity_id": request.entity_id})
    if not res or res.get("status") != "success":
        msg = res.get("message", "WebSocket client failed to delete entity.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    _tracked_entities.pop(request.entity_id, None)
    return {
        "status": "success",
        "source": "live",
        "message": f"Entity {request.entity_id} deleted via WebSocket bridge.",
    }


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

# Serve entity scripts from the depot
_SCRIPTS_DEPOT.mkdir(parents=True, exist_ok=True)
app.mount("/scripts", StaticFiles(directory=str(_SCRIPTS_DEPOT)), name="scripts")
_log("http_server", "INFO", f"Scripts served from {_SCRIPTS_DEPOT}")

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
