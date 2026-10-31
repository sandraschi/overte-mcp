set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]
set allow-duplicate-recipes := true

default:
    @just --list

# Bootstrap python and webapp dependencies
bootstrap:
    uv sync
    uvx pre-commit install --install-hooks
    Set-Location '{{justfile_directory()}}\webapp'; if (Get-Command bun -ErrorAction SilentlyContinue) { bun install } else { npm install }

# Start both FastAPI backend and Vite frontend dashboard
serve:
    Set-Location '{{justfile_directory()}}'; powershell.exe -NoProfile -File .\start.ps1

# Unit + e2e tests
test:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q

# Bridge protocol test without Overte (real bridge script in a fake agent engine under Node)
test-bridge-protocol:
    Set-Location '{{justfile_directory()}}'; uv run python tests/bridge_harness/run_harness.py

# Live headless end-to-end check against a real Overte domain (no Interface/GUI)
e2e-headless *ARGS:
    Set-Location '{{justfile_directory()}}'; uv run python scripts/headless_e2e.py {{ARGS}}

# Unit tests only (no subprocess server)
test-unit:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q tests/unit

# Ruff + Biome lint
lint:
    Set-Location '{{justfile_directory()}}'; uv run ruff check src/
    Set-Location '{{justfile_directory()}}\webapp'; bunx biome check src

# Ruff format + Biome write (applies fixes)
fmt:
    Set-Location '{{justfile_directory()}}'; uv run ruff format src/
    Set-Location '{{justfile_directory()}}\webapp'; bunx biome check --write src

# All gates in one go (lint + format-check + typecheck + tests)
gates-green:
    Set-Location '{{justfile_directory()}}'; uv run ruff check src/
    Set-Location '{{justfile_directory()}}'; uv run ruff format src/ --check
    Set-Location '{{justfile_directory()}}'; uv run pyright src/
    Set-Location '{{justfile_directory()}}'; uv run pytest -q

# Bundle for Claude Desktop (pack from mcpb/ via fleet shim)
mcpb-pack:
    powershell.exe -NoProfile -File "{{justfile_directory()}}/scripts/mcpb-pack.ps1" -OutputDir dist

# -- Tauri Native ---
build-native:
    Set-Location '{{justfile_directory()}}\native'; $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"; powershell.exe -NoProfile -File '{{justfile_directory()}}\native\build.ps1'

# CUA NSIS smoke (install -> launch -> checks -> uninstall; exit 2 = SKIP when no installer built)
cua-nsis-test:
    powershell.exe -NoProfile -File "{{justfile_directory()}}/scripts/just/cua-nsis-test.ps1"

# CUA webapp smoke (isolated backend + REST walk + dist bundle check)
cua-webapp-test:
    powershell.exe -NoProfile -File "{{justfile_directory()}}/scripts/just/cua-webapp-test.ps1"


# Pre-commit hook (ruff + biome)
precommit:
    uv run ruff check src/
    Set-Location '{{justfile_directory()}}\webapp'; bunx biome check src

# Bootstrap: install dev deps + pre-commit hook
