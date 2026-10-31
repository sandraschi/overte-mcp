"""Unit tests for Overte MCP tools."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from overte_mcp.models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from overte_mcp.tools.domain import get_domain_status_impl
from overte_mcp.tools.entities import spawn_entity_impl
from overte_mcp.tools.scripting import inject_script_impl


@pytest.mark.asyncio
async def test_domain_status_error_when_offline():
    """No domain-server: an honest error, never placeholder nodes."""
    result = await get_domain_status_impl(DomainStatusInput(host="localhost", port=9999))
    assert result["status"] == "error"
    assert result["source"] == "unreachable"
    assert "domain_unreachable" in result["message"]
    assert "domain" not in result


@pytest.mark.asyncio
async def test_domain_status_live_success():
    """Test get_domain_status_impl successfully handles a live nodes.json response."""
    nodes_response = httpx.Response(
        status_code=200,
        json={"nodes": [{"type": "avatar-mixer", "uuid": "abc-123", "public": {"ip": "goliath"}}]},
    )
    settings_response = httpx.Response(status_code=200, json={"physics": "Bullet"})

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [nodes_response, settings_response]

        result = await get_domain_status_impl(
            DomainStatusInput(host="goliath", port=40100, username="admin", password="admin")
        )
        assert result["status"] == "success"
        assert result["source"] == "live"
        assert len(result["domain"]["nodes"]) == 1
        assert result["domain"]["settings"]["physics"] == "Bullet"


@pytest.mark.asyncio
async def test_domain_status_unauthorized():
    """Test get_domain_status_impl surfaces a clear error on 401, not a silent fallback."""
    unauthorized_response = httpx.Response(status_code=401, json={})

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = unauthorized_response

        result = await get_domain_status_impl(DomainStatusInput(host="goliath", port=40100))
        assert result["status"] == "error"
        assert "401" in result["message"]


@pytest.mark.asyncio
async def test_entity_spawn_errors_without_backend():
    """No backend/bridge: spawn must fail, not invent an entity."""
    input_data = EntitySpawnInput(name="Test Box", type="Box", position=[0, 0, 0], scale=[1, 1, 1])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectError("refused")
        result = await spawn_entity_impl(input_data)
    assert result["status"] == "error"
    assert "entity" not in result
    assert "unreachable" in result["message"]


@pytest.mark.asyncio
async def test_entity_spawn_forwards_all_fields():
    """parent_id/color/light fields used to be dropped on the way to the backend."""
    input_data = EntitySpawnInput(
        name="Lamp", type="Light", position=[1, 2, 3], color=[1, 0.5, 0], intensity=2.0, parent_id="p-1"
    )
    ok = httpx.Response(200, json={"status": "success", "source": "live", "entity_id": "e-1"})
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = ok
        result = await spawn_entity_impl(input_data)
        sent = mock_post.call_args.kwargs["json"]
    assert result["entity_id"] == "e-1"
    assert sent["parent_id"] == "p-1"
    assert sent["intensity"] == 2.0
    assert sent["color"] == [1, 0.5, 0]


@pytest.mark.asyncio
async def test_script_inject_errors_without_bridge():
    """Backend up but no bridge: the 503 detail is passed through as an error."""
    input_data = ScriptInjectInput(
        entity_id="test-uuid", script_url="http://scripts/spin.js", script_data={"speed": 5.0}
    )
    resp = httpx.Response(503, json={"detail": "bridge_not_connected: no Overte bridge is connected."})
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = resp
        result = await inject_script_impl(input_data)
    assert result["status"] == "error"
    assert "bridge_not_connected" in result["message"]
