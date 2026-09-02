# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-09-02

### Added (model + texture depots, backup/restore, entities UI wiring)
- **Model depot**: `GET/POST /api/overte/models`, `GET/PUT/DELETE /api/overte/models/{name}`,
  binary upload (glb/gltf/fbx/obj), manifest.json metadata (description/category), static
  serve at `/models/{name}`. Supersedes the old passive `/models` static-only mount (no
  manifest, no CRUD) that predated this. One-time reconciliation back-fills manifest entries
  for the two GLBs that already existed on disk (Nekomimi-chan, the living-room scene) so
  they show up instead of the depot looking empty.
- **Texture depot**: same CRUD shape at `/api/overte/textures`, restricted to png/jpg/jpeg
  (the two formats apidocs.overte.org confirms; KTX unconfirmed, not allowed pending a real
  test). Static serve at `/textures/{name}`.
- **Backup/restore**: `POST /api/overte/backup` zips the scripts/models/textures depots +
  tracked-entities list into `data/backups/<timestamp>.zip`; `GET /api/overte/backups` lists
  them; `POST /api/overte/backups/{name}/restore` restores (overwrites matching files only,
  doesn't delete anything the backup doesn't mention). Live round-trip tested: uploaded a
  texture, backed up, deleted the texture, restored, confirmed it came back with its original
  metadata intact. Local to this server only - does not touch the Overte domain-server's own
  world persistence. `data/backups/` gitignored (regenerable, and can get large).
- **Webapp**: new Model Depot, Texture Depot, and Backups pages (upload/list/delete/copy-URL;
  texture page shows thumbnails). `entities.tsx` gained the delete/move/animate UI that was
  missing despite the backend already supporting it, plus a live "Nearby" search panel
  (queries the real world via `overte_nearby_entities`, not just this backend's own
  spawn-tracking memory like the existing entity list). Full spawn→move→animate→delete cycle
  browser-tested end to end, zero console errors, tsc/biome clean.
- No MCP tool wrappers added for models/textures/backups - matches the existing precedent
  that the scripts depot is also REST+webapp-only, no `@mcp.tool` equivalents.

### Added (capability exploration: shapes, particles, textures, real bounce)
- `extra_properties: dict | None` escape hatch on `EntitySpawnInput`/`EntityUpdateInput` -
  merged into the properties dict verbatim. Needed because Overte has far more entity
  properties (shape, particle emission, textures, ...) than are worth dedicated Pydantic
  fields for each.
- `get_entity` bridge command now accepts an optional custom `properties` list from the
  caller (`GET /api/overte/entity/{id}?properties=a,b,c` or `?properties=all`) instead of a
  fixed hardcoded set - needed to inspect `textures`/`shape`/particle fields.
- **Correction**: earlier claimed "Overte has no cylinder primitive" - wrong. Live-verified:
  `type="Shape"` entities support a `shape` property with Cylinder, Dodecahedron (also
  tested), and per Overte's documented enum also Cone/Icosahedron/Octahedron/Tetrahedron/
  Torus/etc. `FIXTURE_PRESETS`' comment corrected.
- **Verified live**: `textures` is a real, settable, persisting property on Model entities
  (tested on the spawned Nori A3 - wrote a JSON material-override string, read it back
  unchanged; visual effect unconfirmed since the guessed material-slot name almost certainly
  doesn't match the model's real ones). `ParticleEffect` entities work (spawned a flame-like
  emitter: `isEmitting`, `emitRate`, `color`, `alpha`, `particleRadius`,
  `emitAcceleration` all accepted and read back correctly) - fog/smoke/sparkle would use the
  same entity type with different presets, not yet built.
- `overte_entity_animate` gained a `bounce` mode: real drop-and-rebound physics (position as
  a closed-form function of elapsed time within the current bounce segment, energy loss via
  `damping` per landing) rather than `bob`'s constant-period sine wave. Verified numerically
  before running live (peak heights decay geometrically, settles instead of bouncing
  forever) and live-tested on a spawned ball fixture (59 ticks over 6s, no errors).

### Changed (color default)
- `EntitySpawnInput.color` and `FixtureSpawnInput.color` now default to white `[1,1,1]`
  instead of `None`/hardcoded per-part presets, applied uniformly - `overte_entity_update`'s
  `color` stays `None`-default deliberately (an update with no color shouldn't reset one).
  Live-verified: a freshly spawned box read back `color: {red:255, green:255, blue:255}`.
- `FIXTURE_PRESETS` dropped its hardcoded per-part colors (table/chair were brown, ball
  orange) now that color is a request-time parameter instead.

### Added (fixture spawner)
- `overte_fixture_spawn` + `POST /api/overte/fixture` — one-call preset test fixtures for
  gripper/manipulation testing: `box`, `cup`, `ball`, `table`, `chair`. Box/Sphere primitive
  approximations sized for realistic grip-testing dimensions - Overte has no cylinder
  primitive and this doesn't fabricate fake model URLs for objects no GLB actually exists
  for. `table`/`chair` spawn as several independent Box parts (not parented - static
  set-dressing that never needs to move as a unit). No bridge-script change needed - reuses
  the existing `spawn` command. Omit `position` to place it in front of the local user's
  current facing direction (reuses the same avatar-relative math added for `get_avatar`).
  Live-verified: spawned `cup` and `table` successfully.

### Added
- `GET /api/overte/avatar` + a matching `get_avatar` bridge command in
  `scripts/overte-mcp-bridge.js` — queries the local user's real `MyAvatar.position`/
  `orientation` via the WebSocket bridge. Same live/simulated labeling discipline as every
  other endpoint. Found the need for this live: `overte_entity_spawn` only ever accepted an
  absolute world coordinate, and the bridge's own dead "spawn in front of user if no position
  given" fallback could never trigger because the backend always fills in a concrete
  `{x,y,z}` default before forwarding to the bridge — spawned entities landed at literal
  (2,0,2)-style coordinates unrelated to wherever the user's avatar actually was (in this
  case, off by roughly 2000 units on every axis). No teleport/position-set tool yet — this is
  read-only.
- `overte_entity_spawn`'s `scale`/`dimensions` no longer default to a forced `[1,1,1]` box —
  found live: dimensions stretches/squishes a model to fit that exact bounding box, it is not
  a uniform scale multiplier, so the previous default silently deformed every non-cubic
  model. Now omitted unless explicitly requested, letting Overte size the entity from the
  model's own natural dimensions.
- Real move/delete/animate/search capability — the bridge previously only knew how to create
  entities, so every correction meant spawning another copy on top of the last one:
  - `overte_entity_update` (+ `update` bridge command, `Entities.editEntity`) — move, resize,
    re-parent, or toggle visibility/intensity/color on an existing entity
  - `overte_entity_delete` (+ `delete` bridge command, `Entities.deleteEntity`)
  - `overte_entity_animate` (+ reuses `update`) — server-driven spin/bob loop on an entity,
    same pattern as `norirobotics-mcp`'s Resonite wave-demo script; blocks for `duration_s`
  - `overte_nearby_entities` (+ `find_nearby` bridge command, `Entities.findEntities`) —
    queries the *live world*, unlike `GET /api/overte/entities` which only ever reflected
    this server's own in-memory spawn-tracking dict
  - `get_entity` bridge command + `GET /api/overte/entity/{id}` — read one entity's live
    properties (needed by `animate` to read a starting position/rotation before looping)
- Light entities: `overte_entity_spawn`/`overte_entity_update` gained `parent_id` (Overte's
  `parentID` — pass `"MyAvatar"` to attach to the local user, e.g. a headlight), `color`
  (0.0-1.0 RGB, converted to Overte's 0-255 byte range at the boundary), `intensity`,
  `is_spotlight`, `falloff_radius`. `type="Light"` was already a valid Overte entity type
  (undocumented here until now) — no bridge change needed, `Entities.addEntity`/`editEntity`
  already forward arbitrary properties through.
- `tool_count` in `/api/health` and `/api/v1/diagnostics`, and the tool lists in `/api/tools`
  and `/api/v1/diagnostics`, were hardcoded at 4/3 tools and already stale before this pass
  (missing `overte_sampling_assist`); updated to the real 8.

## [0.2.1] - 2026-07-30

### Added
- Entity persistence: `permanent` flag on `overte_entity_spawn` sets `lifetime: -1` for cross-restart persistence
- GLB model serving: Nekomimi-chan GLB (11.6 MB) with full armature + embedded textures at `/models/Nekomimi-chan.glb`
- VRM->GLB conversion pipeline: `scripts/vrm_to_glb_converter.py` (headless Blender 4.4)
- SOTA dashboard pages: Chat (skill-first, 4 personalities, provider detection), Settings (health KPIs, LLM probes), Tools (dynamic discovery, search), Skills (markdown rendering), Logs (level filter, auto-refresh)
- `AGENTS.md` — per-repo agent navigation map
- `.env.example` — documented env vars
- `scripts/bridge-stress-test.ps1` — rapid restart lifecycle test
- `scripts/test_vrm_ext.py` — VRM addon loader for Blender
- World Labs Marble living room scene: collider GLB (4.3 MB), full SPZ splat (66.8 MB), panorama skybox (10.5 MB) at `/models/contemporary-living-room_*`
- `scripts/parse_ngsp.py` — NGSP v2 binary format parser for Marble SPZ files
- `scripts/ply_to_glb.py` — Blender headless PLY→GLB converter (uses ReshotAI 3DGS addon)
- `load_ply_to_splats()` in `splat_to_glb_converter.py` — reads standard 3DGS PLY files
- `models/README.md` — model depot documentation
- `scripts/inspect_spz.py` — SPZ binary format inspector

### Changed
- `ARCHITECTURE.md` — fully rewritten from stale vircadia-era doc to verified live architecture
- `glama.json`, `mcpb/manifest.json`, `README.md`, `STATUS.md` — all metadata updated to reflect all 3 tools verified live
- Dependencies: gsplat, scipy, trimesh, plyfile added for splat→mesh pipeline

### Fixed
- **VRM conversion: switched from FBX to GLB** — initial FBX export caused missing textures (MToon shader lost in FBX) and geometry clipped by stray Cube/Light/Camera objects (scene clear missed collections). GLB preserves MToon textures via glTF PBR material pipeline. Aggressive collection-level scene clear prevents object bleed.
- VRM skeletal investigation: Overte does NOT support VRM as Model entity format (FBX/glTF/OBJ only)
- Domain-server persistence: entities default temporary without explicit `lifetime`
- **SPZ splat→mesh blocked** — NGSP v2 is an undocumented binary format readable only by gsplat C++/CUDA. Workaround: use SuperSplat editor (https://superspl.at/editor) to convert SPZ→PLY, then `scripts/ply_to_glb.py` for GLB.

## [0.2.0] - 2026-07-30

### Added
- Tailwind CSS v4 wired (was missing — app rendered unstyled)
- SOTA webapp pages: Chat (skill-first, personalities, localStorage), Settings (LLM provider detection), Tools, Skills, Logs, Apps Hub
- Zustand LLM store with manual "Detect LLM" button (auto-probe removed — was causing connection pool exhaustion)
- Topbar with backend health dot (green/red)
- Sidebar collapse toggle at top (per SOTA standard)
- `overte_sampling_assist` tool with `ctx.sample()` fallback
- `GET /api/tools`, `/api/skills`, `/api/v1/diagnostics`, `/api/logs` endpoints
- Ring-buffer logger in backend
- BUG-007 documented in fleet pitfalls (Tailwind not wired)

### Fixed
- Bridge WebSocket `readyState` check: Overte QtScript engine doesn't have `WebSocket.OPEN` — hardcoded `1`
- Socket race condition: capture socket in `onmessage` closure for response
- `start.ps1`: removed `-NoNewWindow` parameter (PowerShell 5.1 incompatible)
- `start.ps1`: backend entry point uses `run_server.py` (not `-m` module)
- Zombie kill: retry loop for TIME_WAIT ports
- `api-base.ts`: use `127.0.0.1` not `localhost` (IPv6 resolution mismatch)
- Removed oxlint, keep Biome only

### Verified
- `overte_domain_status` — live against `domain-server.exe` on port 40100
- `overte_entity_spawn` — live via WebSocket bridge, entity `{42501700-...}` spawned in-world
- Overte 2026.04.1 installed on Goliath (Client + Server)

## [0.2.0-beta] - 2026-07-21

### Added
- Stateful **WebSocket Bridge** server at `/api/overte/ws` to connect FastAPI backend with in-world Overte environments.
- In-world script [overte-mcp-bridge.js](scripts/overte-mcp-bridge.js) for live entity spawn and JS behavior injection (reconnect with exponential backoff).
- Local domain-server verification for live `/nodes.json` + `/settings.json` on port `40100`.
- **MCPB (Claude Desktop) packaging**: `mcpb/` pack root, `scripts/build-mcpb-package.ps1`, `just mcpb-pack`, `.mcpbignore`, 3-4-100 prompts (`system.md` / `user.md` / `examples.json`), output `dist/overte-mcp.mcpb`.
- Fleet docs refresh: `INSTALL.md`, `ARCHITECTURE.md`, `PROJECT_PAGE.md`, `llms.txt`, new required `llms-full.txt`.

### Changed
- Refactored `overte_entity_spawn` and `overte_script_inject` to prefer local bridge/REST when connected, falling back to labeled simulated data when the bridge client is disconnected.

---

## [0.1.0-alpha] - 2026-07-20

### Changed
- Renamed project from stale `vircadia-mcp` to `overte-mcp` to focus on the active Overte VR lineage.
- Re-aligned service ports across the entire fleet to prevent conflicts with Vienna Life Assistant:
  - Backend API: port **11110**
  - Frontend Vite Dashboard: port **11111**
- Upgraded Python backend dependencies to **FastMCP 3.4.4+** and **prefab-ui 0.14.0**.
- Migrated Vite React dashboard frontend package manager from `npm` to `bun`.
- Implemented `/health` and `/api/health` endpoints returning uptime, Bound Port, and Git SHA metadata.
- Configured local CORS origin whitelist regex patterns according to `CORS_STANDARD.md` (supporting localhost, tailnets, and LAN domains).
- Created a robust startup launcher `start.ps1` with zombie-process killing, command prerequisite checking, and health status polling.
