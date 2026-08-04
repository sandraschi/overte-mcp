import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

interface ToolSchema {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

const portmanteauPatterns = [
  /^[a-z]+_(?:op|action|operation)$/i,
  /^[a-z]+_(?:list|get|set|create|delete|update|search|find)/i,
];

function looksLikePortmanteau(name: string): boolean {
  return portmanteauPatterns.some((p) => p.test(name));
}

export function ToolsPage() {
  const [search, setSearch] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const {
    data: tools,
    isLoading,
    error,
  } = useQuery<ToolSchema[]>({
    queryKey: ["tools"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/tools"));
      if (!r.ok) throw new Error("Failed to fetch tools");
      const data = await r.json();
      // Backend returns {"tools": [...]}; tolerate a bare array too.
      if (Array.isArray(data)) return data;
      return Array.isArray(data?.tools) ? data.tools : [];
    },
  });

  const filtered = (tools || []).filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div data-testid="tools-page" className="space-y-6 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <Wrench className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Tools</h2>
          <p className="text-xs text-slate-400">Discover available MCP tools and their schemas</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel" style={{ padding: "12px" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            data-testid="tools-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools by name..."
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "10px 14px 10px 36px",
              color: "white",
              fontSize: "13px",
            }}
            className="focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Tool list */}
      {isLoading ? (
        <div className="glass-panel">
          <p className="text-xs text-slate-500 animate-pulse">Loading tools...</p>
        </div>
      ) : error ? (
        <div className="glass-panel">
          <p className="text-xs text-rose-400">Failed to load tools. Is the backend running?</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel">
          <p className="text-xs text-slate-500">
            {search ? "No tools match your search." : "No tools discovered."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tool) => {
            const isPortmanteau = looksLikePortmanteau(tool.name);
            const isExpanded = expandedTool === tool.name;
            return (
              <div key={tool.name} className="glass-panel space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono truncate">
                        {tool.name}
                      </span>
                      {isPortmanteau && (
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/30 rounded px-1.5 py-0.5 shrink-0">
                          Portmanteau
                        </span>
                      )}
                    </div>
                    {tool.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tool.description}</p>
                    )}
                  </div>
                  {tool.inputSchema && (
                    <button
                      onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "4px",
                        cursor: "pointer",
                      }}
                      className="text-slate-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {isExpanded && tool.inputSchema && (
                  <div
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Input Schema
                    </p>
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tools && (
        <p className="text-[10px] text-slate-600 text-center">
          {tools.length} tool{tools.length !== 1 ? "s" : ""} discovered
          {search ? ` · ${filtered.length} match${filtered.length !== 1 ? "es" : ""}` : ""}
        </p>
      )}
    </div>
  );
}
