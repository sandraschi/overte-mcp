import { BookOpen, ExternalLink, HelpCircle, Info, Link2, Settings } from "lucide-react";
import { useState } from "react";

export function HelpPage() {
  const [activeTab, setActiveTab] = useState<"setup" | "api" | "links">("setup");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <HelpCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Overte Help Hub
          </h2>
          <p className="text-xs text-slate-400">
            Reference guides, JS API cheat-sheets, and community links
          </p>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex border-b border-white/[0.05] gap-4">
        <button
          onClick={() => setActiveTab("setup")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "setup" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "setup" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          Domain Setup
        </button>
        <button
          onClick={() => setActiveTab("api")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "api" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "api" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          JS Scripting API
        </button>
        <button
          onClick={() => setActiveTab("links")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "links" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "links" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          Useful Links
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-6 text-xs text-slate-300 leading-relaxed">
        {activeTab === "setup" && (
          <div className="space-y-6">
            <div className="glass-panel space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                <Settings className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Local Sandbox Launcher
                </h4>
              </div>
              <p>
                The primary deployment method for development is the <strong>Local Sandbox</strong>{" "}
                server node. When you install Overte, run the <strong>Overte Server</strong>{" "}
                launcher to start a local background sandbox.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Admin Control Panel runs at <code>http://localhost:40100</code>.
                </li>
                <li>
                  Ensure default port mappings (40100, 40102) are not blocked by local firewalls.
                </li>
                <li>
                  Create an administrator username and password inside the control panel to
                  authenticate secure script injection requests.
                </li>
              </ul>
            </div>

            <div className="glass-panel space-y-3">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Deployment Warning (Goliath Server)
                </h4>
              </div>
              <p>
                Docker Desktop daemon on the workstation server <code>Goliath</code> experiences
                runtime instability (daemon crashes).{" "}
                <strong>Do not deploy domain containers via Docker Desktop on Goliath</strong> at
                this time.
              </p>
              <p>
                A migration plan to host Overte domains inside a lightweight container manager (like
                Podman) is in progress and will be detailed in future releases.
              </p>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="glass-panel space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Overte Entity Scripting Guide
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Overte entity scripts are JavaScript files that run inside the Interface client.
                They control entity behaviour through lifecycle callbacks, physics events, and the{" "}
                <code className="text-sky-400">Entities</code> API. Scripts are attached by setting
                the entity's <code className="text-sky-400">script</code> property to the script
                URL.
              </p>
            </div>

            {/* Lifecycle */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Lifecycle Callbacks
              </h5>
              <div className="font-mono text-[10px] text-sky-400 bg-black/35 p-3 rounded-xl space-y-2">
                <div>
                  <p className="text-white text-[11px]">this.preload = function(entityID)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Called when the script first loads. entityID is the target entity. Store it for
                    use in update().
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">this.update = function(deltaTime)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Called every frame. deltaTime is seconds since last frame. Use for animation,
                    physics, AI logic.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">this.unload = function()</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Called when the script is removed or entity is deleted. Clean up timers and
                    listeners here.
                  </p>
                </div>
              </div>
            </div>

            {/* Events */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Interaction Events
              </h5>
              <div className="font-mono text-[10px] text-sky-400 bg-black/35 p-3 rounded-xl space-y-2">
                <div>
                  <p className="text-white text-[11px]">
                    this.clickReleaseEvent = function(entityID, event)
                  </p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Fires when a user clicks/releases on the entity. event contains mouse data.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">this.enterEntity = function(entityID)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Fires when an avatar enters the entity's bounding box.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">this.leaveEntity = function(entityID)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Fires when an avatar exits the entity's bounding box.
                  </p>
                </div>
              </div>
            </div>

            {/* Key API Functions */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Key Entities API
              </h5>
              <div className="font-mono text-[10px] text-sky-400 bg-black/35 p-3 rounded-xl space-y-3">
                <div>
                  <p className="text-white text-[11px]">Entities.addEntity(properties)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Create a new entity. properties is an object with type, name, position,
                    dimensions, modelURL, script, etc. Returns the new entity UUID.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Example: Entities.addEntity({"{"} type: "Box", name: "MyBox", position: {"{"} x:
                    0, y: 1, z: -3 {"}"} {"}"})
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">
                    Entities.editEntity(entityID, properties)
                  </p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Modify an entity's properties. Supports position, rotation, dimensions, color,
                    script, userData, etc.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">
                    Entities.getEntityProperties(entityID, properties)
                  </p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Get current property values. Second argument is optional comma-separated
                    property string like "position,rotation".
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">Entities.deleteEntity(entityID)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Permanently remove an entity from the domain.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">
                    Entities.setJointRotation(entityID, jointIndex, quaternion)
                  </p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Set the rotation of a skeletal joint by index. Use getJointNames() first to find
                    joint indices.
                  </p>
                </div>
                <div>
                  <p className="text-white text-[11px]">Entities.getJointNames(entityID)</p>
                  <p className="text-slate-400 not-italic font-sans mt-0.5">
                    Returns array of joint name strings for a model entity with an armature.
                    Requires FBX or glTF format (not VRM).
                  </p>
                </div>
              </div>
            </div>

            {/* Utilities */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Utility Objects
              </h5>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="font-bold text-white mb-1">Quat</p>
                  <p className="text-[10px] text-slate-400">Quaternion math for rotations.</p>
                  <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-400 space-y-0.5">
                    <li>
                      <code className="text-sky-400">Quat.fromPitchYawRollDegrees(p, y, r)</code> —
                      Create quaternion from Euler angles
                    </li>
                    <li>
                      <code className="text-sky-400">Quat.multiply(a, b)</code> — Multiply two
                      quaternions
                    </li>
                    <li>
                      <code className="text-sky-400">Quat.angle(q)</code> — Get rotation angle
                    </li>
                    <li>
                      <code className="text-sky-400">Quat.axis(q)</code> — Get rotation axis
                    </li>
                  </ul>
                </div>
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="font-bold text-white mb-1">Vec3</p>
                  <p className="text-[10px] text-slate-400">3D vector math.</p>
                  <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-400 space-y-0.5">
                    <li>
                      <code className="text-sky-400">Vec3.sum(a, b)</code> — Add vectors
                    </li>
                    <li>
                      <code className="text-sky-400">Vec3.multiply(a, b)</code> — Multiply vectors
                    </li>
                    <li>
                      <code className="text-sky-400">Vec3.multiplyQbyV(q, v)</code> — Rotate vector
                      by quaternion
                    </li>
                    <li>
                      <code className="text-sky-400">Vec3.distance(a, b)</code> — Distance between
                      points
                    </li>
                  </ul>
                </div>
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="font-bold text-white mb-1">MyAvatar</p>
                  <p className="text-[10px] text-slate-400">Access the local user's avatar.</p>
                  <ul className="list-disc pl-4 mt-1 text-[10px] text-slate-400 space-y-0.5">
                    <li>
                      <code className="text-sky-400">MyAvatar.position</code> — Current position
                    </li>
                    <li>
                      <code className="text-sky-400">MyAvatar.orientation</code> — Current rotation
                      quaternion
                    </li>
                    <li>
                      <code className="text-sky-400">MyAvatar.sessionUUID</code> — Unique session ID
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Script Patterns */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                Common Script Patterns
              </h5>
              <div className="space-y-3 text-xs">
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="font-bold text-white mb-1 text-[11px]">Continuous Spin</p>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Rotates entity along Y axis each frame.
                  </p>
                  <pre className="font-mono text-[10px] text-sky-400">{`this.update = function(dt) {
  var r = Entities.getEntityProperties(
    _entityID, "rotation").rotation;
  var nr = Quat.multiply(r,
    Quat.fromPitchYawRollDegrees(0,45*dt,0));
  Entities.editEntity(_entityID, {rotation:nr});
};`}</pre>
                </div>
                <div className="bg-black/20 p-3 rounded-xl">
                  <p className="font-bold text-white mb-1 text-[11px]">Click to Toggle Color</p>
                  <p className="text-[10px] text-slate-400 mb-2">Changes colour when clicked.</p>
                  <pre className="font-mono text-[10px] text-sky-400">{`var colors = [{r:1,g:0,b:0},{r:0,g:1,b:0},{r:0,g:0,b:1}];
var idx = 0;
this.clickReleaseEvent = function(eid) {
  idx = (idx + 1) % colors.length;
  Entities.editEntity(eid, {color: colors[idx]});
};`}</pre>
                </div>
              </div>
            </div>

            {/* Related Scripts */}
            <div className="glass-panel space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Available Scripts
              </h5>
              <p className="text-[10px] text-slate-400">
                Open the <strong className="text-white">Scripting</strong> page and browse the
                Script Depot for pre-built scripts you can load, inspect, and inject onto entities.
              </p>
              <ul className="text-xs space-y-1 text-slate-300">
                <li>
                  <code className="text-sky-400 text-[10px]">spin.js</code> — Attach to any entity
                  to make it rotate
                </li>
                <li>
                  <code className="text-sky-400 text-[10px]">dance-script.js</code> — Skeletal
                  animation for model entities with armatures
                </li>
                <li>
                  <code className="text-sky-400 text-[10px]">overte-mcp-bridge.js</code> — Required
                  bridge; connect to the MCP WebSocket from Interface
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "links" && (
          <div className="glass-panel space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
              <Link2 className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold uppercase tracking-wider text-white">
                Useful Links & Documentation
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://overte.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card flex justify-between items-center group text-slate-300 hover:text-white"
                style={{ textDecoration: "none" }}
              >
                <div>
                  <h5 className="font-bold text-white">Overte Official Website</h5>
                  <p className="text-[10px] text-slate-400">Download clients and servers</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </a>

              <a
                href="https://github.com/overte-org"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card flex justify-between items-center group text-slate-300 hover:text-white"
                style={{ textDecoration: "none" }}
              >
                <div>
                  <h5 className="font-bold text-white">Overte GitHub</h5>
                  <p className="text-[10px] text-slate-400">Overte organization repositories</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
