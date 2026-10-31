"""Pre-Tauri webapp smoke: boot the backend isolated, walk the stack the Vite
dashboard talks to, verify the built bundle exists.

Usage: ``just cua-webapp-test`` (or ``python scripts/cua-webapp-test.py``).
Exit 0 = pass, 1 = fail. No browser needed: this exercises every REST route
the dashboard depends on. A clicked-through browser nav walk stays manual
until Playwright is wired.
"""

import os
import subprocess
import sys
import time
from typing import NoReturn

import httpx

PORT = "11983"
BASE = f"http://127.0.0.1:{PORT}"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CHECKS: list[tuple[str, str]] = [
    ("health identity", "/api/health"),
    ("capabilities + llm_proxy flag", "/api/capabilities"),
    ("LLM discover via proxy", "/api/llm/discover"),
    ("LLM onboarding shape", "/api/llm/onboarding"),
    ("diagnostics", "/api/v1/diagnostics"),
    ("tools list (12 tools)", "/api/tools"),
    ("skills list", "/api/skills"),
    ("logs ring", "/api/logs?limit=5"),
]


def fail(msg: str) -> "NoReturn":
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def main() -> None:
    dist_index = os.path.join(ROOT, "webapp", "dist", "index.html")
    if not os.path.exists(dist_index):
        fail("webapp/dist/index.html missing - run `bun run build` in webapp/ first")

    env = os.environ.copy()
    env["PORT"] = PORT
    proc = subprocess.Popen(
        [sys.executable, "-m", "overte_mcp.http_server"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=ROOT,
    )
    try:
        deadline = time.time() + 20.0
        while time.time() < deadline:
            try:
                r = httpx.get(f"{BASE}/api/health", timeout=1.0)
                if r.status_code == 200 and r.json().get("server") == "overte-mcp":
                    break
            except Exception:
                time.sleep(0.25)
        else:
            fail("backend on 11983 never became healthy")

        for label, path in CHECKS:
            try:
                r = httpx.get(f"{BASE}{path}", timeout=10.0)
            except Exception as e:
                fail(f"{label}: request error {e}")
            if r.status_code != 200:
                fail(f"{label}: HTTP {r.status_code}")
            print(f"ok: {label}")

        caps = httpx.get(f"{BASE}/api/capabilities", timeout=10.0).json()
        if not caps.get("llm_proxy"):
            fail("capabilities llm_proxy flag missing")
        tools = httpx.get(f"{BASE}/api/tools", timeout=10.0).json().get("tools", [])
        if len(tools) < 12:
            fail(f"expected >=12 tools, got {len(tools)}")
        print(f"ok: tool count {len(tools)}")
        print("PASS: webapp stack smoke (backend 11983 + dist bundle)")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10.0)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
