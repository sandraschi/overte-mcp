"""End-to-End integration tests for Vircadia MCP HTTP server."""

import os
import subprocess
import time

import httpx
import pytest


@pytest.fixture(scope="module")
def api_server():
    """Start the FastAPI HTTP server on port 10999 in a subprocess."""
    env = os.environ.copy()
    env["PORT"] = "10999"

    # Start uvicorn REST server
    proc = subprocess.Popen(
        ["uv", "run", "python", "-m", "src.vircadia_mcp.http_server"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for server to boot
    time.sleep(2.5)

    # Yield base URL
    yield "http://127.0.0.1:10999"

    # Teardown
    proc.terminate()
    try:
        proc.wait(timeout=5.0)
    except subprocess.TimeoutExpired:
        proc.kill()


def test_status_endpoint(api_server):
    """Verify status endpoint is up and returns standard JSON payload."""
    url = f"{api_server}/api/vircadia/status"
    response = httpx.get(url, params={"host": "localhost", "port": 40100})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "domain" in data
    assert data["domain"]["name"] == "Local Sandbox Grid"


def test_spawn_endpoint(api_server):
    """Verify spawn endpoint accepts post requests and returns correct response."""
    url = f"{api_server}/api/vircadia/spawn"
    payload = {
        "name": "E2E Test Model",
        "type": "Model",
        "position": [0.0, 1.0, 0.0],
        "scale": [1.0, 1.0, 1.0],
        "model_url": "http://assets/model.glb",
    }
    response = httpx.post(url, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["entity"]["name"] == "E2E Test Model"


def test_inject_endpoint(api_server):
    """Verify script injection endpoint registers behaviors successfully."""
    url = f"{api_server}/api/vircadia/inject"
    payload = {
        "entity_id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b",
        "script_url": "http://goliath/scripts/spin.js",
        "script_data": {"speed": 60.0},
    }
    response = httpx.post(url, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["script"]["entity_id"] == "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b"
