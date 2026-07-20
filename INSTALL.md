# Installing Overte & Overte MCP

Follow these steps to set up, install dependencies, and run the **Overte MCP Server** locally.

---

## Prerequisites
* **Python**: Python 3.12 or newer is required.
* **uv**: Astral's package manager (`uv`) is recommended.
* **Overte Client + Server (Local Domain Server)**: You need an Overte Domain Server running to get real (non-simulated) results from `overte_domain_status`, and Interface running for anything visual.

> [!IMPORTANT]
> **Deployment Node Status:** As of 2026-07-20, no Overte instance is installed anywhere in the fleet yet. Docker Desktop deployments on `Goliath` are on hold due to daemon instability; a migration to Podman is planned separately (see `podman-mcp`). Until Overte is installed, every tool call from this server will return `"source": "simulated"` labeled placeholder data — that's expected, not a bug.

---

## Step 1: Install Overte
1. Download and install Overte Client + Server for your system from [overte.org/downloads](https://overte.org/downloads.html).
2. Run the Overte Interface, which launches a local domain-server sandbox alongside it.
3. Open your browser to the admin console at `http://localhost:40100/settings`.
4. Set an administrator username/password there (fleet convention: `admin`/`admin`, since this is a local-only relaxed setup). `overte-mcp` needs these credentials to call the domain-server's Basic-Auth-protected `/nodes.json` and `/settings.json` endpoints.

---

## Step 2: Install Overte MCP

### 1. Clone the repository
```bash
git clone https://github.com/sandraschi/overte-mcp
cd overte-mcp
```

### 2. Scaffold virtual environment & install dependencies
Using `uv`:
```bash
uv sync
```
Or using standard pip:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

---

## Step 3: Run the Services

### Start the REST HTTP API Server (Dashboard connection)
```bash
uv run python -m overte_mcp.http_server
```
*Hosts the backend REST API on port `11110` (dashboard on `11111`). Prefer `.\start.ps1` / `start.bat` for both.*

### Start the Stdio MCP Server (IDE Agent connection)
```bash
uv run overte-mcp
```
*Handles stdio communication for connected AI assistants.*

### Add to Claude Desktop config
```json
"mcpServers": {
  "overte-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/overte-mcp", "run", "overte-mcp"]
  }
}
```
