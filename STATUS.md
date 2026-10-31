# Status — overte-mcp

**Status**: v0.2.0-beta. `overte_domain_status`, spawn and script inject were verified live on 2026-07-30 through an Interface-hosted bridge. **2026-10-31: headless bridge implemented** (bridge runs as a domain persistent script on an assignment-client, no GUI) and the simulated-success fallbacks were removed. Headless mode is verified against a protocol harness only; the live run against a real Overte domain is still pending (see "Headless bridge" below). FastAPI backend, React dashboard, Tauri 2.0 native wrapper.

**Repo**: `D:\Dev\repos\overte-mcp`
**Ports**: Backend 11110, Frontend 11111, Overte domain-server admin 40100
**Updated**: 2026-10-31

## Runtime

| Process | Command | Port |
|---------|---------|------|
| MCP gateway + dashboard API | `just serve` or `start.ps1` | 11110 / 11111 |
| Overte Domain Server | Overte `domain-server.exe` external | 40100 |
| Overte assignment-client (mixers, entity server, bridge agent) | `assignment-client.exe -n 9` | (UDP) |

Verify: `curl http://127.0.0.1:11110/api/health` or open `http://127.0.0.1:11111`

## Architecture

Overte Domain Server HTTP admin API (`/nodes.json`, `/settings.json`) + WebSocket bridge (`overte-mcp-bridge.js` loaded in-world) + Python FastAPI MCP gateway + React SPA dashboard.

## Headless bridge (2026-10-31)

**Problem.** Every in-world action went through `overte-mcp-bridge.js` loaded inside the
Overte desktop client, so nothing worked without a GUI session, and nothing could be
tested automatically. Separately, spawn, inject, avatar and domain status returned
`status: "success"` with invented data (`source: "simulated"`) when nothing was
connected; callers that only checked `status` believed entities existed.

**Fix.**
- The bridge (v2.0.0) runs as a domain *persistent script* on an assignment-client
  (agent mode). Overte's API docs list `Entities` and `WebSocket` as available to
  Assignment Client scripts. It detects its context, sends a `hello` with mode and
  `can_rez`, waits for the entity server, keeps a standing `EntityViewer` query and
  re-queries before searches/reads, and refuses avatar-relative calls with
  `no_avatar` / `position_required`.
- Backend serves it at `/bridge/overte-mcp-bridge.js` (WS URL rewritten to the serving
  host), reports it at `GET /api/overte/bridge`, and registers it in the domain settings
  via `POST /api/overte/bridge/install` (+ `/uninstall`). MCP tools
  `overte_bridge_status`, `overte_bridge_install`.
- Simulated success removed everywhere: 503 `bridge_not_connected`, 502
  `domain_unreachable`. Dashboard and entities page updated to match.
- Also fixed on the way: the MCP spawn tool dropped `parent_id`, `color`, `intensity`,
  `is_spotlight`, `falloff_radius` before reaching the backend; filtered `get_entity`
  reads (properties without `type`) were reported as not found.

**Verified (2026-10-31, in the Linux VM, not on Goliath):**
- `tests/unit`: 16 passed (tool impls, bridge route, 503s, install idempotency,
  WS round trip with a test-double bridge). Ruff clean.
- `tests/bridge_harness/run_harness.py`: 14/14. Runs the real bridge script under Node
  in a fake agent engine against the real backend. Found and fixed the filtered-read bug.

**Not verified yet (Goliath was at ~95% CPU / 92% RAM; Python took minutes to start):**
- `just e2e-headless` against the real Overte 2026.04.1 install. Open questions it
  answers: does the persistent-script agent get `can_rez` true; does posting
  `scripts.persistent_scripts` via `/settings.json` restart the domain-server and start
  the agent; does `WebSocket` to localhost work from the agent in practice; do
  `permanent=True` entities survive a restart.
- Windows `just test` (unit + e2e) on Goliath.
- Biome on the webapp edits (TypeScript `tsc -p tsconfig.app.json --noEmit` passed in the VM).

## MCP tools

| Tool | Status |
|------|--------|
| `overte_domain_status` | **Real & verified** (2026-07-30) — calls live domain-server at localhost:40100. `/nodes.json` returns `{"nodes":[...]}`, `/settings.json` returns full settings tree. |
| `overte_entity_spawn` | **Real & verified** (2026-07-30) — spawned Box entity in-world via WebSocket bridge. Supports `permanent=True` for cross-restart persistence. Returns `source: "live"` with real entity UUID. |
| `overte_script_inject` | **Verified live** (2026-07-30) — injected dance-script.js onto entity `{717ad8f1-...}` via WebSocket bridge. Entity bobs up/down + spins. |
| `overte_bridge_status` / `overte_bridge_install` | New 2026-10-31. Unit + protocol-harness tested; **not yet run against a live domain**. |

## Native app

| Artifact | Path |
|----------|------|
| NSIS installer | `native/target/release/bundle/nsis/Overte MCP_*_x64-setup.exe` |
| MCPB bundle | `dist/overte-mcp.mcpb` |

## Standards compliance

| Standard | Status | Notes |
|----------|--------|-------|
| `glama.json` | ✅ | Root |
| `llms.txt` + `llms-full.txt` | ✅ | Root |
| `justfile` | ✅ | 10 recipes |
| `start.ps1` + `start.bat` | ✅ | SOTA pattern with zombie kill, health poll, browser auto-open |
| Tauri NSIS build | ✅ | `native/build.ps1` full pipeline |
| CORS origins | ✅ | Tauri + Tailscale + LAN |
| Session context injection | ✅ | `.cursorrules` + `.claude-plugin/` |
| `AGENTS.md` | ✅ | Root — agent navigation map |
| `.env.example` | ✅ | Root — documented env vars |
| `STATUS.md` | ✅ | This file |
| `docs/` structure | ✅ | ONBOARDING, CONFIGURATION, DEVELOPMENT, ARCHITECTURE, TOOLS, WRAPPEE, TROUBLESHOOTING (retrofitted 2026-07-30) |

## Investigation findings (2026-07-30)

### Entity persistence
Domain-server has persistence enabled (`NoPersist: false`, `persistInterval: 30000ms`, `persistFilePath: models.json.gz`). However, entities spawned via the bridge default to temporary (lifetime in seconds). Only entities with `lifetime: -1` (permanent) are persisted to `models.json.gz`. **Fixed:** added `permanent` flag to `overte_entity_spawn`. Pass `permanent=True` to persist across restarts.

### VRM joint animation
Overte does NOT support VRM as a Model entity format. Supported formats: FBX, glTF, OBJ. VRM is an avatar-only format (loaded via .fst files). When loaded as a Model entity, `Entities.getJointNames()` returns 0 because VRM skeletal data is stored in glTF extensions that the entity pipeline doesn't parse. **Fixed:** Created Blender VRM→GLB conversion pipeline (`scripts/vrm_to_glb_converter.py`). Nekomimi-chan GLB (11.6 MB) with full armature + embedded textures hosted at `http://localhost:11110/models/Nekomimi-chan.glb`. Uses GLB instead of FBX because VRM is built on glTF — FBX loses MToon shader textures.

### World Labs scene
Three assets downloaded from Marble CDN and served at `/models/`:

| File | Size | Use in Overte |
|------|------|---------------|
| `contemporary-living-room.glb` | 4.3 MB | Collider mesh — spawn as Model entity for room geometry |
| `contemporary-living-room_pano.png` | 10.5 MB | 360 panorama — spawn as skybox sphere entity with texture |
| `contemporary-living-room_full.spz` | 66.8 MB | Full-res gaussian splat (NGSP v2). Needs SPZ→PLY→GLB conversion |

**SPZ→mesh — see correction below.** The file is SPZ v4 (NGSP-header), Niantic's documented open-source format, not an undocumented binary — Niantic's own `nianticlabs/spz` Python library (nanobind bindings) reads it directly. Workaround via SuperSplat editor is no longer needed; see the 3DGS pipeline section below for the real path.

### 3DGS pipeline

**Correction (2026-07-30): the "undocumented NGSP v2" claim below was wrong.**
"NGSP" is not gsplat's internal format — it's the magic bytes of **SPZ v4**,
Niantic's official open-source (Apache 2.0/MIT) splat format
(github.com/nianticlabs/spz). Niantic ships an official Python library with
nanobind bindings for loading/saving `.spz` directly:

```
git clone https://github.com/nianticlabs/spz.git
cd spz
pip install .
```

This reads the Marble `.spz` file directly in Python — no SuperSplat-editor
GUI roundtrip needed. Output feeds straight into the existing
`scripts/ply_to_glb.py` Blender pipeline. Note: it's a C++ library with
Python bindings, not pure-Python — building on Windows needs a C++ toolchain
(MSVC Build Tools) and libz; confirm build succeeds on Goliath before relying
on it.

- ReshotAI `gaussian-splatting-blender-addon` installed at `extensions/user_default/gaussian_splatting_addon/`
- `scripts/ply_to_glb.py` — headless Blender PLY→GLB converter (uses the addon)
- `splat_to_glb_converter.py` — has `load_ply_to_splats()` for reading standard 3DGS PLY
- Dependencies: gsplat, scipy, trimesh, plyfile installed

### Dashboard SOTA pages
Chat, Settings, Tools, Skills, and Logs pages built and verified. TypeScript and Biome check clean. Production build passes (463 KB JS + 28 KB CSS). All pages have `data-testid` attributes for CUA/Playwright targeting.

## Remaining

- [ ] End-to-end: spawn Nekomimi-chan GLB with dance script in Overte, verify joints and textures work
- [ ] End-to-end: spawn contemporary-living-room panorama skybox + collider mesh in Overte
- [ ] SPZ→PLY: `pip install` Niantic's `nianticlabs/spz` Python library on Goliath (needs C++ toolchain + libz), decode the Marble `.spz` directly, feed output to `scripts/ply_to_glb.py` — no SuperSplat GUI roundtrip needed
- [ ] ~~NGSP parser: complete Python parser for the NGSP v2 binary format~~ — not needed, use Niantic's official library instead (see 3DGS pipeline section)
- [ ] **Run `just e2e-headless` on Goliath** (headless bridge live verification, includes the persistence check below). Then record the result here and in ASSESSMENT.md.
- [ ] Bridge stress-test (`scripts/bridge-stress-test.ps1`) against the headless bridge
- [ ] Verify world persistence: spawn with `permanent=True`, restart domain-server, confirm reload from `models.json.gz` (automated in `scripts/headless_e2e.py`)
- [ ] Explore Overte's own Create app (tablet Ctrl+E) — entity palette, lighting/sky controls, as a sanity check against what the MCP tools do programmatically

### Lower priority
- [ ] MCPB 3-4-100 prompt check — verify `system.md` (3k+ words), `user.md` (4k+), `examples.json` (100+ entries)
- [ ] CUA-NSIS smoke test — `just cua-nsis-test`
- [ ] Playwright e2e — verify webapp pages render with no console errors
- [ ] `glama.json` — update if publishing to the Glama registry

### Fixed since last pass
- Bridge auto-reconnect — fixed a QtScript compatibility issue (`Script.setTimeout` instead of the browser-standard timer API Interface's script engine doesn't support)
- `ARCHITECTURE.md` — rewritten; the previous version described a stale Vircadia-era architecture that no longer matched the real Overte-based implementation

### Explicitly out of scope
- Vircadia World / Bun-TypeScript compatibility
- Direct octree/UDP protocol parsing

## References
- Overte downloads: https://overte.org/downloads.html
- Overte docs: https://docs.overte.org
- Supported model formats: FBX, glTF, OBJ (NOT VRM for entities — see VRM joint animation note above)
- models depot: `D:\Dev\repos\avatar-mcp\models\` (Nekomimi-chan.vrm, AnimeGirl2.vrm)
- bridge script: `scripts/overte-mcp-bridge.js`
- dance script: `scripts/dance-script.js`
- Domain admin panel: http://localhost:40100/settings (admin/admin)
