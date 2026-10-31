# Tool Reference

There is no simulated mode (removed 2026-10-31). A tool either does the real thing
(`source: "live"`) or fails with a reason: `bridge_not_connected` (no bridge),
`domain_unreachable` (no domain-server), `position_required` (headless bridge and no
position given), `cannot_rez` (domain forbids the bridge to create entities), or a 401
auth error.

The bridge runs headless as a domain persistent script (mode `agent`, set up with
`overte_bridge_install`) or inside the desktop Interface client (mode `interface`).

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

Hits `GET /nodes.json` and `GET /settings.json`. A 401 is a clear auth error; no
domain-server answering is `domain_unreachable` (previously placeholder nodes were
returned with `source: "simulated"`).

## `overte_bridge_status`

Reports whether a bridge is connected and how: `{"connected": bool, "bridge":
{"mode": "agent" | "interface", "version", "can_rez", "has_avatar", ...},
"script_url": str}`. No parameters.

## `overte_bridge_install`

Registers the bridge as a domain persistent script so an assignment-client runs it
headless. Reads the domain's `/settings.json`, appends
`{"url": <script_url>, "num_instances": 1, "pool": ""}` to
`scripts.persistent_scripts` if missing, posts it back. Idempotent (`changed: false`
when already present). The domain-server restarts to apply it; then poll
`overte_bridge_status`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `script_url` | str \| None | backend `/bridge/overte-mcp-bridge.js` | URL the domain fetches the bridge from |

Admin credentials come from `OVERTE_ADMIN_USER` / `OVERTE_ADMIN_PASSWORD` (default
admin/admin). REST: `POST /api/overte/bridge/install`, `POST
/api/overte/bridge/uninstall`.

## `overte_entity_spawn`

Spawns an entity (Box, Sphere, Web, Model or Light) in-world through the connected
bridge (headless agent or Interface). Returns the real `entity_id`.

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

Requires a connected bridge. Headless (agent mode) has no avatar, so pass a
position; `parent_id="MyAvatar"` only works with an Interface bridge. Without a bridge
the call fails with `bridge_not_connected`; it never returns an invented entity.
`parent_id`, `color`, `intensity`, `is_spotlight` and `falloff_radius` are now
forwarded (the MCP tool used to drop them before reaching the backend).

## `overte_script_inject`

Attaches a JavaScript entity-behavior script to an existing in-world entity.

**Status**: Verified live (2026-07-30) — injected a dance script onto a real
entity, confirmed it animates.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entity_id` | str | required | Target entity UUID |
| `script_url` | str | required | JavaScript behavior script URL |
| `script_data` | dict | `{}` | Metadata/parameters injected into the script's scope |

Same bridge dependency as `overte_entity_spawn`; fails with `bridge_not_connected`
when there is none.

## `overte_sampling_assist`

Multi-step planning helper via `ctx.sample()` when the MCP host supports
sampling. Read-only; returns a static plan when sampling isn't available.
Not yet independently verification-tracked in `STATUS.md` — treat as
best-effort.

## Why entity/script tools need a bridge at all

Overte's entity-server speaks an internal octree protocol; the domain-server admin API
cannot create entities. Entity work must run in an Overte script engine. This repo's
bridge (`scripts/overte-mcp-bridge.js`) runs either as a headless agent on an
assignment-client (primary) or inside Interface. See `ARCHITECTURE.md` for the
protocol and agent-mode details.
