"""Headless end-to-end check for the overte-mcp bridge (no Interface, no GUI).

Starts what is missing (overte-mcp backend, domain-server, assignment-client), registers
the bridge as a domain persistent script, waits for it to connect in agent mode, then
drives the real REST API: spawn, read back, edit, search, inject, delete, and (when this
script owns the domain-server) persistence of a permanent entity across a restart.

Run:   uv run python scripts/headless_e2e.py [--keep] [--skip-persistence]
Report: reports/headless-e2e.json  (exit code 0 = every check passed)

Env: OVERTE_DIR (default C:/Program Files/Overte), OVERTE_ADMIN_USER / OVERTE_ADMIN_PASSWORD
(default admin/admin), MCP_PORT (default 11110).
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[1]
REPORTS = REPO / "reports"
LOGS = REPORTS / "headless-e2e-logs"
OVERTE_DIR = Path(os.environ.get("OVERTE_DIR", r"C:\Program Files\Overte"))
DS_EXE = OVERTE_DIR / "domain-server.exe"
AC_EXE = OVERTE_DIR / "assignment-client.exe"
PORT = int(os.environ.get("MCP_PORT", "11110"))
API = f"http://127.0.0.1:{PORT}"
DOMAIN = "http://localhost:40100"
DS_CONFIG = Path(os.environ.get("APPDATA", "")) / "Overte" / "domain-server" / "config.json"
# Generous: on a loaded machine Python alone can take minutes to start.
STARTUP_S = int(os.environ.get("E2E_STARTUP_S", "300"))
NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

checks: list[dict] = []
owned: dict[str, bool] = {"backend": False, "domain": False, "ac": False}
procs: dict[str, subprocess.Popen] = {}


def check(name: str, ok: bool, detail: object = None) -> bool:
    checks.append({"check": name, "ok": bool(ok), "detail": detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" :: {detail}" if detail is not None else ""), flush=True)
    return ok


def up(url: str) -> bool:
    try:
        httpx.get(url, timeout=2.0)
        return True
    except Exception:
        return False


def wait_for(fn, timeout: float, every: float = 1.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        v = fn()
        if v:
            return v
        time.sleep(every)
    return None


def start(name: str, args: list[str], cwd: Path | None = None, env: dict | None = None) -> subprocess.Popen:
    LOGS.mkdir(parents=True, exist_ok=True)
    log = open(LOGS / f"{name}.log", "ab")
    p = subprocess.Popen(args, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=NO_WINDOW)
    procs[name] = p
    return p


def kill_image(exe: str) -> None:
    subprocess.run(["taskkill", "/F", "/T", "/IM", exe], capture_output=True)


def image_running(exe: str) -> bool:
    r = subprocess.run(["tasklist", "/FI", f"IMAGENAME eq {exe}", "/NH"], capture_output=True, text=True)
    return exe.lower() in r.stdout.lower()


def ensure_backend() -> bool:
    if up(f"{API}/api/health"):
        return check("backend already running", True, API)
    env = dict(os.environ, MCP_PORT=str(PORT), PORT=str(PORT))
    start("backend", [sys.executable, "run_server.py"], cwd=REPO, env=env)
    owned["backend"] = True
    return check("backend started", bool(wait_for(lambda: up(f"{API}/api/health"), STARTUP_S)), API)


def ensure_domain() -> bool:
    if up(DOMAIN):
        return check("domain-server already running", True, DOMAIN)
    if not DS_EXE.exists():
        return check("domain-server installed", False, str(DS_EXE))
    start("domain-server", [str(DS_EXE)])
    owned["domain"] = True
    return check("domain-server started", bool(wait_for(lambda: up(DOMAIN), STARTUP_S)), DOMAIN)


def ensure_ac() -> bool:
    if image_running("assignment-client.exe"):
        return check("assignment-client already running", True)
    # 6 static assignments (audio, avatar, entity, asset, messages, entity-script) + 1 agent
    # for the bridge + headroom.
    start("assignment-client", [str(AC_EXE), "-n", "9"])
    owned["ac"] = True
    return check("assignment-client started", bool(wait_for(lambda: image_running("assignment-client.exe"), 20)))


def bridge_state() -> dict:
    try:
        return httpx.get(f"{API}/api/overte/bridge", timeout=3.0).json()
    except Exception:
        return {}


def wait_bridge(timeout: float) -> dict | None:
    def ok():
        st = bridge_state()
        b = st.get("bridge") or {}
        return st if st.get("connected") and b.get("mode") else None

    return wait_for(ok, timeout, 2.0)


def install_offline(url: str) -> bool:
    """Fallback when the admin API refuses our credentials: edit the domain-server's own
    config.json while it is stopped (only when this script owns the domain process)."""
    if not owned["domain"]:
        return check("offline install", False, "admin API refused credentials and the domain-server is not ours to stop")
    kill_image("domain-server.exe")
    time.sleep(2)
    backup = DS_CONFIG.with_suffix(f".json.{datetime.datetime.now():%Y%m%d_%H%M%S}.bak")
    shutil.copy2(DS_CONFIG, backup)
    cfg = json.loads(DS_CONFIG.read_text(encoding="utf-8-sig"))
    rows = cfg.setdefault("scripts", {}).setdefault("persistent_scripts", [])
    if not any(r.get("url") == url for r in rows):
        rows.append({"url": url, "num_instances": 1, "pool": ""})
    DS_CONFIG.write_text(json.dumps(cfg, indent=4), encoding="utf-8")
    start("domain-server", [str(DS_EXE)])
    return check("offline install (config.json edited, backup kept)", bool(wait_for(lambda: up(DOMAIN), 90)), str(backup))


def call(method: str, path: str, **kw) -> httpx.Response:
    return httpx.request(method, f"{API}{path}", timeout=30.0, **kw)


def run(args) -> int:
    if not (ensure_backend() and ensure_domain() and ensure_ac()):
        return 1

    st = bridge_state()
    if st.get("connected") and (st.get("bridge") or {}).get("mode") == "interface":
        print("note: an Interface bridge is connected; the agent bridge will replace it when it connects")

    r = call("POST", "/api/overte/bridge/install", json={})
    if r.status_code == 401:
        if not install_offline(bridge_state().get("script_url") or f"{API}/bridge/overte-mcp-bridge.js"):
            return 1
    elif not check("bridge registered as persistent script", r.status_code == 200, r.json()):
        return 1

    st = wait_bridge(180)
    if not check("bridge connected", bool(st), st):
        return 1
    b = st["bridge"]
    check("bridge runs headless (agent mode)", b.get("mode") == "agent", b)
    if not check("bridge may create entities (can_rez)", b.get("can_rez") is True, b):
        return 1

    tag = f"overte-mcp-e2e-{int(time.time())}"
    r = call("POST", "/api/overte/spawn", json={"name": tag, "type": "Box", "position": [3.0, 1.0, -3.0],
                                                 "scale": [0.5, 0.5, 0.5], "color": [1.0, 0.4, 0.1]})
    if not check("spawn Box", r.status_code == 200, r.json()):
        return 1
    eid = r.json()["entity_id"]

    r = wait_for(lambda: (lambda x: x if x.status_code == 200 else None)(call("GET", f"/api/overte/entity/{eid}")), 15, 1.5)
    props = r.json()["properties"] if r is not None else {}
    check("read back: entity exists with our name", props.get("name") == tag, props)

    r = call("POST", "/api/overte/update", json={"entity_id": eid, "position": [4.0, 1.5, -3.0]})
    check("edit position", r.status_code == 200, r.json())
    time.sleep(1.5)
    r = call("GET", f"/api/overte/entity/{eid}")
    pos = (r.json().get("properties") or {}).get("position") or {}
    check("edit visible on read", abs(pos.get("x", 0) - 4.0) < 0.05 and abs(pos.get("y", 0) - 1.5) < 0.05, pos)

    r = call("POST", "/api/overte/nearby", json={"position": [4.0, 1.5, -3.0], "radius": 3.0})
    ids = [i.get("id") for i in r.json().get("items", [])] if r.status_code == 200 else []
    check("nearby search finds it", eid in ids, {"count": len(ids)})

    r = call("POST", "/api/overte/inject", json={"entity_id": eid, "script_url": f"{API}/scripts/spin.js",
                                                  "script_data": {"speed": 1}})
    check("inject script", r.status_code == 200, r.json())
    time.sleep(1.5)
    r = call("GET", f"/api/overte/entity/{eid}", params={"properties": "script,userData"})
    sp = r.json().get("properties") or {}
    check("script property set", sp.get("script", "").endswith("/scripts/spin.js"), sp)

    r = call("POST", "/api/overte/fixture", json={"fixture": "box"})
    check("fixture without position refused in agent mode", r.status_code == 400 and "position_required" in r.text, r.json())

    r = call("POST", "/api/overte/delete", json={"entity_id": eid})
    check("delete", r.status_code == 200, r.json())
    time.sleep(2)
    r = call("GET", f"/api/overte/entity/{eid}")
    check("deleted entity is gone", r.status_code != 200, r.json())

    if args.skip_persistence:
        check("persistence across restart", True, "skipped (--skip-persistence)")
    elif not owned["domain"]:
        check("persistence across restart", True, "skipped: domain-server was already running and is not ours to restart")
    else:
        r = call("POST", "/api/overte/spawn", json={"name": tag + "-perm", "type": "Sphere", "permanent": True,
                                                     "position": [-3.0, 1.0, -3.0], "scale": [0.4, 0.4, 0.4]})
        if check("spawn permanent Sphere", r.status_code == 200, r.json()):
            pid = r.json()["entity_id"]
            print("waiting 40 s for the entity server to persist (persistInterval 30 s)...", flush=True)
            time.sleep(40)
            kill_image("domain-server.exe")
            kill_image("assignment-client.exe")
            wait_for(lambda: not call("GET", "/api/overte/bridge").json().get("connected"), 30)
            time.sleep(3)
            start("domain-server", [str(DS_EXE)])
            wait_for(lambda: up(DOMAIN), 90)
            start("assignment-client", [str(AC_EXE), "-n", "9"])
            check("bridge reconnects after restart", bool(wait_bridge(180)), bridge_state())
            r = wait_for(lambda: (lambda x: x if x.status_code == 200 else None)(call("GET", f"/api/overte/entity/{pid}")), 30, 2.0)
            check("permanent entity survived restart", r is not None, r.json() if r is not None else None)
            call("POST", "/api/overte/delete", json={"entity_id": pid})
    return 0 if all(c["ok"] for c in checks) else 1


def cleanup(keep: bool) -> None:
    if keep:
        return
    if owned["ac"]:
        kill_image("assignment-client.exe")
    if owned["domain"]:
        kill_image("domain-server.exe")
    if owned["backend"] and "backend" in procs:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(procs["backend"].pid)], capture_output=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="leave started processes running")
    ap.add_argument("--skip-persistence", action="store_true")
    args = ap.parse_args()
    started = datetime.datetime.now(datetime.timezone.utc)
    code = 1
    try:
        code = run(args)
    except Exception as e:  # report, never hide
        check("unexpected exception", False, repr(e))
        code = 1
    finally:
        cleanup(args.keep)
        REPORTS.mkdir(exist_ok=True)
        report = {
            "started_at": started.isoformat(),
            "finished_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "passed": code == 0,
            "owned_processes": owned,
            "checks": checks,
        }
        (REPORTS / "headless-e2e.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\n{'PASS' if code == 0 else 'FAIL'}: {sum(c['ok'] for c in checks)}/{len(checks)} checks; report reports/headless-e2e.json")
    return code


if __name__ == "__main__":
    sys.exit(main())
