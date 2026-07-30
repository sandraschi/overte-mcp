import { useQuery } from "@tanstack/react-query";
import { Bot, Download, Eraser, MessageSquare, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";

const STORAGE_KEY = "overte-mcp-chat-history";
const PERSONALITY_KEY = "overte-mcp-chat-personality";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts?: string;
}

const personalities = [
  {
    id: "research",
    name: "Research Assistant",
    prompt:
      "You are a thorough research assistant for Overte virtual worlds. Provide detailed, well-structured answers with technical depth.",
  },
  {
    id: "reviewer",
    name: "Expert Reviewer",
    prompt:
      "You are an expert reviewer of Overte scripts, entities, and domain configurations. Analyze critically, point out issues, and suggest improvements.",
  },
  {
    id: "quick",
    name: "Quick Summarizer",
    prompt:
      "You are a concise summarizer. Give brief, direct answers in 2-3 sentences. Focus on the key point only.",
  },
  { id: "custom", name: "Custom", prompt: "" },
];

const examplePrompts = [
  {
    group: "Domain",
    prompts: ["Check domain status", "List connected nodes", "Show domain settings"],
  },
  {
    group: "Entities",
    prompts: ["Spawn a box entity", "Find all light entities", "Delete entity by ID"],
  },
  {
    group: "Scripts",
    prompts: ["Create a dance script", "Run a movement animation", "List running scripts"],
  },
];

const PROVIDER_PORTS: Record<string, { port: number; modelEndpoint: string }> = {
  ollama: { port: 11434, modelEndpoint: "/api/tags" },
  lmstudio: { port: 1234, modelEndpoint: "/v1/models" },
  vllm: { port: 8000, modelEndpoint: "/v1/models" },
};

async function detectProvider(): Promise<{ name: string; base: string } | null> {
  for (const [name, cfg] of Object.entries(PROVIDER_PORTS)) {
    try {
      const r = await fetch(`http://127.0.0.1:${cfg.port}${cfg.modelEndpoint}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) return { name, base: `http://127.0.0.1:${cfg.port}` };
    } catch {}
  }
  return null;
}

async function fetchModels(provider: string): Promise<string[]> {
  const cfg = PROVIDER_PORTS[provider];
  if (!cfg) return [];
  try {
    const r = await fetch(`http://127.0.0.1:${cfg.port}${cfg.modelEndpoint}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (provider === "ollama") return (data.models || []).map((m: any) => m.name);
    return (data.data || []).map((m: any) => m.id);
  } catch {
    return [];
  }
}

function buildSystemPrompt(
  skillContent: string,
  personalityId: string,
  personalityPrompt: string,
): string {
  if (personalityId === "custom") return personalityPrompt || skillContent;
  return `${skillContent}\n\n---\n\n## Role\n${personalityPrompt}`;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).slice(-100) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [personalityId, setPersonalityId] = useState(
    () => localStorage.getItem(PERSONALITY_KEY) || "research",
  );
  const [provider, setProvider] = useState<{ name: string; base: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("overte-mcp-chat-model") || "",
  );
  const [providerStatus, setProviderStatus] = useState<"probing" | "detected" | "not_found">(
    "probing",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: skillList } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/skills"));
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: skillContent } = useQuery({
    queryKey: ["skill", "overte-admin"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/skill/overte-admin"));
      if (!r.ok)
        return "Overte MCP server for virtual world management. Use the available tools to interact with Overte domains, entities, avatars, and scripts.";
      return r.text();
    },
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personalityId);
  }, [personalityId]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem("overte-mcp-chat-model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    (async () => {
      setProviderStatus("probing");
      const p = await detectProvider();
      setProvider(p);
      setProviderStatus(p ? "detected" : "not_found");
      if (p) {
        const m = await fetchModels(p.name);
        setModels(m);
        if (m.length > 0 && !selectedModel) setSelectedModel(m[0]);
      }
    })();
  }, [selectedModel]);

  const personality = personalities.find((p) => p.id === personalityId) || personalities[0];
  const systemPrompt = buildSystemPrompt(skillContent || "", personalityId, personality.prompt);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !provider) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch(
        `http://127.0.0.1:${PROVIDER_PORTS[provider.name].port}/v1/chat/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "user", content: text },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content || "No response";
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: reply,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Failed to get response"}`,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, provider, messages, selectedModel, systemPrompt]);

  const handleExport = () => {
    if (messages.length === 0) return;
    const lines = messages.map(
      (m) => `[${m.ts || "unknown"}] ${m.role.toUpperCase()}: ${m.content}`,
    );
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overte-mcp-chat-${new Date().toISOString().slice(0, 19).replace(/[:]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const personalityName = personality.name;

  return (
    <div data-testid="chat-page" className="space-y-6 animate-fade-in h-full flex flex-col">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AI Chat
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </h2>
            <p className="text-xs text-slate-400">
              {providerStatus === "probing"
                ? "Detecting local LLM..."
                : providerStatus === "detected"
                  ? `Connected to ${provider?.name} on :${provider ? PROVIDER_PORTS[provider.name]?.port : "?"}`
                  : "No local LLM detected"}
            </p>
          </div>
        </div>

        <div data-testid="chat-controls" className="flex items-center gap-2">
          <select
            data-testid="personality-select"
            value={personalityId}
            onChange={(e) => setPersonalityId(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "white",
              fontSize: "12px",
            }}
            className="focus:outline-none focus:border-amber-500/50"
          >
            {personalities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "white",
                fontSize: "12px",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <button
            data-testid="chat-export"
            onClick={handleExport}
            disabled={messages.length === 0}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px",
              cursor: messages.length === 0 ? "default" : "pointer",
              opacity: messages.length === 0 ? 0.4 : 1,
            }}
            className="text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            data-testid="chat-clear"
            onClick={handleClear}
            disabled={messages.length === 0}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px",
              cursor: messages.length === 0 ? "default" : "pointer",
              opacity: messages.length === 0 ? 0.4 : 1,
            }}
            className="text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Clear conversation"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {personalityId !== "custom" && (
        <div className="glass-card px-3 py-1.5 text-[10px] text-slate-500 flex items-center gap-2">
          <Bot className="w-3 h-3 text-amber-500" />
          <span>
            Persona: <span className="text-white font-semibold">{personalityName}</span>
          </span>
          {skillList && Array.isArray(skillList) && skillList.length > 0 && (
            <span className="ml-2">
              | Skill:{" "}
              <span className="text-indigo-400 font-semibold">
                {skillList[0]?.name || "overte-admin"}
              </span>
            </span>
          )}
        </div>
      )}

      <div
        data-testid="chat-messages"
        className="flex-1 overflow-y-auto space-y-4 min-h-0"
        style={{ maxHeight: "calc(100vh - 340px)" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Bot className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-sm text-slate-500 mb-2">Start a conversation</p>
            <p className="text-xs text-slate-600">
              {providerStatus === "detected"
                ? `Using ${provider?.name} with model ${selectedModel || "default"}`
                : "No local LLM detected — responses unavailable"}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`glass-card ${msg.role === "user" ? "border-amber-500/20" : "border-indigo-500/20"}`}
            style={{ padding: "12px 16px" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase ${msg.role === "user" ? "text-amber-500" : "text-indigo-400"}`}
              >
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              {msg.ts && (
                <span className="text-[9px] text-slate-600">
                  {new Date(msg.ts).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {sending && (
          <div className="glass-card" style={{ padding: "12px 16px" }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Example prompts */}
      {messages.length === 0 && (
        <div data-testid="example-prompts" className="space-y-3">
          {examplePrompts.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {group.group}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.15)",
                      borderRadius: "20px",
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontSize: "11px",
                      color: "#f59e0b",
                    }}
                    className="hover:bg-amber-500/15 hover:text-amber-400 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-3 glass-panel" style={{ padding: "12px" }}>
        <input
          data-testid="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={provider ? "Type a message..." : "No LLM provider available"}
          disabled={!provider || sending}
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "white",
            fontSize: "13px",
          }}
          className="focus:outline-none focus:border-amber-500/50 disabled:opacity-40"
        />
        <button
          data-testid="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || !provider || sending}
          style={{
            background: input.trim() && provider && !sending ? "#f59e0b" : "var(--border-color)",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            cursor: input.trim() && provider && !sending ? "pointer" : "default",
            opacity: input.trim() && provider && !sending ? 1 : 0.4,
          }}
          className="transition-all hover:bg-amber-400"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
