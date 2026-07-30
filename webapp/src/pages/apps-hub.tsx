import { useQuery } from "@tanstack/react-query";
import { AppWindow, ExternalLink, Globe, WifiOff } from "lucide-react";

interface FleetApp {
  name: string;
  port: number;
  label: string;
  description: string;
  reachable: boolean;
}

const FLEET_APPS: FleetApp[] = [
  {
    name: "overte-mcp",
    port: 11110,
    label: "Overte MCP",
    description: "VR domain administration",
    reachable: true,
  },
  {
    name: "resonite-mcp",
    port: 10978,
    label: "Resonite MCP",
    description: "VR world browser",
    reachable: false,
  },
  {
    name: "vrchat-mcp",
    port: 10712,
    label: "VRChat MCP",
    description: "World dashboard",
    reachable: false,
  },
  {
    name: "godot-mcp",
    port: 10992,
    label: "Godot MCP",
    description: "Engine dashboard",
    reachable: false,
  },
  {
    name: "avatar-mcp",
    port: 10792,
    label: "Avatar MCP",
    description: "VRM management",
    reachable: false,
  },
  {
    name: "gazebo-mcp",
    port: 10990,
    label: "Gazebo MCP",
    description: "Simulation dashboard",
    reachable: false,
  },
];

async function probePort(port: number, label: string): Promise<FleetApp> {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return {
      name: label.toLowerCase().replace(/\s+/g, "-"),
      port,
      label,
      description: "",
      reachable: r.ok,
    };
  } catch {
    return {
      name: label.toLowerCase().replace(/\s+/g, "-"),
      port,
      label,
      description: "",
      reachable: false,
    };
  }
}

export function AppsHubPage() {
  const { data: probeResults } = useQuery({
    queryKey: ["fleet-probe"],
    queryFn: async () => Promise.all(FLEET_APPS.map((a) => probePort(a.port, a.label))),
    refetchInterval: 30000,
  });
  const apps = probeResults || FLEET_APPS;

  return (
    <div className="space-y-6 animate-fade-in">
      <div style={{ borderBottom: "1px solid var(--border-color)" }} className="pb-4">
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <AppWindow className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Apps Hub</h2>
            <p className="text-xs text-slate-400">Fleet MCP webapps on this machine</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <div
            key={app.name}
            className={`glass-card transition-all ${app.reachable ? "" : "opacity-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {app.reachable ? (
                  <Globe className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">{app.label}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">:{app.port}</p>
                </div>
              </div>
              {app.reachable && (
                <a
                  href={`http://127.0.0.1:${app.port}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
