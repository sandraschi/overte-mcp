# Development Setup

## Tools required

```bash
# Windows (winget)
winget install astral-sh.uv
winget install Git.Git
winget install OpenJS.NodeJS
winget install Casey.Just

# Bun (webapp + Biome) — see https://bun.sh for the Windows installer
# Verify
uv --version
git --version
node --version
just --version
bun --version
```

## Setup

```powershell
git clone https://github.com/sandraschi/overte-mcp
Set-Location overte-mcp
uv sync
Set-Location webapp
bun install
Set-Location ..
```

Or in one step: `just bootstrap`.

## Running the full stack

```powershell
./start.ps1
```

Starts the FastAPI backend (`11110`) and Vite dashboard (`11111`), with
zombie-process cleanup, a health poll, and browser auto-open. See
`docs/ONBOARDING.md` for getting Overte itself running alongside it.

## Common tasks

```powershell
just lint       # Ruff (Python) + Biome (webapp)
just test       # unit + e2e
just test-unit  # unit only
just mcpb-pack  # validate + pack Claude Desktop bundle → dist/overte-mcp.mcpb
```

## Repo layout

See `ARCHITECTURE.md`'s "Workspace Directory Structure" section for the full
tree — the short version:

- `src/overte_mcp/` — canonical Python package (server, http_server, tools/)
- `webapp/` — Vite React SPA dashboard
- `scripts/` — the Interface bridge script, dance script, MCPB build scripts
- `native/` — Tauri 2.0 NSIS desktop wrapper
- `mcpb/` — Claude Desktop bundle pack root (synced from `src/overte_mcp`,
  never edited directly)
- `tests/unit/` and `tests/e2e/`

## Code standards

Fleet-wide standards live in `mcp-central-docs/standards/` — notably
`README_STRUCTURE.md` (this repo's own doc layout follows it),
`MCPB_PACKAGING_STANDARDS.md` for the `.mcpb` build, and
`WEBAPP_DIRECTORY_STANDARD.md` for the `webapp/` naming convention.

## A note on honesty in this repo

`STATUS.md` tracks what's actually been verified against a live Overte
instance vs. what's implemented-but-untested. When adding new Overte-facing
code, follow the same pattern already in `tools/domain.py`,
`tools/entities.py`, and `tools/scripting.py`: label unverified paths
honestly in code comments and always return `source: "live"` or
`source: "simulated"` rather than letting simulated data look real. Don't
mark something "verified" in `STATUS.md` without having actually tested it
against a running domain-server/Interface client — this repo has already had
to walk back overclaimed status once.
