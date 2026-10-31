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

## `overte_entity_update`

Moves, resizes, re-parents, or toggles an existing in-world entity. Live-only
(bridge required).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entity_id` | str | required | Target entity UUID |
| `position` | list[float] \| None | `None` | X, Y, Z translation coordinates |
| `dimensions` | list[float] \| None | `None` | X, Y, Z bounding-box dimensions in meters |
| `parent_id` | str \| None | `None` | Re-parent to a different entity/avatar UUID |
| `visible` | bool \| None | `None` | Show/hide without deleting |
| `intensity` | float \| None | `None` | Light entity brightness |
| `color` | list[float] \| None | `None` | RGB as 0.0-1.0 floats |

## `overte_entity_delete`

Permanently deletes an in-world entity. DESTRUCTIVE, no undo. Live-only.
Parameter: `entity_id` (required).

## `overte_entity_animate`

Loop-animates an entity in place: `spin` (continuous rotation), `bob`
(sinusoidal oscillation), or `bounce` (real drop-and-rebound physics with
per-landing energy loss, not a sine wave). Server-driven repeated WebSocket
updates, not a baked clip — this call blocks for `duration_s`. Live-only.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entity_id` | str | required | Target entity UUID |
| `mode` | str | `"spin"` | `spin`, `bob`, or `bounce` |
| `axis` | list[float] | `[0,1,0]` | Rotation axis for `spin` (normalized) |
| `speed` | float | `1.0` | Radians/second (`spin`), oscillations/second (`bob`), pace (`bounce`) |
| `amplitude` | float | `0.1` | Peak height above settled position, meters (`bob`/`bounce`) |
| `damping` | float | `0.6` | Energy retained per bounce, 0–1 (`bounce` only) |
| `duration_s` | float | `5.0` | How long to animate before stopping |
| `tick_hz` | float | `10.0` | Update rate over the bridge |

## `overte_nearby_entities`

Finds entities near a point by querying the live world
(`Entities.findEntities`), not just this server's own tracked-entity list.
Live-only.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `position` | list[float] \| None | `None` | Search center; omit to search around the local user |
| `radius` | float | `20.0` | Search radius in meters |

## `overte_fixture_spawn`

Spawns a preset gripper/manipulation test fixture: `box`, `cup`, `ball`,
`table`, or `chair`. Box/Sphere primitive approximations (Overte has no
cylinder primitive). Multi-part fixtures (table/chair) spawn as several
same-colored Box parts; their entity_ids are all in the response's
`data.entity_ids` list. Live-only.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fixture` | str | required | `box`, `cup`, `ball`, `table`, or `chair` |
| `position` | list[float] \| None | `None` | Omit to spawn in front of the local user's facing direction |
| `forward_distance` | float | `1.5` | Meters in front of the user when position is omitted |
| `name` | str \| None | `None` | Override the entity name |
| `color` | list[float] | `[1,1,1]` | RGB 0.0-1.0, applied to every part of a multi-part fixture |

## `overte_shutdown`

Orderly self-termination for agents and the fleet launcher. Responds
immediately, then exits the process ~500 ms later so depot writes and
in-flight jobs can flush. Parameter: `confirm` (must be `True`).
REST twin: `POST /api/shutdown`.

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
