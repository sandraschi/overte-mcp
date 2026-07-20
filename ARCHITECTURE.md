# 🏛️ Vircadia MCP System Architecture & Protocols

This document maps out the system architecture, protocols, and data-flow pathways of the **Vircadia MCP Server**.

---

## 🗺️ High-Level System Architecture

Vircadia MCP bridges the gap between natural-language AI agents and decentralized Vircadia domains:

```
  ┌───────────────────────────────┐
  │         Client Tier           │
  │  - IDE/Chat AI (Stdio MCP)    │
  │  - React Dashboard (REST API) │
  └───────────────────────────────┘
                 │
                 ▼ [HTTP REST Commands / Port 10989]
  ┌───────────────────────────────┐
  │         Backend Tier          │
  │  - Python FastMCP Server      │
  │  - local HTTP Server          │
  └───────────────────────────────┘
                 │
                 ▼ [Domain REST Admin API / Port 40100]
  ┌───────────────────────────────┐
  │        In-World Tier          │
  │  - Vircadia Domain Server     │
  │  - Injected JavaScript Scripts│
  └───────────────────────────────┘
```

---

## 📡 Communication Protocols & Ports

| Protocol | Source | Destination | Default Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Stdio** | MCP Client | Python Backend | N/A | Tool registration and command execution |
| **HTTP (REST)** | React Webapp | Python Backend | `10989` | Dashboard telemetry, spawn calls, and script edits |
| **HTTP (REST)** | Python Backend | Vircadia Domain API | `40100` | Managing server users, querying state, and spawning entities |
| **ES6 JavaScript** | Vircadia Client | In-World Entities | N/A | Real-time object scripting and animation parameters |

---

## 📁 Workspace Directory Structure

* **`src/vircadia_mcp/`**: Core backend code.
  - **`tools/`**: Exposes domain, entities, and script injection functions.
  - **`models.py`**: Pydantic models mapping HTTP payloads.
  - **`server.py` & `http_server.py`**: Main MCP stdio and REST API entry points.
* **`README.md`**: Quickstart guide.
* **`ARCHITECTURE.md`**: Communication routing.
* **`INSTALL.md`**: Build dependencies and environments setup.
