# Configuration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `11110` | Backend service port |
| `MCP_PORT` | `11110` | MCP host port for dual-transport (set by Tauri `backend.rs` at spawn) |
| `MCP_HOST` | `127.0.0.1` | MCP host bind address |
| `SERVER_API_URL` | `http://127.0.0.1:11110` | HTTP daemon URL the stdio proxy probes on startup — see [ARCHITECTURE.md](ARCHITECTURE.md)'s dual-transport section |

Copy `.env.example` to `.env` and edit as needed.

## Overte domain-server connection

Not an env var — passed per-call to `overte_domain_status`:

| Field | Default | Description |
|-------|---------|-------------|
| `host` | `localhost` | Domain-server host |
| `port` | `40100` | Domain-server admin port |
| `username` | none | HTTP Basic Auth username |
| `password` | none | HTTP Basic Auth password |

Local sandbox convention is `admin`/`admin`, set at
`http://localhost:40100/settings` the first time you run the domain-server.

## Ports (fixed, fleet-registered — don't change)

| Service | Port |
|---------|------|
| FastAPI backend + bridge WebSocket | `11110` |
| Vite dashboard | `11111` |
| Overte domain-server admin | `40100` |

## Claude Desktop config

```json
{
  "mcpServers": {
    "overte-mcp": {
      "command": "uv",
      "args": ["--directory", "D:/Dev/repos/overte-mcp", "run", "overte-mcp"],
      "env": {
        "PYTHONPATH": "D:/Dev/repos/overte-mcp/src",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```
