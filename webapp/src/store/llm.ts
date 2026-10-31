import { create } from "zustand";
import { apiUrl } from "../lib/api-base";

export interface LlmProviderStatus {
  name: string;
  available: boolean;
  base: string;
}

interface LlmState {
  providers: LlmProviderStatus[];
  defaultProvider: string | null;
  provider: string;
  model: string;
  models: string[];
  modelsLive: boolean;
  status: "probing" | "detected" | "not_found";
  gpu: { available: boolean; gpus: string[] };
  onboardingRequired: boolean;
  refresh: () => Promise<void>;
  refreshModels: () => Promise<void>;
  setProvider: (p: string) => void;
  setModel: (m: string) => void;
  chat: (messages: { role: string; content: string }[], system?: string) => Promise<string>;
}

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = "llm_model";

function initialSelection(): { provider: string; model: string } {
  // One-time migration from the pre-proxy keys, then canonical keys win.
  const legacyProvider =
    localStorage.getItem(PROVIDER_KEY) ||
    localStorage.getItem("settings_llm_provider") ||
    localStorage.getItem("overte-mcp-chat-provider") ||
    "";
  const legacyModel =
    localStorage.getItem(MODEL_KEY) ||
    localStorage.getItem("settings_llm_model") ||
    localStorage.getItem("overte-mcp-chat-model") ||
    "";
  return { provider: legacyProvider, model: legacyModel };
}

export const useLlmStore = create<LlmState>((set, get) => ({
  providers: [],
  defaultProvider: null,
  provider: initialSelection().provider,
  model: initialSelection().model,
  models: [],
  modelsLive: false,
  status: "probing",
  gpu: { available: false, gpus: [] },
  onboardingRequired: false,

  refresh: async () => {
    try {
      const [discover, onboarding] = await Promise.all([
        fetch(apiUrl("/api/llm/discover")).then((r) => (r.ok ? r.json() : null)),
        fetch(apiUrl("/api/llm/onboarding")).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (!discover) {
        set({ status: "not_found" });
        return;
      }
      const live = (discover.providers || []).filter((p: LlmProviderStatus) => p.available);
      set((s) => {
        const provider = s.provider || discover.default_provider || "";
        return {
          providers: discover.providers || [],
          defaultProvider: discover.default_provider || null,
          provider,
          status: live.length > 0 ? "detected" : "not_found",
          gpu: discover.gpu || { available: false, gpus: [] },
          onboardingRequired: onboarding ? onboarding.required : live.length === 0,
        };
      });
      await get().refreshModels();
    } catch {
      set({ status: "not_found" });
    }
  },

  refreshModels: async () => {
    const { provider, model } = get();
    if (!provider) {
      set({ models: [], modelsLive: false });
      return;
    }
    try {
      const r = await fetch(apiUrl(`/api/llm/models?provider=${encodeURIComponent(provider)}`));
      if (!r.ok) {
        set({ models: [], modelsLive: false });
        return;
      }
      const data = await r.json();
      const models: string[] = data.models || [];
      set({
        models,
        modelsLive: data.live,
        model: model && models.includes(model) ? model : models[0] || "",
      });
    } catch {
      set({ models: [], modelsLive: false });
    }
  },

  setProvider: (p: string) => {
    localStorage.setItem(PROVIDER_KEY, p);
    set({ provider: p, model: "", models: [] });
    void get().refreshModels();
  },

  setModel: (m: string) => {
    localStorage.setItem(MODEL_KEY, m);
    set({ model: m });
  },

  chat: async (messages, system?: string) => {
    const { provider, model } = get();
    if (!provider || !model) throw new Error("No LLM provider/model selected (see Settings).");
    const r = await fetch(apiUrl("/api/llm/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, messages, system }),
      signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.detail || `LLM proxy HTTP ${r.status}`);
    }
    const data = await r.json();
    return data.reply || "";
  },
}));
