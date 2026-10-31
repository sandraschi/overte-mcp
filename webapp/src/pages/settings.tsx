import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Database, Gpu, Network, Server, Wifi } from "lucide-react";
import { useEffect } from "react";
import { apiUrl } from "../lib/api-base";
import { useLlmStore } from "../store/llm";

interface HealthData {
  status: string;
  server: string;
  version: string;
  uptime_seconds: number;
  tool_count: number;
  providers?: Record<string, unknown>;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export function SettingsPage() {
  const {
    providers,
    provider: selectedProvider,
    model: selectedModel,
    models: availableModels,
    modelsLive,
    status,
    gpu,
    refresh,
    setProvider,
    setModel,
  } = useLlmStore();

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/health"));
      if (!r.ok) throw new Error("Health check failed");
      return r.json();
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const detectedProviders = providers.filter((p) => p.available);

  return (
    <div data-testid="settings-page" className="space-y-8 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <Server className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Settings</h2>
          <p className="text-sm text-slate-300">Backend health and LLM provider configuration</p>
        </div>
      </div>

      {/* Backend Health */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Activity className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Backend Health</h3>
          <div
            className={`w-2 h-2 rounded-full ml-auto ${
              healthLoading
                ? "bg-gray-500 animate-pulse"
                : health?.status === "ok"
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
            data-testid="backend-dot"
          />
        </div>
        {healthLoading ? (
          <p className="text-sm text-slate-300 animate-pulse">Checking backend...</p>
        ) : health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-sm text-slate-300 uppercase font-bold tracking-wider">
                Server
              </span>
              <p data-testid="kpi-server" className="text-sm font-bold text-white">
                {health.server || "Overte MCP"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-slate-300 uppercase font-bold tracking-wider">
                Version
              </span>
              <p className="text-sm font-bold text-white font-mono">{health.version || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-slate-300 uppercase font-bold tracking-wider">
                Tools
              </span>
              <p data-testid="kpi-tools" className="text-sm font-bold text-white">
                {health.tool_count ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-slate-300 uppercase font-bold tracking-wider">
                Uptime
              </span>
              <p className="text-sm font-bold text-white">
                {health.uptime_seconds ? formatUptime(health.uptime_seconds) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-400">Backend unreachable</p>
        )}
      </div>

      {/* LLM Provider Detection (via backend proxy - the browser never probes providers) */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            LLM Provider Detection
          </h3>
        </div>

        <div className="space-y-3">
          {providers.map((p) => {
            const dot =
              status === "probing"
                ? "bg-gray-500 animate-pulse"
                : p.available
                  ? "bg-green-500"
                  : "bg-gray-600";
            const label =
              status === "probing" ? "Probing..." : p.available ? "Detected" : "Not found";
            return (
              <div key={p.name} className="glass-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm font-semibold text-white capitalize">{p.name}</span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    p.available && status !== "probing" ? "text-green-400" : "text-slate-300"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="glass-card flex items-center gap-2 text-sm text-slate-300">
          <Gpu className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            {gpu.available
              ? `GPU: ${gpu.gpus.join("; ")}`
              : "No NVIDIA GPU detected on the backend host."}
            {!modelsLive && availableModels.length > 0 && " Showing curated fallback models."}
          </span>
        </div>

        {detectedProviders.length === 0 && status !== "probing" && (
          <div className="glass-card border border-amber-500/20 text-sm text-amber-400 flex items-center gap-2">
            <Gpu className="w-4 h-4 shrink-0" />
            <span>Install Ollama or LM Studio to enable AI features.</span>
          </div>
        )}

        {detectedProviders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm uppercase font-bold text-slate-300 tracking-wider">
                Provider
              </label>
              <select
                data-testid="llm-provider-select"
                value={selectedProvider}
                onChange={(e) => {
                  setProvider(e.target.value);
                }}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "white",
                  fontSize: "14px",
                }}
                className="focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Select a provider</option>
                {detectedProviders.map((p) => (
                  <option key={p.name} value={p.name} className="capitalize">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm uppercase font-bold text-slate-300 tracking-wider">
                Model
              </label>
              <select
                data-testid="llm-model-select"
                value={selectedModel}
                onChange={(e) => setModel(e.target.value)}
                disabled={availableModels.length === 0}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "white",
                  fontSize: "14px",
                }}
                className="focus:outline-none focus:border-amber-500/50 disabled:opacity-40"
              >
                {availableModels.length === 0 ? (
                  <option value="">No models found</option>
                ) : (
                  availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Port Info */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Network className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Port Information
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="glass-card">
            <span className="text-sm text-slate-300 uppercase font-bold tracking-wider block mb-1">
              <Wifi className="w-3 h-3 inline mr-1" />
              Backend API
            </span>
            <span className="text-sm font-bold text-white font-mono">11110</span>
          </div>
          <div className="glass-card">
            <span className="text-sm text-slate-300 uppercase font-bold tracking-wider block mb-1">
              <Database className="w-3 h-3 inline mr-1" />
              Domain Server
            </span>
            <span className="text-sm font-bold text-white font-mono">40100</span>
          </div>
          <div className="glass-card">
            <span className="text-sm text-slate-300 uppercase font-bold tracking-wider block mb-1">
              <Server className="w-3 h-3 inline mr-1" />
              Frontend
            </span>
            <span className="text-sm font-bold text-white font-mono">11111</span>
          </div>
        </div>
      </div>
    </div>
  );
}
