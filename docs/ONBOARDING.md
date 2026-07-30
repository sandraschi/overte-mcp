# Onboarding — Overte + overte-mcp

This server wraps **Overte**, a full desktop client + server application —
not a cloud API. There's real one-time setup on your machine before any tool
here does anything live.

## What you're installing

Two separate pieces:
1. **Overte** itself — the domain-server (world host) and Interface (viewer/
   client). Neither ships with this repo; you download them from the
   official project.
2. **overte-mcp** — this repo. It talks to Overte over two channels: the
   domain-server's HTTP admin API, and a WebSocket bridge script loaded
   inside Interface.

Until both pieces are running, every tool call here returns clearly-labeled
`source: "simulated"` placeholder data — never a silent fake success.

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

## Step 2 — Get the entity/scripting tools live

Entity spawning and script injection need a running **Interface** client
with a bridge script loaded, because Overte's entity-server has no plain
HTTP "create entity" endpoint — only Interface's JavaScript API can do it.

1. Start Interface, log into your local domain (`localhost`).
2. Developer → Script Manager → Load Script → From Disk → select
   `scripts/overte-mcp-bridge.js` from this repo.
3. Keep the overte-mcp backend running (`./start.ps1`, port `11110`) so the
   bridge's WebSocket has something to connect to at `/api/overte/ws`.

Once connected, `overte_entity_spawn` and `overte_script_inject` switch from
`source: "simulated"` to `source: "live"`.

## Common first-run pitfalls

- **Dashboard loads but looks unstyled** — this was a real bug (Tailwind
  wasn't wired into the webapp build) fixed 2026-07-30. If you're on an old
  clone, `git pull` and re-run `bun install` in `webapp/`.
- **401 from `overte_domain_status`** — your admin credentials don't match
  what's set at `http://localhost:40100/settings`. Pass `username`/`password`
  to the tool, or reset the domain-server's admin account.
- **Entity spawns but nothing appears in Interface** — check the backend log
  for a bridge WebSocket connection; if none shows up, the script wasn't
  loaded, or Interface lost connection and hasn't reconnected yet (bridge
  retries with exponential backoff up to 30s).

## Next
- [Configuration](CONFIGURATION.md) for env vars and ports
- [Tool Reference](TOOLS.md) for what each tool actually does
- [Troubleshooting](TROUBLESHOOTING.md) for anything not covered above
