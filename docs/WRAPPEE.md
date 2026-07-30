# Overte

Overte is an open source virtual-worlds and social VR platform: create and
host your own virtual world, explore other worlds, meet other users, attend
or host live VR events, in VR or on desktop. Maintained by the nonprofit
Overte e.V., published under the Apache 2.0 license.

## Disambiguation — "isn't this called Vircadia?"

Yes and no, and it matters which one you mean:

- **Overte** (this repo's target) split off from Vircadia's original
  codebase, which itself descended from High Fidelity's 2019 open-sourced
  client/server architecture (C++ Interface client, domain-server,
  entity-server, in-world JS scripting). Overte is the active continuation
  of that original architecture.
- **Vircadia** (current) has since pivoted to an entirely different stack —
  "Vircadia World": PostgreSQL-backed state, Bun/TypeScript, Docker-first,
  OAuth2, pitched as a "reactivity layer for games" rather than a social-VR
  platform. It shares no wire protocol, admin API, or client with Overte.
  `vircadia-native-core` (the old C++ stack) now just points people toward
  Vircadia World instead.

This repo talks to Overte's classic domain-server API. Nothing here works
against current Vircadia World.

## Links

- Official site: https://overte.org
- Downloads: https://overte.org/downloads.html
- Documentation: https://docs.overte.org
- Source: https://github.com/overte-org
- Community: Matrix Space at `overte:overte.org`, bridged to Discord (see
  overte.org for current invite links — Matrix is the primary channel, not
  Discord)
- Mastodon: linked from overte.org

No official Reddit found as of 2026-07-30 — don't assume one exists.
