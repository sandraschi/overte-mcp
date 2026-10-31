import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Inbox as InboxIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface LogEntry {
  ts: string;
  source: string;
  level: string;
  message: string;
}

const PAGE_SIZE = 20;

export function InboxPage() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ["inboxLogs"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/logs?limit=200"));
      if (!r.ok) throw new Error("Failed to load server events");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const logs = data?.logs || [];
  const sources = useMemo(() => [...new Set(logs.map((l) => l.source))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = logs.filter((l) => {
      if (level !== "all" && l.level.toUpperCase() !== level) return false;
      if (source !== "all" && l.source !== source) return false;
      if (q && !`${l.message} ${l.source}`.toLowerCase().includes(q)) return false;
      return true;
    });
    rows.sort((a, b) => (ascending ? a.ts.localeCompare(b.ts) : b.ts.localeCompare(a.ts)));
    return rows;
  }, [logs, search, level, source, ascending]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetPage = () => setPage(0);

  return (
    <div data-testid="inbox-page" className="space-y-6 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <InboxIcon className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Inbox</h2>
          <p className="text-sm text-slate-300">
            Server events that need attention - bridge drops, domain errors, warnings
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            marginLeft: "auto",
          }}
          className="text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          title="Refresh events"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="glass-panel flex flex-col md:flex-row gap-3">
        <input
          data-testid="inbox-search"
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          placeholder="Search messages and sources..."
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "white",
            fontSize: "14px",
          }}
          className="focus:outline-none focus:border-amber-500/50"
        />
        <select
          data-testid="inbox-level-filter"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            resetPage();
          }}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "white",
            fontSize: "14px",
          }}
          className="focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">All levels</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
          <option value="DEBUG">Debug</option>
        </select>
        <select
          data-testid="inbox-source-filter"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            resetPage();
          }}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "white",
            fontSize: "14px",
          }}
          className="focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          data-testid="inbox-sort"
          onClick={() => setAscending((v) => !v)}
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
          className="text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
          title={ascending ? "Oldest first" : "Newest first"}
        >
          <ArrowDownUp className="w-4 h-4" />
          {ascending ? "Oldest" : "Newest"}
        </button>
      </div>

      {isLoading && logs.length === 0 ? (
        <p className="text-sm text-slate-300 animate-pulse">Loading events...</p>
      ) : isError ? (
        <p className="text-sm text-rose-400">Failed to load events. Is the backend running?</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-300">No events match. The server is quiet.</p>
      ) : (
        <div className="space-y-2">
          <p data-testid="inbox-count" className="text-sm text-slate-300">
            {filtered.length} of {logs.length} events - page {safePage + 1} of {pageCount}
          </p>
          {pageRows.map((l, i) => (
            <div
              key={`${l.ts}-${i}`}
              className={`glass-card ${
                l.level.toUpperCase() === "ERROR"
                  ? "border-rose-500/20"
                  : l.level.toUpperCase() === "WARNING"
                    ? "border-amber-500/20"
                    : ""
              }`}
              style={{ padding: "10px 14px" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-sm font-bold uppercase ${
                    l.level.toUpperCase() === "ERROR"
                      ? "text-rose-400"
                      : l.level.toUpperCase() === "WARNING"
                        ? "text-amber-400"
                        : "text-slate-300"
                  }`}
                >
                  {l.level}
                </span>
                <span className="text-sm text-slate-300 font-mono">{l.source}</span>
                <span className="text-sm text-slate-300 ml-auto">
                  {new Date(l.ts).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{l.message}</p>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <button
              data-testid="inbox-prev"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              style={{
                background: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: safePage === 0 ? "default" : "pointer",
                opacity: safePage === 0 ? 0.4 : 1,
              }}
              className="text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Prev
            </button>
            <button
              data-testid="inbox-next"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              style={{
                background: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: safePage >= pageCount - 1 ? "default" : "pointer",
                opacity: safePage >= pageCount - 1 ? 0.4 : 1,
              }}
              className="text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
