# 🛰️ Vircadia MCP & Dashboard

**Talk to your decentralized, agent-based virtual worlds.**

Vircadia MCP is a Model Context Protocol (MCP) server and telemetry dashboard tailored for **Vircadia** (and the new **Vircadia World** agent-based metaverse ecosystem). It enables AI assistants to query domain servers, spawn objects, and inject JavaScript scripts into virtual entities dynamically.

---

## ✨ Key Features

* 🤖 **Agent-First Design**: Native compatibility with the Vircadia World agent ecosystem, allowing AI agents to interact with virtual spaces.
* 🌐 **Domain Telemetry**: Monitor self-hosted domains, check user concurrency, and gain controls for active avatars.
* 📦 **Real-Time Spawning**: Instantly inject 3D models (GLB/FBX), primitive shapes, and web assets into your active world.
* 📜 **JS Script Injection**: Remotely modify and attach standard ES6 JavaScript behaviors directly into virtual world entities.
* 🎨 **Federated Caching**: Syncs with standard caching directories (`~/.avatarmcp/`) to share VRM and GLB files with sister servers (like `resonite-mcp` and `vrchat-mcp`).

---

## ⛩️ Quick Start

### 1. Configure in-world parameters
Ensure your self-hosted Vircadia Domain Server is running and accessible (default port `40100` for REST administration).

### 2. Start the REST API and Stdio Server
Install dependencies and run the server using `uv`:
```bash
git clone https://github.com/sandraschi/vircadia-mcp
cd vircadia-mcp
uv pip install -e .
uv run vircadia-mcp
```

### 3. Add to your AI Agent Configuration (e.g. Claude Desktop)
Add this to your `claude_desktop_config.json`:
```json
"mcpServers": {
  "vircadia-mcp": {
    "command": "uv",
    "args": ["--directory", "D:/Dev/repos/vircadia-mcp", "run", "vircadia-mcp"]
  }
}
```

---

## 📚 Documentation Index

| Guide | Description |
| :--- | :--- |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | High-level data flow, REST endpoints, and domain scripting |
| **[INSTALL.md](INSTALL.md)** | Environment variables, local setup, and staging caches |

---

## 📈 Project Status
* **Status**: `v0.1.0-alpha` (Concept & Scaffolding).
* **Target Audience**: AI developers, self-hosted metaverse admins, and agent-builders.
* **License**: MIT Licensed. Made with care for the open metaverse.
