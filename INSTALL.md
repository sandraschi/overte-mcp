# 📥 Installing Vircadia & Vircadia MCP

Follow these steps to set up, install dependencies, and run the **Vircadia MCP Server** locally.

---

## 📋 Prerequisites
* **Python**: Python 3.12 or newer is required.
* **uv**: Astral's package manager (`uv`) is recommended.
* **Vircadia Sandbox (Local Domain Server)**: You must have a Vircadia Domain Server running. 

> [!IMPORTANT]
> **Deployment Node Status:** Run the Vircadia Domain Server **locally on your workstation (Local Sandbox)** for development. 
> Docker Desktop deployments on the server `Goliath` are currently **on hold** due to Docker Desktop daemon instability. A migration to a lightweight alternative (e.g. Podman) is planned.

---

## 🛠️ Step 1: Start the Vircadia Local Sandbox
1. Download and install the Vircadia package for your system from the [Vircadia Official Website](https://vircadia.com/).
2. Run the **Vircadia Server (Sandbox)** launcher.
3. Open your browser and navigate to the admin console at `http://localhost:40100`.
4. Set up your administrator credentials. The `vircadia-mcp` server will query this local port to communicate with the world.

---

## 🛠️ Step 2: Install Vircadia MCP

### 1. Clone the repository
```bash
git clone https://github.com/sandraschi/vircadia-mcp
cd vircadia-mcp
```

### 2. Scaffold virtual environment & install dependencies
Using `uv`:
```bash
# Initialize and sync python environment
uv sync
```
Or using standard pip:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

---

## 🛠️ Step 3: Run the Services

### Start the REST HTTP API Server (Dashboard connection)
```bash
uv run python -m src.vircadia_mcp.http_server
```
*Hosts the backend REST API on port `10989`.*

### Start the Stdio MCP Server (IDE Agent connection)
```bash
uv run vircadia-mcp
```
*Handles stdio communication for connected AI assistants.*
