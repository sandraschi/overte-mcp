# overte-mcp — Project Assessment

**Category**: MCP Server
**Assessment Date**: 2026-07-30
**Version**: v0.2.0-beta

---

## Summary

| Metric | Status |
|--------|--------|
| Overte install on Goliath | Done (2026.04.1, Client + Server) |
| `overte_domain_status` | Verified live against real domain-server |
| `overte_entity_spawn` | Verified live via WebSocket bridge (Box entity, in-world) |
| `overte_script_inject` | Verified live via WebSocket bridge (dance script, animates) |
| Entity persistence | Fixed — `permanent=True` sets `lifetime: -1` |
| Dashboard (webapp) | Renders correctly (Tailwind wiring bug fixed 2026-07-30) |
| `docs/` structure | Retrofitted 2026-07-30 (was entirely missing) |
| Native app (Tauri/NSIS) | Pipeline exists, not independently re-verified this pass |
| MCPB packaging | `mcpb/` pack root exists, `just mcpb-pack` |

**Overall**: Genuinely progressed from "plausible code, zero contact with
reality" to "core tools confirmed against a live Overte instance" over the
course of a few days. The pattern worth noting — and repeating — is that
every stale or overclaimed status found along the way got corrected in place
rather than left to compound (see Audit findings below).

---

## 2026-07-30 audit findings

### Fixed this pass
- **Stale top-line status** in `STATUS.md` claimed the bridge "still needs
  Interface client connection" while the tools table right below it said
  spawn/inject were both verified live. Corrected to match reality.
- **`ARCHITECTURE.md` dangling references** to `TODO.md` (deleted per repo
  convention — TODO folds into `STATUS.md`, not a separate file) and a stale
  "Known Issues" item claiming persistence was still broken after it had
  already been fixed.
- **`tools/domain.py`'s own docstring** still carried a "not yet verified,
  as of 2026-07-20" honesty note after the tool had since been verified live
  on 2026-07-30 — the kind of note that's valuable when true and actively
  misleading once it isn't updated.
- **NGSP/SPZ misdiagnosis**: `STATUS.md` described a downloaded `.spz`
  (Gaussian splat) asset as "NGSP v2, gsplat's internal compressed format,
  undocumented binary, no Python-level reader exists," recommending a manual
  SuperSplat-editor GUI workaround. This was wrong — "NGSP" is the magic-byte
  header of SPZ v4, Niantic's official, documented, open-source (Apache
  2.0/MIT) splat format, with an official Python library
  (`nianticlabs/spz`, nanobind bindings) that decodes it directly. Corrected
  in `STATUS.md`, the Remaining checklist, and `docs/TROUBLESHOOTING.md`.
- **Missing `docs/` structure** — the fleet's own `README_STRUCTURE.md`
  standard requires `docs/ONBOARDING.md`, `CONFIGURATION.md`,
  `DEVELOPMENT.md`, `TOOLS.md`, `TROUBLESHOOTING.md`. None existed; all five
  retrofitted this pass, grounded in the actual code (`models.py` field
  definitions, `.env.example`, `ARCHITECTURE.md`'s bridge protocol) rather
  than aspirational description.
- **`TODO.md` kept resurfacing at repo root** after being folded into
  `STATUS.md` once already — deleted again per the repo owner's explicit
  standing preference not to have a separate TODO file here. If this
  happens a third time, check whatever agent/process is recreating it and
  point it at `STATUS.md`'s "Remaining" section instead.

### Not yet independently re-verified this pass
- Native Tauri/NSIS build pipeline (`native/build.ps1`) — present, not
  re-run this session.
- Bridge stress test (`scripts/bridge-stress-test.ps1`) — script exists,
  hasn't been executed against a live connected bridge yet.
- The Niantic `nianticlabs/spz` Python library build on Windows — it's a
  C++ library with Python bindings (needs MSVC Build Tools + libz), not
  pure Python. The fix above is correct per the upstream spec, but "should
  build" isn't "confirmed builds on Goliath" — treat as the next concrete
  step, not a closed item.

### A caution for whoever reads this next (opencode / local-deepseek included)
This repo has now had two rounds of "confidently wrong status corrected
after checking the actual source." Before writing "verified" or "real" into
`STATUS.md`, `ARCHITECTURE.md`, or a tool's docstring, check it against a
running system or the authoritative upstream source, not against what
sounds plausible. The NGSP mix-up in particular came from treating a
file's internal magic bytes as if they named an obscure/undocumented format
without checking — a five-minute search would have found Niantic's own
GitHub repo and README.

---

## Improvement plan (priority order)

| Priority | Item | Effort (AI-assisted) |
|----------|------|----------------------|
| **P1** | Confirm `nianticlabs/spz` builds on Goliath (C++ toolchain + libz), decode the Marble `.spz` end to end into `ply_to_glb.py` | half day |
| **P1** | End-to-end: spawn Nekomimi-chan GLB with dance script in Overte, verify joints/textures live | half day |
| **P2** | End-to-end: spawn contemporary-living-room panorama skybox + collider mesh | half day |
| **P2** | Bridge stress test — run `scripts/bridge-stress-test.ps1` against a live connected bridge | a few hours |
| **P3** | Verify world persistence end-to-end: spawn `permanent=True`, restart domain-server, confirm reload from `models.json.gz` | a few hours |
| **P3** | Re-run native Tauri/NSIS build pipeline to confirm it still produces a working installer | half day |
| **P4** | MCPB 3-4-100 prompt check, CUA-NSIS smoke test, Playwright e2e, `glama.json` update | half day, mostly mechanical |

---

## References

- [STATUS.md](STATUS.md) — current verification status, remaining work, references
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — system architecture, bridge protocol, ports
- [docs/](docs/) — onboarding, configuration, dev setup, tool reference, troubleshooting
- [MCP Central — README standard](file:///D:/Dev/repos/mcp-central-docs/standards/README_STRUCTURE.md)
