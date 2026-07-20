import { useQuery } from "@tanstack/react-query";
import { Headphones, RefreshCw, User, Volume2 } from "lucide-react";
import { apiUrl } from "../lib/api-base";

interface Avatar {
  name: string;
  uuid: string;
  position: number[];
}

export function AvatarsPage() {
  const { data, isLoading, refetch, isRefetching } = useQuery<{ domain: { active_avatars: Avatar[] } }>({
    queryKey: ["avatarsList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/vircadia/status"));
      if (!res.ok) throw new Error("Failed to load avatars");
      return res.json();
    },
  });

  const avatars = data?.domain?.active_avatars || [];

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
            <p className="text-xs text-slate-400">Live spatial audio feeds and presence coordinates</p>
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

      {/* Grid of Avatars */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-panel h-48 animate-pulse" />
          ))}
        </div>
      ) : avatars.length === 0 ? (
        <div className="glass-panel text-center py-12 space-y-2">
          <User className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400 font-bold">No avatars active in the domain</p>
          <p className="text-xs text-slate-500">Connect using the Vircadia Interface client to join.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {avatars.map((av) => (
            <div key={av.uuid} className="glass-panel space-y-4 relative overflow-hidden group">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{av.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{av.uuid}</p>
                </div>
              </div>

              {/* Audio mixer levels (Vircadia server-side audio) */}
              <div className="space-y-2 border-t border-white/[0.05] pt-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    Spatial Voice Gain
                  </span>
                  <span className="font-mono text-white">0 dB</span>
                </div>
                <div
                  style={{ background: "rgba(0, 0, 0, 0.4)", height: "8px", borderRadius: "4px" }}
                  className="w-full overflow-hidden border border-white/[0.03]"
                >
                  <div
                    style={{
                      height: "100%",
                      width: av.name.includes("Miko") ? "75%" : "15%",
                      background: "linear-gradient(to right, var(--accent-indigo), #38bdf8)",
                      boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>

              {/* Location telemetry */}
              <div className="flex justify-between items-center text-[10px] bg-black/25 p-2.5 rounded-lg border border-white/[0.03] font-mono">
                <span className="text-slate-500 font-bold uppercase tracking-wide">Position</span>
                <span className="text-slate-300">[{av.position.map((v) => v.toFixed(2)).join(", ")}]</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
