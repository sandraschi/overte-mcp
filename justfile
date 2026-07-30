set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]
set allow-duplicate-recipes := true

default:
    @just --list

# Bootstrap python and webapp dependencies
bootstrap:
    uv sync
    Set-Location '{{justfile_directory()}}\webapp'; if (Get-Command bun -ErrorAction SilentlyContinue) { bun install } else { npm install }

# Start both FastAPI backend and Vite frontend dashboard
serve:
    Set-Location '{{justfile_directory()}}'; pwsh -File .\start.ps1

# Unit + e2e tests
test:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q

# Unit tests only (no subprocess server)
test-unit:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q tests/unit

# Ruff + Biome lint
lint:
    Set-Location '{{justfile_directory()}}'; uv run ruff check .
    Set-Location '{{justfile_directory()}}\webapp'; bunx biome check src

# Bundle for Claude Desktop (pack from mcpb/)
mcpb-pack:
    powershell.exe -NoProfile -File "{{justfile_directory()}}/scripts/build-mcpb-package.ps1" -OutputDir dist

# -- Tauri Native ---
build-native:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    npx @tauri-apps/cli build

cua-nsis-test:
    uv run python scripts/cua-smoke.py


# Pre-commit hook (ruff + biome)
precommit:
    uv run ruff check src/
    Set-Location '{{justfile_directory()}}\webapp'; bunx biome check src

# Bootstrap: install dev deps + pre-commit hook
