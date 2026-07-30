// Dance animation for Overte entity
(function() {
    var entityID = null;
    var running = true;
    var time = 0;
    var startPos = null;

    this.preload = function(eid) {
        entityID = eid;
        var props = Entities.getEntityProperties(eid, ["position"]);
        startPos = props.position || { x: 0, y: 1.5, z: -2 };
        print("[dance-script] Loaded on entity " + entityID);
    };

    this.update = function(deltaSec) {
        if (!running || !entityID) return;
        time += deltaSec;

        var yOffset = Math.sin(time * 3) * 0.3;
        var rotDeg = time * 50 % 360;

        Entities.editEntity(entityID, {
            position: {
                x: startPos.x,
                y: startPos.y + yOffset,
                z: startPos.z
            },
            rotation: Quat.fromPitchYawRollDegrees(0, rotDeg, 0)
        });
    };

    this.unload = function() {
        running = false;
        print("[dance-script] Unloaded");
    };
})();
