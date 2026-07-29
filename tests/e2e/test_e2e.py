"""End-to-End integration tests for Overte MCP HTTP server."""

import os
import subprocess
import time

import httpx
import pytest


@pytest.fixture(scope="module")
def api_server():
    """Start the FastAPI HTTP server on an isolated test port."""
    env = os.environ.copy()
    env["PORT"] = "11119"  # isolated from fleet 11110

    proc = subprocess.Popen(
        ["uv", "run", "python", "-m", "overte_mcp.http_server"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    )

    # Wait for server to boot (poll health)
    base = "http://127.0.0.1:11119"
    deadline = time.time() + 15.0
    while time.time() < deadline:
        try:
            r = httpx.get(f"{base}/api/health", timeout=0.5)
            if r.status_code == 200:
                break
        except Exception:
            time.sleep(0.25)
    else:
        proc.terminate()
        raise RuntimeError("overte-mcp e2e server failed to become healthy")

    try:
        yield base
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5.0)
        except subprocess.TimeoutExpired:
            proc.kill()


def test_status_endpoint(api_server):
    """Verify status endpoint is up and returns a simulated payload when no domain is running."""
    url = f"{api_server}/api/overte/status"
    response = httpx.get(url, params={"host": "localhost", "port": 40100}, timeout=10.0)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["source"] in ("simulated", "live")
    assert "domain" in data


def test_spawn_endpoint(api_server):
    """Verify spawn endpoint accepts post requests and returns a labeled-simulated response."""
    url = f"{api_server}/api/overte/spawn"
    payload = {
        "name": "E2E Test Model",
        "type": "Model",
        "position": [0.0, 1.0, 0.0],
        "scale": [1.0, 1.0, 1.0],
        "model_url": "http://assets/model.glb",
    }
    response = httpx.post(url, json=payload, timeout=10.0)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["source"] == "simulated"
    assert data["entity"]["name"] == "E2E Test Model"


def test_inject_endpoint(api_server):
    """Verify script injection endpoint returns a labeled-simulated response."""
    url = f"{api_server}/api/overte/inject"
    payload = {
        "entity_id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b",
        "script_url": "http://goliath/scripts/spin.js",
        "script_data": {"speed": 60.0},
    }
    response = httpx.post(url, json=payload, timeout=10.0)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["source"] == "simulated"
    assert data["script"]["entity_id"] == "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b"


def test_health_endpoints(api_server):
    """Verify health endpoints are up and return correct SOTA health metadata."""
    for path in ["/health", "/api/health"]:
        response = httpx.get(f"{api_server}{path}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["server"] == "overte-mcp"
        assert "version" in data
        assert "git_sha" in data
        assert "started_at" in data
        assert "uptime_seconds" in data
        assert data["shutting_down"] is False
