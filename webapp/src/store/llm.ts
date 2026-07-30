import { create } from "zustand";

export interface ProviderInfo {
  name: string;
  port: number;
  base: string;
}

interface LLMState {
  detectedProviders: ProviderInfo[];
  providerStatus: Record<string, "probing" | "detected" | "not_found">;
  selectedProvider: string;
  selectedModel: string;
  availableModels: string[];
  probing: boolean;

  setDetectedProviders: (p: ProviderInfo[]) => void;
  setProviderStatus: (k: string, s: "probing" | "detected" | "not_found") => void;
  setSelectedProvider: (p: string) => void;
  setSelectedModel: (m: string) => void;
  setAvailableModels: (m: string[]) => void;
  setProbing: (b: boolean) => void;
}

export const useLLMStore = create<LLMState>((set) => ({
  detectedProviders: [],
  providerStatus: { ollama: "probing", "lm-studio": "probing" },
  selectedProvider: localStorage.getItem("overte-mcp-llm-provider") || "",
  selectedModel: localStorage.getItem("overte-mcp-llm-model") || "",
  availableModels: [],
  probing: true,

  setDetectedProviders: (p) => set({ detectedProviders: p }),
  setProviderStatus: (k, s) => set((st) => ({ providerStatus: { ...st.providerStatus, [k]: s } })),
  setSelectedProvider: (p) => {
    localStorage.setItem("overte-mcp-llm-provider", p);
    set({ selectedProvider: p, selectedModel: "" });
  },
  setSelectedModel: (m) => {
    localStorage.setItem("overte-mcp-llm-model", m);
    set({ selectedModel: m });
  },
  setAvailableModels: (m) => set({ availableModels: m }),
  setProbing: (b) => set({ probing: b }),
}));

const PROBE_TIMEOUT = 3000;

export async function probeProviders(store: LLMState) {
  const results: ProviderInfo[] = [];

  try {
    const r = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    });
    if (r.ok) results.push({ name: "Ollama", port: 11434, base: "http://127.0.0.1:11434" });
    store.setProviderStatus("ollama", r.ok ? "detected" : "not_found");
  } catch {
    store.setProviderStatus("ollama", "not_found");
  }

  try {
    const r = await fetch("http://127.0.0.1:1234/v1/models", {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    });
    if (r.ok) results.push({ name: "LM Studio", port: 1234, base: "http://127.0.0.1:1234" });
    store.setProviderStatus("lm-studio", r.ok ? "detected" : "not_found");
  } catch {
    store.setProviderStatus("lm-studio", "not_found");
  }

  store.setDetectedProviders(results);
  if (!store.selectedProvider && results.length > 0) store.setSelectedProvider(results[0].name);
  store.setProbing(false);
}

export async function fetchModels(provider: ProviderInfo, store: LLMState) {
  try {
    const url =
      provider.port === 11434 ? `${provider.base}/api/tags` : `${provider.base}/v1/models`;
    const r = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT) });
    if (!r.ok) return;
    const data = await r.json();
    const models =
      provider.port === 11434
        ? (data.models || []).map((m: any) => m.name)
        : (data.data || []).map((m: any) => m.id);
    store.setAvailableModels(models);
    if (!store.selectedModel && models.length > 0) store.setSelectedModel(models[0]);
  } catch {
    /* probe failed */
  }
}
