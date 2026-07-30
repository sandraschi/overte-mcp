import { Download, Eraser, MessageSquare, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchModels, useLLMStore } from "../store/llm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

const STORAGE_KEY = "overte-mcp-chat-history";
const PERSONALITY_KEY = "overte-mcp-chat-personality";
const MAX_HISTORY = 100;

const PERSONALITIES: Record<string, string> = {
  "research-assistant":
    "You are a thorough research assistant. Provide detailed, well-structured answers with citations where possible.",
  "expert-reviewer":
    "You are a critical expert reviewer. Analyze problems rigorously, point out flaws, and suggest improvements.",
  "quick-summarizer":
    "You are a concise summarizer. Keep answers brief and to the point \u2014 3 bullet points max.",
};

const EXAMPLE_PROMPTS = [
  { label: "Check domain", text: "What nodes are connected to the Overte domain server?" },
  { label: "Spawn entity", text: "How do I spawn a Box at position (0, 2, -5)?" },
  { label: "Inject script", text: "Show me how to inject a click-handler script onto an entity." },
  { label: "Bridge setup", text: "How do I connect the WebSocket bridge?" },
  { label: "Auth config", text: "How do I set up admin credentials for the domain-server?" },
  { label: "Troubleshoot", text: "Domain-server returns simulated data. What should I check?" },
];

const SKILL_CONTENT =
  "You are an Overte VR/metaverse assistant. You help users manage Overte domain-servers, spawn entities, and inject scripts. Available tools: overte_domain_status (query nodes/settings), overte_entity_spawn (create in-world objects), overte_script_inject (attach JS behaviors).\n\nUse the dashboard at http://127.0.0.1:11111 for visual management. The backend runs on port 11110. The WebSocket bridge script is at scripts/overte-mcp-bridge.js.";

function buildSystemPrompt(personalityId: string, customPrompt: string): string {
  if (personalityId === "custom") return customPrompt || SKILL_CONTENT;
  const role = PERSONALITIES[personalityId];
  return `${SKILL_CONTENT}\n\n---\n\n## Role\n${role}`;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personalityId, setPersonalityId] = useState(
    () => localStorage.getItem(PERSONALITY_KEY) || "research-assistant",
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const store = useLLMStore();
  const { detectedProviders, selectedProvider, selectedModel, availableModels, probing } = store;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages]);
  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personalityId);
  }, [personalityId]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      const prov = detectedProviders.find((p) => p.name === selectedProvider);
      if (prov) fetchModels(prov, store);
    }
  }, [selectedProvider, detectedProviders, store]);

  const providerBase = detectedProviders.find((p) => p.name === selectedProvider)?.base || "";

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !providerBase) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const systemContent = buildSystemPrompt(personalityId, customPrompt);
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const r = await fetch(`${providerBase}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "system", content: systemContent }, ...history],
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "No response.",
          ts: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : "Request failed"}`,
          ts: new Date().toISOString(),
        },
      ]);
    }
    setLoading(false);
  }, [input, loading, messages, personalityId, customPrompt, providerBase, selectedModel]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `[${m.ts}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overte-mcp-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasLLM = detectedProviders.length > 0;

  return (
    <div data-testid="chat-page" className="flex flex-col h-[calc(100vh-10rem)]">
      <div
        style={{ borderBottom: "1px solid var(--border-color)" }}
        className="pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Chat</h2>
            <p className="text-xs text-slate-400">Ask questions about Overte domain operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2" data-testid="chat-controls">
          <select
            data-testid="personality-select"
            value={personalityId}
            onChange={(e) => setPersonalityId(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "white",
              fontSize: "11px",
            }}
            className="px-2 py-1.5 focus:outline-none focus:border-amber-500/50"
          >
            <option value="research-assistant">Research Assistant</option>
            <option value="expert-reviewer">Expert Reviewer</option>
            <option value="quick-summarizer">Quick Summarizer</option>
            <option value="custom">Custom</option>
          </select>
          <button
            data-testid="chat-export"
            onClick={exportChat}
            disabled={messages.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
            title="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            data-testid="chat-clear"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
            title="Clear chat"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {personalityId === "custom" && (
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Enter custom system prompt..."
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            color: "white",
          }}
          className="w-full px-3 py-2 text-xs h-20 resize-none focus:outline-none focus:border-amber-500/50 mb-2"
        />
      )}

      <div className="flex items-center gap-3 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${probing ? "bg-amber-500 animate-pulse" : hasLLM ? "bg-green-500" : "bg-slate-500"}`}
          />
          <span className="text-slate-400">
            {probing ? "Probing LLM..." : hasLLM ? `${selectedProvider} detected` : "No local LLM"}
          </span>
        </div>
        {hasLLM && (
          <>
            <span className="text-slate-500">|</span>
            <select
              value={selectedModel}
              onChange={(e) => store.setSelectedModel(e.target.value)}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "white",
                fontSize: "11px",
              }}
              className="px-2 py-1 focus:outline-none focus:border-amber-500/50"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              skill:overte-admin
            </span>
          </>
        )}
      </div>

      <div data-testid="chat-messages" className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && hasLLM && (
          <div data-testid="example-prompts" className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => setInput(p.text)}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                className="text-xs px-3 py-2 hover:text-white hover:border-amber-500/30 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        {messages.length === 0 && !hasLLM && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Sparkles className="w-8 h-8" />
            <p className="text-sm">No local LLM detected.</p>
            <p className="text-xs">Start Ollama or LM Studio to enable AI features.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${msg.role === "user" ? "glass-panel" : "glass-card"}`}
              style={msg.role === "user" ? { borderColor: "rgba(245,158,11,0.2)" } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card text-xs text-slate-400 animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          data-testid="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={hasLLM ? "Ask about Overte..." : "Start Ollama to enable chat..."}
          disabled={!hasLLM}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "white",
          }}
          className="flex-1 px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 disabled:opacity-40"
        />
        <button
          data-testid="chat-send"
          onClick={sendMessage}
          disabled={!input.trim() || loading || !hasLLM}
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "12px",
            cursor: "pointer",
          }}
          className="p-2.5 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
