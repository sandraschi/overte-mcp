import { useQuery } from "@tanstack/react-query";
import { Download, Filter, Terminal } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

interface LogEntry {
  ts: string;
  source: string;
  level: string;
  message: string;
}

export function LogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>("");
  const { data, isLoading, refetch } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ["logs", levelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (levelFilter) params.set("level", levelFilter);
      const r = await fetch(apiUrl(`/api/logs?${params}`));
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 5000,
  });
  const logs = data?.logs || [];
  const exportLogs = () => {
    if (logs.length === 0) return;
    const text = logs.map((l) => `[${l.ts}] [${l.level}] [${l.source}] ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overte-mcp-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)" }}
        className="pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Terminal className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Logs</h2>
            <p className="text-xs text-slate-400">
              Backend activity log — {data?.total || 0} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "white",
              fontSize: "11px",
            }}
            className="px-2 py-1.5 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All levels</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Refresh"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel max-h-[65vh] overflow-y-auto font-mono">
        {isLoading ? (
          <p className="text-xs text-slate-400 animate-pulse p-4">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 text-center">No log entries.</p>
        ) : (
          <div className="space-y-0">
            {logs.map((entry, i) => (
              <div
                key={i}
                className="flex gap-3 text-[11px] px-4 py-1.5 border-b border-white/[0.02] last:border-0 text-slate-300"
              >
                <span className="text-slate-600 shrink-0 w-20">{entry.ts.slice(11, 19)}</span>
                <span
                  className={`shrink-0 w-16 font-bold ${entry.level === "ERROR" ? "text-rose-400" : entry.level === "WARNING" ? "text-amber-400" : "text-emerald-400"}`}
                >
                  {entry.level}
                </span>
                <span className="text-slate-600 shrink-0 w-24">{entry.source}</span>
                <span className="break-all">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
