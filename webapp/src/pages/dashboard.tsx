import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  Monitor,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Square,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface DomainNode {
  type?: string;
  uuid?: string;
  public?: { ip?: string };
}

interface DomainInfo {
  host: string;
  port: number;
  nodes: DomainNode[];
  settings: Record<string, unknown>;
}

interface AppDetect {
  installed: boolean;
  paths: Record<string, string | null>;
  running: Record<string, boolean>;
}

const APP_LABELS: Record<string, string> = {
  "domain-server": "Domain Server",
  interface: "Interface Client",
};

export function Dashboard() {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(40100);
  const [appDetect, setAppDetect] = useState<AppDetect | null>(null);
  const [appLoading, setAppLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(apiUrl("/api/overte/app/detect"))
      .then((r) => r.json())
      .then(setAppDetect)
      .catch(() => {});
  }, []);

  const appAction = useCallback(async (target: string, action: "start" | "stop") => {
    setAppLoading((p) => ({ ...p, [target]: true }));
    try {
      const res = await fetch(apiUrl(`/api/overte/app/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail ?? "Action failed");
      }
    } catch {
      alert("Action failed -- backend unreachable");
    } finally {
      setAppLoading((p) => ({ ...p, [target]: false }));
      // Refresh detect after action
      fetch(apiUrl("/api/overte/app/detect"))
        .then((r) => r.json())
        .then(setAppDetect)
        .catch(() => {});
    }
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery<{
    domain: DomainInfo;
    source: "live" | "simulated";
    warning?: string;
  }>({
    queryKey: ["domainStatus", host, port],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/overte/status?host=${host}&port=${port}`));
      if (!res.ok) throw new Error("Server connection offline");
      return res.json();
    },
  });

  const domain = data?.domain;
  const avatarNodes = (domain?.nodes || []).filter((n) =>
    ["agent", "avatar-mixer"].includes(n.type ?? ""),
  );

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard">
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
            <p className="text-xs text-slate-400">Overte domain-server node monitoring</p>
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

      {/* Hero */}
      <div
        className="glass-panel border border-amber-500/10"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)",
          padding: "24px",
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Overte Open-Source Social VR
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Self-hosted virtual worlds platform. Run your own domain server, spawn entities,
              inject JavaScript behaviours, and host multi-user VR spaces &mdash; all from this
              dashboard.
            </p>
            <a
              href="https://overte.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              overte.org
            </a>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center px-4" data-testid="kpi-nodes">
              <p className="text-2xl font-bold text-white">
                {domain?.nodes?.length ?? (isLoading ? "..." : "0")}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Nodes</p>
            </div>
            <div className="text-center px-4" data-testid="kpi-server">
              <p className="text-2xl font-bold text-white font-mono text-sm">
                {domain?.host ?? host}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Server</p>
            </div>
          </div>
        </div>
      </div>

      {/* App Status */}
      <div className="glass-panel" style={{ padding: "16px" }} data-testid="app-status">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 mb-3">
          <Monitor className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Overte Application
          </h3>
        </div>
        {!appDetect ? (
          <p className="text-xs text-slate-400 animate-pulse">Detecting installation...</p>
        ) : !appDetect.installed ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Download className="w-3.5 h-3.5" />
            <span>
              Not installed.{" "}
              <a
                href="https://overte.org/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 underline"
              >
                Download Overte
              </a>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.keys(APP_LABELS).map((key) => {
              const installed = !!appDetect.paths[key];
              const running = !!appDetect.running[key];
              const loading = !!appLoading[key];
              return (
                <div
                  key={key}
                  className="glass-card flex items-center gap-3"
                  style={{ padding: "8px 14px", borderRadius: "8px", minWidth: "220px" }}
                  data-testid={`app-status-${key}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: running ? "#10b981" : installed ? "#6b7280" : "#ef4444" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{APP_LABELS[key]}</p>
                    <p className="text-[10px] text-slate-500">
                      {!installed ? "Not found" : running ? "Running" : "Stopped"}
                    </p>
                  </div>
                  {installed &&
                    (running ? (
                      <button
                        onClick={() => appAction(key, "stop")}
                        disabled={loading}
                        className="p-1 rounded hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Stop"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => appAction(key, "start")}
                        disabled={loading}
                        className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Start"
                      >
                        {loading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data?.source === "simulated" && (
        <div className="glass-panel border border-amber-500/30 flex items-center gap-2 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            {data.warning ?? "Showing simulated data -- no live domain-server reachable."}
          </span>
        </div>
      )}

      {/* Connection Config Bar */}
      <div className="glass-panel" style={{ padding: "16px" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Domain Host
            </label>
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
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Port
            </label>
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
        {/* Left Column: Domain Info */}
        <div className="md:col-span-8 space-y-6">
          <div className="glass-panel space-y-6">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Globe className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Domain Overview
              </h3>
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
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    Server Target
                  </span>
                  <p className="text-sm font-bold text-white font-mono">
                    {domain.host}:{domain.port}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    Connected Nodes
                  </span>
                  <p className="text-sm font-bold text-white">{domain.nodes?.length ?? 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Avatar-like nodes */}
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Inhabited Presence
              </h3>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Reading node list...</p>
            ) : !domain || avatarNodes.length === 0 ? (
              <p className="text-xs text-slate-400">No avatar nodes in this domain</p>
            ) : (
              <div className="space-y-2">
                {avatarNodes.map((n, i) => (
                  <div key={n.uuid ?? i} className="glass-card flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{n.type}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{n.uuid}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {n.public?.ip ?? "unknown"}
                    </p>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Domain Settings
              </h3>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Reading configuration...</p>
            ) : !domain || Object.keys(domain.settings || {}).length === 0 ? (
              <p className="text-xs text-slate-400">No settings returned</p>
            ) : (
              <div className="space-y-3 text-xs">
                {Object.entries(domain.settings).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-white/[0.03] pb-1.5"
                  >
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
