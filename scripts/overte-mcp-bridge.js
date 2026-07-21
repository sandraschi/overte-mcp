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
                handleMessage(message);
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
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = setTimeout(function() {
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
            connect();
        }, backoffMs);
    }

    function handleMessage(msg) {
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
                });
            } catch (err) {
                sendResponse({
                    request_id: reqId,
                    status: "error",
                    message: err.toString()
                });
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
                });
            } catch (err) {
                sendResponse({
                    request_id: reqId,
                    status: "error",
                    message: err.toString()
                });
            }
        } else {
            sendResponse({
                request_id: reqId,
                status: "error",
                message: "Unknown action: " + action
            });
        }
    }

    function sendResponse(response) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(response));
        } else {
            print("[overte-mcp-bridge] Cannot send response: socket not open");
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
