import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  Monitor,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Square,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api-base";

interface DomainNode {
  type?: string;
  uuid?: string;
  public?: { ip?: string };
}

interface DomainInfo {
  host: string;
  port: number;
  nodes: DomainNode[];
  settings: Record<string, unknown>;
}

interface AppDetect {
  installed: boolean;
  paths: Record<string, string | null>;
  running: Record<string, boolean>;
}

const APP_LABELS: Record<string, string> = {
  "domain-server": "Domain Server",
  interface: "Interface Client",
};

function LlmOpportunity() {
  const { data } = useQuery<{ required: boolean; detected: string[] } | null>({
    queryKey: ["llmOnboarding"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/llm/onboarding"));
      if (!r.ok) return null;
      return r.json();
    },
    refetchInterval: 30000,
  });
  if (!data?.required) return null;
  return (
    <div
      className="glass-panel border border-amber-500/30 flex items-center gap-3 text-amber-300 text-sm"
      style={{ padding: "12px 16px" }}
      data-testid="onboarding-cue"
      data-onboarding="llm"
    >
      <Cpu className="w-4 h-4 shrink-0" />
      <span>
        No local LLM detected - install Ollama or LM Studio to enable AI Chat and script generation.{" "}
        <Link to="/settings" className="underline font-bold">
          Configure in Settings
        </Link>
      </span>
    </div>
  );
}

export function Dashboard() {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(40100);
  const [appDetect, setAppDetect] = useState<AppDetect | null>(null);
  const [appLoading, setAppLoading] = useState<Record<string, boolean>>({});
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [bridgeNote, setBridgeNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/overte/app/detect"))
      .then((r) => r.json())
      .then(setAppDetect)
      .catch(() => {});
  }, []);

  const appAction = useCallback(async (target: string, action: "start" | "stop") => {
    setAppLoading((p) => ({ ...p, [target]: true }));
    try {
      const res = await fetch(apiUrl(`/api/overte/app/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail ?? "Action failed");
      }
    } catch {
      alert("Action failed -- backend unreachable");
    } finally {
      setAppLoading((p) => ({ ...p, [target]: false }));
      // Refresh detect after action
      fetch(apiUrl("/api/overte/app/detect"))
        .then((r) => r.json())
        .then(setAppDetect)
        .catch(() => {});
    }
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery<{
    domain?: DomainInfo;
    source: "live" | "unreachable";
    warning?: string;
  }>({
    queryKey: ["domainStatus", host, port],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/overte/status?host=${host}&port=${port}`));
      if (res.status === 502) {
        // No domain-server answered: say so, never show placeholder nodes.
        const body = await res.json().catch(() => ({}));
        return { source: "unreachable" as const, warning: body.detail };
      }
      if (!res.ok) throw new Error("Server connection offline");
      return res.json();
    },
  });

  const domainInstalled = !!appDetect?.paths["domain-server"];
  const domainRunning = !!appDetect?.running["domain-server"];
  const domainBusy = !!appLoading["domain-server"];
  const interfaceInstalled = !!appDetect?.paths.interface;
  const interfaceRunning = !!appDetect?.running.interface;
  const interfaceBusy = !!appLoading.interface;

  const installBridge = useCallback(async () => {
    setBridgeBusy(true);
    setBridgeNote(null);
    try {
      const res = await fetch(apiUrl("/api/overte/bridge/install"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBridgeNote(body.detail || `Install failed (HTTP ${res.status})`);
      } else {
        setBridgeNote(
          body.changed
            ? "Bridge registered — domain restarting, then check Entities."
            : "Bridge already registered.",
        );
      }
    } catch {
      setBridgeNote("Backend unreachable — is the stack running?");
    } finally {
      setBridgeBusy(false);
    }
  }, []);

  const domain = data?.domain;
  const avatarNodes = (domain?.nodes || []).filter((n) =>
    ["agent", "avatar-mixer"].includes(n.type ?? ""),
  );

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Domain Control Panel
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h2>
            <p className="text-sm text-slate-300">Overte domain-server node monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
            className="text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div
        className="glass-panel border border-amber-500/10"
        data-testid="dashboard-hero"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)",
          padding: "24px",
        }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-amber-500">
              overte-mcp — MCP server + control panel
            </p>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Overte Open-Source Social VR
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Overte is the open-source VR/metaverse platform descended from High Fidelity: you run
              your own domain server and step inside with the Interface client. This app is its
              control panel — and an MCP server, so AI agents can administer the domain, spawn
              entities, and inject scripts through the same backend this dashboard talks to.
            </p>
            <ol data-testid="hero-quickstart" className="space-y-1.5 text-sm text-slate-300">
              <li>
                <span className="font-bold text-white">1.</span> Start the domain server (plus an
                assignment client for headless mode) — see App Status below.
              </li>
              <li>
                <span className="font-bold text-white">2.</span> Connect the bridge: run{" "}
                <span className="font-mono">overte_bridge_install</span> from any MCP client, or
                load <span className="font-mono">/bridge/overte-mcp-bridge.js</span> in Interface.
              </li>
              <li>
                <span className="font-bold text-white">3.</span> Build:{" "}
                <Link to="/entities" className="text-amber-500 hover:text-amber-400 font-bold">
                  spawn entities
                </Link>
                ,{" "}
                <Link to="/scripting" className="text-amber-500 hover:text-amber-400 font-bold">
                  inject scripts
                </Link>{" "}
                — or ask an agent. New here? Start at the{" "}
                <Link to="/help" className="text-amber-500 hover:text-amber-400 font-bold">
                  Help Hub
                </Link>
                .
              </li>
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="hero-actions">
              <button
                data-testid="hero-domain-toggle"
                onClick={() => appAction("domain-server", domainRunning ? "stop" : "start")}
                disabled={!appDetect || !domainInstalled || domainBusy}
                style={{
                  background: domainRunning ? "none" : "#10b981",
                  border: `1px solid ${domainRunning ? "#ef4444" : "#10b981"}`,
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: !appDetect || !domainInstalled || domainBusy ? "default" : "pointer",
                  opacity: !appDetect || !domainInstalled || domainBusy ? 0.4 : 1,
                  color: domainRunning ? "#f87171" : "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
                className="flex items-center gap-2 transition-all hover:brightness-110 active:scale-95"
                title={
                  domainInstalled ? "Start/stop the domain server" : "Domain server not installed"
                }
              >
                {domainBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : domainRunning ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {!appDetect
                  ? "Detecting..."
                  : domainRunning
                    ? "Stop domain"
                    : "Start domain server"}
              </button>
              {interfaceInstalled && (
                <button
                  data-testid="hero-interface-toggle"
                  onClick={() => appAction("interface", interfaceRunning ? "stop" : "start")}
                  disabled={interfaceBusy}
                  style={{
                    background: "none",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    cursor: interfaceBusy ? "default" : "pointer",
                    opacity: interfaceBusy ? 0.4 : 1,
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                  className="flex items-center gap-2 transition-all hover:bg-white/5 active:scale-95"
                  title="Start/stop the Interface client"
                >
                  {interfaceBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : interfaceRunning ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {interfaceRunning ? "Stop Interface" : "Start Interface"}
                </button>
              )}
              <button
                data-testid="hero-bridge-install"
                onClick={installBridge}
                disabled={bridgeBusy}
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: bridgeBusy ? "default" : "pointer",
                  opacity: bridgeBusy ? 0.4 : 1,
                  color: "#f59e0b",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
                className="flex items-center gap-2 transition-all hover:bg-amber-500/15 active:scale-95"
                title="Register the headless bridge on the domain"
              >
                {bridgeBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Install bridge
              </button>
              {bridgeNote && (
                <span data-testid="hero-bridge-note" className="text-sm text-slate-300">
                  {bridgeNote}
                </span>
              )}
            </div>
            <a
              href="https://overte.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              overte.org
            </a>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center px-4" data-testid="kpi-nodes">
              <p className="text-2xl font-bold text-white">
                {domain?.nodes?.length ?? (isLoading ? "..." : "0")}
              </p>
              <p className="text-sm uppercase tracking-wider text-slate-300">Nodes</p>
            </div>
            <div className="text-center px-4" data-testid="kpi-server">
              <p className="text-2xl font-bold text-white font-mono text-sm">
                {domain?.host ?? host}
              </p>
              <p className="text-sm uppercase tracking-wider text-slate-300">Server</p>
            </div>
          </div>
        </div>
      </div>

      {/* LLM opportunity prompt (fail-open: only renders when no provider detected) */}
      <LlmOpportunity />

      {/* App Status */}
      <div className="glass-panel" style={{ padding: "16px" }} data-testid="app-status">
        <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 mb-3">
          <Monitor className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Overte Application
          </h3>
        </div>
        {!appDetect ? (
          <p className="text-sm text-slate-300 animate-pulse">Detecting installation...</p>
        ) : !appDetect.installed ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Download className="w-3.5 h-3.5" />
            <span>
              Not installed.{" "}
              <a
                href="https://overte.org/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 underline"
              >
                Download Overte
              </a>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.keys(APP_LABELS).map((key) => {
              const installed = !!appDetect.paths[key];
              const running = !!appDetect.running[key];
              const loading = !!appLoading[key];
              return (
                <div
                  key={key}
                  className="glass-card flex items-center gap-3"
                  style={{ padding: "8px 14px", borderRadius: "8px", minWidth: "220px" }}
                  data-testid={`app-status-${key}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: running ? "#10b981" : installed ? "#6b7280" : "#ef4444" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{APP_LABELS[key]}</p>
                    <p className="text-sm text-slate-300">
                      {!installed ? "Not found" : running ? "Running" : "Stopped"}
                    </p>
                  </div>
                  {installed &&
                    (running ? (
                      <button
                        onClick={() => appAction(key, "stop")}
                        disabled={loading}
                        className="p-1 rounded hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Stop"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => appAction(key, "start")}
                        disabled={loading}
                        className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Start"
                      >
                        {loading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data?.source === "unreachable" && (
        <div className="glass-panel border border-amber-500/30 flex items-center gap-2 text-amber-300 text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{data.warning ?? "No domain-server reachable."}</span>
        </div>
      )}

      {/* Connection Config Bar */}
      <div className="glass-panel" style={{ padding: "16px" }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-sm uppercase font-bold text-slate-300 tracking-wider">
              Domain Host
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontSize: "14px",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-sm uppercase font-bold text-slate-300 tracking-wider">
              Port
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontSize: "14px",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Grid Panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Domain Info */}
        <div className="md:col-span-8 space-y-6">
          <div className="glass-panel space-y-6">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Globe className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Domain Overview
              </h3>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-300 animate-pulse">Querying server node...</p>
            ) : !domain ? (
              <div className="flex items-center gap-2 text-rose-400 text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Domain Server Offline. Verify port and try again.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-sm">
                    Server Target
                  </span>
                  <p className="text-sm font-bold text-white font-mono">
                    {domain.host}:{domain.port}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-sm">
                    Connected Nodes
                  </span>
                  <p className="text-sm font-bold text-white">{domain.nodes?.length ?? 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Avatar-like nodes */}
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Inhabited Presence
              </h3>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-300 animate-pulse">Reading node list...</p>
            ) : !domain || avatarNodes.length === 0 ? (
              <p className="text-sm text-slate-300">No avatar nodes in this domain</p>
            ) : (
              <div className="space-y-2">
                {avatarNodes.map((n, i) => (
                  <div key={n.uuid ?? i} className="glass-card flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{n.type}</p>
                      <p className="text-sm text-slate-300 font-mono">{n.uuid}</p>
                    </div>
                    <p className="text-sm text-slate-300 font-mono">{n.public?.ip ?? "unknown"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="md:col-span-4 space-y-6">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Cpu className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Domain Settings
              </h3>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-300 animate-pulse">Reading configuration...</p>
            ) : !domain || Object.keys(domain.settings || {}).length === 0 ? (
              <p className="text-sm text-slate-300">No settings returned</p>
            ) : (
              <div className="space-y-3 text-sm">
                {Object.entries(domain.settings).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-white/[0.03] pb-1.5"
                  >
                    <span className="text-slate-300 capitalize">{key.replace("_", " ")}</span>
                    <span className="font-bold text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
