"""FastAPI REST HTTP server interface for Vircadia Webapp Dashboard."""

import logging
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from .tools.domain import get_domain_status_impl
from .tools.entities import spawn_entity_impl
from .tools.scripting import inject_script_impl

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vircadia MCP REST Server",
    description="HTTP REST interface complementing standard Stdio MCP",
    version="0.1.0"
)

# Enable CORS for frontend dashboard connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/vircadia/status")
async def get_domain_status(host: str = "localhost", port: int = 40100):
    """Query domain server status telemetry."""
    try:
        result = await get_domain_status_impl(DomainStatusInput(host=host, port=port))
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to query domain status: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/vircadia/spawn")
async def post_entity_spawn(request: EntitySpawnInput):
    """Spawn an in-world entity."""
    try:
        result = await spawn_entity_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to spawn entity: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/vircadia/inject")
async def post_script_inject(request: ScriptInjectInput):
    """Inject a JavaScript entity script."""
    try:
        result = await inject_script_impl(request)
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Failed to inject script: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


def start_server(port: int = 10989):
    """Start the uvicorn REST server."""
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    start_server()
