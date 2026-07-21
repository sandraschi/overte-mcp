# Product Requirements Document (PRD) — Overte MCP

## 1. Introduction & Background
Overte is an open-source, decentralized social-VR and virtual world platform descended from High Fidelity (2019). The platform includes a desktop viewer client ("Interface"), a domain-server, and an entity-server. 

The **Overte MCP Server** provides a Model Context Protocol (MCP) interface and React web dashboard to bridge generative AI agents (like Cursor, Claude Desktop, and autonomous agents) directly with these virtual spaces. This allows AI assistants to programmatically explore worlds, spawn objects, and inject interactive JavaScript scripts to dynamically orchestrate virtual spaces.

---

## 2. Objectives & Scope
The core goal is to enable bidirectional telemetry and action between AI agents and local/remote Overte VR domains.

### In Scope
* **Domain Telemetry**: Retrieve live server settings, uptime, connected user nodes, and avatar status.
* **In-World Object Spawning**: Allow agents to spawn primitive shapes (Box, Sphere) or 3D meshes (GLB/FBX models) into the virtual scene.
* **Dynamic Scripting**: Allow agents to remotely inject JavaScript files and JSON metadata parameters into target entity behavior properties.
* **Stateful Script Bridge**: Maintain a local WebSocket relay server connecting the Python MCP host with an in-world Overte JavaScript bridge.
* **Web Dashboard**: Provide a visual monitoring page (FastAPI REST backend + Vite React client) for local server metrics and telemetry.

### Out of Scope
* Direct binary network protocol parsing of the Overte custom UDP/octree wire format in Python. We delegate in-world changes to the official JavaScript client API using our script bridge.
* Compatibility with the pivoted, Bun/TypeScript-based "Vircadia World" stack.

---

## 3. Key Use Cases
1. **AI World Builder**: An AI assistant is asked to "create a red box at my feet and attach a rotating script to it." The assistant calls the spawning tool, which places the box in-world via the active WebSocket bridge.
2. **Metaverse Monitor**: An admin queries the agent to "check the status of the local server and see if anyone is logged in." The agent calls `overte_domain_status` and prints live concurrency and uptime statistics.
3. **Interactive Script Injection**: An agent hot-swaps an entity's behavior by updating its `script` property to a web-hosted URL while attaching local configuration parameters in the entity's `userData`.

---

## 4. Functional Requirements

### FR-1: Domain Status Tool (`overte_domain_status`)
* **REST API Query**: Must fetch `/nodes.json` and `/settings.json` from the domain-server.
* **Authentication**: Must support optional Basic HTTP Authentication config.
* **Fallback Behavior**: Must gracefully fall back to a simulated dictionary structure indicating `source: "simulated"` if the server is offline or unreachable.

### FR-2: Stateful WebSocket Bridge (`/api/overte/ws`)
* **Connection Lifecycle**: Must support a long-lived WebSocket endpoint.
* **Message Delivery**: Must generate unique request IDs, enqueue async futures, dispatch commands to the JS client, and resolve on response or timeout (5.0s).
* **Robustness**: The JS client must automatically attempt reconnection with exponential backoff if the MCP server restarts.

### FR-3: In-World Spawning (`overte_entity_spawn`)
* **Bridge Redirection**: If a WebSocket client is active, delegate spawning to the virtual world and return `source: "live"`.
* **Properties**: Support name, type, position (X, Y, Z), and scale/dimensions.
* **Default Placement**: If position is not specified, place the object 2 meters in front of the user's avatar (`MyAvatar`).

### FR-4: Script Injection (`overte_script_inject`)
* **Attachment**: Attach a behavior script URL to an entity.
* **Metadata Scope**: Inject arbitrary parameter structures into the entity's `userData` field as JSON.

---

## 5. Non-Functional Requirements

### NFR-1: Standardized Ports
* Backend Services (REST / WS): Port `11110` (fleet registered).
* Frontend Dashboard Client: Port `11111` (fleet registered).

### NFR-2: CORS Whitelisting
* Must permit cross-origin requests from local, Tailscale, and LAN subnets matching:
  - `http://localhost:*`
  - `http://127.0.0.1:*`
  - `^https?://.*\.ts\.net(:[0-9]+)?$` (Tailnet)
  - LAN subnets (e.g. `192.168.*`, `10.*`).

### NFR-3: Dev Stack Launcher
* A unified `start.ps1` and `start.bat` launcher that:
  - Verifies presence of `uv`, `bun`, and python tools.
  - Clears zombie processes bound to ports `11110`/`11111`.
  - Starts the backend, polls `/api/health`, starts the Vite dev server, and opens the default browser.
