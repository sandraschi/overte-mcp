import { useMutation, useQuery } from "@tanstack/react-query";
import { Box, Code, Layers, Plus, Send, ShieldAlert, TreePine } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

interface Entity {
  id: string;
  name: string;
  type: string;
  position: number[];
  scale: number[];
  model_url?: string;
  script_url?: string;
}

export function EntitiesPage() {
  const [spawnName, setSpawnName] = useState("Sandbox Prop");
  const [spawnType, setSpawnType] = useState("Box");
  const [posX, setPosX] = useState(0.0);
  const [posY, setPosY] = useState(1.0);
  const [posZ, setPosZ] = useState(0.0);
  const [modelUrl, setModelUrl] = useState("");
  const [scriptUrl, setScriptUrl] = useState("");

  // Retrieve entities list from server-side tracking
  const { data, isLoading, refetch } = useQuery<{ items: Entity[]; source: string }>({
    queryKey: ["entitiesList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/entities"));
      if (!res.ok) throw new Error("Failed to load entities");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const entities = data?.items || [];
  const source = data?.source;

  const spawnMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/overte/spawn"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spawnName,
          type: spawnType,
          position: [posX, posY, posZ],
          scale: [1.0, 1.0, 1.0],
          model_url: spawnType === "Model" ? modelUrl : undefined,
          script_url: scriptUrl || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: () => refetch(),
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
            <TreePine className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Entity Tree Explorer
            </h2>
            <p className="text-xs text-slate-400">
              Traverse, edit, and spawn interactive domain entities
            </p>
          </div>
        </div>
      </div>

      {source === "simulated" && (
        <div className="glass-panel border border-amber-500/30 flex items-center gap-2 text-amber-300 text-xs px-4 py-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Bridge disconnected — showing only server-tracked entities. Load overte-mcp-bridge.js in
            Interface for live operations.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Entity Spawner Box */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Plus className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Spawn Entity
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Entity Name
                </label>
                <input
                  type="text"
                  value={spawnName}
                  onChange={(e) => setSpawnName(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Type
                </label>
                <select
                  value={spawnType}
                  onChange={(e) => setSpawnType(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                  className="focus:outline-none focus:border-amber-500/50"
                >
                  <option value="Box">Box (Primitive)</option>
                  <option value="Sphere">Sphere (Primitive)</option>
                  <option value="Model">3D Model (GLB/FBX)</option>
                  <option value="Web">Web Overlay (URL)</option>
                  <option value="Light">Spatial Light</option>
                </select>
              </div>

              {spawnType === "Model" && (
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Model Resource URL
                  </label>
                  <input
                    type="text"
                    value={modelUrl}
                    onChange={(e) => setModelUrl(e.target.value)}
                    placeholder="https://assets/mesh.glb"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "white",
                    }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Attach JavaScript URL
                </label>
                <input
                  type="text"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="http://goliath/scripts/my_script.js"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "white",
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Spawn Coordinates
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    placeholder="X"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px",
                      color: "white",
                      textAlign: "center",
                    }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    placeholder="Y"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px",
                      color: "white",
                      textAlign: "center",
                    }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={posZ}
                    onChange={(e) => setPosZ(Number(e.target.value))}
                    placeholder="Z"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px",
                      color: "white",
                      textAlign: "center",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => spawnMutation.mutate()}
                disabled={spawnMutation.isPending}
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
                <Send className="w-4 h-4" />
                Spawn Entity
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Entity Tree Explorer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Domain Entity Tree
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                {entities.length} items
              </span>
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Loading scene graph...</p>
            ) : (
              <div className="space-y-4">
                {entities.map((ent) => (
                  <div key={ent.id} className="glass-card space-y-3 relative group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">{ent.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">
                            {ent.id}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-slate-400">
                        {ent.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] bg-black/20 p-2.5 rounded-lg border border-white/[0.03]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Position:</span>
                        <span className="font-mono text-slate-300">
                          [{ent.position.map((n) => n.toFixed(1)).join(", ")}]
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scale:</span>
                        <span className="font-mono text-slate-300">
                          [{ent.scale.map((n) => n.toFixed(1)).join(", ")}]
                        </span>
                      </div>
                    </div>

                    {ent.script_url && (
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg">
                        <Code className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="font-mono text-ellipsis overflow-hidden whitespace-nowrap w-full">
                          {ent.script_url}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
