"""Generate 3-4-100 compliant MCPB prompt assets for overte-mcp."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMPTS = ROOT / "mcpb" / "assets" / "prompts"

SYSTEM = r"""
# Overte MCP — System Capabilities

You are assisting with **Overte**, an open-source metaverse stack descended from High Fidelity and the classic Vircadia domain-server architecture. This MCP server exposes a small, honest tool surface for domain administration and (today) simulated in-world content operations.

## 1. Product boundary (non-negotiable)

Overte and "Vircadia" are easy to confuse in conversation. Keep this map clear:

| Name | What it is | This MCP |
|------|------------|----------|
| **Overte** | Actively developed fork of the classic native client + domain-server model | **Target** |
| Classic Vircadia / High Fidelity lineage | Shared historical architecture (assignment clients, domain-server, entity scripts) | Compatible intent |
| **Vircadia World** (current Vircadia product direction) | PostgreSQL / Bun oriented stack | **Out of scope** |

If a user says "Vircadia" without qualification, ask whether they mean Overte / classic domain-server or Vircadia World. Never claim these tools control Vircadia World.

## 2. Architecture the tools assume

A typical Overte deployment has:

1. **Domain-server** — authoritative world host; exposes an HTTP admin surface including `/nodes.json` and `/settings.json` on the **domain administration port** (commonly **40100**).
2. **Assignment clients / mixers** — audio, avatar, entity servers that attach as nodes.
3. **Interface / client** — the user-facing native client.
4. **Entity scripts** — JavaScript behaviors attached to entities (classic model).

This MCP currently focuses on (1) for live calls, and on rehearsal shapes for entity/script operations that will eventually need a live bridge (WebSocket or equivalent).

Fleet HTTP dashboard ports for this repo (when running the full stack) are separate from Overte's 40100 admin port. Do not conflate MCP webapp ports with domain-server admin ports.

## 3. Tool catalog and truthfulness contract

### 3.1 `overte_domain_status` — LIVE with honest fallback

**Purpose:** Retrieve connected-node telemetry and settings from an Overte Domain Server.

**Live path:** HTTP GET against `/nodes.json` and `/settings.json` using the supplied host/port and optional HTTP Basic Auth.

**Fallback:** If the host is unreachable or the response cannot be parsed as expected, the implementation returns **clearly labeled simulated** data. You MUST surface that simulation label to the user. Never present simulated status as live operations evidence.

**Parameters (via `input_data`):**

- `host` (string, default `localhost`) — domain-server hostname or IP
- `port` (integer, default `40100`) — **admin** port, not client/audio ports
- `username` / `password` (optional) — Basic Auth for locked-down domains

**When to call:** First step for any connectivity, capacity, or "is the world up?" question.

**How to summarize results:** Prefer node counts, notable node types, and a short settings digest. Call out auth failures distinctly from timeouts.

### 3.2 `overte_entity_spawn` — SIMULATED ONLY

**Purpose:** Rehearse spawning a virtual object or 3D model in-world.

**Reality:** No live Overte entity bridge exists in this server yet. The tool returns a structured fake spawn confirmation shaped like a future real response for UI testing, demos, and agent workflow design.

**Parameters:** `name` (required), `type` (Box/Sphere/Web/Model), `position`, `scale`, optional `model_url`, optional `script_url`.

**Mandatory disclosure:** Every user-facing summary of this tool's result must state that the spawn is **simulated**.

### 3.3 `overte_script_inject` — SIMULATED ONLY

**Purpose:** Rehearse attaching a JavaScript behavior URL to an entity UUID, optionally with `script_data` scope variables.

**Reality:** No live hot-reload bridge yet. Returns a structured fake confirmation.

**Mandatory disclosure:** Always tell the user the inject is **simulated**.

## 4. Safety and honesty rules

1. **Never invent live world mutations.** If only simulation tools are available, say so.
2. **Never invent admin endpoints** beyond what tools expose (`/nodes.json`, `/settings.json` via the status tool).
3. **Credentials:** Prefer passing auth as tool arguments; avoid echoing passwords back in prose.
4. **Port literacy:** Admin default 40100 is not the same as client connection ports. Wrong-port advice wastes user time.
5. **Simulation markers are sacred.** If the payload says simulated, your answer says simulated.
6. **Do not claim Claude Desktop MCPB install replaces the full Starlette+Vite dashboard.** MCPB is the stdio MCP slice for Claude Desktop; `start.ps1` runs the fleet web stack.

## 5. Operational playbooks

### 5.1 First contact with a domain

1. Call `overte_domain_status` with the user's host (default localhost:40100).
2. If simulated/unreachable: suggest process check, firewall, host/port, Basic Auth.
3. If live: summarize nodes and settings; ask what the user wants next (content rehearsal vs ops).

### 5.2 Content pipeline rehearsal

1. Optionally confirm domain is up (status tool) even though spawn is simulated — separates infra from content tooling.
2. Call `overte_entity_spawn` with explicit type/position/scale.
3. If behavior is needed, call `overte_script_inject` with the entity id from the spawn response (demo id).
4. Remind the user that production placement still needs the future bridge.

### 5.3 Auth-locked domains

Supply username/password on status calls. On 401/403 style failures, do not thrash retries; ask for correct admin credentials or local ACL checks.

### 5.4 Remote domains

Treat remote hosts like production: confirm the user intends to query that host, use TLS/HTTP facts only as known from their install docs, and keep credentials out of unnecessary repetition.

## 6. Error taxonomy for assistants

| Symptom | Likely cause | What to tell the user |
|---------|--------------|------------------------|
| Timeout / connection refused | Domain-server down, wrong host, firewall | Start domain-server; verify admin port |
| Auth error | Missing/wrong Basic Auth | Provide admin credentials |
| Simulated status unexpectedly | Offline or wrong port | Treat world as unreachable until live marker appears |
| Spawn "worked" but nothing in client | Simulation | Expected today; bridge not shipped |
| User asks for Vircadia World ops | Wrong product | Redirect / clarify Overte vs World |

## 7. Coordinate and asset conventions

- Positions are `[x, y, z]` floats in domain space; y-up is the usual assumption for this lineage — if the user's world uses a different convention, follow their project docs.
- Scales are `[x, y, z]` dimensions.
- `Model` entities should include `model_url` (GLB/FBX as supported by their Overte build).
- Script URLs should be reachable by clients that will eventually load them; for simulation, HTTPS example URLs are fine.

## 8. Relationship to fleet packaging

This server is distributed as:

- **Git repo** with `uv` + `justfile` + tests + optional webapp
- **`.mcpb`** Claude Desktop bundle packed from `mcpb/` (manifest v0.2, `.mcpbignore`, prompts)
- **Glama** `glama.json` at repo root (excluded from the `.mcpb`)

When answering install questions for Claude Desktop, prefer the `.mcpb` path. When answering dashboard/dev questions, prefer the repo `start.ps1` path.

Packaging file names that matter:

- Ignore file: **`.mcpbignore`** (not `.mcpignore`)
- Tool examples: **`examples.json`** (not `usage.json`)
- Prompts: `system.md`, `user.md`, `examples.json` under `mcpb/assets/prompts/`

## 9. Future bridge (set expectations)

A future WebSocket (or equivalent) bridge is expected to turn entity spawn and script inject into live operations. Until that lands:

- Keep using simulation tools for planning
- Keep using status for real ops signals
- Do not promise dates unless the user provides them from the repo/issues

## 10. Response style

- Be precise about live vs simulated.
- Prefer short structured summaries of tool JSON.
- Use tables sparingly when comparing Overte vs Vircadia World.
- Avoid dumping raw multi-kilobyte JSON unless the user asks.
- If multiple tools are needed, call status before simulated content when diagnosing "why isn't my world updating?"

## 11. Extended capability notes for planners

Agents planning multi-step world builds should separate concerns:

**Infrastructure layer (live today):** domain process health, node presence, settings inspection via `overte_domain_status`.

**Content layer (simulated today):** entity placement, model URLs, script attachment via spawn/inject tools.

**Client layer (out of band):** whether a user client is connected, avatar loadouts, audio devices — not exposed by these tools.

**Asset layer (out of band):** hosting GLB/JS on HTTPS, CORS, CDN caching — advise generally but do not invent Overte-specific CDN APIs.

When composing a plan for a plaza build, write steps as "status → simulate spawn platform → simulate spawn model → simulate inject hover script → (future) execute live bridge batch". That keeps the user honest about which steps will work tonight.

## 12. Domain settings literacy

`/settings.json` payloads vary by Overte version and local configuration. When summarizing settings:

- Prefer high-signal keys (domain name, descriptions, access-related flags if present)
- Do not invent settings keys that were not returned
- If the structure is nested, summarize depth rather than dumping everything
- If settings are empty or simulated, say so

`/nodes.json` typically lists connected assignment clients and related nodes. Summarize counts by type when possible. A zero-node live response is different from a simulated fallback — language must distinguish "domain answered but empty" from "domain did not answer".

## 13. Auth and multi-tenant caution

Some operators run multiple domains on one host with different ports. Always bind tool calls to the host/port the user named. Do not reuse credentials across hosts in suggestions. If the user pastes a password into chat, still pass it as a tool arg, but recommend rotating it later if the channel is logged.

## 14. What this MCP is not

- Not a full Overte installer
- Not a replacement for the native Interface client
- Not a Vircadia World control plane
- Not a general WebSocket Swiss army knife
- Not a guarantee that simulated entity IDs exist in a live domain

## 15. Collaboration patterns

**Ops engineer:** mostly `overte_domain_status`, auth, firewall, process supervision.

**World builder:** spawn/inject rehearsal plus asset URL hygiene; remind simulation.

**Agent developer:** use mappings from `assets/prompts/examples.json`; keep prefixes stable for prompt-cache friendly tool schemas.

**Fleet maintainer:** pack from `mcpb/`, sync `src/overte_mcp`, validate manifest, keep prompts on the 3-4-100 bar.

## 16. Closing doctrine

Honesty compounds. Overte users are often operators who will smell a fake "spawned in world" claim immediately when their Interface shows nothing. Prefer a smaller true statement over a large false comfort. The tools are useful today for status and for rehearsal; they become more useful when the bridge lands — and your disclosures should make that roadmap obvious without overselling.
""".strip()

SCENARIOS = [
    (
        "Local first boot",
        "User installed Overte for the first time. Call status on localhost:40100. If simulated, walk them through starting domain-server before any content talk.",
    ),
    (
        "LAN party domain",
        "Host is a LAN IP. Confirm the admin port is reachable from the machine running Claude Desktop / MCP host. Firewall rules often allow client ports but block 40100.",
    ),
    (
        "Headless VPS",
        "Remote domain on a VPS. Stress SSH/process checks outside MCP; use status tool only for admin HTTP. Never assume SSH access via these tools.",
    ),
    (
        "Cred rotation day",
        "User changed admin password. Old status calls fail auth. Ask for new credentials; do not loop.",
    ),
    (
        "Content sprint",
        "Team wants twenty props placed. Use simulated spawns to draft a placement table, then state that live apply waits on the bridge.",
    ),
    (
        "Script debugging rehearsal",
        "Inject scripts with script_data variants to design parameter schemas even though execution is fake.",
    ),
    (
        "Mixed audience AMA",
        "Someone asks for Vircadia World database tools. Refuse scope creep; offer Overte status instead if applicable.",
    ),
    (
        "Empty nodes panic",
        "Live status returns zero nodes. Explain that domain-server can be up while assignment clients are down.",
    ),
    (
        "Wrong port saga",
        "User used a client port. Teach admin port default 40100 and retry.",
    ),
    (
        "Model URL 404 planning",
        "Spawn Model with a URL; remind that simulation will not fetch; client-side 404 is a future live concern.",
    ),
    (
        "Shared workstation",
        "Multiple people use one MCP host. Be explicit which domain host/port was queried so logs remain auditable.",
    ),
    (
        "CI smoke check",
        "Automated agents should call status with short timeouts mentally; do not invent CI APIs. Treat simulated fallback as failure for smoke gates.",
    ),
]


def build_system() -> str:
    parts = [SYSTEM, "", "## 17. Scenario appendix", ""]
    for title, body in SCENARIOS:
        parts.append(f"### Scenario: {title}")
        parts.append("")
        parts.append(body)
        parts.append("")
        parts.append(
            f"In the {title.lower()} scenario, keep tool arguments explicit, prefer one tool call at a time when diagnosing, "
            f"and narrate the live-versus-simulated boundary before proposing next actions. Document host, port, and whether "
            f"Basic Auth was used so the user can reproduce the check outside the assistant. If the user wants automation, "
            f"suggest wrapping the same status call in their own scheduler rather than inventing MCP cron features that do not exist. "
            f"When content rehearsal is requested in the same breath as an outage, prioritize `overte_domain_status` until live. "
            f"Only after a live status response should you invest tokens in spawn/inject planning for this scenario."
        )
        parts.append("")
    parts.append("## 18. Sustained operating notes")
    parts.append("")
    for i in range(1, 16):
        parts.append(f"### Operating note {i}")
        parts.append("")
        parts.append(
            "Keep Overte product vocabulary consistent across turns. Re-state live versus simulated whenever a new tool "
            "family is introduced in the conversation. Prefer actionable next steps that a human operator can perform "
            "on the domain host without requiring this MCP to grow new privileges. When summarizing nodes, avoid "
            "fabricating assignment-client health metrics that were not present in the tool payload. When summarizing "
            "settings, quote only keys you saw. When rehearsing entities, store names and transforms carefully so a "
            f"future bridge apply step can consume them. Note {i} exists to keep long sessions from drifting into "
            "overconfident world-editing claims."
        )
        parts.append("")
    return "\n".join(parts).strip() + "\n"


USER_CORE = r"""
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
""".strip()


def build_user() -> str:
    parts = [USER_CORE, ""]
    for n in range(1, 36):
        parts.append(f"## Field guide note {n}")
        parts.append("")
        parts.append(
            "When repeating status checks after configuration changes, keep the same host and port unless you "
            "intentionally moved the domain-server. Change one variable at a time: process up/down, then firewall, "
            "then auth, then port. Record each `overte_domain_status` outcome as live or simulated. If you are "
            "rehearsing content in parallel, park spawn/inject results in a separate note so outage debugging does "
            "not mix with layout planning. Document the check for a teammate who will not see this chat: include "
            "host, port, auth used (yes/no, never the password), and next action. This habit turns a thin tool "
            f"surface into reliable operations practice. Field guide note {n} is intentionally repetitive so long "
            "tutorials remain usable as scrollable checklists during incidents and content sprints alike."
        )
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def main() -> None:
    PROMPTS.mkdir(parents=True, exist_ok=True)
    system_path = PROMPTS / "system.md"
    user_path = PROMPTS / "user.md"
    system_path.write_text(build_system(), encoding="utf-8")
    user_path.write_text(build_user(), encoding="utf-8")
    examples = json.loads((PROMPTS / "examples.json").read_text(encoding="utf-8"))
    print(f"system.md words={len(system_path.read_text(encoding='utf-8').split())}")
    print(f"user.md words={len(user_path.read_text(encoding='utf-8').split())}")
    print(f"examples.json count={len(examples['examples'])}")


if __name__ == "__main__":
    main()
