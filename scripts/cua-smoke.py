"""CUA NSIS smoke: silent install -> launch -> health/nav checks -> uninstall.

Config: scripts/cua-nsis-config.json. Wired as `just cua-nsis-test`.
Exit 0 = pass, 1 = fail, 2 = SKIP (no installer built yet, or no interactive
desktop/pywinauto). The skip is explicit - never a fake green.

The full path installs software and kills fleet processes per hooks.nsh:
run it on a disposable target (or accept the restart of your local stack),
never blind inside automation.
"""

import glob
import json
import os
import subprocess
import time
import urllib.request
from typing import NoReturn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def skip(msg: str) -> "NoReturn":
    print(f"SKIP: {msg}")
    raise SystemExit(2)


def fail(msg: str) -> "NoReturn":
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def main() -> None:
    with open(os.path.join(ROOT, "scripts", "cua-nsis-config.json"), encoding="utf-8") as f:
        cfg = json.load(f)

    installers = sorted(glob.glob(os.path.join(ROOT, cfg["nsis_glob"])))
    if not installers:
        skip("no installer built - run `just build-native` first")
    installer = installers[-1]
    print(f"installer: {installer}")

    try:
        from pywinauto import Application  # noqa: F401
    except ImportError:
        skip("pywinauto not installed in this venv")

    if os.environ.get("SESSIONNAME", "") == "":
        # No interactive desktop session visible to this process.
        skip("no interactive desktop session")

    backend_port = int(cfg.get("backend_port", 11110))
    base = f"http://127.0.0.1:{backend_port}"
    health_path = cfg.get("health_path", "/health")

    uninstall: str | None = None
    try:
        # Silent install (registers AI clients unless /NOMCP).
        r = subprocess.run([installer, "/S"], cwd=ROOT, timeout=300)
        if r.returncode != 0:
            fail(f"silent install exited {r.returncode}")

        # Launch: the installer registers the app; start via install dir exe.
        install_dir = os.path.expandvars(cfg["install_dir"])
        op_exe = os.path.join(install_dir, cfg["operator_exe"])
        if not os.path.exists(op_exe):
            fail(f"operator exe missing after install: {op_exe}")
        subprocess.Popen([op_exe], cwd=install_dir,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Health poll + feature smoke.
        deadline = time.time() + 90.0
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(base + health_path, timeout=5) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                if resp.status == 200 and body.get("server") == "overte-mcp":
                    break
            except Exception:
                time.sleep(1.0)
        else:
            fail("app never became healthy after install")

        smoke_path = cfg.get("feature_smoke_path", "/api/v1/diagnostics")
        try:
            with urllib.request.urlopen(base + smoke_path, timeout=15) as resp:
                if resp.status != 200:
                    fail(f"feature smoke {smoke_path}: HTTP {resp.status}")
        except Exception as e:
            fail(f"feature smoke error: {e}")
        print("ok: install + launch + health + feature smoke")

        # Resolve uninstaller from the registry for the finally block.
        try:
            import winreg

            key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as root:
                for i in range(winreg.QueryInfoKey(root)[0]):
                    sub = winreg.EnumKey(root, i)
                    if "overte" in sub.lower() or "fleet" in sub.lower():
                        with winreg.OpenKey(root, sub) as k:
                            try:
                                uninstall, _ = winreg.QueryValueEx(k, "UninstallString")
                                break
                            except FileNotFoundError:
                                continue
        except Exception:
            pass
    finally:
        # Always uninstall: leave no side effects on the test machine.
        if uninstall:
            cleaned = uninstall.strip('"')
            print(f"uninstalling: {cleaned}")
            subprocess.run([cleaned, "/S"], timeout=180, check=False)
            time.sleep(5)
        for proc in cfg.get("backend_process_names", []):
            subprocess.run(
                ["taskkill", "/F", "/IM", f"{proc}.exe"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
            )
    print("PASS: NSIS install/launch/uninstall smoke")


if __name__ == "__main__":
    main()
