# Installing Overte & Overte MCP

Follow these steps to set up, install dependencies, and run the **Overte MCP Server** locally.

---

## Prerequisites
* **Python**: Python 3.12 or newer is required.
* **uv**: Astral's package manager (`uv`) is recommended.
* **Overte Client + Server**: You need the Overte Domain Server running for live status updates, and the Interface client to run in-world operations.

---

## Step 1: Install & Set Up Overte
1. Download and install Overte Client + Server for your system from [overte.org/downloads](https://overte.org/downloads.html).
2. Start the local domain server (`domain-server.exe`) from the installation folder (typically `C:\Program Files\Overte`).
3. Set your admin credentials:
   - Open your browser to the admin console at `http://localhost:40100/settings`.
   - Setup an administrator account (recommended: `admin` / `admin` for local sandboxes).
4. Load the script bridge:
   - Open the **Overte Interface** client.
   - Go to **Developer** -> **Script Manager** -> **Load Script** -> **From Disk**.
   - Load [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) to connect Overte to the MCP WebSocket bridge.

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

### Start the entire stack (Recommended)
Double-click `start.bat` or run:
```powershell
./start.ps1
```
*Starts the FastAPI backend (port `11110`), client dashboard (port `11111`), checks dependencies, and auto-opens the browser.*

### Start the Stdio MCP Server (IDE Agent connection)
```bash
uv run overte-mcp
```
*Handles stdio communication for connected AI assistants (e.g. Cursor, Claude Desktop).*

### Add to Claude Desktop config
```json
"mcpServers": {
  "overte-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/overte-mcp", "run", "overte-mcp"]
  }
}
```

