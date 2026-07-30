import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Database, Gpu, Network, Server, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface HealthData {
  status: string;
  server: string;
  version: string;
  uptime_seconds: number;
  tool_count: number;
  providers?: Record<string, any>;
}

const PROVIDERS = [
  {
    id: "ollama",
    name: "Ollama",
    port: 11434,
    endpoint: "/api/tags",
    modelKey: "models",
    nameKey: "name",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    port: 1234,
    endpoint: "/v1/models",
    modelKey: "data",
    nameKey: "id",
  },
  { id: "vllm", name: "vLLM", port: 8000, endpoint: "/v1/models", modelKey: "data", nameKey: "id" },
];

async function probeProvider(
  provider: (typeof PROVIDERS)[0],
): Promise<"detected" | "not_found" | "probing"> {
  try {
    const r = await fetch(`http://127.0.0.1:${provider.port}${provider.endpoint}`, {
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? "detected" : "not_found";
  } catch {
    return "not_found";
  }
}

async function fetchProviderModels(provider: (typeof PROVIDERS)[0]): Promise<string[]> {
  try {
    const r = await fetch(`http://127.0.0.1:${provider.port}${provider.endpoint}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const items = data[provider.modelKey as keyof typeof data] as any[] | undefined;
    if (!items) return [];
    return items.map((m: any) => m[provider.nameKey] as string).filter(Boolean);
  } catch {
    return [];
  }
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

const LLM_STORAGE_PROVIDER_KEY = "settings_llm_provider";
const LLM_STORAGE_MODEL_KEY = "settings_llm_model";

export function SettingsPage() {
  const [providerStatuses, setProviderStatuses] = useState<
    Record<string, "probing" | "detected" | "not_found">
  >({
    ollama: "probing",
    lmstudio: "probing",
    vllm: "probing",
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState(
    () => localStorage.getItem(LLM_STORAGE_PROVIDER_KEY) || "",
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem(LLM_STORAGE_MODEL_KEY) || "",
  );

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
    (async () => {
      const results: Record<string, "probing" | "detected" | "not_found"> = {};
      for (const p of PROVIDERS) {
        results[p.id] = "probing";
      }
      setProviderStatuses({ ...results });

      for (const p of PROVIDERS) {
        const status = await probeProvider(p);
        results[p.id] = status;
        setProviderStatuses({ ...results });
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    (async () => {
      const p = PROVIDERS.find((x) => x.id === selectedProvider);
      if (!p) return;
      const models = await fetchProviderModels(p);
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    })();
  }, [selectedProvider, selectedModel]);

  useEffect(() => {
    if (selectedProvider) localStorage.setItem(LLM_STORAGE_PROVIDER_KEY, selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem(LLM_STORAGE_MODEL_KEY, selectedModel);
  }, [selectedModel]);

  const detectedProviders = PROVIDERS.filter((p) => providerStatuses[p.id] === "detected");

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
          <p className="text-xs text-slate-400">Backend health and LLM provider configuration</p>
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
          <p className="text-xs text-slate-500 animate-pulse">Checking backend...</p>
        ) : health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Server
              </span>
              <p data-testid="kpi-server" className="text-sm font-bold text-white">
                {health.server || "Overte MCP"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Version
              </span>
              <p className="text-sm font-bold text-white font-mono">{health.version || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Tools
              </span>
              <p data-testid="kpi-tools" className="text-sm font-bold text-white">
                {health.tool_count ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Uptime
              </span>
              <p className="text-sm font-bold text-white">
                {health.uptime_seconds ? formatUptime(health.uptime_seconds) : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-400">Backend unreachable</p>
        )}
      </div>

      {/* LLM Provider Detection */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            LLM Provider Detection
          </h3>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const status = providerStatuses[p.id];
            return (
              <div key={p.id} className="glass-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status === "probing"
                        ? "bg-gray-500 animate-pulse"
                        : status === "detected"
                          ? "bg-green-500"
                          : "bg-gray-600"
                    }`}
                  />
                  <span className="text-xs font-semibold text-white">{p.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">:{p.port}</span>
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    status === "probing"
                      ? "text-slate-500"
                      : status === "detected"
                        ? "text-green-400"
                        : "text-slate-500"
                  }`}
                >
                  {status === "probing"
                    ? "Probing..."
                    : status === "detected"
                      ? "Detected"
                      : "Not found"}
                </span>
              </div>
            );
          })}
        </div>

        {detectedProviders.length === 0 && (
          <div className="glass-card border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
            <Gpu className="w-4 h-4 shrink-0" />
            <span>Install Ollama or LM Studio to enable AI features.</span>
          </div>
        )}

        {detectedProviders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Provider
              </label>
              <select
                data-testid="llm-provider-select"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedModel("");
                }}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "white",
                  fontSize: "12px",
                }}
                className="focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Select a provider</option>
                {detectedProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Model
              </label>
              <select
                data-testid="llm-model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={availableModels.length === 0}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "white",
                  fontSize: "12px",
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="glass-card">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
              <Wifi className="w-3 h-3 inline mr-1" />
              Backend API
            </span>
            <span className="text-sm font-bold text-white font-mono">11110</span>
          </div>
          <div className="glass-card">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
              <Database className="w-3 h-3 inline mr-1" />
              Domain Server
            </span>
            <span className="text-sm font-bold text-white font-mono">40100</span>
          </div>
          <div className="glass-card">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
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
