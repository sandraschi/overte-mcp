# Overte World Building & Testing

You are helping a human build, test, and animate content in a live Overte world through
overte-mcp's MCP tools. This skill is task-oriented (how to accomplish things); see the
`overte-admin` skill for the full tool/architecture reference.

New 2026-09-02, alongside the `overte-admin` refresh.

## Before anything live: is the bridge connected?

Call `overte_bridge_status` first. Every tool below except `overte_domain_status` needs a
connected bridge. If none is connected, run `overte_bridge_install` (headless, needs the
domain-server and an assignment-client running) and poll `overte_bridge_status` until
`connected`. Without a bridge every tool fails with `bridge_not_connected`; nothing is ever
simulated.

In headless (`agent`) mode there is no avatar: always pass `position` to spawn and
fixture calls, and do not parent to `"MyAvatar"`.

## Recipe: spawn and light a scene

1. `overte_entity_spawn(name="Table", entity_type="Box", position=[0,0,-3], scale=[1.2,0.05,0.6], color=[0.4,0.25,0.1])`
2. `overte_entity_spawn(name="Lamp", entity_type="Light", position=[0,1.2,-3], color=[1,0.9,0.7], intensity=2.0, is_spotlight=False)`
3. Read back each response's `data.entity_id` for use in later steps.

## Recipe: animate something

`overte_entity_animate` blocks for the whole `duration_s` while it runs - it is not
fire-and-forget.
- Spin a globe: `overte_entity_animate(entity_id=..., mode="spin", axis=[0,1,0], speed=1.5, duration_s=10)`
- Bob a light: `overte_entity_animate(entity_id=..., mode="bob", amplitude=0.15, speed=0.5, duration_s=8)`
- Drop a ball realistically: `overte_entity_animate(entity_id=..., mode="bounce", amplitude=0.4, damping=0.65, duration_s=8)` -
  this is closed-form drop physics (each landing loses energy, `damping` fraction of the
  previous height), not a repeating sine wave - it visibly settles instead of bouncing forever.

## Recipe: gripper/manipulation test fixtures

`overte_fixture_spawn(fixture="ball")` - `fixture` is one of `box`/`cup`/`ball`/`table`/
`chair`. Omit `position` to spawn it 1.5m in front of wherever the local user is currently
facing (tune with `forward_distance`); table/chair spawn as several same-colored Box parts,
not one merged mesh - if you need to move the whole thing later you'll need to move each part
(their entity_ids are all in the response's `data.entity_ids` list).

## Recipe: find what's already there

`overte_nearby_entities(radius=10)` searches around the local user by default (pass
`position` to search elsewhere) - this queries the live world via `Entities.findEntities`,
not just what this server itself has spawned this session, so it also finds entities anyone
else placed.

## Recipe: clean up

`overte_entity_update(entity_id=..., visible=False)` to hide without losing it, or
`overte_entity_delete(entity_id=...)` to permanently remove it - delete is DESTRUCTIVE and
has no undo.

## Models, textures, and backups: not MCP tools

There is no `overte_model_spawn` or `overte_backup` MCP tool. Model/texture depot management
and backup/restore only exist via the REST API (port 11110) and the React dashboard
(`http://localhost:11111`) - point a human user at the dashboard's Models/Textures/Backups
pages rather than trying to do this through an MCP tool call. See `overte-admin`'s REST
endpoint list if you need the raw routes.

## Common mistakes to avoid
- Passing `scale` on `overte_entity_spawn` for a Model entity expecting it to act like a
  uniform size multiplier - it's a bounding-box target, so a non-cubic model gets
  stretched/squished to fit, not scaled proportionally.
- Forgetting `overte_entity_animate` blocks - don't call it and then immediately try to
  interact with the entity in the same turn; wait for the response.
- Overte-mcp has no simulated mode: every in-world tool either does the real thing
  (`source: "live"`) or fails with `bridge_not_connected` / `domain_unreachable`.
  A failed call means the object does not exist in-world - never treat it as placed.
