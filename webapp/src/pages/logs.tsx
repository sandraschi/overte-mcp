import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Bug, Info, Play, RefreshCw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface LogEntry {
  timestamp: string;
  source: string;
  level: string;
  message: string;
}

const LOG_LEVELS = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];

const levelConfig: Record<string, { icon: typeof Info; color: string }> = {
  INFO: { icon: Info, color: "#94a3b8" },
  WARNING: { icon: AlertTriangle, color: "#f59e0b" },
  ERROR: { icon: AlertCircle, color: "#f43f5e" },
  DEBUG: { icon: Bug, color: "#818cf8" },
};

export function LogsPage() {
  const [level, setLevel] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ["logs", level],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (level !== "ALL") params.set("level", level);
      const r = await fetch(apiUrl(`/api/logs?${params}`));
      if (!r.ok) return [];
      return r.json();
    },
  });

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => refetch(), 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refetch]);

  const logs = data || [];

  return (
    <div data-testid="logs-page" className="space-y-6 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Bug className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Logs</h2>
            <p className="text-xs text-slate-400">Server event log stream</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            data-testid="logs-filter"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "white",
              fontSize: "12px",
            }}
            className="focus:outline-none focus:border-amber-500/50"
          >
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
            }}
            className="text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? "rgba(245, 158, 11, 0.15)" : "none",
              border: `1px solid ${autoRefresh ? "rgba(245, 158, 11, 0.3)" : "var(--border-color)"}`,
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
            }}
            className={`transition-all ${autoRefresh ? "text-amber-500" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            title={autoRefresh ? "Stop auto-refresh" : "Auto-refresh every 5s"}
          >
            {autoRefresh ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {autoRefresh && (
        <div className="flex items-center gap-2 text-[10px] text-amber-500">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          Auto-refreshing every 5s
        </div>
      )}

      <div
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
        }}
        className="overflow-hidden"
      >
        {isLoading && logs.length === 0 ? (
          <div className="p-6">
            <p className="text-xs text-slate-500 animate-pulse">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <p className="text-xs text-slate-500">No log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry, i) => {
                  const cfg = levelConfig[entry.level?.toUpperCase()] || levelConfig.INFO;
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                        {entry.timestamp || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px] whitespace-nowrap max-w-[150px] truncate">
                        {entry.source || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          style={{ color: cfg.color }}
                          className="flex items-center gap-1.5 text-[10px] font-bold"
                        >
                          <Icon className="w-3 h-3" />
                          {entry.level || "INFO"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 font-mono text-[10px] whitespace-pre-wrap">
                        {entry.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Showing {logs.length} entry{logs.length !== 1 ? "ies" : "y"}
        {level !== "ALL" ? ` at level ${level}` : ""}
      </p>
    </div>
  );
}
