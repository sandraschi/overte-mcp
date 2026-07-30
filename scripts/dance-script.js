// Skeletal dance animation for Overte VRM entity
(function() {
    var entityID = null;
    var running = true;
    var time = 0;
    var joints = {};
    var hipJoint = -1;

    this.preload = function(eid) {
        entityID = eid;
        try {
            var names = Entities.getJointNames(eid);
            for (var i = 0; i < names.length; i++) {
                if (names[i].toLowerCase().indexOf("hip") !== -1) hipJoint = i;
                if (names[i].toLowerCase().indexOf("head") !== -1) joints.head = i;
                if (names[i].toLowerCase().indexOf("neck") !== -1) joints.neck = i;
                if (names[i].toLowerCase().indexOf("shoulder") !== -1 || names[i].toLowerCase().indexOf("clavicle") !== -1) {
                    if (names[i].toLowerCase().indexOf("left") !== -1) joints.shoulderL = i;
                    else if (names[i].toLowerCase().indexOf("right") !== -1) joints.shoulderR = i;
                }
                if (names[i].toLowerCase().indexOf("arm") !== -1 || names[i].toLowerCase().indexOf("upper_arm") !== -1) {
                    if (names[i].toLowerCase().indexOf("left") !== -1) joints.armL = i;
                    else if (names[i].toLowerCase().indexOf("right") !== -1) joints.armR = i;
                }
                if (names[i].toLowerCase().indexOf("hand") !== -1) {
                    if (names[i].toLowerCase().indexOf("left") !== -1) joints.handL = i;
                    else if (names[i].toLowerCase().indexOf("right") !== -1) joints.handR = i;
                }
                if (names[i].toLowerCase().indexOf("leg") !== -1 || names[i].toLowerCase().indexOf("upper_leg") !== -1) {
                    if (names[i].toLowerCase().indexOf("left") !== -1) joints.legL = i;
                    else if (names[i].toLowerCase().indexOf("right") !== -1) joints.legR = i;
                }
                if (names[i].toLowerCase().indexOf("foot") !== -1) {
                    if (names[i].toLowerCase().indexOf("left") !== -1) joints.footL = i;
                    else if (names[i].toLowerCase().indexOf("right") !== -1) joints.footR = i;
                }
            }
            print("[dance-script] Found " + names.length + " joints, hip=" + hipJoint);
        } catch (e) {
            print("[dance-script] Joint init error: " + e);
        }
    };

    this.update = function(deltaSec) {
        if (!running || !entityID) return;
        time += deltaSec;

        var bodyBob = Math.sin(time * 3) * 0.15;
        var armSwingL = Math.sin(time * 2) * 20;
        var armSwingR = Math.sin(time * 2 + Math.PI) * 20;
        var hipSway = Math.sin(time * 1.5) * 8;
        var headTilt = Math.sin(time * 1.2) * 10;

        // Float the whole entity
        Entities.editEntity(entityID, {
            position: { x: 0, y: 0.5 + bodyBob, z: -3 }
        });

        // Animate individual joints
        if (joints.armL !== undefined) {
            Entities.setJointRotation(entityID, joints.armL, Quat.fromPitchYawRollDegrees(armSwingL, 0, 0));
        }
        if (joints.armR !== undefined) {
            Entities.setJointRotation(entityID, joints.armR, Quat.fromPitchYawRollDegrees(armSwingR, 0, 0));
        }
        if (joints.neck !== undefined || joints.head !== undefined) {
            var h = joints.head !== undefined ? joints.head : joints.neck;
            Entities.setJointRotation(entityID, h, Quat.fromPitchYawRollDegrees(headTilt, 0, 0));
        }
        if (hipJoint !== -1) {
            Entities.setJointRotation(entityID, hipJoint, Quat.fromPitchYawRollDegrees(0, 0, hipSway));
        }
    };

    this.unload = function() {
        running = false;
        print("[dance-script] Unloaded");
    };
})();
