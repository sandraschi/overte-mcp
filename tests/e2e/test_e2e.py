"""End-to-End integration tests for Overte MCP HTTP server."""

import os
import subprocess
import sys
import time

import httpx
import pytest


@pytest.fixture(scope="module")
def api_server():
    """Start the FastAPI HTTP server on an isolated test port.

    Port 11981 is verified free in mcp-central-docs/operations/WEBAPP_PORTS.md
    (11119 belongs to sdr-mcp - a previous run failed by polling the wrong server).
    The wait loop additionally pins the server identity before yielding.
    """
    env = os.environ.copy()
    env["PORT"] = "11981"  # isolated from fleet 11110 and sdr-mcp 11119

    # sys.executable (not `uv run`): the server is a direct child, so
    # proc.terminate() actually kills it - `uv run` orphans the grandchild
    # python and leaves stale servers holding the port (observed 2026-10-31).
    # stdout/stderr go to DEVNULL: nobody drains PIPEs here, and a full pipe
    # blocks the server mid-request (observed as test ReadTimeouts).
    proc = subprocess.Popen(
        [sys.executable, "-m", "overte_mcp.http_server"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    )

    # Wait for server boot (poll health + pin identity)
    base = "http://127.0.0.1:11981"
    deadline = time.time() + 15.0
    while time.time() < deadline:
        try:
            r = httpx.get(f"{base}/api/health", timeout=0.5)
            if r.status_code == 200 and r.json().get("server") == "overte-mcp":
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
    """Status is live if a domain-server runs here, otherwise an honest domain_unreachable."""
    url = f"{api_server}/api/overte/status"
    response = httpx.get(url, params={"host": "localhost", "port": 40100}, timeout=10.0)
    if response.status_code == 200:
        data = response.json()
        assert data["source"] == "live"
        assert "domain" in data
    else:
        assert response.status_code == 502
        assert "domain_unreachable" in response.json()["detail"]


def test_spawn_without_bridge_is_503(api_server):
    """No bridge connected to this isolated server: spawn must refuse, not simulate."""
    url = f"{api_server}/api/overte/spawn"
    payload = {"name": "E2E Test Model", "type": "Model", "position": [0.0, 1.0, 0.0]}
    response = httpx.post(url, json=payload, timeout=10.0)
    assert response.status_code == 503
    assert "bridge_not_connected" in response.json()["detail"]


def test_inject_without_bridge_is_503(api_server):
    url = f"{api_server}/api/overte/inject"
    payload = {"entity_id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b", "script_url": "http://goliath/scripts/spin.js"}
    response = httpx.post(url, json=payload, timeout=10.0)
    assert response.status_code == 503


def test_bridge_script_served(api_server):
    response = httpx.get(f"{api_server}/bridge/overte-mcp-bridge.js", timeout=10.0)
    assert response.status_code == 200
    host = api_server.split("://")[1]
    assert f"ws://{host}/api/overte/ws" in response.text


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
