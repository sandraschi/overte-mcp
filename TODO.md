# overte-mcp — TODO

## Done in v0.2.0 (2026-07-30)
- [x] Overte 2026.04.1 installed (Client + Server) on Goliath
- [x] `overte_domain_status` verified live against domain-server :40100
- [x] `overte_entity_spawn` verified live with VRM model via WebSocket bridge
- [x] `overte_script_inject` verified live with dance-script.js
- [x] Bridge autoreconnect fixed (`Script.setTimeout` for QtScript compat)
- [x] Tailwind CSS wired, webapp renders properly
- [x] start.ps1 fixed for PowerShell 5.1
- [x] Fleet pitfalls BUG-007 documented (Tailwind not wired)

## High priority
- [ ] **ARCHITECTURE.md rewrite** — currently stale vircadia doc, needs to reflect verified live architecture (domain-server :40100, WS bridge, VRM models, dance scripts, tool surface)
- [ ] **World persistence** — entities placed in Overte currently vanish on server restart. Need to configure domain-server to auto-save entities or export/import world JSON
- [ ] **Investigate VRM joint animation** — `Entities.getJointNames()` returned 0 joints for VRM entity. Does Overte support VRM skeletal animation on Model entities? Might need FBX format instead
- [ ] **World Labs GLB import** — test converting a World Labs scene to GLB and loading as Model entity in Overte

## Medium priority
- [ ] **Bridge stress-test** — multiple rapid backend restarts, verify exponential backoff works (1s → 2s → 4s → ... up to 30s)
- [ ] **Dashboard SOTA pages** — Chat, Settings, Tools, Skills, Logs were reverted to original 5 pages. Rebuild properly if wanted
- [ ] **Nekomimi-chan v2** — if skeletal animation works, create a more expressive dance with hip sway, arm waves, head tilts using actual joint rotations
- [ ] **Explore Overte world building** — learn the Edit mode (Ctrl+E), entity palette, lighting/sky controls, terrain tools

## Low priority
- [ ] **MCPB 3-4-100 prompts** — verify system.md (3k+ words), user.md (4k+ words), examples.json (100+ examples)
- [ ] **CUA-NSIS smoke test** — verify `just cua-nsis-test` passes
- [ ] **Playwright e2e tests** — verify webapp pages render without console errors
- [ ] **glama.json** — update for Glama registry if publishing there

## References
- Overte downloads: https://overte.org/downloads.html
- Overte docs: https://docs.overte.org
- models: `D:\Dev\repos\avatar-mcp\models\` (Nekomimi-chan.vrm, AnimeGirl2.vrm)
- bridge script: `scripts/overte-mcp-bridge.js`
- dance script: `scripts/dance-script.js`
- Domain admin panel: http://localhost:40100/settings (admin/admin)
