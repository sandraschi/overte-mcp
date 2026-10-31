"""Backend LLM proxy: discovery, models, chat forward, onboarding, stream relay.

No local provider runs in CI, so these tests assert the fail-open contract:
honest 502/400 with a reason, never invented text. Live-provider paths are
covered by manual dashboard verification (Settings page).
"""

from fastapi.testclient import TestClient

from overte_mcp.http_server import app


def _client():
    return TestClient(app)


def test_llm_discover_shape():
    with _client() as c:
        r = c.get("/api/llm/discover")
    assert r.status_code == 200
    body = r.json()
    assert body["chat_proxy"] is True
    assert {p["name"] for p in body["providers"]} == {"ollama", "lmstudio", "vllm"}
    assert all("available" in p and "base" in p for p in body["providers"])
    assert "gpu" in body and "gpus" in body["gpu"]


def test_llm_providers_no_keys_exposed():
    with _client() as c:
        r = c.get("/api/llm/providers")
    assert r.status_code == 200
    body = r.json()
    assert len(body["local"]) == 3
    assert set(body["cloud_configured"]) == {"openai", "anthropic"}
    assert all(isinstance(v, bool) for v in body["cloud_configured"].values())


def test_llm_models_unknown_provider_is_400():
    with _client() as c:
        r = c.get("/api/llm/models", params={"provider": "nope"})
    assert r.status_code == 400


def test_llm_models_live_or_fallback():
    with _client() as c:
        r = c.get("/api/llm/models", params={"provider": "ollama"})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "ollama"
    assert isinstance(body["models"], list) and body["models"]
    assert isinstance(body["live"], bool)


def test_llm_chat_unreachable_is_502_not_invented():
    with _client() as c:
        r = c.post(
            "/api/llm/chat",
            json={"provider": "ollama", "model": "qwen3:8b", "messages": [{"role": "user", "content": "hi"}]},
        )
    assert r.status_code == 502
    assert "unreachable" in r.json()["detail"]


def test_llm_chat_unknown_provider_is_400():
    with _client() as c:
        r = c.post(
            "/api/llm/chat",
            json={"provider": "nope", "model": "x", "messages": []},
        )
    assert r.status_code == 400


def test_llm_onboarding_shape():
    with _client() as c:
        r = c.get("/api/llm/onboarding")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["required"], bool)
    assert body["steps"] and isinstance(body["steps"], list)


def test_llm_stream_relay_errors_honestly():
    with _client() as c:
        r = c.post(
            "/api/llm/chat/stream",
            json={"provider": "ollama", "model": "qwen3:8b", "messages": [{"role": "user", "content": "hi"}]},
        )
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    assert b"error" in r.content  # no provider running: error event, not invented tokens
