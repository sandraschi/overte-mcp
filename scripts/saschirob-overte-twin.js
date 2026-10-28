// saschirob-overte-twin.js
// Overte In-World Script for Saschirob Digital Twin & Diegetic Teach Pendant.
// Spawns Saschirob GLB model and attaches an interactive Web Entity Teach Pendant in 3D.
// Load via: Overte Interface -> Running Scripts -> Load Script -> this file.

(function() {
    print("[Saschirob-Overte] Initializing Saschirob Digital Twin script...");

    var PENDANT_URL = "http://127.0.0.1:11110/embed/saschirob-pendant";
    // Canonical path to local GLB model served via models depot or file URI
    var MODEL_URL = "http://127.0.0.1:11110/models/saschirob.glb";

    var robotEntityId = null;
    var pendantEntityId = null;

    function getSpawnPosition() {
        if (typeof MyAvatar !== "undefined" && MyAvatar.position) {
            // Spawn 2.0 meters in front of the user avatar
            var front = Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2.0 });
            var pos = Vec3.sum(MyAvatar.position, front);
            pos.y = MyAvatar.position.y - 0.5; // Near floor level
            return pos;
        }
        return { x: 0, y: 1.0, z: -2.0 };
    }

    function spawnTwin() {
        var basePos = getSpawnPosition();
        print("[Saschirob-Overte] Spawning Saschirob at: " + JSON.stringify(basePos));

        // 1. Spawn Saschirob 3D Model Entity
        robotEntityId = Entities.addEntity({
            type: "Model",
            name: "Saschirob_Twin_v0.8",
            modelURL: MODEL_URL,
            position: basePos,
            dimensions: { x: 0.68, y: 0.85, z: 0.54 },
            lifetime: 3600, // 1 hour session lifetime
            collisionless: false,
            userData: JSON.stringify({
                app: "rust-saschirob-mcp",
                vfe_v0: 0.012,
                status: "active"
            })
        });

        print("[Saschirob-Overte] Model Entity created: " + robotEntityId);

        // 2. Spawn Diegetic Teach Pendant (Web Entity) parented to robot
        var pendantPos = {
            x: basePos.x + 0.50, // Slightly to the right
            y: basePos.y + 0.65, // At convenient hand/chest height
            z: basePos.z + 0.15
        };

        pendantEntityId = Entities.addEntity({
            type: "Web",
            name: "Saschirob_TeachPendant",
            sourceUrl: PENDANT_URL,
            position: pendantPos,
            dimensions: { x: 0.40, y: 0.52, z: 0.02 },
            parentID: robotEntityId,
            dpi: 40,
            lifetime: 3600,
            collisionless: true
        });

        print("[Saschirob-Overte] Diegetic Teach Pendant created: " + pendantEntityId);
    }

    // Cleanup on script unload
    Script.scriptEnding.connect(function() {
        print("[Saschirob-Overte] Cleaning up twin entities...");
        if (pendantEntityId) {
            Entities.deleteEntity(pendantEntityId);
        }
        if (robotEntityId) {
            Entities.deleteEntity(robotEntityId);
        }
    });

    // Execute spawn
    spawnTwin();
})();
