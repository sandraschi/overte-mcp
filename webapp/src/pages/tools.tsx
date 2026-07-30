import { useQuery } from "@tanstack/react-query";
import { Code, Search, Terminal } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "../lib/api-base";

interface ToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

export function ToolsPage() {
  const [search, setSearch] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{ tools: ToolInfo[] }>({
    queryKey: ["tools"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/tools"));
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const tools = (data?.tools || []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div style={{ borderBottom: "1px solid var(--border-color)" }} className="pb-4">
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Terminal className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">MCP Tools</h2>
            <p className="text-xs text-slate-400">Registered Overte MCP tools</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "white",
            paddingLeft: "36px",
          }}
          className="w-full px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-400 animate-pulse">Loading tools...</p>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <button
              key={tool.name}
              onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
              className="glass-panel cursor-pointer w-full text-left"
            >
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white font-mono">{tool.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{tool.description}</p>
                </div>
              </div>
              {expandedTool === tool.name && tool.inputSchema && (
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <pre className="text-[10px] text-slate-400 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                </div>
              )}
            </button>
          ))}
          {tools.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">No tools found.</p>
          )}
        </div>
      )}
    </div>
  );
}
