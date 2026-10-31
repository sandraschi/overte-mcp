"""Headless bridge: script route, honest no-bridge errors, install, and the WS round trip.

The WebSocket client below is a test double standing in for overte-mcp-bridge.js; the
real bridge is exercised against a live domain by scripts/headless_e2e.py.
"""

import threading
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from overte_mcp import http_server
from overte_mcp.http_server import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_bridge_script_ws_url_points_back_at_server(client):
    r = client.get("/bridge/overte-mcp-bridge.js", headers={"host": "goliath:11110"})
    assert r.status_code == 200
    assert "ws://goliath:11110/api/overte/ws" in r.text
    assert "ws://localhost:11110/api/overte/ws" not in r.text
    assert "BRIDGE_VERSION" in r.text


def test_bridge_status_disconnected(client):
    r = client.get("/api/overte/bridge")
    assert r.status_code == 200
    body = r.json()
    assert body["connected"] is False
    assert body["bridge"] is None
    assert body["script_url"].endswith("/bridge/overte-mcp-bridge.js")


@pytest.mark.parametrize(
    "method,path,json",
    [
        ("post", "/api/overte/spawn", {"name": "x", "type": "Box", "position": [0, 0, 0]}),
        ("post", "/api/overte/inject", {"entity_id": "e", "script_url": "http://s/x.js"}),
        ("post", "/api/overte/delete", {"entity_id": "e"}),
        ("post", "/api/overte/nearby", {"radius": 5}),
        ("get", "/api/overte/avatar", None),
    ],
)
def test_no_bridge_is_503_not_simulated(client, method, path, json):
    r = getattr(client, method)(path, json=json) if json is not None else getattr(client, method)(path)
    assert r.status_code == 503
    assert "bridge_not_connected" in r.json()["detail"]


def test_install_appends_once_and_is_idempotent(client):
    url = http_server._bridge_script_url()
    existing = [{"url": "http://example/other.js", "num_instances": 1, "pool": ""}]
    get_resp = httpx.Response(
        200,
        json={"values": {"scripts": {"persistent_scripts": existing}}},
        request=httpx.Request("GET", "http://d/settings.json"),
    )
    post_resp = httpx.Response(200, json={"status": "success"}, request=httpx.Request("POST", "http://d/settings.json"))
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as g, patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock
    ) as p:
        g.return_value = get_resp
        p.return_value = post_resp
        r = client.post("/api/overte/bridge/install", json={})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["changed"] is True
        sent = p.call_args.kwargs["json"]["scripts"]["persistent_scripts"]
        assert [row["url"] for row in sent] == ["http://example/other.js", url]

        get_resp2 = httpx.Response(
            200,
            json={"values": {"scripts": {"persistent_scripts": sent}}},
            request=httpx.Request("GET", "http://d/settings.json"),
        )
        g.return_value = get_resp2
        p.reset_mock()
        r2 = client.post("/api/overte/bridge/install", json={})
        assert r2.json()["changed"] is False
        p.assert_not_called()


def test_install_reports_unreachable_domain(client):
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as g:
        g.side_effect = httpx.ConnectError("refused")
        r = client.post("/api/overte/bridge/install", json={})
    assert r.status_code == 502
    assert "domain_unreachable" in r.json()["detail"]


def test_ws_round_trip_agent_mode(client):
    with client.websocket_connect("/api/overte/ws") as ws:
        ws.send_json({"type": "hello", "mode": "agent", "version": "2.0.0", "can_rez": True})
        # hello is processed asynchronously; poll status
        for _ in range(50):
            st = client.get("/api/overte/bridge").json()
            if st["connected"] and st["bridge"] and st["bridge"].get("mode") == "agent":
                break
        assert st["bridge"]["mode"] == "agent"

        result = {}

        def do_spawn():
            result["r"] = client.post(
                "/api/overte/spawn", json={"name": "Probe", "type": "Box", "position": [1, 0, 2], "permanent": True}
            )

        t = threading.Thread(target=do_spawn)
        t.start()
        cmd = ws.receive_json()
        assert cmd["action"] == "spawn"
        assert cmd["properties"]["position"] == {"x": 1, "y": 0, "z": 2}
        assert cmd["properties"]["lifetime"] == -1
        ws.send_json({"request_id": cmd["request_id"], "status": "success", "entity_id": "{abc}"})
        t.join(timeout=10)
        r = result["r"]
        assert r.status_code == 200, r.text
        assert r.json()["entity_id"] == "{abc}"
        assert r.json()["bridge_mode"] == "agent"

        # fixtures without a position cannot work headless
        r = client.post("/api/overte/fixture", json={"fixture": "box"})
        assert r.status_code == 400
        assert "position_required" in r.json()["detail"]
