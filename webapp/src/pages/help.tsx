import { BookOpen, ExternalLink, HelpCircle, Info, Link2, Settings } from "lucide-react";
import { useState } from "react";

export function HelpPage() {
  const [activeTab, setActiveTab] = useState<"setup" | "api" | "links">("setup");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <HelpCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Overte Help Hub
          </h2>
          <p className="text-xs text-slate-400">
            Reference guides, JS API cheat-sheets, and community links
          </p>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex border-b border-white/[0.05] gap-4">
        <button
          onClick={() => setActiveTab("setup")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "setup" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "setup" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          Domain Setup
        </button>
        <button
          onClick={() => setActiveTab("api")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "api" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "api" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          JS Scripting API
        </button>
        <button
          onClick={() => setActiveTab("links")}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: activeTab === "links" ? "var(--accent-amber)" : "var(--text-secondary)",
            borderBottom:
              activeTab === "links" ? "2px solid var(--accent-amber)" : "2px solid transparent",
            paddingBottom: "8px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          className="font-bold tracking-wider uppercase transition-all"
        >
          Useful Links
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-6 text-xs text-slate-300 leading-relaxed">
        {activeTab === "setup" && (
          <div className="space-y-6">
            <div className="glass-panel space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                <Settings className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Local Sandbox Launcher
                </h4>
              </div>
              <p>
                The primary deployment method for development is the <strong>Local Sandbox</strong>{" "}
                server node. When you install Overte, run the <strong>Overte Server</strong>{" "}
                launcher to start a local background sandbox.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Admin Control Panel runs at <code>http://localhost:40100</code>.
                </li>
                <li>
                  Ensure default port mappings (40100, 40102) are not blocked by local firewalls.
                </li>
                <li>
                  Create an administrator username and password inside the control panel to
                  authenticate secure script injection requests.
                </li>
              </ul>
            </div>

            <div className="glass-panel space-y-3">
              <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Deployment Warning (Goliath Server)
                </h4>
              </div>
              <p>
                Docker Desktop daemon on the workstation server <code>Goliath</code> experiences
                runtime instability (daemon crashes).{" "}
                <strong>Do not deploy domain containers via Docker Desktop on Goliath</strong> at
                this time.
              </p>
              <p>
                A migration plan to host Overte domains inside a lightweight container manager (like
                Podman) is in progress and will be detailed in future releases.
              </p>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="glass-panel space-y-6">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold uppercase tracking-wider text-white">
                Entity Javascript API reference
              </h4>
            </div>

            <p>
              Overte entity scripts run locally inside the client's JS engine. Here are common event
              callbacks to implement when writing behavior scripts:
            </p>

            <div className="space-y-4 font-mono text-[10px] text-sky-400 bg-black/35 p-4 rounded-xl border border-white/[0.03]">
              <div>
                <p className="text-white font-bold">// 1. Preload & Unload callbacks</p>
                <p>this.preload = function(entityID) &#123;</p>
                <p>&nbsp;&nbsp;this.entityID = entityID;</p>
                <p>&#125;;</p>
                <p>this.unload = function() &#123; ... &#125;;</p>
              </div>

              <div>
                <p className="text-white font-bold">
                  // 2. Trigger events (mouse clicks / trigger pulls)
                </p>
                <p>this.clickReleaseEvent = function(entityID, event) &#123;</p>
                <p>&nbsp;&nbsp;console.log("Object clicked!");</p>
                <p>&#125;;</p>
              </div>

              <div>
                <p className="text-white font-bold">// 3. Collision / Touch triggers</p>
                <p>this.enterEntity = function(entityID) &#123;</p>
                <p>&nbsp;&nbsp;console.log("Avatar entered entity boundaries!");</p>
                <p>&#125;;</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "links" && (
          <div className="glass-panel space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
              <Link2 className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold uppercase tracking-wider text-white">
                Useful Links & Documentation
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://overte.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card flex justify-between items-center group text-slate-300 hover:text-white"
                style={{ textDecoration: "none" }}
              >
                <div>
                  <h5 className="font-bold text-white">Overte Official Website</h5>
                  <p className="text-[10px] text-slate-400">Download clients and servers</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </a>

              <a
                href="https://github.com/overte-org"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card flex justify-between items-center group text-slate-300 hover:text-white"
                style={{ textDecoration: "none" }}
              >
                <div>
                  <h5 className="font-bold text-white">Overte GitHub</h5>
                  <p className="text-[10px] text-slate-400">Overte organization repositories</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
