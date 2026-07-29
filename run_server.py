"""PyInstaller entry point — starts the HTTP/uvicorn server."""
import os
import sys

sys.path.insert(0, "src")

import uvicorn

from overte_mcp.http_server import app

port = int(os.getenv("MCP_PORT") or os.getenv("PORT") or "11110")
host = os.getenv("MCP_HOST", "127.0.0.1")
uvicorn.run(app, host=host, port=port, log_level="info")
