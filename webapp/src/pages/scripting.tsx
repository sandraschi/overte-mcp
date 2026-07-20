import { useMutation } from "@tanstack/react-query";
import { Code, Play, RefreshCw, Send, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

export function ScriptingPage() {
  const [entityId, setEntityId] = useState("eeb24f2a-c602-4bf1-a8e9-42b78b09c12b");
  const [scriptUrl, setScriptUrl] = useState("http://localhost:10989/scripts/spin.js");
  const [scriptCode, setScriptCode] = useState(`// Vircadia In-World Entity Behavior Script
(function() {
  var _entityID;

  this.preload = function(entityID) {
    _entityID = entityID;
    console.log("Entity script loaded for: " + _entityID);
  };

  // Simple spin animation handler
  this.update = function(deltaTime) {
    var rotation = Entities.getEntityProperties(_entityID, "rotation").rotation;
    var newRotation = Quat.multiply(rotation, Quat.fromPitchYawRollDegrees(0, 45 * deltaTime, 0));
    Entities.editEntity(_entityID, { rotation: newRotation });
  };
});
`);

  const [speed, setSpeed] = useState(45.0);

  const injectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/vircadia/inject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: entityId,
          script_url: scriptUrl,
          script_data: { speed: speed },
        }),
      });
      return res.json();
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Terminal className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              JavaScript Scripting Sandbox
            </h2>
            <p className="text-xs text-slate-400">
              Compose and inject live ES6 scripts to govern in-world entities
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Script Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Play className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Injection Parameters
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Target Entity UUID
                </label>
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                  className="focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Hosted Script URL
                </label>
                <input
                  type="text"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                  className="focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Animation Speed (Scope Variable)
                </label>
                <input
                  type="number"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                  className="focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                onClick={() => injectMutation.mutate()}
                disabled={injectMutation.isPending}
                style={{
                  background: "linear-gradient(to right, var(--accent-amber), #d97706)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                  width: "100%",
                }}
                className="font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {injectMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Hot-Inject Script URL
              </button>

              {injectMutation.isSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>Script updated in Sandbox simulation</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Code className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                JavaScript Source
              </h3>
            </div>

            <div className="relative">
              <textarea
                value={scriptCode}
                onChange={(e) => setScriptCode(e.target.value)}
                rows={16}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  color: "#38bdf8",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
                className="focus:outline-none focus:border-amber-500/30"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
