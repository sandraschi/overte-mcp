# Troubleshooting

## Every tool returns `source: "simulated"`
**Cause**: No Overte domain-server and/or Interface bridge is reachable.
**Fix**: For `overte_domain_status`, confirm `domain-server.exe` is running
and reachable at the host/port you passed. For `overte_entity_spawn` /
`overte_script_inject`, confirm `scripts/overte-mcp-bridge.js` is loaded in
a running Interface client (Developer → Script Manager → Load Script → From
Disk) and the overte-mcp backend is running on port `11110`.

## `overte_domain_status` returns a 401 error
**Cause**: Basic Auth credentials don't match what's set on the
domain-server.
**Fix**: Pass `username`/`password` matching the account created at
`http://localhost:40100/settings`. Local sandbox convention is `admin`/
`admin`.

## Dashboard loads but looks completely unstyled
**Cause**: Historical bug (fixed 2026-07-30) — Tailwind CSS was used
throughout the webapp components but never installed or wired into the Vite
build.
**Fix**: If you're on an old clone, `git pull`, then `cd webapp; bun install`
to pick up the `tailwindcss`/`@tailwindcss/vite` devDependencies, then
restart. If it recurs, check `webapp/package.json` devDependencies,
`webapp/vite.config.ts`'s plugin list, and `webapp/src/index.css`'s
`@import "tailwindcss";` line.

## Entity spawns (`source: "live"`) but I don't see it in Interface
**Cause**: Spawned entities default to `Box` at `[0,0,0]` — you may be
looking somewhere else, or the entity is small/far from your avatar's spawn
point. Also check the entity isn't temporary and already expired (see next
item).

## Entity disappeared after restarting the domain-server
**Cause**: Entities are temporary by default (`lifetime` in seconds, not
persisted). Only entities with `lifetime: -1` are written to
`models.json.gz`.
**Fix**: Pass `permanent=True` to `overte_entity_spawn`.

## VRM avatar loads but has no working joints/animation
**Cause**: Overte does not support VRM as a Model entity format (only FBX,
glTF, OBJ). VRM skeletal data lives in glTF extensions the entity pipeline
doesn't parse, so `Entities.getJointNames()` returns 0.
**Fix**: Convert VRM → GLB with `scripts/vrm_to_glb_converter.py` (Blender
pipeline, preserves armature + MToon textures) and spawn the GLB as a Model
entity instead. Or load the VRM as an avatar via an `.fst` file rather than
as a Model entity.

## Bridge keeps disconnecting / reconnect seems stuck
**Cause**: Interface's QtScript engine doesn't support the browser-standard
timer API — the bridge uses `Script.setTimeout` for reconnect scheduling
(fixed after an earlier compatibility bug).
**Fix**: Confirm you're running a current `scripts/overte-mcp-bridge.js` from
this repo, not an older cached copy inside Interface's script cache.

## `.spz` (Gaussian splat) file won't load / no reader available
**Cause**: this was previously misdiagnosed as "undocumented NGSP v2 binary
format" — that was wrong. The file is SPZ v4, Niantic's official
open-source splat format; "NGSP" is just its magic-byte header.
**Fix**: `git clone https://github.com/nianticlabs/spz.git && cd spz && pip
install .` — this needs a C++ toolchain (MSVC Build Tools) and libz since
it's C++ with Python bindings, not pure Python. Decode directly, then feed
output into `scripts/ply_to_glb.py`. See `STATUS.md`'s 3DGS pipeline section.
