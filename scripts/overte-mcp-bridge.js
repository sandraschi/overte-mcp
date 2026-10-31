// overte-mcp-bridge.js
// Bridge between the overte-mcp FastAPI WebSocket hub and an Overte script engine.
//
// Runs in two contexts:
//   agent      - headless: registered as a domain "persistent script" and run by an
//                assignment client (no GUI, no avatar). This is the primary mode.
//   interface  - loaded in the Overte desktop client (Edit > Running Scripts). Optional,
//                useful when you want to watch, and the only mode with MyAvatar.
//
// ES5 only: Overte's script engine is not a browser. Use Script.setTimeout /
// Script.setInterval, never the bare timer globals.
//
// The backend serves this file at /bridge/overte-mcp-bridge.js and rewrites WS_URL to
// point at itself, so the same file works on any host/port.

(function () {
    var BRIDGE_VERSION = "2.0.0";
    var WS_URL = "ws://localhost:11110/api/overte/ws";

    var MODE = (typeof Agent !== "undefined" && typeof MyAvatar === "undefined") ? "agent" : "interface";
    var HAS_VIEWER = (typeof EntityViewer !== "undefined");

    // Agent scripts only "see" entities inside the EntityViewer query volume. Keep a large
    // standing query around the origin and widen/move it on demand for searches.
    var VIEW_CENTER = { x: 0, y: 0, z: 0 };
    var VIEW_RADIUS = 2000;
    var QUERY_SETTLE_MS = 1000;

    var socket = null;
    var backoffMs = 1000;
    var maxBackoffMs = 30000;
    var stopping = false;

    function log(msg) {
        print("[overte-mcp-bridge " + MODE + "] " + msg);
    }

    function canRez() {
        try {
            return !!Entities.canRez();
        } catch (e) {
            return false;
        }
    }

    function queryView(center, radius) {
        if (!HAS_VIEWER) {
            return;
        }
        EntityViewer.setPosition(center || VIEW_CENTER);
        EntityViewer.setCenterRadius(radius || VIEW_RADIUS);
        EntityViewer.queryOctree();
    }

    // Run fn after the viewer has had time to receive entities (agent mode only).
    function afterQuery(center, radius, fn) {
        if (!HAS_VIEWER) {
            fn();
            return;
        }
        queryView(center, radius);
        Script.setTimeout(function () {
            fn();
            queryView(VIEW_CENTER, VIEW_RADIUS);
        }, QUERY_SETTLE_MS);
    }

    function sendJSON(obj, sock) {
        var target = sock || socket;
        var WS_OPEN = 1;
        if (target && target.readyState === WS_OPEN) {
            try {
                target.send(JSON.stringify(obj));
            } catch (e) {
                log("send error: " + e);
            }
        } else {
            log("cannot send, state=" + (target ? target.readyState : "null"));
        }
    }

    function reply(reqId, sock, fields) {
        var r = { request_id: reqId };
        for (var k in fields) {
            if (fields.hasOwnProperty(k)) {
                r[k] = fields[k];
            }
        }
        sendJSON(r, sock);
    }

    function fail(reqId, sock, message, code) {
        reply(reqId, sock, { status: "error", message: String(message), code: code || "bridge_error" });
    }

    function hello(sock) {
        sendJSON({
            type: "hello",
            mode: MODE,
            version: BRIDGE_VERSION,
            can_rez: canRez(),
            has_avatar: MODE === "interface",
            servers_exist: (function () { try { return !!Entities.serversExist(); } catch (e) { return false; } })()
        }, sock);
    }

    function handleMessage(msg, sock) {
        var action = msg.action;
        var reqId = msg.request_id;

        if (action === "ping") {
            reply(reqId, sock, { status: "success", mode: MODE, version: BRIDGE_VERSION, can_rez: canRez() });
            return;
        }

        if (action === "spawn") {
            try {
                var props = msg.properties || {};
                if (props.lifetime === null) {
                    delete props.lifetime;
                }
                if (!props.position) {
                    if (MODE === "interface") {
                        var front = Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2 });
                        props.position = Vec3.sum(MyAvatar.position, front);
                    } else {
                        fail(reqId, sock, "position is required in agent mode (there is no avatar to place it in front of)", "position_required");
                        return;
                    }
                }
                if (!canRez()) {
                    fail(reqId, sock, "this script may not create entities in this domain (Entities.canRez() is false); check the domain's permissions", "cannot_rez");
                    return;
                }
                var newId = Entities.addEntity(props);
                if (!newId || newId === "{00000000-0000-0000-0000-000000000000}") {
                    fail(reqId, sock, "Entities.addEntity returned no id", "spawn_failed");
                    return;
                }
                reply(reqId, sock, { status: "success", entity_id: newId, mode: MODE });
            } catch (err) {
                fail(reqId, sock, err);
            }
            return;
        }

        if (action === "get_avatar") {
            if (MODE !== "interface") {
                fail(reqId, sock, "no avatar in agent mode; pass an explicit position instead", "no_avatar");
                return;
            }
            reply(reqId, sock, { status: "success", position: MyAvatar.position, orientation: MyAvatar.orientation });
            return;
        }

        if (action === "update") {
            try {
                Entities.editEntity(msg.entity_id, msg.properties || {});
                reply(reqId, sock, { status: "success" });
            } catch (err) {
                fail(reqId, sock, err);
            }
            return;
        }

        if (action === "delete") {
            try {
                Entities.deleteEntity(msg.entity_id);
                reply(reqId, sock, { status: "success" });
            } catch (err) {
                fail(reqId, sock, err);
            }
            return;
        }

        if (action === "get_entity") {
            afterQuery(null, null, function () {
                try {
                    var wanted = msg.properties || ["name", "type", "position", "rotation", "dimensions", "parentID", "visible", "intensity", "color", "lifetime"];
                    // "type" doubles as the existence check below, so always ask for it.
                    if (wanted.length && wanted.indexOf("type") < 0) {
                        wanted = wanted.concat(["type"]);
                    }
                    var props = wanted.length ? Entities.getEntityProperties(msg.entity_id, wanted)
                                              : Entities.getEntityProperties(msg.entity_id);
                    if (!props || !props.type || props.type === "Unknown") {
                        fail(reqId, sock, "entity " + msg.entity_id + " not found (or not visible to this script)", "not_found");
                        return;
                    }
                    reply(reqId, sock, { status: "success", properties: props });
                } catch (err) {
                    fail(reqId, sock, err);
                }
            });
            return;
        }

        if (action === "find_nearby") {
            var center = msg.position;
            if (!center) {
                if (MODE === "interface") {
                    center = MyAvatar.position;
                } else {
                    center = { x: 0, y: 0, z: 0 };
                }
            }
            var radius = msg.radius || 20;
            afterQuery(center, Math.max(radius, 10), function () {
                try {
                    var ids = Entities.findEntities(center, radius);
                    var items = [];
                    for (var i = 0; i < ids.length; i++) {
                        var p = Entities.getEntityProperties(ids[i], ["name", "type", "position", "dimensions", "modelURL", "lifetime"]);
                        items.push({ id: ids[i], name: p.name, type: p.type, position: p.position,
                                     dimensions: p.dimensions, modelURL: p.modelURL, lifetime: p.lifetime });
                    }
                    reply(reqId, sock, { status: "success", items: items });
                } catch (err) {
                    fail(reqId, sock, err);
                }
            });
            return;
        }

        if (action === "inject") {
            try {
                Entities.editEntity(msg.entity_id, {
                    script: msg.script_url,
                    userData: JSON.stringify(msg.script_data || {})
                });
                reply(reqId, sock, { status: "success" });
            } catch (err) {
                fail(reqId, sock, err);
            }
            return;
        }

        fail(reqId, sock, "Unknown action: " + action, "unknown_action");
    }

    function connect() {
        if (stopping) {
            return;
        }
        log("connecting to " + WS_URL);
        socket = new WebSocket(WS_URL);

        socket.onopen = function () {
            log("connected (bridge " + BRIDGE_VERSION + ", can_rez=" + canRez() + ")");
            backoffMs = 1000;
            hello(socket);
        };

        socket.onmessage = function (event) {
            var sock = socket;
            var message;
            try {
                message = JSON.parse(event.data);
            } catch (e) {
                log("bad message: " + e);
                return;
            }
            handleMessage(message, sock);
        };

        socket.onclose = function () {
            if (stopping) {
                return;
            }
            log("socket closed, reconnecting in " + backoffMs + " ms");
            Script.setTimeout(connect, backoffMs);
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        };

        socket.onerror = function (error) {
            log("socket error: " + error);
        };
    }

    // In agent mode, wait for the entity server before connecting so the first command
    // does not race the domain handshake.
    function start() {
        if (MODE === "agent") {
            var waited = 0;
            var timer = Script.setInterval(function () {
                waited += 500;
                var ready = false;
                try {
                    ready = Entities.serversExist();
                } catch (e) {
                    ready = false;
                }
                if (ready || waited >= 30000) {
                    Script.clearInterval(timer);
                    if (!ready) {
                        log("entity server not visible after 30 s, connecting anyway");
                    }
                    queryView(VIEW_CENTER, VIEW_RADIUS);
                    // Re-query periodically so entities created elsewhere stay visible.
                    Script.setInterval(function () { queryView(VIEW_CENTER, VIEW_RADIUS); }, 5000);
                    connect();
                }
            }, 500);
        } else {
            connect();
        }
    }

    Script.scriptEnding.connect(function () {
        stopping = true;
        log("shutting down");
        if (socket) {
            socket.close();
        }
    });

    start();
})();
