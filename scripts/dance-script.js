// Dance animation for Overte entity
(function() {
    var entityID = null;
    var running = true;
    var time = 0;
    var startPos = null;

    this.preload = function(eid) {
        entityID = eid;
        var props = Entities.getEntityProperties(eid, ["position"]);
        startPos = props.position || { x: 0, y: 0.5, z: -3 };
        print("[dance-script] Loaded on entity " + entityID);
    };

    this.update = function(deltaSec) {
        if (!running || !entityID) return;
        time += deltaSec;

        var yOffset = Math.sin(time * 4) * 0.4;
        var rotDeg = time * 60 % 360;
        var lean = Math.sin(time * 2) * 5;

        Entities.editEntity(entityID, {
            position: {
                x: startPos.x + Math.sin(time * 1.5) * 0.3,
                y: startPos.y + yOffset,
                z: startPos.z
            },
            rotation: Quat.fromPitchYawRollDegrees(lean, rotDeg, 0)
        });
    };

    this.unload = function() {
        running = false;
        print("[dance-script] Unloaded");
    };
})();
