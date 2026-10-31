"""Protocol test for scripts/overte-mcp-bridge.js without Overte.

Starts the backend on an isolated port, runs the real bridge script under Node inside a
fake agent script engine (fake_overte.mjs: Agent, Entities, EntityViewer, Script,
WebSocket), and drives the REST API end to end. This proves the bridge/backend protocol
and the agent-mode logic (hello, EntityViewer re-query, position_required, no_avatar,
not_found). It does NOT prove anything about real Overte; scripts/headless_e2e.py does.

Run: uv run python tests/bridge_harness/run_harness.py   (needs node >= 22 on PATH)
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
PORT = int(os.environ.get("HARNESS_PORT", "11118"))
API = f"http://127.0.0.1:{PORT}"

results: list[bool] = []


def ck(name: str, ok: bool, detail: object = None) -> None:
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" :: {detail}"), flush=True)


def body(r: httpx.Response):
    try:
        return r.json()
    except Exception:
        return r.text


def drive() -> None:
    st: dict = {}
    for _ in range(60):
        st = httpx.get(f"{API}/api/overte/bridge").json()
        if st["connected"] and st["bridge"] and st["bridge"].get("mode"):
            break
        time.sleep(0.5)
    ck("hello received, agent mode, can_rez", bool(st.get("bridge")) and st["bridge"]["mode"] == "agent" and st["bridge"]["can_rez"] is True, st)
    r = httpx.post(f"{API}/api/overte/spawn", json={"name": "probe", "type": "Box", "position": [3, 1, -3], "permanent": True}, timeout=10)
    ck("spawn", r.status_code == 200, body(r))
    if r.status_code != 200:
        return
    eid = r.json()["entity_id"]
    r = httpx.get(f"{API}/api/overte/entity/{eid}", timeout=10)
    ck("get_entity", r.status_code == 200 and r.json()["properties"]["name"] == "probe", body(r))
    ck("permanent sends lifetime -1", r.status_code == 200 and r.json()["properties"].get("lifetime") == -1, body(r))
    r = httpx.post(f"{API}/api/overte/update", json={"entity_id": eid, "position": [4, 1.5, -3]}, timeout=10)
    ck("update", r.status_code == 200, body(r))
    r = httpx.post(f"{API}/api/overte/nearby", json={"position": [4, 1.5, -3], "radius": 3}, timeout=10)
    ck("nearby finds it", r.status_code == 200 and eid in [i["id"] for i in r.json()["items"]], body(r))
    r = httpx.post(f"{API}/api/overte/nearby", json={"position": [500, 0, 0], "radius": 5}, timeout=10)
    ck("nearby discovers an entity outside the standing view (EntityViewer re-query)",
       r.status_code == 200 and "{external}" in [i["id"] for i in r.json()["items"]], body(r))
    r = httpx.post(f"{API}/api/overte/inject", json={"entity_id": eid, "script_url": "http://x/spin.js"}, timeout=10)
    ck("inject", r.status_code == 200, body(r))
    r = httpx.get(f"{API}/api/overte/entity/{eid}", params={"properties": "script"}, timeout=10)
    ck("filtered get_entity (no 'type' requested) still works", r.status_code == 200 and r.json()["properties"]["script"] == "http://x/spin.js", body(r))
    r = httpx.get(f"{API}/api/overte/avatar", timeout=10)
    ck("avatar refused in agent mode", r.status_code == 400 and "no avatar" in r.text, body(r))
    r = httpx.post(f"{API}/api/overte/fixture", json={"fixture": "box"}, timeout=10)
    ck("fixture without position refused", r.status_code == 400 and "position_required" in r.text, body(r))
    r = httpx.post(f"{API}/api/overte/fixture", json={"fixture": "table", "position": [0, 0, -2]}, timeout=10)
    ck("fixture with position", r.status_code == 200 and len(r.json()["entity_ids"]) > 1, body(r))
    r = httpx.post(f"{API}/api/overte/delete", json={"entity_id": eid}, timeout=10)
    ck("delete", r.status_code == 200, body(r))
    r = httpx.get(f"{API}/api/overte/entity/{eid}", timeout=10)
    ck("deleted entity reads as not found", r.status_code == 400 and "not found" in r.text, body(r))


def main() -> int:
    env = dict(os.environ, PYTHONPATH=str(REPO / "src"), MCP_PORT=str(PORT))
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "overte_mcp.http_server:app", "--host", "127.0.0.1", "--port", str(PORT)],
        cwd=REPO, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    node = None
    try:
        for _ in range(120):
            try:
                if httpx.get(f"{API}/api/health", timeout=1).status_code == 200:
                    break
            except Exception:
                time.sleep(0.5)
        node = subprocess.Popen(
            ["node", str(HERE / "fake_overte.mjs")],
            env=dict(os.environ, BRIDGE_URL=f"{API}/bridge/overte-mcp-bridge.js"),
        )
        drive()
    finally:
        if node:
            node.kill()
        backend.kill()
    print(f"{sum(results)}/{len(results)} passed")
    return 0 if results and all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
