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

## Bridge protocol test (no Overte needed)

```powershell
just test-bridge-protocol   # = uv run python tests/bridge_harness/run_harness.py
```

Runs the real `scripts/overte-mcp-bridge.js` under Node inside a fake agent script engine
(`tests/bridge_harness/fake_overte.mjs`: `Agent`, `Entities`, `EntityViewer`, `Script`,
`WebSocket`) against the backend on port 11118, and drives the REST API: hello/agent
mode, spawn, read-back, edit, nearby (including discovery outside the standing
EntityViewer volume), inject, filtered reads, `no_avatar`, `position_required`, fixtures,
delete. It proves the bridge/backend protocol and the agent-mode logic, not Overte
itself. Needs Node 22+.

## Live headless end-to-end check

```powershell
just e2e-headless          # = uv run python scripts/headless_e2e.py
just e2e-headless --keep   # leave domain-server / assignment-client running afterwards
```

Needs Overte installed (`OVERTE_DIR`, default `C:\Program Files\Overte`). Starts what is
missing (backend, domain-server, `assignment-client -n 9`), installs the bridge as a
persistent script, waits for it to connect in agent mode, then checks against the real
domain: spawn, read-back, edit, nearby search, script inject, fixture refusal without a
position, delete, and (only when it started the domain-server itself) that a
`permanent=True` entity survives a domain-server restart. Writes
`reports/headless-e2e.json` and per-process logs under `reports/headless-e2e-logs/`.
Exit code 0 means every check passed. It stops only the processes it started.

If the admin API rejects the credentials and the script owns the domain-server, it edits
the domain-server `config.json` while it is stopped (timestamped backup kept next to it).

## Repo layout

See `ARCHITECTURE.md`'s "Workspace Directory Structure" section for the full
tree — the short version:

- `src/overte_mcp/` — canonical Python package (server, http_server, tools/)
- `webapp/` — Vite React SPA dashboard
- `scripts/` - the bridge script, `headless_e2e.py`, dance script, MCPB build scripts
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
honestly in code comments, and when something real cannot happen, return an error
that says why. Do not reintroduce a "simulated" success path: it was removed on
2026-10-31 because callers checking only `status` believed invented entities existed. Don't
mark something "verified" in `STATUS.md` without having actually tested it
against a running domain-server/Interface client — this repo has already had
to walk back overclaimed status once.
