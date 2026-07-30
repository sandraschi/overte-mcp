import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { useLocation } from "react-router-dom";
import { apiUrl } from "../../lib/api-base";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/avatars": "Avatars",
  "/entities": "Entities Explorer",
  "/scripting": "JS Scripting",
  "/chat": "Chat",
  "/tools": "Tools",
  "/skills": "Skills",
  "/logs": "Logs",
  "/settings": "Settings",
  "/apps-hub": "Apps Hub",
  "/help": "Help Hub",
};

export function Topbar() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "Overte MCP";

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/health"));
      if (!r.ok) throw new Error("offline");
      return r.json();
    },
    refetchInterval: 10000,
    retry: 1,
  });

  return (
    <div
      style={{ borderBottom: "1px solid var(--border-color)", height: "48px" }}
      className="flex items-center justify-between px-6 flex-shrink-0 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5" data-testid="backend-dot">
          <span
            className={`w-2 h-2 rounded-full ${
              health ? "bg-green-500" : "bg-rose-500"
            } animate-pulse`}
          />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {health ? "Connected" : "Offline"}
          </span>
        </div>
        <a
          href={`http://127.0.0.1:11110/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-amber-400 transition-colors"
          title="API Docs"
        >
          <Globe className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
