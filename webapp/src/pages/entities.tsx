import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Code,
  Layers,
  Move,
  Plus,
  RotateCw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  TreePine,
  Waves,
} from "lucide-react";
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

interface NearbyEntity {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  dimensions?: { x: number; y: number; z: number };
  modelURL?: string;
}

export function EntitiesPage() {
  const queryClient = useQueryClient();

  const [spawnName, setSpawnName] = useState("Sandbox Prop");
  const [spawnType, setSpawnType] = useState("Box");
  const [posX, setPosX] = useState(0.0);
  const [posY, setPosY] = useState(1.0);
  const [posZ, setPosZ] = useState(0.0);
  const [modelUrl, setModelUrl] = useState("");
  const [scriptUrl, setScriptUrl] = useState("");

  const [searchRadius, setSearchRadius] = useState(20);
  const [moveTarget, setMoveTarget] = useState<Record<string, { x: string; y: string; z: string }>>(
    {},
  );

  // Server-tracked entities (spawned by this backend process since it last restarted)
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

  // Live nearby search - queries the actual world, including things this backend never spawned
  const {
    data: nearbyData,
    isFetching: nearbyLoading,
    refetch: refetchNearby,
  } = useQuery<{ items: NearbyEntity[]; count: number }>({
    queryKey: ["nearbyEntities", searchRadius],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/nearby"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radius: searchRadius }),
      });
      if (!res.ok) throw new Error("Nearby search failed");
      return res.json();
    },
    enabled: false,
  });

  const spawnMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/overte/spawn"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: spawnName,
          type: spawnType,
          position: [posX, posY, posZ],
          model_url: spawnType === "Model" ? modelUrl : undefined,
          script_url: scriptUrl || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (entityId: string) => {
      const res = await fetch(apiUrl("/api/overte/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["nearbyEntities"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      entityId,
      x,
      y,
      z,
    }: {
      entityId: string;
      x: number;
      y: number;
      z: number;
    }) => {
      const res = await fetch(apiUrl("/api/overte/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId, position: [x, y, z] }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["nearbyEntities"] });
    },
  });

  const animateMutation = useMutation({
    mutationFn: async ({
      entityId,
      mode,
    }: {
      entityId: string;
      mode: "spin" | "bob" | "bounce";
    }) => {
      const res = await fetch(apiUrl("/api/overte/animate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: entityId, mode, duration_s: 5 }),
      });
      return res.json();
    },
  });

  const setMoveField = (id: string, field: "x" | "y" | "z", value: string) => {
    setMoveTarget((prev) => {
      const current = prev[id] || { x: "0", y: "0", z: "0" };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const renderEntityCard = (
    id: string,
    name: string,
    type: string,
    position: number[],
    scale: number[] | undefined,
    scriptUrlVal: string | undefined,
  ) => {
    const move = moveTarget[id] || {
      x: position[0]?.toFixed(2) || "0",
      y: position[1]?.toFixed(2) || "0",
      z: position[2]?.toFixed(2) || "0",
    };
    return (
      <div key={id} className="glass-card space-y-3 relative group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">{name}</p>
              <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-slate-400">
              {type}
            </span>
            <button
              onClick={() => deleteMutation.mutate(id)}
              disabled={deleteMutation.isPending}
              title="Delete entity"
              style={{ background: "none", border: "1px solid transparent", borderRadius: "6px" }}
              className="p-1 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[10px] bg-black/20 p-2.5 rounded-lg border border-white/[0.03]">
          <div className="flex justify-between">
            <span className="text-slate-500">Position:</span>
            <span className="font-mono text-slate-300">
              [{position.map((n) => n.toFixed(1)).join(", ")}]
            </span>
          </div>
          {scale && (
            <div className="flex justify-between">
              <span className="text-slate-500">Scale:</span>
              <span className="font-mono text-slate-300">
                [{scale.map((n) => n.toFixed(1)).join(", ")}]
              </span>
            </div>
          )}
        </div>

        {scriptUrlVal && (
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg">
            <Code className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="font-mono text-ellipsis overflow-hidden whitespace-nowrap w-full">
              {scriptUrlVal}
            </span>
          </div>
        )}

        {/* Move */}
        <div className="flex items-center gap-1.5">
          {(["x", "y", "z"] as const).map((axis) => (
            <input
              key={axis}
              type="number"
              step="0.1"
              value={move[axis]}
              onChange={(e) => setMoveField(id, axis, e.target.value)}
              placeholder={axis.toUpperCase()}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "4px 6px",
                color: "white",
                width: "100%",
                fontSize: "10px",
              }}
            />
          ))}
          <button
            onClick={() =>
              moveMutation.mutate({
                entityId: id,
                x: Number(move.x),
                y: Number(move.y),
                z: Number(move.z),
              })
            }
            disabled={moveMutation.isPending}
            title="Move to these coordinates"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "6px",
            }}
            className="p-1.5 text-indigo-300 hover:text-white cursor-pointer transition-all flex-shrink-0"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animate */}
        <div className="flex items-center gap-1.5">
          {(["spin", "bob", "bounce"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => animateMutation.mutate({ entityId: id, mode })}
              disabled={animateMutation.isPending}
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "6px",
                padding: "4px 8px",
                flex: 1,
              }}
              className="text-[9px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/15 cursor-pointer transition-all flex items-center justify-center gap-1"
            >
              {mode === "spin" ? <RotateCw className="w-3 h-3" /> : <Waves className="w-3 h-3" />}
              {mode} 5s
            </button>
          ))}
        </div>
      </div>
    );
  };

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
              Spawn, move, animate, and delete interactive domain entities
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
                  <option value="Shape">Shape (Cylinder/Torus/Dodecahedron/...)</option>
                  <option value="Model">3D Model (GLB/FBX)</option>
                  <option value="ParticleEffect">Particle Effect (fire/smoke/...)</option>
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
                    placeholder="https://assets/mesh.glb (or pick one from the Models depot)"
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

          {/* Live nearby search */}
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Search className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Nearby (Live)
              </h3>
            </div>
            <p className="text-[10px] text-slate-500">
              Queries the actual world via Entities.findEntities — includes anything already there,
              not just what this backend spawned.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "white",
                  width: "80px",
                }}
              />
              <span className="text-[10px] text-slate-500">meters, around you</span>
              <button
                onClick={() => refetchNearby()}
                disabled={nearbyLoading}
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                className="text-[10px] font-bold text-indigo-300 hover:text-white cursor-pointer transition-all ml-auto"
              >
                {nearbyLoading ? "Searching..." : "Search"}
              </button>
            </div>
            {nearbyData && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {nearbyData.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between text-[10px] bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/[0.03]"
                  >
                    <span className="text-slate-300 truncate">{it.name || "(unnamed)"}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-slate-500 uppercase">{it.type}</span>
                      <button
                        onClick={() => deleteMutation.mutate(it.id)}
                        title="Delete"
                        style={{ background: "none", border: "none" }}
                        className="text-slate-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {nearbyData.items.length === 0 && (
                  <p className="text-[10px] text-slate-500 text-center py-2">
                    Nothing found in range.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Entity Tree Explorer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Server-Tracked Entities
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                {entities.length} items
              </span>
            </div>
            <p className="text-[10px] text-slate-500 -mt-2">
              Only entities spawned by this backend since it last restarted. Use Nearby (Live) on
              the left for anything else already in the world.
            </p>

            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Loading scene graph...</p>
            ) : (
              <div className="space-y-4">
                {entities.map((ent) =>
                  renderEntityCard(
                    ent.id,
                    ent.name,
                    ent.type,
                    ent.position,
                    ent.scale,
                    ent.script_url,
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
