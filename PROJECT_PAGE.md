# 🌐 Vircadia MCP Project Page

This document serves as the project dashboard, design specification, and task tracker for the **Vircadia MCP Server** integration in the multi-agent builder and inhabit fleet.

---

## 🎯 High-Level Purpose & Mission
Vircadia MCP provides a standardized Model Context Protocol (MCP) bridge into **Vircadia** (and the **Vircadia World** agent-based metaverse ecosystem). It enables AI agents to interact with decentralized virtual worlds, query domain status, spawn 3D assets, and hot-reload JavaScript scripting logic directly into in-world entities.

---

## 🏢 Platform Architecture & Deployment Options

Vircadia runs a decentralized **Domain Server** model to coordinate physics, avatars, and audio spatialization. 

### 1. Primary Path: Local Sandbox (Recommended for Dev)
* **What it is**: The native Vircadia Sandbox server launched directly alongside the client interface.
* **Ports**: Admin dashboard runs at `http://localhost:40100`.
* **Stability**: Highly stable, runs on the local PC thread, and avoids virtual network overhead.
* **Current Status**: **Active**. This is the primary target for development and testing of the `vircadia-mcp` tools.

### 2. Secondary Path: Remote Server Deployment (Goliath)
* **What it is**: Hosting Vircadia Domain Server on the workstation `Goliath`.
* **Current Status**: **On Hold**. Docker Desktop daemon on Goliath experiences recurring instability (daemon crashes). 
* **Next Steps**: A migration plan to transition to a lightweight, stable container engine (such as Podman or native WSL2 Linux Docker daemon) will be designed in a separate phase. Do not attempt Dockerization on Goliath until this migration is resolved.

---

## 🛠️ Tool Integration Scope

### 🛰️ Domain Management (`tools/domain.py`)
* Query uptime, world coordinates, and configurations of local/remote domains.
* Inspect active users and retrieve their avatar UUIDs and spatial positions.

### 📦 Entity Spawning (`tools/entities.py`)
* Inject 3D meshes (GLB/FBX format), primitive shapes, and spatial audio points.
* Track entity bounding boxes and translation states.

### 📜 JavaScript Injection (`tools/scripting.py`)
* Remotely assign ES6 JavaScript behavior URLs to in-world objects.
* Trigger hot-reloads of entity behavior to update logic dynamically without server restarts.

---

## 🗓️ Development Roadmap

- `[x]` **Phase 1: Project Scaffolding**
  - Scaffold project files (`pyproject.toml`, FastAPI server, models, main README stack).
  - Initialize git repository and perform initial commit.
- `[ ]` **Phase 2: Local Domain Client Integration**
  - Implement actual HTTP queries using `httpx` to connect to local Sandbox API (`http://localhost:40100`).
  - Write test suites asserting status queries against running Sandbox instances.
- `[ ]` **Phase 3: Webapp Dashboard**
  - Build a React-based web interface under `webapp/` featuring an Entity Tree Explorer and a JavaScript scripting editor.
- `[ ]` **Phase 4: Lightweight Container Migration**
  - Select and deploy a lightweight container runner (e.g. Podman) on Goliath and move the domain server there.
