// Overte In-World Entity Behavior Script
// Simple spin animation — rotates entity along Y axis.
// Attach via overte_script_inject or set script property on entity.
(function() {
    var _entityID;
    var _speed = 45;

    this.preload = function(entityID) {
        _entityID = entityID;
        print("[spin.js] Loaded for entity " + entityID);
        // If userData has a speed override, use it
        var props = Entities.getEntityProperties(entityID, "userData");
        if (props.userData) {
            try {
                var data = JSON.parse(props.userData);
                if (data && data.speed) _speed = data.speed;
            } catch(e) {}
        }
    };

    this.update = function(deltaTime) {
        if (!_entityID) return;
        var props = Entities.getEntityProperties(_entityID, "rotation");
        if (!props || !props.rotation) return;
        var newRot = Quat.multiply(props.rotation, Quat.fromPitchYawRollDegrees(0, _speed * deltaTime, 0));
        Entities.editEntity(_entityID, { rotation: newRot });
    };

    this.unload = function() {
        print("[spin.js] Unloaded");
    };
})();
