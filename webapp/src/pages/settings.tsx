import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Globe, Laptop, Server } from "lucide-react";
import { useEffect } from "react";
import { apiUrl } from "../lib/api-base";
import { fetchModels, useLLMStore } from "../store/llm";

export function SettingsPage() {
  const store = useLLMStore();
  const { detectedProviders, providerStatus, selectedProvider, selectedModel, availableModels } =
    store;

  useEffect(() => {
    if (selectedProvider) {
      const prov = detectedProviders.find((p) => p.name === selectedProvider);
      if (prov) fetchModels(prov, store);
    }
  }, [selectedProvider, store, detectedProviders.find]);

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/health"));
      if (!r.ok) throw new Error("offline");
      return r.json();
    },
    refetchInterval: 15000,
  });

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--border-color)" }} className="pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Server className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="text-xs text-slate-400">Backend health and LLM provider configuration</p>
          </div>
        </div>
      </div>

      <div className="glass-panel mb-6">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 mb-4">
          <Activity className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Backend Health</h3>
        </div>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              { label: "Server", value: health.server },
              { label: "Version", value: health.version },
              { label: "Uptime", value: `${Math.floor((health.uptime_seconds || 0) / 60)}m` },
              { label: "Port", value: String(health.port) },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  {item.label}
                </span>
                <span className="text-white font-bold font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-rose-400 animate-pulse">Backend offline</p>
        )}
      </div>

      <div className="glass-panel mb-6">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 mb-4">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Local Intelligence
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            {(["ollama", "lm-studio"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between glass-card py-2 px-3">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  {key === "ollama" ? "Ollama (:11434)" : "LM Studio (:1234)"}
                </span>
                <span
                  className={`flex items-center gap-1.5 ${providerStatus[key] === "detected" ? "text-green-400" : providerStatus[key] === "probing" ? "text-amber-400" : "text-slate-500"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${providerStatus[key] === "probing" ? "animate-pulse bg-amber-400" : providerStatus[key] === "detected" ? "bg-green-400" : "bg-slate-500"}`}
                  />
                  {providerStatus[key] === "detected"
                    ? "Detected"
                    : providerStatus[key] === "probing"
                      ? "Probing..."
                      : "Not found"}
                </span>
              </div>
            ))}
            {detectedProviders.length === 0 &&
              providerStatus.ollama === "not_found" &&
              providerStatus["lm-studio"] === "not_found" && (
                <div className="text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs">
                  Install Ollama or LM Studio to enable AI features.
                </div>
              )}
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Provider
              </span>
              <select
                data-testid="llm-provider-select"
                value={selectedProvider}
                onChange={(e) => store.setSelectedProvider(e.target.value)}
                disabled={detectedProviders.length === 0}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                className="w-full px-3 py-2 focus:outline-none focus:border-amber-500/50"
              >
                {detectedProviders.length === 0 && <option value="">No LLM detected</option>}
                {detectedProviders.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProvider && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Model
                </span>
                <select
                  data-testid="llm-model-select"
                  value={selectedModel}
                  onChange={(e) => store.setSelectedModel(e.target.value)}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                  }}
                  className="w-full px-3 py-2 focus:outline-none focus:border-amber-500/50"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 mb-4">
          <Laptop className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">System</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Globe className="w-4 h-4" />
          <span>Overte MCP — {health?.version || "0.2.0-beta"}</span>
        </div>
      </div>
    </div>
  );
}
