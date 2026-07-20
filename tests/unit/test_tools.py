"""Unit tests for Overte MCP tools."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from overte_mcp.models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from overte_mcp.tools.domain import get_domain_status_impl
from overte_mcp.tools.entities import spawn_entity_impl
from overte_mcp.tools.scripting import inject_script_impl


@pytest.mark.asyncio
async def test_domain_status_simulated_when_offline():
    """Test get_domain_status_impl falls back to clearly-labeled simulated data offline."""
    # We do not mock httpx here, so it will raise a connection error and trigger the
    # simulated fallback path.
    result = await get_domain_status_impl(DomainStatusInput(host="localhost", port=9999))
    assert result["status"] == "success"
    assert result["source"] == "simulated"
    assert "warning" in result
    assert len(result["domain"]["nodes"]) == 2


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
async def test_entity_spawn_is_simulated():
    """spawn_entity_impl has no live bridge yet -- it must say so, not claim success silently."""
    input_data = EntitySpawnInput(name="Test Box", type="Box", position=[0, 0, 0], scale=[1, 1, 1])
    result = await spawn_entity_impl(input_data)
    assert result["status"] == "success"
    assert result["source"] == "simulated"
    assert "warning" in result
    assert result["entity"]["name"] == "Test Box"


@pytest.mark.asyncio
async def test_script_inject_is_simulated():
    """inject_script_impl has no live bridge yet -- it must say so, not claim success silently."""
    input_data = ScriptInjectInput(
        entity_id="test-uuid", script_url="http://scripts/spin.js", script_data={"speed": 5.0}
    )
    result = await inject_script_impl(input_data)
    assert result["status"] == "success"
    assert result["source"] == "simulated"
    assert "warning" in result
    assert result["script"]["entity_id"] == "test-uuid"
    assert result["script"]["scope"]["speed"] == 5.0
