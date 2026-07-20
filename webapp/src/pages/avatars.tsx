import { useQuery } from "@tanstack/react-query";
import { Headphones, RefreshCw, User, Volume2 } from "lucide-react";
import { apiUrl } from "../lib/api-base";

interface Node {
  type?: string;
  uuid?: string;
  public?: { ip?: string };
}

export function AvatarsPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    domain: { nodes: Node[] };
  }>({
    queryKey: ["avatarsList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/status"));
      if (!res.ok) throw new Error("Failed to load avatars");
      return res.json();
    },
  });

  // NOTE: nodes.json's real shape hasn't been verified against a live domain-server
  // yet (see ARCHITECTURE.md). This filter is a best guess at which node "type"
  // values represent connected avatars -- expect to adjust once tested for real.
  const avatarNodes = (data?.domain?.nodes || []).filter((n) =>
    ["agent", "avatar-mixer"].includes(n.type ?? ""),
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Headphones className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Avatar Mixer Console
            </h2>
            <p className="text-xs text-slate-400">
              Live spatial audio feeds and presence coordinates
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
          className="text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grid of connected nodes (filtered to avatar-like types) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-panel h-48 animate-pulse" />
          ))}
        </div>
      ) : avatarNodes.length === 0 ? (
        <div className="glass-panel text-center py-12 space-y-2">
          <User className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400 font-bold">No avatar nodes in the domain</p>
          <p className="text-xs text-slate-500">
            Connect using the Overte Interface client to join.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {avatarNodes.map((n, i) => (
            <div key={n.uuid ?? i} className="glass-panel space-y-4 relative overflow-hidden group">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{n.type ?? "unknown"}</h4>
                  <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">
                    {n.uuid ?? "no-uuid"}
                  </p>
                </div>
              </div>

              {/* Overte server-side audio -- per-avatar gain isn't exposed by nodes.json,
                  so this panel is intentionally omitted until a real source for it exists. */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 border-t border-white/[0.05] pt-3">
                <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                Spatial audio gain not available from nodes.json
              </div>

              {/* Node IP telemetry */}
              <div className="flex justify-between items-center text-[10px] bg-black/25 p-2.5 rounded-lg border border-white/[0.03] font-mono">
                <span className="text-slate-500 font-bold uppercase tracking-wide">IP</span>
                <span className="text-slate-300">{n.public?.ip ?? "unknown"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
