set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]
set allow-duplicate-recipes := true

default:
    @just --list

# Bootstrap python and webapp node dependencies
bootstrap:
    uv sync
    Set-Location '{{justfile_directory()}}\webapp'; npm install

# Start both FastAPI backend and Vite frontend dashboard
serve:
    Set-Location '{{justfile_directory()}}'; pwsh -File .\start.ps1

# Unit + e2e tests
test:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q

# Unit tests only (no subprocess server)
test-unit:
    Set-Location '{{justfile_directory()}}'; uv run pytest -q tests/unit
