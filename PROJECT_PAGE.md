# Overte MCP Project Page

This document serves as the project dashboard, design specification, and task tracker for the **Overte MCP Server** integration in the fleet.

---

## High-Level Purpose & Mission
Overte MCP provides a standardized Model Context Protocol (MCP) bridge into **Overte**, the actively-developed open-source fork of the original Vircadia/High Fidelity social-VR architecture. It enables AI agents to query domain-server telemetry now, with entity spawning and in-world scripting planned once a WebSocket bridge exists (see `ARCHITECTURE.md`).

**2026-07-20: repo renamed from `vircadia-mcp` to `overte-mcp`.** Current Vircadia has pivoted to an unrelated stack ("Vircadia World" — PostgreSQL/Bun/Docker, positioned as game backend infra, not social VR). Overte is the actual continuation of the classic avatar/entity/domain-server architecture this project targets. See `README.md` for the full explainer. All tool names, package paths, and docs have been updated accordingly; the domain-server client was also rewritten against Overte's real `/nodes.json`/`/settings.json` admin API instead of the previous invented `/status` endpoint.

---

## Platform Architecture & Deployment Options

Overte runs a domain-server model to coordinate physics, avatars, and audio spatialization.

### 1. Primary Path: Local Sandbox (Recommended for Dev)
* **What it is**: The native Overte domain-server launched directly alongside the Interface client.
* **Ports**: Admin dashboard runs at `http://localhost:40100/settings`.
* **Current Status**: **Not yet installed anywhere in the fleet.** This is the immediate next step before any "live" tool path can be verified.

### 2. Secondary Path: Remote Server Deployment (Goliath)
* **What it is**: Hosting an Overte domain-server on the workstation `Goliath`.
* **Current Status**: **On hold.** Docker Desktop on Goliath has recurring daemon instability; a migration to a lighter engine (Podman — see `podman-mcp`) is planned before attempting this.

---

## Tool Integration Scope

### Domain Management (`tools/domain.py`) — real, unverified
* Query connected nodes (avatar-mixer, entity-server, audio-mixer, etc.) and settings from `/nodes.json` + `/settings.json`.
* HTTP Basic Auth support (fleet default `admin`/`admin` for local dev).

### Entity Spawning (`tools/entities.py`) — simulated only
* No REST equivalent exists in Overte. Returns clearly-labeled fake data pending the WebSocket bridge.

### JavaScript Injection (`tools/scripting.py`) — simulated only
* Same limitation as entity spawning.

---

## Development Roadmap

- `[x]` **Phase 1: Project Scaffolding** — done under the old `vircadia-mcp` name.
- `[x]` **Phase 2: Rename & re-scope to Overte** — package, tools, docs, tests updated 2026-07-20; domain-server client rewritten against real endpoints.
- `[ ]` **Phase 3: Install Overte locally and verify `overte_domain_status` against a real domain** — the actual next step, blocking everything below.
- `[ ]` **Phase 4: Build the Assignment Client WebSocket bridge** for real entity spawn/script inject (see `ARCHITECTURE.md`).
- `[ ]` **Phase 5: Webapp Dashboard** — Entity Tree Explorer and JS scripting editor, once there's real data to show.
- `[ ]` **Phase 6: Lightweight Container Migration** — deploy the domain-server on Goliath via Podman once `podman-mcp` migration lands.
