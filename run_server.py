import os,sys;sys.path.insert(0,"src")
port=int(os.getenv("MCP_PORT")or os.getenv("PORT")or "11110")
import uvicorn;from overte_mcp.http_server import app
uvicorn.run(app,host=os.getenv("MCP_HOST","127.0.0.1"),port=port,log_level="info")
