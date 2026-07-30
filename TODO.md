# overte-mcp — TODO

## Done
- [x] Overte 2026.04.1 installed (Client + Server) on Goliath
- [x] `overte_domain_status` verified live against domain-server :40100
- [x] `overte_entity_spawn` verified live with VRM model via WebSocket bridge
- [x] `overte_script_inject` verified live with dance-script.js
- [x] Bridge autoreconnect fixed (`Script.setTimeout` for QtScript compat)
- [x] Tailwind CSS wired, webapp renders properly
- [x] start.ps1 fixed for PowerShell 5.1
- [x] Fleet pitfalls BUG-007 documented (Tailwind not wired)
- [x] **ARCHITECTURE.md rewritten** — stale vircadia doc replaced with verified live architecture
- [x] **World persistence investigated** — domain-server configured with persistInterval=30s, but entities need `lifetime: -1` to be permanent. Added `permanent` flag to `overte_entity_spawn`.
- [x] **VRM joint animation investigated** — Overte does NOT support VRM as Model entity format. Supported formats: FBX, glTF, OBJ. VRM is avatar-only (FST pipeline). `getJointNames()` returns 0 because VRM glTF extensions are not parsed by entity pipeline.
- [x] **World Labs GLB feasibility confirmed** — glTF/GLB is supported as Model entity. Contemporary living room scene downloaded from Marble CDN: collider GLB (4.3 MB), panorama (10.5 MB), full SPZ splat (66.8 MB).
- [x] **Nekomimi-chan VRM→GLB conversion** — Blender VRM→GLB pipeline with embedded textures and full armature. GLB (11.6 MB) served at `/models/Nekomimi-chan.glb`.
- [x] **Dashboard SOTA pages** — Chat, Settings, Tools, Skills, Logs built and verified (TypeScript, Biome, Vite build all pass)
- [x] **3DGS pipeline** — ReshotAI Blender addon installed, `scripts/ply_to_glb.py`, `load_ply_to_splats()` reader, dependencies (gsplat, scipy, trimesh, plyfile)
- [x] **Model depot** — `models/README.md` documenting all assets and conversion pipelines

## High priority
- [ ] **End-to-end: spawn Nekomimi-chan GLB with dance script** — test joint animation in Overte Interface.
- [ ] **End-to-end: spawn contemporary-living-room** — panorama skybox + collider mesh + SPZ→PLY→GLB pipeline.

## Medium priority
- [ ] **Bridge stress-test** — run `scripts/bridge-stress-test.ps1` while bridge is connected.
- [ ] **NGSP parser** — complete the Python NGSP v2 reader (blocked by undocumented binary format; needs gsplat C++ source).
- [ ] **Explore Overte world building** — use the Create app (tablet Ctrl+E), entity palette, lighting/sky controls.
- [ ] **Verify world persistence** — spawn with `permanent=True`, restart domain-server, confirm reload from `models.json.gz`.

## Low priority
- [ ] **MCPB 3-4-100 prompts** — verify system.md (3k+), user.md (4k+), examples.json (100+)
- [ ] **CUA-NSIS smoke test** — verify `just cua-nsis-test` passes
- [ ] **Playwright e2e tests** — verify webapp pages render without console errors
- [ ] **glama.json** — update for Glama registry if publishing there

## References
- Overte downloads: https://overte.org/downloads.html
- Overte docs: https://docs.overte.org
- Supported model formats: FBX, glTF, OBJ (NOT VRM for entities)
- SuperSplat editor: https://superspl.at/editor (SPZ→PLY conversion)
- models: `D:\Dev\repos\avatar-mcp\models\` (Nekomimi-chan.vrm, AnimeGirl2.vrm)
- bridge script: `scripts/overte-mcp-bridge.js`
- dance script: `scripts/dance-script.js`
- Domain admin panel: http://localhost:40100/settings (admin/admin)
