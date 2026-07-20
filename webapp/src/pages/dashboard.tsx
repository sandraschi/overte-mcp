import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Globe, RefreshCw, ShieldAlert, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

interface DomainInfo {
  name: string;
  host: string;
  port: number;
  uptime_seconds: number;
  active_avatars: Array<{ name: string; uuid: string; position: number[] }>;
  settings: Record<string, string | number | boolean>;
}

export function Dashboard() {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(40100);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ domain: DomainInfo }>({
    queryKey: ["domainStatus", host, port],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/vircadia/status?host=${host}&port=${port}`));
      if (!res.ok) throw new Error("Server connection offline");
      return res.json();
    },
  });

  const domain = data?.domain;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Domain Control Panel
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400">Decentralized domain node monitoring and asset mapping</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
      </div>

      {/* Connection Config Bar */}
      <div className="glass-panel" style={{ padding: "16px" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Domain Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontSize: "12px",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontSize: "12px",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Grid Panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: World Info */}
        <div className="md:col-span-8 space-y-6">
          <div className="glass-panel space-y-6">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Globe className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Domain Overview</h3>
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Querying server node...</p>
            ) : !domain ? (
              <div className="flex items-center gap-2 text-rose-400 text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Domain Server Offline. Verify port and try again.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">World Name</span>
                  <p className="text-sm font-bold text-white">{domain.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Uptime</span>
                  <p className="text-sm font-bold text-white">{Math.round(domain.uptime_seconds / 3600)} Hours</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Server Target</span>
                  <p className="text-sm font-bold text-white font-mono">{domain.host}:{domain.port}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Audio Protocol</span>
                  <p className="text-sm font-bold text-white">{domain.settings.audio_spatialization || "Stereo Mix"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Avatars in Dashboard */}
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Inhabited Presence</h3>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Reading presence logs...</p>
            ) : !domain || domain.active_avatars.length === 0 ? (
              <p className="text-xs text-slate-400">No active avatars in this zone</p>
            ) : (
              <div className="space-y-2">
                {domain.active_avatars.map((av) => (
                  <div key={av.uuid} className="glass-card flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{av.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{av.uuid}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">[{av.position.join(", ")}]</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="md:col-span-4 space-y-6">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Cpu className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">System Settings</h3>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Reading configuration...</p>
            ) : !domain ? (
              <p className="text-xs text-slate-400">Settings unavailable</p>
            ) : (
              <div className="space-y-3 text-xs">
                {Object.entries(domain.settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-slate-500 capitalize">{key.replace("_", " ")}</span>
                    <span className="font-bold text-white">{String(value)}</span>
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
