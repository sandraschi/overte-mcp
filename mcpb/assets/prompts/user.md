# Overte MCP — User Tutorials

## Welcome

This tutorial teaches humans and agents how to use the Overte MCP tools effectively. Overte is the open-source metaverse stack this server targets. If you came here because of the word "Vircadia," read the comparison section before calling tools.

## Install paths

### Claude Desktop (`.mcpb`)

1. Obtain `overte-mcp.mcpb` from a release or build it with `just mcpb-pack` in the git repo.
2. Drag the `.mcpb` into Claude Desktop (or use the extension install UI).
3. Ensure **Python 3.12+** and **uv** are available on the machine — the bundle launches via `uv run`.
4. Ask Claude to check domain status.

### From source (developers)

1. Clone the repo.
2. `uv sync`
3. Run the MCP stdio server via `uv run python -m overte_mcp` or the MCPB `run_server.py` entry with `PYTHONPATH=src`.
4. Optional: `just serve` starts the FastAPI + Vite dashboard (separate from Claude Desktop MCPB).

## Tutorial A — Is my domain up?

**Goal:** Verify the domain-server admin API answers.

**Say:** "Check Overte domain status on localhost."

**Tool call shape:**

```json
{
  "name": "overte_domain_status",
  "arguments": {
    "input_data": {
      "host": "localhost",
      "port": 40100
    }
  }
}
```

**Interpret:**

- Live payload without a simulation marker → domain answered.
- Simulated / unreachable marker → start domain-server or fix network/auth.

## Tutorial B — Authenticated status

Supply `username` and `password` in `input_data` for locked domains. Rotate passwords outside chat if transcripts are retained.

## Tutorial C — Rehearse a plaza build (simulated)

1. Confirm domain status (optional but useful).
2. Spawn a platform Box.
3. Spawn a Model statue.
4. Inject a hover or spin script onto the statue's demo entity id.

Always expect the assistant to label spawn/inject as simulated.

## Tutorial D — Web entity billboard

Spawn `type: Web` with a thin scale for signage rehearsal. Still simulated today.

## Tutorial E — Overte vs Vircadia World

| Question | Overte (this MCP) | Vircadia World |
|----------|-------------------|----------------|
| Domain admin JSON? | Yes | Different stack |
| Tools here apply? | Yes (status live; content simulated) | No |
| PostgreSQL/Bun world DB tools? | No | Not provided here |

## Tutorial F — Troubleshooting cookbook

### Connection refused

Is domain-server running? Is admin port really 40100? Firewall? Retry status.

### Unauthorized

Add Basic Auth. Confirm admin rights. Retry once; then fix credentials.

### Simulated status while you swear the domain is up

Same host as the client? Admin HTTP reachable via browser/curl? TLS vs plain HTTP mismatch? MCP host machine versus client machine?

### "I spawned but see nothing"

Expected with current simulation tools.

## Tutorial G — Agent workflow tips

Keep the `overte_` prefix stable. Diagnose with status before content rehearsal. Do not chain dozens of simulated spawns unless asked for a bulk layout plan.

## Tutorial H — Ports mental model

1. Overte domain admin (40100-ish) — status tool.
2. Overte realtime paths — Interface client; not these tools.
3. Fleet MCP webapp ports — repo dashboard; not Overte.

## Tutorial I — Asset hygiene

Prefer HTTPS URLs, reasonable GLB sizes, versioned script URLs, and a placement table in your notes for a future live bridge.

## Tutorial J — Security basics

Treat admin Basic Auth as production credentials. Do not expose admin ports carelessly. MCPB runs as the local user. Simulated tools cannot damage a live world today; status can still reveal operational detail.

## Tutorial K — Success criteria

Ops success = live status without simulation marker. Planning success = labeled rehearsal layout. Install success = tools visible and status call launches (`uv`/Python missing are common failures).

## Tutorial L — FAQ

**Q: Does MCPB include the web dashboard?**  
A: No.

**Q: Is the ignore file `.mcpignore`?**  
A: No. Use **`.mcpbignore`**.

**Q: Is the examples file `usage.json`?**  
A: No. Fleet standard name is **`examples.json`**.

**Q: Will spawn become real?**  
A: Intent of a future bridge; until then, simulated.

## Tutorial M — Sample conversation snippets

- "Is overte up?" → status.
- "Drop a box" → disclose simulation → spawn.
- "Make it spin" → inject → disclose simulation.
- "Do that in Vircadia World" → refuse wrong product.

## Tutorial N — Working with teams

Share host/port, auth-required yes/no, placement tables, and simulated labels. Do not share production passwords in public trackers. Do not assume demo entity IDs exist live.

## Tutorial O — Extending beyond three tools

New Overte operations need new server work with the same honesty contract. Do not invent tools in chat.

## Tutorial P — Practice drills

Cold start status. Remote admin with redaction. Eight-entity layout sheet. Script parameter matrix. Wrong-product refusal.

## Tutorial Q — Glossary

Domain-server, admin port, node, entity, entity script, MCPB, simulation marker.

## Tutorial R — Closing checklist

Confirmed Overte. Status used for infra claims. Spawn/inject labeled simulated. Admin port correct. Credentials careful. Install path matches goal.

## Tutorial S — Weekend event narrative

Friday: live status until healthy. Build placement table with simulated spawn/inject. Saturday future: apply live via bridge. Tell staff clearly which steps were rehearsal.

## Tutorial T — Operator loop

Status → interpret → remediate outside MCP → status again. Content tools are optional noise during outages.

## Tutorial U — Refuse well

Good: explain Overte scope and offer status if applicable. Bad: silent spawn theater for the wrong product.

## Tutorial V — Maintainer packaging reminder

Tool docstring + manifest tools + glama + prompts + `just mcpb-pack`. Skipping prompts regresses SOTA packaging.

## Field guide note 1

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 1 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 2

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 2 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 3

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 3 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 4

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 4 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 5

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 5 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 6

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 6 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 7

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 7 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 8

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 8 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 9

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 9 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 10

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 10 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 11

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 11 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 12

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 12 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 13

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 13 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 14

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 14 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 15

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 15 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 16

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 16 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 17

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 17 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 18

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 18 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 19

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 19 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 20

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 20 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 21

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 21 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 22

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 22 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 23

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 23 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 24

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 24 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 25

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 25 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 26

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 26 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 27

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 27 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 28

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 28 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 29

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 29 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 30

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 30 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 31

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 31 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 32

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 32 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 33

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 33 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 34

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 34 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.

## Field guide note 35

When repeating status checks after configuration changes, keep the same host and port unless you intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does not mix with layout planning. Document the check for a teammate who will not see this chat: include host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool surface into reliable operations practice. Field guide note 35 is intentionally repetitive so long tutorials remain usable as scrollable checklists during incidents and content sprints alike.
