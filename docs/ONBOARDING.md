# Onboarding — Overte + overte-mcp

This server wraps **Overte**, a full desktop client + server application —
not a cloud API. There's real one-time setup on your machine before any tool
here does anything live.

## What you're installing

Two separate pieces:
1. **Overte** itself — the domain-server (world host) and Interface (viewer/
   client). Neither ships with this repo; you download them from the
   official project.
2. **overte-mcp** - this repo. It talks to Overte over two channels: the
   domain-server's HTTP admin API, and a bridge script that runs inside Overte's
   script engine (headless on an assignment-client, or in Interface).

Until both pieces are running, tools fail with a clear reason
(`domain_unreachable`, `bridge_not_connected`); nothing is simulated.

## Step 1 — Get Overte

1. Download Client + Server from https://overte.org/downloads.html.
2. Install both.
3. Start `domain-server.exe`.
4. Open `http://localhost:40100/settings` in a browser and set an admin
   account. Local sandbox convention: username `admin`, password `admin`
   (this is a local dev credential, not a production one — don't reuse it
   anywhere real).

At this point `overte_domain_status` will already return live data — no
Interface client needed for that one tool.

## Step 2 - Get the entity/scripting tools live (headless, no GUI)

Overte's entity-server has no HTTP "create entity" endpoint; entity work has to run in an
Overte script engine. The bridge runs there as a domain *persistent script*, executed by an
assignment-client. No Interface client and no logged-in user are needed.

1. Start an assignment-client with enough children for the static assignments plus the
   bridge agent: `"C:\Program Files\Overte\assignment-client.exe" -n 9`.
2. Start the overte-mcp backend (`./start.ps1`, port `11110`).
3. Call `overte_bridge_install` (or `POST /api/overte/bridge/install`). It registers
   `http://127.0.0.1:11110/bridge/overte-mcp-bridge.js` as a persistent script; the
   domain-server restarts to apply it.
4. Poll `overte_bridge_status` until it reports `connected` and `mode: "agent"`.

Or run everything in one go and get a pass/fail report:
`uv run python scripts/headless_e2e.py` (see [DEVELOPMENT.md](DEVELOPMENT.md)).

### Optional: the desktop client

To watch, or to use avatar-relative features (spawn in front of you, parent to
`MyAvatar`), load `http://127.0.0.1:11110/bridge/overte-mcp-bridge.js` in Interface
(Edit > Running Scripts > Load from URL). The newest bridge connection wins, so an
Interface bridge replaces the headless one until it disconnects.

## Joining someone else's domain instead

Everything above sets up a **local sandbox** (your machine, `localhost:40100`).
To work in another domain instead:

1. In Interface: *Connect to Domain…* and enter their domain-server address.
   Load the bridge script there (URL above works from anywhere that can reach
   your backend) so the tools act in that world.
2. In this dashboard: use the **Watching** switcher on the Dashboard page to
   point monitoring at their host/port.
3. Pass their `host`/`port` (and admin `username`/`password`, if they gave you
   any) to `overte_domain_status`. Without admin credentials you get reachability
   only — spawning and script injection need a bridge *and* their permission.

Remember the split: Watching selects the domain you *look at*; the bridge
selects the domain you *act in*. They are only the same domain when you (or
your assignment-client) joined the one you're watching.

## Common first-run pitfalls

- **Dashboard loads but looks unstyled** — this was a real bug (Tailwind
  wasn't wired into the webapp build) fixed 2026-07-30. If you're on an old
  clone, `git pull` and re-run `bun install` in `webapp/`.
- **401 from `overte_domain_status`** — your admin credentials don't match
  what's set at `http://localhost:40100/settings`. Pass `username`/`password`
  to the tool, or reset the domain-server's admin account.
- **`bridge_not_connected` after install** - too few assignment-client children
  (use `-n 9`), or the domain-server has not finished restarting. See
  [Troubleshooting](TROUBLESHOOTING.md).
- **`position_required`** - the headless bridge has no avatar; pass a position.

## Next
- [Configuration](CONFIGURATION.md) for env vars and ports
- [Tool Reference](TOOLS.md) for what each tool actually does
- [Troubleshooting](TROUBLESHOOTING.md) for anything not covered above
