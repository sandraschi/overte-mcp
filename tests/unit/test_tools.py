"""Unit tests for Vircadia MCP tools."""

import pytest
from unittest.mock import AsyncMock, patch
import httpx

from src.vircadia_mcp.models import DomainStatusInput, EntitySpawnInput, ScriptInjectInput
from src.vircadia_mcp.tools.domain import get_domain_status_impl
from src.vircadia_mcp.tools.entities import spawn_entity_impl
from src.vircadia_mcp.tools.scripting import inject_script_impl


@pytest.mark.asyncio
async def test_domain_status_fallback():
    """Test get_domain_status_impl falls back gracefully when the server is offline."""
    # We do not mock httpx here, so it will raise a connection error and trigger fallback
    result = await get_domain_status_impl(DomainStatusInput(host="localhost", port=9999))
    assert result["status"] == "success"
    assert result["source"] == "fallback"
    assert result["domain"]["name"] == "Local Sandbox Grid"
    assert len(result["domain"]["active_avatars"]) == 2


@pytest.mark.asyncio
async def test_domain_status_live_success():
    """Test get_domain_status_impl successfully handles a live server response."""
    mock_response = httpx.Response(
        status_code=200,
        json={
            "name": "Live Goliath Server",
            "uptime": 50000,
            "users": [{"name": "Miko-Agent-02", "uuid": "abc-123"}],
            "settings": {"physics": "Bullet"}
        }
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        result = await get_domain_status_impl(DomainStatusInput(host="goliath", port=40100))
        assert result["status"] == "success"
        assert result["source"] == "live"
        assert result["domain"]["name"] == "Live Goliath Server"
        assert len(result["domain"]["active_avatars"]) == 1


@pytest.mark.asyncio
async def test_entity_spawn_fallback():
    """Test spawn_entity_impl falls back gracefully when the server is offline."""
    input_data = EntitySpawnInput(
        name="Test Box",
        type="Box",
        position=[0, 0, 0],
        scale=[1, 1, 1]
    )
    result = await spawn_entity_impl(input_data)
    assert result["status"] == "success"
    assert result["source"] == "fallback"
    assert result["entity"]["name"] == "Test Box"


@pytest.mark.asyncio
async def test_entity_spawn_live_success():
    """Test spawn_entity_impl successfully parses a live entity spawn response."""
    input_data = EntitySpawnInput(
        name="Test Model",
        type="Model",
        position=[1, 2, 3],
        scale=[2, 2, 2],
        model_url="http://assets/test.glb"
    )

    mock_response = httpx.Response(
        status_code=201,
        json={
            "id": "eeb24f2a-c602-4bf1-a8e9-42b78b09c12b",
            "name": "Test Model",
            "type": "Model",
            "position": [1, 2, 3],
            "scale": [2, 2, 2],
            "modelURL": "http://assets/test.glb"
        }
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await spawn_entity_impl(input_data)
        assert result["status"] == "success"
        assert result["source"] == "live"
        assert result["entity"]["name"] == "Test Model"


@pytest.mark.asyncio
async def test_script_inject_fallback():
    """Test inject_script_impl falls back gracefully when server is offline."""
    input_data = ScriptInjectInput(
        entity_id="test-uuid",
        script_url="http://scripts/spin.js",
        script_data={"speed": 5.0}
    )
    result = await inject_script_impl(input_data)
    assert result["status"] == "success"
    assert result["source"] == "fallback"
    assert result["script"]["entity_id"] == "test-uuid"
    assert result["script"]["scope"]["speed"] == 5.0
