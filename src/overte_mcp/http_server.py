"""FastAPI REST HTTP server interface for Overte MCP Webapp Dashboard."""

import asyncio
import collections
import datetime
import json
import logging
import math
import os
import shutil
import subprocess
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .models import (
    DomainStatusInput,
    EntityAnimateInput,
    EntityDeleteInput,
    EntitySpawnInput,
    EntityUpdateInput,
    FixtureSpawnInput,
    LlmChatInput,
    NearbyEntitiesInput,
    ScriptInjectInput,
)
from .tools.domain import get_domain_status_impl

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
# Last "hello" the connected bridge sent: {"mode": "agent"|"interface", "version", "can_rez", ...}
_bridge_info: dict[str, Any] = {}

NO_BRIDGE_DETAIL = (
    "bridge_not_connected: no Overte bridge is connected. Headless: run "
    "overte_bridge_install (or POST /api/overte/bridge/install) and make sure the "
    "domain-server and an assignment-client are running. Desktop: load "
    "/bridge/overte-mcp-bridge.js in Interface (Edit > Running Scripts)."
)


def _require_bridge() -> None:
    if not _active_ws:
        raise HTTPException(status_code=503, detail=NO_BRIDGE_DETAIL)


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


@asynccontextmanager
async def _lifespan(_app):
    """Compose the FastMCP session manager so /mcp does not 404/terminate (BUG-038)."""
    try:
        from .server import mcp as _mcp

        async with _mcp.lifespan():
            yield {}
    except Exception:
        yield {}


app = FastAPI(
    title="Overte MCP REST Server",
    description="HTTP REST interface complementing standard Stdio MCP",
    version="0.2.1",
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
        "version": "0.2.1",
        "git_sha": GIT_SHA,
        "started_at": _STARTED.isoformat(),
        "uptime_seconds": int(uptime),
        "tool_count": 12,
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
                "name": "overte_bridge_status",
                "description": "Is the in-world bridge connected, and in which mode (agent = headless, interface = desktop).",
                "inputSchema": {},
            },
            {
                "name": "overte_bridge_install",
                "description": "Register the bridge as a domain persistent script so it runs headless on an assignment client.",
                "inputSchema": {"script_url": {"type": "string"}},
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
            {
                "name": "overte_shutdown",
                "description": "Orderly self-termination of the server process.",
                "inputSchema": {"confirm": {"type": "boolean", "required": False}},
            },
        ]
    }


_SKILLS_DIR = Path(__file__).resolve().parent / "skills"
_SKILLS_REGISTRY = {
    "overte-admin": "Overte Domain Administration",
    "overte-user": "Overte World Building & Testing",
}


@app.get("/api/skills")
async def list_skills():
    """List available Overte skills. Reads the same SKILL.md files the MCP skill://
    resources serve (server.py) - no separate hardcoded copy, so this can't drift stale the
    way the pre-2026-09-02 version of this endpoint did."""
    skills = []
    for name, title in _SKILLS_REGISTRY.items():
        skill_path = _SKILLS_DIR / name / "SKILL.md"
        first_para = ""
        if skill_path.exists():
            lines = skill_path.read_text(encoding="utf-8").splitlines()
            first_para = next((line for line in lines[1:] if line.strip()), "")
        skills.append({"name": name, "title": title, "description": first_para})
    return {"skills": skills}


@app.get("/api/skill/{name}")
async def get_skill(name: str):
    """Return one skill's full content, read from its SKILL.md - same source of truth as the
    MCP skill://<name> resource in server.py."""
    if name not in _SKILLS_REGISTRY:
        raise HTTPException(
            status_code=404, detail=f"Unknown skill {name!r}. Known: {sorted(_SKILLS_REGISTRY)}"
        )
    skill_path = _SKILLS_DIR / name / "SKILL.md"
    if not skill_path.exists():
        raise HTTPException(status_code=404, detail=f"SKILL.md missing on disk for {name!r}")
    return {"name": name, "content": skill_path.read_text(encoding="utf-8")}


@app.get("/api/v1/diagnostics")
async def diagnostics():
    """CUA smoke-test required endpoint: tool list + system info."""
    uptime = (datetime.datetime.now(datetime.timezone.utc) - _STARTED).total_seconds()
    return {
        "status": "ok",
        "server": "overte-mcp",
        "version": "0.2.1",
        "uptime_seconds": int(uptime),
        "tool_count": 12,
        "tools": [
            {"name": "overte_domain_status"},
            {"name": "overte_bridge_status"},
            {"name": "overte_bridge_install"},
            {"name": "overte_entity_spawn"},
            {"name": "overte_script_inject"},
            {"name": "overte_entity_update"},
            {"name": "overte_entity_delete"},
            {"name": "overte_entity_animate"},
            {"name": "overte_nearby_entities"},
            {"name": "overte_fixture_spawn"},
            {"name": "overte_sampling_assist"},
            {"name": "overte_shutdown"},
        ],
        "system": {"windows": True},
        "errors": [],
    }


@app.get("/api/capabilities")
async def capabilities():
    """Standard fleet capabilities shape for webapp discovery."""
    return {
        "server": "overte-mcp",
        "version": "0.2.1",
        "tools": [
            "overte_domain_status",
            "overte_bridge_status",
            "overte_bridge_install",
            "overte_entity_spawn",
            "overte_script_inject",
            "overte_entity_update",
            "overte_entity_delete",
            "overte_entity_animate",
            "overte_nearby_entities",
            "overte_fixture_spawn",
            "overte_sampling_assist",
            "overte_shutdown",
        ],
        "transports": ["stdio", "http", "mcp"],
        "health_path": "/api/health",
        "llm_proxy": True,
    }


@app.post("/api/shutdown")
async def api_shutdown():
    """Orderly exit for the fleet launcher: 200 now, process exits ~500 ms later."""
    import threading

    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"status": "shutting_down"}


# -- Local LLM proxy (backend-for-frontend: browser tabs never touch providers directly) --
_LLM_PROVIDERS: dict[str, dict[str, Any]] = {
    "ollama": {
        "port": 11434,
        "models_path": "/api/tags",
        "chat_path": "/api/chat",
        "openai_compatible": False,
        "label": "Ollama",
    },
    "lmstudio": {
        "port": 1234,
        "models_path": "/v1/models",
        "chat_path": "/v1/chat/completions",
        "openai_compatible": True,
        "label": "LM Studio",
    },
    "vllm": {
        "port": 8000,
        "models_path": "/v1/models",
        "chat_path": "/v1/chat/completions",
        "openai_compatible": True,
        "label": "vLLM",
    },
}

_LLM_FALLBACK_MODELS: dict[str, list[str]] = {
    "ollama": ["qwen3:8b", "llama3.1:8b", "mistral:7b"],
    "lmstudio": ["local-model"],
    "vllm": ["local-model"],
}


async def _probe_llm_provider(name: str, timeout: float = 2.0) -> dict[str, Any]:
    """Server-side liveness probe for one local LLM provider (loopback only)."""
    cfg = _LLM_PROVIDERS[name]
    base = f"http://127.0.0.1:{cfg['port']}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(base + cfg["models_path"])
            if r.status_code == 200:
                return {"name": name, "available": True, "base": base}
    except Exception as e:
        logger.debug("LLM provider %s probe failed: %s", name, e)
    return {"name": name, "available": False, "base": base}


def _gpu_info() -> dict[str, Any]:
    """Best-effort local GPU inventory for the dashboard opportunity prompt (fail-soft)."""
    if not shutil.which("nvidia-smi"):
        return {"available": False, "gpus": []}
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        gpus = [line.strip() for line in (out.stdout or "").splitlines() if line.strip()]
        return {"available": bool(gpus), "gpus": gpus}
    except Exception as e:
        logger.debug("nvidia-smi probe failed: %s", e)
        return {"available": False, "gpus": []}


@app.get("/api/llm/discover")
async def llm_discover():
    """Probe loopback LLM providers server-side; dashboard calls this, never providers directly."""
    providers = [await _probe_llm_provider(name) for name in _LLM_PROVIDERS]
    live = [p["name"] for p in providers if p["available"]]
    return {
        "providers": providers,
        "default_provider": live[0] if live else None,
        "chat_proxy": True,
        "gpu": _gpu_info(),
    }


@app.get("/api/llm/providers")
async def llm_providers():
    """Provider registry: local loopback providers plus cloud-configured flags (no keys exposed)."""
    return {
        "local": [
            {
                "name": name,
                "label": cfg["label"],
                "port": cfg["port"],
                "openai_compatible": cfg["openai_compatible"],
            }
            for name, cfg in _LLM_PROVIDERS.items()
        ],
        "cloud_configured": {
            "openai": bool(os.environ.get("OPENAI_API_KEY")),
            "anthropic": bool(os.environ.get("ANTHROPIC_API_KEY")),
        },
    }


@app.get("/api/llm/models")
async def llm_models(provider: str = "ollama"):
    """Model list per provider: live when reachable, curated fallback otherwise."""
    if provider not in _LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider {provider!r}.")
    cfg = _LLM_PROVIDERS[provider]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"http://127.0.0.1:{cfg['port']}{cfg['models_path']}")
            if r.status_code == 200:
                data = r.json()
                if provider == "ollama":
                    models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                else:
                    models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                return {"provider": provider, "models": models, "live": True}
    except Exception as e:
        logger.debug("LLM models list for %s failed: %s", provider, e)
    return {"provider": provider, "models": _LLM_FALLBACK_MODELS[provider], "live": False}


@app.get("/api/llm/onboarding")
async def llm_onboarding():
    """Fail-open LLM setup state for the dashboard opportunity prompt."""
    providers = [await _probe_llm_provider(name) for name in _LLM_PROVIDERS]
    live = [p["name"] for p in providers if p["available"]]
    return {
        "required": not live,
        "detected": live,
        "steps": [
            "Install Ollama (https://ollama.com) or start LM Studio with a local server.",
            "Pull a model, e.g. `ollama pull qwen3:8b`.",
            "Reload this page - the dashboard detects the provider automatically.",
        ],
        "note": "Chat works without an LLM for tool-driven answers; free-form chat needs one.",
    }


async def _forward_chat(provider: str, model: str, messages: list[dict[str, str]]) -> str:
    """Forward one chat completion to the local provider; raises HTTPException on failure."""
    if provider not in _LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider {provider!r}.")
    cfg = _LLM_PROVIDERS[provider]
    url = f"http://127.0.0.1:{cfg['port']}{cfg['chat_path']}"
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            if cfg["openai_compatible"]:
                r = await client.post(url, json={"model": model, "messages": messages})
                r.raise_for_status()
                return str(r.json()["choices"][0]["message"]["content"] or "")
            r = await client.post(url, json={"model": model, "messages": messages, "stream": False})
            r.raise_for_status()
            return str(r.json().get("message", {}).get("content", "") or "")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("LLM chat forward to %s failed: %s", provider, e)
        raise HTTPException(status_code=502, detail=f"LLM provider {provider!r} unreachable: {e}")


@app.post("/api/llm/chat")
async def llm_chat(payload: LlmChatInput):
    """Chat completion via the backend proxy. Never returns invented text on failure."""
    reply = await _forward_chat(payload.provider, payload.model, list(payload.messages))
    return {"reply": reply, "provider": payload.provider, "model": payload.model, "live": True}


@app.post("/api/llm/chat/stream")
async def llm_chat_stream(payload: LlmChatInput):
    """SSE byte-relay of the provider stream (Ollama NDJSON and OpenAI SSE both pass through)."""

    async def _relay():
        if payload.provider not in _LLM_PROVIDERS:
            yield 'data: {"error": "unknown provider"}\n\n'
            return
        cfg = _LLM_PROVIDERS[payload.provider]
        url = f"http://127.0.0.1:{cfg['port']}{cfg['chat_path']}"
        body: dict[str, Any] = {"model": payload.model, "messages": list(payload.messages)}
        if payload.system and not cfg["openai_compatible"]:
            body["system"] = payload.system
        if cfg["openai_compatible"]:
            body["stream"] = True
            if payload.system:
                body["messages"] = [
                    {"role": "system", "content": payload.system},
                    *body["messages"],
                ]
        else:
            body["stream"] = True
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=body) as r:
                    if r.status_code != 200:
                        yield f"data: {json.dumps({'error': f'provider HTTP {r.status_code}'})}\n\n"
                        return
                    async for chunk in r.aiter_bytes():
                        if chunk:
                            yield chunk
        except Exception as e:
            logger.warning("LLM stream relay to %s failed: %s", payload.provider, e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(_relay(), media_type="text/event-stream")


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
            code = 502 if result.get("source") == "unreachable" else 400
            raise HTTPException(status_code=code, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to query domain status: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/api/overte/avatar")
async def get_avatar_state():
    """Query the local user's avatar position/orientation via the WebSocket bridge.

    No domain-server admin API involved - this goes through the same bridge script as
    spawn/inject, so it needs Interface running with overte-mcp-bridge.js loaded.
    """
    _require_bridge()
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
    running = await asyncio.to_thread(_check_overte_processes)
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
        await asyncio.to_thread(
            subprocess.run,
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
    _bridge_info.clear()
    _bridge_info["connected_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("type") == "hello":
                    _bridge_info.update({k: v for k, v in data.items() if k != "type"})
                    _log("bridge", "INFO", f"bridge hello: {data}")
                    continue
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
            _bridge_info.clear()


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


# ---------------------------------------------------------------------------
# Model + texture depots (binary file CRUD, same manifest-on-disk pattern as
# the scripts depot above, adapted for uploads instead of inline text content)
# ---------------------------------------------------------------------------

_MODELS_DEPOT = Path(__file__).resolve().parent.parent.parent / "models"
_MODELS_MANIFEST_PATH = _MODELS_DEPOT / "manifest.json"
_MODEL_EXTENSIONS = {".glb", ".gltf", ".fbx", ".obj"}

_TEXTURES_DEPOT = Path(__file__).resolve().parent.parent.parent / "data" / "textures"
_TEXTURES_MANIFEST_PATH = _TEXTURES_DEPOT / "manifest.json"
_TEXTURE_EXTENSIONS = {".png", ".jpg", ".jpeg"}  # per apidocs.overte.org - KTX unconfirmed


def _load_depot_manifest(path: Path) -> list[dict]:
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_depot_manifest(path: Path, manifest: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(manifest, f, indent=2)


def _register_binary_depot(
    *,
    api_prefix: str,
    depot: Path,
    manifest_path: Path,
    static_mount: str,
    allowed_extensions: set[str],
    kind: str,
):
    """Wire up list/get/upload/update-metadata/delete routes plus a static mount for one
    binary-file depot (models or textures). A function factory rather than a class so each
    depot still gets normal, individually-named FastAPI route handlers."""

    depot.mkdir(parents=True, exist_ok=True)
    app.mount(static_mount, StaticFiles(directory=str(depot)), name=f"{kind}_static")

    @app.get(api_prefix, name=f"list_{kind}s")
    async def list_items():
        manifest = _load_depot_manifest(manifest_path)
        result = []
        for m in manifest:
            fp = depot / m["name"]
            entry = dict(m)
            entry["exists"] = fp.exists()
            entry["url"] = f"http://localhost:{BACKEND_PORT}{static_mount}/{m['name']}"
            if fp.exists():
                entry["size"] = fp.stat().st_size
            result.append(entry)
        return {kind + "s": result, "count": len(result)}

    @app.get(api_prefix + "/{name}", name=f"get_{kind}")
    async def get_item(name: str):
        fp = depot / name
        if not fp.exists():
            raise HTTPException(status_code=404, detail=f"{kind.capitalize()} not found")
        manifest = _load_depot_manifest(manifest_path)
        meta = next((m for m in manifest if m["name"] == name), {})
        return {
            "name": name,
            "url": f"http://localhost:{BACKEND_PORT}{static_mount}/{name}",
            "size": fp.stat().st_size,
            "description": meta.get("description", ""),
            "category": meta.get("category", "uncategorized"),
        }

    @app.post(api_prefix, name=f"upload_{kind}")
    async def upload_item(
        file: UploadFile,
        description: str = "",
        category: str = "uncategorized",
    ):
        ext = Path(file.filename or "").suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported {kind} extension {ext!r}. Allowed: {sorted(allowed_extensions)}",
            )
        name = file.filename
        if not name:
            raise HTTPException(status_code=400, detail=f"Missing {kind} filename.")
        fp = depot / name
        if fp.exists():
            raise HTTPException(
                status_code=409, detail=f"{kind.capitalize()} {name!r} already exists"
            )
        depot.mkdir(parents=True, exist_ok=True)
        content = await file.read()
        fp.write_bytes(content)
        manifest = _load_depot_manifest(manifest_path)
        manifest.append({"name": name, "description": description, "category": category})
        _save_depot_manifest(manifest_path, manifest)
        _log(kind + "s", "INFO", f"Uploaded {kind}: {name} ({len(content)} bytes)")
        return {
            "status": "success",
            "name": name,
            "url": f"http://localhost:{BACKEND_PORT}{static_mount}/{name}",
            "size": len(content),
        }

    @app.put(api_prefix + "/{name}", name=f"update_{kind}_metadata")
    async def update_item_metadata(
        name: str, description: str | None = None, category: str | None = None
    ):
        fp = depot / name
        if not fp.exists():
            raise HTTPException(status_code=404, detail=f"{kind.capitalize()} not found")
        manifest = _load_depot_manifest(manifest_path)
        found = False
        for m in manifest:
            if m["name"] == name:
                if description is not None:
                    m["description"] = description
                if category is not None:
                    m["category"] = category
                found = True
                break
        if not found:
            manifest.append(
                {
                    "name": name,
                    "description": description or "",
                    "category": category or "uncategorized",
                }
            )
        _save_depot_manifest(manifest_path, manifest)
        _log(kind + "s", "INFO", f"Updated {kind} metadata: {name}")
        return {"status": "success", "name": name}

    @app.delete(api_prefix + "/{name}", name=f"delete_{kind}")
    async def delete_item(name: str):
        fp = depot / name
        if fp.exists():
            fp.unlink()
        manifest = _load_depot_manifest(manifest_path)
        manifest = [m for m in manifest if m["name"] != name]
        _save_depot_manifest(manifest_path, manifest)
        _log(kind + "s", "INFO", f"Deleted {kind}: {name}")
        return {"status": "success", "name": name}


def _reconcile_manifest_with_disk(
    depot: Path, manifest_path: Path, allowed_extensions: set[str]
) -> None:
    """models/ predates this manifest system (Nekomimi-chan.glb, a living-room GLB, ... were
    already sitting there) - back-fill manifest entries for any recognized-extension file on
    disk that isn't tracked yet, so the depot listing reflects what's actually there instead
    of appearing empty. One-way (adds missing entries only, never removes)."""
    if not depot.exists():
        return
    manifest = _load_depot_manifest(manifest_path)
    known = {m["name"] for m in manifest}
    changed = False
    for fp in sorted(depot.iterdir()):
        if fp.is_file() and fp.suffix.lower() in allowed_extensions and fp.name not in known:
            manifest.append({"name": fp.name, "description": "", "category": "uncategorized"})
            changed = True
    if changed:
        _save_depot_manifest(manifest_path, manifest)


_register_binary_depot(
    api_prefix="/api/overte/models",
    depot=_MODELS_DEPOT,
    manifest_path=_MODELS_MANIFEST_PATH,
    static_mount="/models",
    allowed_extensions=_MODEL_EXTENSIONS,
    kind="model",
)
_reconcile_manifest_with_disk(_MODELS_DEPOT, _MODELS_MANIFEST_PATH, _MODEL_EXTENSIONS)
_register_binary_depot(
    api_prefix="/api/overte/textures",
    depot=_TEXTURES_DEPOT,
    manifest_path=_TEXTURES_MANIFEST_PATH,
    static_mount="/textures",
    allowed_extensions=_TEXTURE_EXTENSIONS,
    kind="texture",
)


# ---------------------------------------------------------------------------
# Backup: zip snapshots of the scripts/models/textures depots + tracked entities.
# ---------------------------------------------------------------------------

_BACKUPS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "backups"


@app.post("/api/overte/backup")
async def create_backup():
    """Zip-snapshot the scripts/models/textures depots and the tracked-entities list into
    data/backups/<timestamp>.zip. Does not touch the live Overte world - this backs up what
    this server manages locally, not the domain-server's own entity-tree persistence."""
    import zipfile

    _BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = _BACKUPS_DIR / f"overte-mcp-backup-{ts}.zip"

    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for depot, arc_prefix in [
            (_SCRIPTS_DEPOT, "scripts"),
            (_MODELS_DEPOT, "models"),
            (_TEXTURES_DEPOT, "textures"),
        ]:
            if not depot.exists():
                continue
            for fp in depot.rglob("*"):
                if fp.is_file():
                    zf.write(fp, arcname=f"{arc_prefix}/{fp.relative_to(depot)}")
        zf.writestr("tracked_entities.json", json.dumps(_tracked_entities, indent=2))

    size = backup_path.stat().st_size
    _log("backup", "INFO", f"Created backup: {backup_path.name} ({size} bytes)")
    return {"status": "success", "name": backup_path.name, "size": size}


@app.get("/api/overte/backups")
async def list_backups():
    """List available backup archives, newest first."""
    if not _BACKUPS_DIR.exists():
        return {"backups": [], "count": 0}
    items = sorted(
        (
            {
                "name": p.name,
                "size": p.stat().st_size,
                "created_at": datetime.datetime.fromtimestamp(
                    p.stat().st_mtime, tz=datetime.timezone.utc
                ).isoformat(),
            }
            for p in _BACKUPS_DIR.glob("*.zip")
        ),
        key=lambda x: x["created_at"],
        reverse=True,
    )
    return {"backups": items, "count": len(items)}


@app.post("/api/overte/backups/{name}/restore")
async def restore_backup(name: str):
    """Restore a backup archive, OVERWRITING current files in the scripts/models/textures
    depots (matching names only - does not delete files the backup doesn't mention) and the
    tracked-entities list. Does not touch the live Overte world."""
    import zipfile

    backup_path = _BACKUPS_DIR / name
    if not backup_path.exists() or backup_path.suffix != ".zip":
        raise HTTPException(status_code=404, detail="Backup not found")

    depot_by_prefix = {
        "scripts": _SCRIPTS_DEPOT,
        "models": _MODELS_DEPOT,
        "textures": _TEXTURES_DEPOT,
    }
    restored = 0
    with zipfile.ZipFile(backup_path, "r") as zf:
        for member in zf.namelist():
            if member == "tracked_entities.json":
                global _tracked_entities
                _tracked_entities = json.loads(zf.read(member))
                continue
            prefix, _, rel = member.partition("/")
            target_depot = depot_by_prefix.get(prefix)
            if not target_depot or not rel:
                continue
            target_path = target_depot / rel
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(zf.read(member))
            restored += 1

    _log("backup", "INFO", f"Restored backup: {name} ({restored} files)")
    return {"status": "success", "name": name, "files_restored": restored}


@app.get("/api/overte/entities")
async def list_tracked_entities():
    """Return all entities tracked by this server (spawned via bridge)."""
    return {
        "status": "success",
        "source": "tracked",
        "bridge_connected": _active_ws is not None,
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
    """Spawn an in-world entity via the bridge. 503 bridge_not_connected if there is none."""
    _require_bridge()
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
            if request.extra_properties:
                properties.update(request.extra_properties)
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
                    "bridge_mode": _bridge_info.get("mode"),
                    "entity_id": entity_id,
                    "entity": _tracked_entities[entity_id],
                    "message": "Entity spawned in-world via the bridge.",
                }
            else:
                msg = (
                    res.get("message", "WebSocket client failed to spawn entity.")
                    if res
                    else "WebSocket timeout/error."
                )
                raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=503, detail=NO_BRIDGE_DETAIL)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to spawn entity: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/overte/update")
async def post_entity_update(request: EntityUpdateInput):
    """Move/resize an existing entity in-world via the bridge (503 without one)."""
    _require_bridge()
    properties: dict[str, Any] = {}
    if request.position and len(request.position) == 3:
        properties["position"] = {
            "x": request.position[0],
            "y": request.position[1],
            "z": request.position[2],
        }
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
    if request.extra_properties:
        properties.update(request.extra_properties)
    if not properties:
        raise HTTPException(
            status_code=400, detail="Nothing to update - pass position and/or dimensions."
        )

    res = await _send_ws_command(
        "update", {"entity_id": request.entity_id, "properties": properties}
    )
    if not res or res.get("status") != "success":
        msg = (
            res.get("message", "WebSocket client failed to update entity.")
            if res
            else "WebSocket timeout/error."
        )
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


def _bounce_height(t: float, amplitude: float, damping: float, speed: float) -> float:
    """A real bounce, not a sine wave: t=0 starts on the ground with upward velocity, rises
    to `amplitude`, falls back under gravity, and each landing loses energy (kinetic energy
    *= damping, so velocity *= sqrt(damping)) - bounces get both shorter and lower, unlike
    abs(sin(t)) which keeps a constant period regardless of height. Verified numerically:
    peak heights decay geometrically (0.30 -> ~0.15 -> ~0.04m at damping=0.6) and it settles
    to the ground rather than bouncing forever. `speed` scales the effective gravity, so it
    controls overall pace without the caller needing to reason about g directly."""
    g = 9.8 * max(speed, 0.05)
    v = math.sqrt(2 * g * amplitude) if amplitude > 0 else 0.0
    remaining = t
    while v > 1e-4:
        duration = 2 * v / g
        if remaining <= duration:
            return max(v * remaining - 0.5 * g * remaining * remaining, 0.0)
        remaining -= duration
        v *= math.sqrt(max(min(damping, 1.0), 0.0))
    return 0.0


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


# Box/Sphere primitive approximations. CORRECTION: Overte's type="Shape" entity DOES support
# a cylinder (and other platonic-solid-ish shapes: Cone, Dodecahedron, Icosahedron,
# Octahedron, Tetrahedron, Torus, ...) via its `shape` property - live-verified
# (spawn(type="Shape", extra_properties={"shape":"Cylinder"}) produced a real cylinder,
# read back correctly). These presets stay Box/Sphere anyway since a cup/table/chair isn't
# better served by a cylinder or dodecahedron, not because cylinders don't exist. Each preset
# is one or more parts with an offset from the fixture's placement point (its base, roughly
# floor-of-object level).
# Color is no longer baked in here - FixtureSpawnInput.color (default white) is applied
# uniformly to every part at spawn time, so the same preset can be recolored per call.
FIXTURE_PRESETS: dict[str, list[dict[str, Any]]] = {
    "box": [
        {"type": "Box", "offset": (0, 0.05, 0), "dimensions": (0.1, 0.1, 0.1)},
    ],
    "cup": [
        {"type": "Box", "offset": (0, 0.05, 0), "dimensions": (0.08, 0.10, 0.08)},
    ],
    "ball": [
        {"type": "Sphere", "offset": (0, 0.035, 0), "dimensions": (0.07, 0.07, 0.07)},
    ],
    "table": [
        {"type": "Box", "offset": (0, 0.715, 0), "dimensions": (1.2, 0.05, 0.6)},
        {"type": "Box", "offset": (0, 0.35, 0), "dimensions": (0.08, 0.70, 0.08)},
    ],
    "chair": [
        {"type": "Box", "offset": (0, 0.45, 0), "dimensions": (0.4, 0.05, 0.4)},
        {"type": "Box", "offset": (0, 0.70, -0.18), "dimensions": (0.4, 0.5, 0.05)},
        {"type": "Box", "offset": (0, 0.225, 0), "dimensions": (0.35, 0.45, 0.35)},
    ],
}


@app.post("/api/overte/fixture")
async def post_fixture_spawn(request: FixtureSpawnInput):
    """Spawn a preset test fixture (box/cup/ball/table/chair) for gripper testing. Multi-part
    fixtures (table, chair) spawn as several independent Box entities near each other - not
    parented, since they're static set-dressing that never needs to move as a unit."""
    _require_bridge()
    parts = FIXTURE_PRESETS.get(request.fixture)
    if not parts:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown fixture {request.fixture!r}. Known: {sorted(FIXTURE_PRESETS)}",
        )

    if request.position and len(request.position) == 3:
        base = tuple(request.position)
    else:
        if _bridge_info.get("mode") == "agent":
            raise HTTPException(
                status_code=400,
                detail="position_required: the bridge runs headless (agent mode), there is no avatar to place the fixture in front of.",
            )
        avatar_res = await _send_ws_command("get_avatar", {})
        if not avatar_res or avatar_res.get("status") != "success":
            raise HTTPException(
                status_code=400, detail="Could not read avatar position to place the fixture."
            )
        pos = avatar_res["position"]
        rot = avatar_res["orientation"]
        forward = _rotate_vector((rot["x"], rot["y"], rot["z"], rot["w"]), (0.0, 0.0, -1.0))
        base = (
            pos["x"] + forward[0] * request.forward_distance,
            pos["y"],
            pos["z"] + forward[2] * request.forward_distance,
        )

    base_name = request.name or request.fixture
    fixture_color = _rgb01_to_overte(request.color if len(request.color) == 3 else [1.0, 1.0, 1.0])
    entity_ids = []
    for i, part in enumerate(parts):
        ox, oy, oz = part["offset"]
        dx, dy, dz = part["dimensions"]
        properties = {
            "type": part["type"],
            "name": f"{base_name}_{i}" if len(parts) > 1 else base_name,
            "position": {"x": base[0] + ox, "y": base[1] + oy, "z": base[2] + oz},
            "dimensions": {"x": dx, "y": dy, "z": dz},
            "color": fixture_color,
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
    """Loop-animate an entity in place: 'spin' (continuous rotation), 'bob' (smooth
    sinusoidal oscillation), or 'bounce' (real drop-and-rebound physics - shortening,
    lowering bounces from energy loss, not a constant-period sine wave). Server-driven, same
    pattern as norirobotics-mcp's Resonite wave-demo script - repeated 'update' calls over
    the bridge, not a client-side animation clip."""
    _require_bridge()
    if request.mode not in ("spin", "bob", "bounce"):
        raise HTTPException(status_code=400, detail="mode must be 'spin', 'bob', or 'bounce'")

    start_res = await _send_ws_command("get_entity", {"entity_id": request.entity_id})
    if not start_res or start_res.get("status") != "success":
        raise HTTPException(
            status_code=400, detail=f"Could not read entity {request.entity_id} - does it exist?"
        )
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
        elif request.mode == "bob":
            offset = request.amplitude * math.sin(2 * math.pi * request.speed * t)
            properties = {
                "position": {"x": rest_pos["x"], "y": rest_pos["y"] + offset, "z": rest_pos["z"]}
            }
        else:  # bounce
            offset = _bounce_height(t, request.amplitude, request.damping, request.speed)
            properties = {
                "position": {"x": rest_pos["x"], "y": rest_pos["y"] + offset, "z": rest_pos["z"]}
            }
        res = await _send_ws_command(
            "update", {"entity_id": request.entity_id, "properties": properties}
        )
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
    _require_bridge()
    payload: dict[str, Any] = {"radius": request.radius}
    if request.position and len(request.position) == 3:
        payload["position"] = {
            "x": request.position[0],
            "y": request.position[1],
            "z": request.position[2],
        }
    res = await _send_ws_command("find_nearby", payload)
    if not res or res.get("status") != "success":
        msg = (
            res.get("message", "WebSocket client failed to search.")
            if res
            else "WebSocket timeout/error."
        )
        raise HTTPException(status_code=400, detail=msg)
    return {
        "status": "success",
        "source": "live",
        "items": res.get("items", []),
        "count": len(res.get("items", [])),
    }


@app.get("/api/overte/entity/{entity_id}")
async def get_entity_properties(entity_id: str, properties: str | None = None):
    """Read one entity's live properties. `properties`: comma-separated property names, or
    'all' for every property Overte has for it. Omit for a sensible common-fields default."""
    _require_bridge()
    payload: dict[str, Any] = {"entity_id": entity_id}
    if properties == "all":
        payload["properties"] = []
    elif properties:
        payload["properties"] = [p.strip() for p in properties.split(",") if p.strip()]
    res = await _send_ws_command("get_entity", payload)
    if not res or res.get("status") != "success":
        msg = res.get("message", "Entity not found.") if res else "WebSocket timeout/error."
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "success", "source": "live", "properties": res["properties"]}


@app.post("/api/overte/delete")
async def post_entity_delete(request: EntityDeleteInput):
    """Delete an entity from the world (via WebSocket bridge, live-only)."""
    _require_bridge()
    res = await _send_ws_command("delete", {"entity_id": request.entity_id})
    if not res or res.get("status") != "success":
        msg = (
            res.get("message", "WebSocket client failed to delete entity.")
            if res
            else "WebSocket timeout/error."
        )
        raise HTTPException(status_code=400, detail=msg)
    _tracked_entities.pop(request.entity_id, None)
    return {
        "status": "success",
        "source": "live",
        "message": f"Entity {request.entity_id} deleted via WebSocket bridge.",
    }


@app.post("/api/overte/inject")
async def post_script_inject(request: ScriptInjectInput):
    """Inject a JavaScript entity script via the bridge. 503 bridge_not_connected if there is none."""
    _require_bridge()
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
        raise HTTPException(status_code=503, detail=NO_BRIDGE_DETAIL)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to inject script: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ---------------------------------------------------------------------------
# Headless bridge: serve the bridge script and register it as a domain persistent script
# ---------------------------------------------------------------------------

_BRIDGE_FILE = Path(__file__).resolve().parent.parent.parent / "scripts" / "overte-mcp-bridge.js"
_BRIDGE_ROUTE = "/bridge/overte-mcp-bridge.js"
_BRIDGE_WS_PLACEHOLDER = "ws://localhost:11110/api/overte/ws"


def _domain_admin_auth() -> httpx.BasicAuth:
    user = os.environ.get("OVERTE_ADMIN_USER", "admin")
    password = os.environ.get("OVERTE_ADMIN_PASSWORD", "admin")
    return httpx.BasicAuth(user, password)


def _domain_admin_base() -> str:
    host = os.environ.get("OVERTE_DOMAIN_HOST", "localhost")
    port = os.environ.get("OVERTE_DOMAIN_ADMIN_PORT", "40100")
    return f"http://{host}:{port}"


def _bridge_script_url() -> str:
    """URL the domain's assignment client fetches the bridge from. Assignment clients run
    on the domain host, so loopback is right unless OVERTE_BRIDGE_PUBLIC_URL says otherwise."""
    override = os.environ.get("OVERTE_BRIDGE_PUBLIC_URL")
    if override:
        return override
    port = int(os.environ.get("MCP_PORT") or os.environ.get("PORT") or BACKEND_PORT)
    return f"http://127.0.0.1:{port}{_BRIDGE_ROUTE}"


@app.get(_BRIDGE_ROUTE, response_class=PlainTextResponse)
async def get_bridge_script(request: Request):
    """The bridge script, with its WebSocket URL rewritten to point back at this server."""
    if not _BRIDGE_FILE.exists():
        raise HTTPException(status_code=404, detail=f"bridge script missing: {_BRIDGE_FILE}")
    text = _BRIDGE_FILE.read_text(encoding="utf-8")
    host = request.headers.get("host") or f"127.0.0.1:{BACKEND_PORT}"
    text = text.replace(_BRIDGE_WS_PLACEHOLDER, f"ws://{host}/api/overte/ws")
    return PlainTextResponse(text, media_type="application/javascript")


@app.get("/api/overte/bridge")
async def get_bridge_status():
    """Is a bridge connected, and in which mode (agent = headless, interface = desktop)."""
    return {
        "status": "success",
        "connected": _active_ws is not None,
        "bridge": dict(_bridge_info) if _active_ws else None,
        "script_url": _bridge_script_url(),
    }


async def _read_domain_settings(client: httpx.AsyncClient) -> dict[str, Any]:
    r = await client.get(f"{_domain_admin_base()}/settings.json")
    if r.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="domain-server admin API returned 401: set OVERTE_ADMIN_USER / OVERTE_ADMIN_PASSWORD",
        )
    r.raise_for_status()
    data = r.json()
    return data.get("values", data)


async def _write_persistent_scripts(rows: list[dict[str, Any]]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0, auth=_domain_admin_auth()) as client:
        r = await client.post(
            f"{_domain_admin_base()}/settings.json",
            json={"scripts": {"persistent_scripts": rows}},
        )
        if r.status_code == 401:
            raise HTTPException(status_code=401, detail="domain-server admin API returned 401")
        r.raise_for_status()
        try:
            return r.json()
        except Exception:
            return {"raw": r.text}


@app.post("/api/overte/bridge/install")
async def install_bridge(data: dict | None = None):
    """Register the bridge as a domain persistent script so an assignment client runs it
    headless. Idempotent. The domain-server restarts itself to apply the change; a running
    assignment-client then picks up the agent assignment and the bridge connects back here."""
    url = (data or {}).get("script_url") or _bridge_script_url()
    try:
        async with httpx.AsyncClient(timeout=10.0, auth=_domain_admin_auth()) as client:
            values = await _read_domain_settings(client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"domain_unreachable: {_domain_admin_base()} ({e})"
        ) from e
    rows = list((values.get("scripts") or {}).get("persistent_scripts") or [])
    if any(r.get("url") == url for r in rows):
        return {
            "status": "success",
            "changed": False,
            "script_url": url,
            "persistent_scripts": rows,
        }
    rows.append({"url": url, "num_instances": 1, "pool": ""})
    try:
        result = await _write_persistent_scripts(rows)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"settings write failed: {e}") from e
    _log("bridge", "INFO", f"registered persistent script {url}")
    return {
        "status": "success",
        "changed": True,
        "script_url": url,
        "persistent_scripts": rows,
        "domain_response": result,
        "next": "the domain-server restarts to apply this; poll GET /api/overte/bridge until connected",
    }


@app.post("/api/overte/bridge/uninstall")
async def uninstall_bridge(data: dict | None = None):
    """Remove the bridge from the domain's persistent scripts. Idempotent."""
    url = (data or {}).get("script_url") or _bridge_script_url()
    try:
        async with httpx.AsyncClient(timeout=10.0, auth=_domain_admin_auth()) as client:
            values = await _read_domain_settings(client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"domain_unreachable: {_domain_admin_base()} ({e})"
        ) from e
    rows = list((values.get("scripts") or {}).get("persistent_scripts") or [])
    kept = [r for r in rows if r.get("url") != url]
    if len(kept) == len(rows):
        return {"status": "success", "changed": False, "persistent_scripts": rows}
    result = await _write_persistent_scripts(kept)
    return {
        "status": "success",
        "changed": True,
        "persistent_scripts": kept,
        "domain_response": result,
    }


# Model files (FBX/GLB) are now served via the models depot's own static mount, registered
# by _register_binary_depot() above (also handles textures) - this used to be a standalone
# passive mount with no manifest/CRUD; superseded, not duplicated.

# Serve entity scripts from the depot
_SCRIPTS_DEPOT.mkdir(parents=True, exist_ok=True)
app.mount("/scripts", StaticFiles(directory=str(_SCRIPTS_DEPOT)), name="scripts")
_log("http_server", "INFO", f"Scripts served from {_SCRIPTS_DEPOT}")


@app.get("/embed/saschirob-pendant", response_class=HTMLResponse)
async def get_saschirob_pendant():
    """In-world 3D Teach Pendant for Saschirob robot control in Overte Web entities."""
    from .teach_pendant import get_teach_pendant_html

    return HTMLResponse(content=get_teach_pendant_html(), status_code=200)


# Mount MCP streamable HTTP protocol at /mcp for stdio proxy pattern
try:
    from .server import mcp

    mcp_asgi = mcp.http_app(path="/")
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
