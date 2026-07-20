# 📥 Installing Vircadia MCP

Follow these steps to set up, install dependencies, and run the **Vircadia MCP Server** locally.

---

## 📋 Prerequisites
* **Python**: Python 3.12 or newer is required.
* **uv**: Astral's package manager (`uv`) is recommended for fast dependency resolution.
* **Vircadia Domain**: You should have access to a local or remote Vircadia Domain Server with administrative privileges enabled on port `40100`.

---

## 🛠️ Step-by-Step Installation

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

### 3. Run the services
To start the REST HTTP API server:
```bash
uv run python -m src.vircadia_mcp.http_server
```

To run the Stdio MCP server (for IDE connection):
```bash
uv run vircadia-mcp
```
