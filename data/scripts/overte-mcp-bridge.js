// Moved. The bridge now lives in scripts/overte-mcp-bridge.js and the backend serves it at
// /bridge/overte-mcp-bridge.js with its WebSocket URL rewritten for the host it is served
// from. This stub keeps old Interface "Running Scripts" entries working by loading it.
Script.include("http://127.0.0.1:11110/bridge/overte-mcp-bridge.js");
