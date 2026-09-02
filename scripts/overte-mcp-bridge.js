// overte-mcp-bridge.js
// JavaScript client bridge for Overte Interface client / Assignment Client.
// Connects to the local overte-mcp FastAPI WebSocket server and translates commands.

(function() {
    var wsUrl = "ws://localhost:11110/api/overte/ws";
    var socket = null;
    var reconnectTimeout = null;
    var backoffMs = 1000;
    var maxBackoffMs = 30000;

    function connect() {
        print("[overte-mcp-bridge] Connecting to " + wsUrl + "...");
        socket = new WebSocket(wsUrl);

        socket.onopen = function() {
            print("[overte-mcp-bridge] Connected successfully!");
            backoffMs = 1000; // Reset backoff
        };

        socket.onmessage = function(event) {
            try {
                var message = JSON.parse(event.data);
                var sock = socket; // capture socket for this message's response
                handleMessage(message, sock);
            } catch (e) {
                print("[overte-mcp-bridge] Error parsing message: " + e);
            }
        };

        socket.onclose = function(event) {
            print("[overte-mcp-bridge] Socket closed: " + event.reason + ". Reconnecting...");
            scheduleReconnect();
        };

        socket.onerror = function(error) {
            print("[overte-mcp-bridge] Socket error: " + error);
        };
    }

    function scheduleReconnect() {
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        print("[overte-mcp-bridge] Reconnecting in " + backoffMs + "ms...");
        // Overte QtScript uses Script.setTimeout, not global setTimeout
        if (typeof Script !== "undefined" && Script.setTimeout) {
            Script.setTimeout(function() { connect(); }, backoffMs);
        } else {
            // Fallback: retry immediately after a delay via update loop
            var retryUntil = Date.now() + backoffMs;
            var waiter = function() {
                if (Date.now() >= retryUntil) {
                    connect();
                } else {
                    Script.setTimeout(waiter, 100);
                }
            };
            Script.setTimeout(waiter, 100);
        }
    }

    function handleMessage(msg, sock) {
        var action = msg.action;
        var reqId = msg.request_id;

        print("[overte-mcp-bridge] Handling action: " + action + " (ID: " + reqId + ")");

        if (action === "spawn") {
            try {
                var props = msg.properties || {};

                // Set default position in front of user if not provided (and in client script mode)
                if (!props.position && typeof MyAvatar !== "undefined" && typeof Vec3 !== "undefined") {
                    var avatarPos = MyAvatar.position;
                    var avatarRot = MyAvatar.orientation;
                    var frontOffset = Vec3.multiplyQbyV(avatarRot, { x: 0, y: 0, z: -2 });
                    props.position = Vec3.sum(avatarPos, frontOffset);
                }

                var newEntityId = Entities.addEntity(props);

                sendResponse({
                    request_id: reqId,
                    status: "success",
                    entity_id: newEntityId
                }, sock);
            } catch (err) {
                sendResponse({
                    request_id: reqId,
                    status: "error",
                    message: err.toString()
                }, sock);
            }
        } else if (action === "get_avatar") {
            try {
                if (typeof MyAvatar === "undefined") {
                    throw new Error("MyAvatar not available in this script context");
                }
                sendResponse({
                    request_id: reqId,
                    status: "success",
                    position: MyAvatar.position,
                    orientation: MyAvatar.orientation
                }, sock);
            } catch (err) {
                sendResponse({
                    request_id: reqId,
                    status: "error",
                    message: err.toString()
                }, sock);
            }
        } else if (action === "inject") {
            try {
                var entityId = msg.entity_id;
                var scriptUrl = msg.script_url;
                var scriptData = msg.script_data || {};

                Entities.editEntity(entityId, {
                    script: scriptUrl,
                    userData: JSON.stringify(scriptData)
                });

                sendResponse({
                    request_id: reqId,
                    status: "success"
                }, sock);
            } catch (err) {
                sendResponse({
                    request_id: reqId,
                    status: "error",
                    message: err.toString()
                }, sock);
            }
        } else {
            sendResponse({
                request_id: reqId,
                status: "error",
                message: "Unknown action: " + action
            }, sock);
        }
    }

    function sendResponse(response, sock) {
        var target = sock || socket;
        var WS_OPEN = 1; // WebSocket.OPEN constant
        if (target && target.readyState === WS_OPEN) {
            try {
                target.send(JSON.stringify(response));
            } catch (e) {
                print("[overte-mcp-bridge] send error: " + e);
            }
        } else {
            print("[overte-mcp-bridge] Cannot send: state=" + (target ? target.readyState : "null"));
        }
    }

    // Clean up when script stops
    if (typeof Script !== "undefined" && Script.scriptEnding) {
        Script.scriptEnding.connect(function() {
            print("[overte-mcp-bridge] Shutting down bridge...");
            if (socket) {
                socket.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        });
    }

    // Start connection
    connect();
})();
