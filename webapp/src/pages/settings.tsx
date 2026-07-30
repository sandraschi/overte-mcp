import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Globe, Laptop, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api-base";

export function SettingsPage() {
  const [providerStatus, setProviderStatus] = useState<
    Record<string, "probing" | "detected" | "not_found">
  >({
    ollama: "probing",
    "lm-studio": "probing",
  });
  const [detectedProviders, setDetectedProviders] = useState<
    Array<{ name: string; port: number; base: string }>
  >([]);
  const [selectedProvider, setSelectedProvider] = useState(
    () => localStorage.getItem("overte-mcp-llm-provider") || "",
  );
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("overte-mcp-llm-model") || "",
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/health"));
      if (!r.ok) throw new Error("Backend offline");
      return r.json();
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    (async () => {
      const results: Array<{ name: string; port: number; base: string }> = [];

      try {
        const r = await fetch("http://127.0.0.1:11434/api/tags", {
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) results.push({ name: "Ollama", port: 11434, base: "http://127.0.0.1:11434" });
        setProviderStatus((prev) => ({ ...prev, ollama: r.ok ? "detected" : "not_found" }));
      } catch {
        setProviderStatus((prev) => ({ ...prev, ollama: "not_found" }));
      }

      try {
        const r = await fetch("http://127.0.0.1:1234/v1/models", {
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) results.push({ name: "LM Studio", port: 1234, base: "http://127.0.0.1:1234" });
        setProviderStatus((prev) => ({ ...prev, "lm-studio": r.ok ? "detected" : "not_found" }));
      } catch {
        setProviderStatus((prev) => ({ ...prev, "lm-studio": "not_found" }));
      }

      setDetectedProviders(results);
      if (!selectedProvider && results.length > 0) setSelectedProvider(results[0].name);
    })();
  }, [selectedProvider]);

  useEffect(() => {
    if (!selectedProvider) return;
    const prov = detectedProviders.find((p) => p.name === selectedProvider);
    if (!prov) return;

    (async () => {
      try {
        const url = prov.port === 11434 ? `${prov.base}/api/tags` : `${prov.base}/v1/models`;
        const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!r.ok) return;
        const data = await r.json();
        const models =
          prov.port === 11434
            ? (data.models || []).map((m: any) => m.name)
            : (data.data || []).map((m: any) => m.id);
        setAvailableModels(models);
        if (!selectedModel && models.length > 0) setSelectedModel(models[0]);
      } catch {}
    })();
  }, [selectedProvider, selectedModel, detectedProviders.find]);

  useEffect(() => {
    if (selectedProvider) localStorage.setItem("overte-mcp-llm-provider", selectedProvider);
  }, [selectedProvider]);
  useEffect(() => {
    if (selectedModel) localStorage.setItem("overte-mcp-llm-model", selectedModel);
  }, [selectedModel]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div style={{ borderBottom: "1px solid var(--border-color)" }} className="pb-4">
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

      {/* Backend Health */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Activity className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Backend Health</h3>
        </div>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Server</span>
              <span className="text-white font-bold">{health.server}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Version</span>
              <span className="text-white font-bold">{health.version}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Uptime</span>
              <span className="text-white font-bold">
                {Math.floor((health.uptime_seconds || 0) / 60)}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Port</span>
              <span className="text-white font-bold font-mono">{health.port}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-400 animate-pulse">Backend offline</p>
        )}
      </div>

      {/* LLM Provider */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Local Intelligence
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ollama (:11434)</span>
              <span
                className={`flex items-center gap-1.5 ${providerStatus.ollama === "detected" ? "text-green-400" : providerStatus.ollama === "probing" ? "text-yellow-400" : "text-slate-500"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${providerStatus.ollama === "probing" ? "animate-pulse bg-yellow-400" : providerStatus.ollama === "detected" ? "bg-green-400" : "bg-slate-500"}`}
                />
                {providerStatus.ollama === "detected"
                  ? "Detected"
                  : providerStatus.ollama === "probing"
                    ? "Probing..."
                    : "Not found"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">LM Studio (:1234)</span>
              <span
                className={`flex items-center gap-1.5 ${providerStatus["lm-studio"] === "detected" ? "text-green-400" : providerStatus["lm-studio"] === "probing" ? "text-yellow-400" : "text-slate-500"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${providerStatus["lm-studio"] === "probing" ? "animate-pulse bg-yellow-400" : providerStatus["lm-studio"] === "detected" ? "bg-green-400" : "bg-slate-500"}`}
                />
                {providerStatus["lm-studio"] === "detected"
                  ? "Detected"
                  : providerStatus["lm-studio"] === "probing"
                    ? "Probing..."
                    : "Not found"}
              </span>
            </div>

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
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Provider
              </label>
              <select
                data-testid="llm-provider-select"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedModel("");
                }}
                className="w-full bg-zinc-800 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-xs"
                disabled={detectedProviders.length === 0}
              >
                {detectedProviders.length === 0 && <option value="">No local LLM detected</option>}
                {detectedProviders.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProvider && (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Model
                </label>
                <select
                  data-testid="llm-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-800 text-zinc-100 border border-zinc-600 rounded-lg px-3 py-2 text-xs"
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

      {/* System */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
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
