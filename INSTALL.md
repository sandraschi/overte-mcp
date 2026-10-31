# Installing Overte & Overte MCP

Local setup for the **Overte MCP Server**, dashboard, WebSocket bridge, and Claude Desktop `.mcpb` bundle.

---

## Prerequisites

- **Python** 3.12+
- **[uv](https://docs.astral.sh/uv/)** (required for stdio MCP and MCPB launch)
- **[Bun](https://bun.sh)** or Node (webapp + Biome)
- **[just](https://github.com/casey/just)** (optional; recipes in root `justfile`)
- **Overte Client + Server** from [overte.org/downloads](https://overte.org/downloads.html) for live domain status and in-world bridge ops

---

## Step 1: Install & set up Overte

1. Install Overte Client + Server.
2. Start the local domain server (`domain-server.exe`) — typically under `C:\Program Files\Overte`.
3. Open the admin console at `http://localhost:40100/settings` and create an admin account (local sandbox often uses `admin` / `admin`).
4. Load the MCP bridge script in **Overte Interface**:
   - **Developer** → **Script Manager** → **Load Script** → **From Disk**
   - Select [scripts/overte-mcp-bridge.js](scripts/overte-mcp-bridge.js)
5. Keep the MCP FastAPI backend running (port `11110`) so the bridge WebSocket at `/api/overte/ws` can connect.

---

## Step 2: Install Overte MCP

### Clone

```powershell
git clone https://github.com/sandraschi/overte-mcp
Set-Location overte-mcp
```

### Dependencies

```powershell
uv sync
Set-Location webapp
bun install
# or: npm install
Set-Location ..
```

Or: `just bootstrap` (uv sync + webapp install).

---

## Step 3: Run the services

### Full stack (recommended for dashboard + bridge)

```powershell
./start.ps1
```

Starts FastAPI (`11110`), Vite dashboard (`11111`), prerequisite checks, health poll, browser open.

### Stdio MCP (Cursor / VS Code / Codex / Opencode — no bundle needed)

```json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/sandraschi/overte-mcp.git", "overte-mcp"]
    }
  }
}
```

### Claude Desktop config (repo path — development only)

```json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "python",
      "args": ["-m", "overte_mcp"],
      "env": {
        "PYTHONPATH": "<checkout>/src",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```
Replace `<checkout>` with the repo location. End users should use the one-liner above, never hand-wire this.

### Claude Desktop via `.mcpb` (fleet packaging)

Claude-only one-liner (installs Python/`uv` if missing, registers the bundle):

```powershell
irm https://github.com/sandraschi/overte-mcp/releases/latest/download/install.ps1 | iex
```

From source:

```powershell
just mcpb-pack
```

Output: `dist/overte-mcp.mcpb`. Drag into Claude Desktop.

- Pack **from** `mcpb/` (not repo root) — `scripts/mcpb-pack.ps1` is a thin shim over the canonical `mcp-central-docs/scripts/fleet-mcpb-pack.ps1`: it syncs `src/overte_mcp` → `mcpb/src/overte_mcp`, validates `manifest.json`, applies `.mcpbignore`, and generates `install.ps1`.
- Prompts (3-4-100): `mcpb/assets/prompts/system.md`, `user.md`, `examples.json`.
- Ignore file name is **`.mcpbignore`** (not `.mcpignore`). Examples file is **`examples.json`** (not `usage.json`).
- `glama.json` stays in the repo root and is excluded from the bundle.

Details: [mcpb/README.md](mcpb/README.md), fleet [MCPB_PACKAGING_STANDARDS.md](https://github.com/sandraschi/mcp-central-docs/blob/main/standards/MCPB_PACKAGING_STANDARDS.md).

---

## Ports

| Service | Port |
|---------|------|
| FastAPI backend + bridge WS | `11110` |
| Vite dashboard | `11111` |
| Overte domain admin | `40100` |

---

## Quality gates

```powershell
just lint       # Ruff (Python) + Biome (webapp)
just test-unit
just test
```

Pre-commit runs Ruff + Biome when configured.
