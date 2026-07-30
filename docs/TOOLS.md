# Tool Reference

All tools return a `source` field: `"live"` (real Overte data/action) or
`"simulated"` (no domain-server/bridge reachable — placeholder data for
UI/tool-shape testing, always accompanied by a `warning` field explaining
what's needed to go live). No tool ever returns fake-looking success without
this label.

## `overte_domain_status`

Queries a running Overte domain-server's HTTP admin API for connected-node
telemetry and settings.

**Status**: Verified live (2026-07-30) against Overte 2026.04.1.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` | str | `"localhost"` | Domain-server host |
| `port` | int | `40100` | Domain-server admin port |
| `username` | str \| None | `None` | HTTP Basic Auth username |
| `password` | str \| None | `None` | HTTP Basic Auth password |

Hits `GET /nodes.json` and `GET /settings.json`. A 401 response is surfaced
as a clear auth error (not silently swapped for simulated data) — pass
matching credentials or check `http://{host}:{port}/settings`.

## `overte_entity_spawn`

Spawns an entity (Box, Sphere, Web, or Model) in-world via the WebSocket
bridge running inside a connected Interface client.

**Status**: Verified live (2026-07-30) — spawned a real Box entity, confirmed
in-world.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | str | required | Entity name |
| `type` | str | `"Box"` | `Box`, `Sphere`, `Web`, or `Model` |
| `position` | list[float] | `[0,0,0]` | X, Y, Z coordinates |
| `scale` | list[float] | `[1,1,1]` | X, Y, Z dimensions |
| `model_url` | str \| None | `None` | GLB/FBX resource URL when `type="Model"` |
| `script_url` | str \| None | `None` | JS behavior script to attach on spawn |
| `permanent` | bool | `False` | If `True`, sets `lifetime=-1` so the entity survives a domain-server restart. Default spawns are temporary. |

Requires `scripts/overte-mcp-bridge.js` loaded in a running Interface client
(Developer → Script Manager → Load Script → From Disk) and the overte-mcp
backend running so the bridge's WebSocket has something to connect to. Falls
through to a labeled `simulated` response if no bridge client is connected.

## `overte_script_inject`

Attaches a JavaScript entity-behavior script to an existing in-world entity.

**Status**: Verified live (2026-07-30) — injected a dance script onto a real
entity, confirmed it animates.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entity_id` | str | required | Target entity UUID |
| `script_url` | str | required | JavaScript behavior script URL |
| `script_data` | dict | `{}` | Metadata/parameters injected into the script's scope |

Same bridge dependency as `overte_entity_spawn` — same simulated fallback if
no bridge client is connected.

## `overte_sampling_assist`

Multi-step planning helper via `ctx.sample()` when the MCP host supports
sampling. Read-only; returns a static plan when sampling isn't available.
Not yet independently verification-tracked in `STATUS.md` — treat as
best-effort.

## Why entity/script tools need a bridge at all

Overte's entity-server speaks an internal octree protocol — there's no
"POST an entity" endpoint on the domain-server admin API. The only two ways
to create or modify in-world entities are through Interface's JavaScript API
(`Entities.addEntity()`, `Entities.editEntity()`) or a headless Assignment
Client running the same API. This repo implements the former via
`scripts/overte-mcp-bridge.js` — see `ARCHITECTURE.md` for the full
WebSocket bridge protocol (command/response JSON shapes, reconnect
behavior).
