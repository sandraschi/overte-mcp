import { useQuery } from "@tanstack/react-query";
import { Bot, Download, Eraser, MessageSquare, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";
import { useLlmStore } from "../store/llm";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { provider, model, models, status, refresh, setModel, chat } = useLlmStore();

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
    void refresh();
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personalityId);
  }, [personalityId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const personality = personalities.find((p) => p.id === personalityId) || personalities[0];
  const systemPrompt = buildSystemPrompt(skillContent || "", personalityId, personality.prompt);
  const providerReady = status === "detected" && !!provider && !!model;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !providerReady) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await chat(
        [...history, { role: "user", content: text }],
        systemPrompt || undefined,
      );
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: reply || "No response",
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
  }, [input, sending, providerReady, messages, systemPrompt, chat]);

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
            <p className="text-sm text-slate-300">
              {status === "probing"
                ? "Detecting local LLM via backend..."
                : status === "detected"
                  ? `Connected via backend proxy to ${provider}${model ? ` / ${model}` : ""}`
                  : "No local LLM detected - see Settings"}
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
              fontSize: "14px",
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "white",
                fontSize: "14px",
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
            className="text-slate-300 hover:text-white hover:bg-white/5 transition-all"
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
            className="text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            title="Clear conversation"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {personalityId !== "custom" && (
        <div className="glass-card px-3 py-1.5 text-sm text-slate-300 flex items-center gap-2">
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
            <Bot className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-sm text-slate-300 mb-2">Start a conversation</p>
            <p className="text-sm text-slate-300">
              {status === "detected"
                ? `Using ${provider} with model ${model || "default"} via backend proxy`
                : "No local LLM detected - responses unavailable until one is (see Settings)"}
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
                className={`text-sm font-bold uppercase ${msg.role === "user" ? "text-amber-500" : "text-indigo-400"}`}
              >
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              {msg.ts && (
                <span className="text-sm text-slate-300">{new Date(msg.ts).toLocaleString()}</span>
              )}
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {sending && (
          <div className="glass-card" style={{ padding: "12px 16px" }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-300">Thinking...</span>
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
              <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                      fontSize: "14px",
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
          placeholder={providerReady ? "Type a message..." : "No LLM provider available"}
          disabled={!providerReady || sending}
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "white",
            fontSize: "14px",
          }}
          className="focus:outline-none focus:border-amber-500/50 disabled:opacity-40"
        />
        <button
          data-testid="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || !providerReady || sending}
          style={{
            background:
              input.trim() && providerReady && !sending ? "#f59e0b" : "var(--border-color)",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            cursor: input.trim() && providerReady && !sending ? "pointer" : "default",
            opacity: input.trim() && providerReady && !sending ? 1 : 0.4,
          }}
          className="transition-all hover:bg-amber-400"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
