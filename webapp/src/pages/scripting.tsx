import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Bot,
  Code,
  FileUp,
  Link,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface Script {
  name: string;
  description: string;
  category: string;
  url: string;
  exists: boolean;
}

interface ScriptManifest {
  scripts: Script[];
}

export function ScriptingPage() {
  const [entityId, setEntityId] = useState("eeb24f2a-c602-4bf1-a8e9-42b78b09c12b");
  const [scriptUrl, setScriptUrl] = useState("http://localhost:11110/scripts/spin.js");
  const [scriptCode, setScriptCode] = useState(`// Overte In-World Entity Behavior Script
(function() {
  var _entityID;

  this.preload = function(entityID) {
    _entityID = entityID;
  };

  this.update = function(deltaTime) {
    var rotation = Entities.getEntityProperties(_entityID, "rotation").rotation;
    var newRotation = Quat.multiply(rotation, Quat.fromPitchYawRollDegrees(0, 45 * deltaTime, 0));
    Entities.editEntity(_entityID, { rotation: newRotation });
  };
});
`);
  const [originalCode, setOriginalCode] = useState(scriptCode);
  const [currentFilename, setCurrentFilename] = useState("spin.js");
  const [speed, setSpeed] = useState(45.0);
  const [loadedScript, setLoadedScript] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  const scriptDetails: Record<
    string,
    { howto: string; requires: string; config: string; example: string }
  > = {
    "spin.js": {
      howto:
        "1. Spawn any entity in-world\n2. Inject this script onto it\n3. The entity will rotate continuously along the Y axis",
      requires:
        "Any spawned entity (Box, Sphere, Model). No bridge needed to inject if the entity already has a script property.",
      config:
        "Set script_data.speed (default 45) to control rotation speed in degrees/second. Higher = faster spin.",
      example:
        'overte_entity_spawn(name="Spinner", type="Box", position=[0,1,-3])\noverte_script_inject(entity_id="<uuid>", script_url="http://localhost:11110/scripts/spin.js", script_data={"speed": 90})',
    },
    "dance-script.js": {
      howto:
        "1. Spawn a Model entity with an FBX/glTF file that has an armature\n2. Inject this script\n3. The model will bob, spin, and swing its limbs",
      requires:
        "Model entity with armature/joints (FBX or glTF format). NOT compatible with VRM files loaded as entities.",
      config:
        "No configuration parameters. Animation timing is hardcoded. Modify the script source to change dance patterns.",
      example:
        'overte_entity_spawn(name="Dancer", type="Model", model_url="http://localhost:11110/models/Nekomimi-chan.glb")\noverte_script_inject(entity_id="<uuid>", script_url="http://localhost:11110/scripts/dance-script.js")',
    },
    "overte-mcp-bridge.js": {
      howto:
        "1. Open Overte Interface\n2. Go to Edit > Running Scripts > +\n3. Navigate to this file and load it\n4. The bridge connects to ws://localhost:11110 and enables MCP live operations",
      requires: "Running Overte MCP backend on port 11110. Overte Interface client must be open.",
      config:
        "No configuration. Reconnect backoff is 1s-30s exponential. Edit the wsUrl variable in the script to change the backend address.",
      example:
        "Load this script in Interface, then use overte_entity_spawn or overte_script_inject from any MCP client.",
    },
  };
  const [aiError, setAiError] = useState<string | null>(null);

  const [showLoadUrl, setShowLoadUrl] = useState(false);
  const [loadUrlInput, setLoadUrlInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: manifest, isLoading: manifestLoading } = useQuery<ScriptManifest>({
    queryKey: ["scriptManifest"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/scripts"));
      if (!res.ok) throw new Error("Failed to load script manifest");
      return res.json();
    },
  });

  const loadScript = async (script: Script) => {
    try {
      const res = await fetch(apiUrl(`/api/overte/scripts/${encodeURIComponent(script.name)}`));
      if (!res.ok) throw new Error("Failed to fetch script content");
      const data = await res.json();
      setScriptCode(data.content);
      setOriginalCode(data.content);
      setCurrentFilename(script.name);
      setScriptUrl(`http://localhost:11110/scripts/${script.name}`);
      setLoadedScript(script.name);
    } catch (e) {
      console.error("Failed to load script:", e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setScriptCode(content);
      setOriginalCode(content);
      setCurrentFilename(file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadUrl = async () => {
    if (!loadUrlInput.trim()) return;
    try {
      const res = await fetch(loadUrlInput);
      if (!res.ok) throw new Error("Failed to fetch script");
      const content = await res.text();
      setScriptCode(content);
      setOriginalCode(content);
      setCurrentFilename(loadUrlInput.split("/").pop() || "remote.js");
      setScriptUrl(loadUrlInput);
      setShowLoadUrl(false);
      setLoadUrlInput("");
    } catch (e) {
      console.error("Failed to load from URL:", e);
    }
  };

  const handleSave = () => {
    const blob = new Blob([scriptCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRevert = () => {
    setScriptCode(originalCode);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          messages: [
            {
              role: "system",
              content:
                "You are an Overte scripting expert. Generate Overte-compatible JavaScript entity scripts using the IIFE pattern: (function() { ... }); Use Entities.getEntityProperties and Entities.editEntity for entity manipulation, Script.setTimeout for timers, Quat and Vec3 for math. Return ONLY the raw JavaScript code, no explanation.",
            },
            { role: "user", content: aiPrompt },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) throw new Error(`LLM returned ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const codeMatch = content.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : content.trim();
      if (code) {
        setScriptCode(code);
        setOriginalCode(code);
        setCurrentFilename("ai-generated.js");
      }
    } catch (e) {
      setAiError(
        e instanceof Error
          ? `LLM unavailable: ${e.message}`
          : "Failed to generate script. Write your script manually in the editor.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const injectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/overte/inject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: entityId,
          script_url: scriptUrl,
          script_data: { speed: speed },
        }),
      });
      return res.json();
    },
  });

  const scriptsByCategory: Record<string, Script[]> = {};
  if (manifest?.scripts) {
    for (const script of manifest.scripts) {
      const cat = script.category || "uncategorized";
      if (!scriptsByCategory[cat]) scriptsByCategory[cat] = [];
      scriptsByCategory[cat].push(script);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="scripting-page">
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <Terminal className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              JavaScript Scripting Sandbox
            </h2>
            <p className="text-xs text-slate-400">
              Compose and inject live ES6 scripts to govern in-world entities
            </p>
          </div>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="glass-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Target Entity UUID
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
              }}
              className="focus:outline-none focus:border-amber-500/50 font-mono text-[11px]"
            />
          </div>

          <div className="md:col-span-4 flex flex-col gap-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Hosted Script URL
            </label>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
              }}
              className="focus:outline-none focus:border-amber-500/50 font-mono text-[11px]"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Speed (Scope Variable)
            </label>
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
              }}
              className="focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={() => injectMutation.mutate()}
              disabled={injectMutation.isPending}
              style={{
                background: "linear-gradient(to right, var(--accent-amber), #d97706)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 14px",
                color: "white",
                cursor: "pointer",
                fontSize: "11px",
              }}
              className="font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-1"
            >
              {injectMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Hot-Inject
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "10px",
                padding: "8px 10px",
                color: "white",
                cursor: "pointer",
                fontSize: "11px",
              }}
              data-testid="scripting-file-upload"
              className="font-bold hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              title="Upload .js file"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-400" />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".js"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />

            <button
              onClick={() => setShowLoadUrl(!showLoadUrl)}
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "10px",
                padding: "8px 10px",
                color: "white",
                cursor: "pointer",
                fontSize: "11px",
              }}
              data-testid="scripting-load-url"
              className="font-bold hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              title="Load script from URL"
            >
              <Link className="w-3.5 h-3.5 text-indigo-400" />
              Load URL
            </button>
          </div>
        </div>

        {showLoadUrl && (
          <div className="mt-3 flex gap-2 items-center">
            <input
              type="text"
              value={loadUrlInput}
              onChange={(e) => setLoadUrlInput(e.target.value)}
              placeholder="https://example.com/script.js"
              onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                fontSize: "11px",
              }}
              className="focus:outline-none focus:border-amber-500/50 font-mono"
            />
            <button
              onClick={handleLoadUrl}
              style={{
                background: "linear-gradient(to right, var(--accent-amber), #d97706)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                color: "white",
                cursor: "pointer",
                fontSize: "11px",
              }}
              className="font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95"
            >
              Fetch
            </button>
          </div>
        )}

        {injectMutation.isSuccess && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 text-xs">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Script injected into Sandbox simulation</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Script Depot Browser */}
        <div className="lg:col-span-3 space-y-6" data-testid="scripting-depot">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Script Depot
              </h3>
            </div>

            {manifestLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading manifest...
              </div>
            ) : !manifest?.scripts?.length ? (
              <p className="text-xs text-slate-500 py-4">No scripts registered.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(scriptsByCategory).map(([category, scripts]) => (
                  <div key={category}>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {scripts.map((script) => (
                        <div key={script.name}>
                          <button
                            type="button"
                            className={`glass-card p-3 space-y-2 cursor-pointer transition-all text-left w-full ${
                              loadedScript === script.name
                                ? "border-amber-500/40 bg-amber-500/5"
                                : ""
                            } ${selectedDetail === script.name ? "ring-1 ring-amber-500/20" : ""}`}
                            onClick={() =>
                              setSelectedDetail(selectedDetail === script.name ? null : script.name)
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {script.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadScript(script);
                                }}
                                style={{
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "9px",
                                }}
                                className="font-bold hover:bg-amber-500/20 transition-all shrink-0"
                              >
                                Load
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              {script.description}
                            </p>
                          </button>
                          {selectedDetail === script.name && scriptDetails[script.name] && (
                            <div className="mt-1 mb-2 bg-black/30 border border-white/5 rounded-lg p-3 space-y-2 text-[10px]">
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">
                                  How to use
                                </p>
                                <p className="text-slate-300 whitespace-pre-line">
                                  {scriptDetails[script.name].howto}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                                  Requires
                                </p>
                                <p className="text-slate-400">
                                  {scriptDetails[script.name].requires}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                                  Configuration
                                </p>
                                <p className="text-slate-400">
                                  {scriptDetails[script.name].config}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                                  Example
                                </p>
                                <pre className="font-mono text-[9px] text-sky-400 bg-black/40 p-2 rounded-lg mt-0.5 whitespace-pre-wrap">
                                  {scriptDetails[script.name].example}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Script Editor */}
        <div className="lg:col-span-6 space-y-4" data-testid="scripting-editor">
          <div className="glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Script Editor
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-black/30 border border-white/10 px-2 py-0.5 rounded-md">
                {currentFilename}
              </span>
            </div>

            <textarea
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              rows={22}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "16px",
                color: "#38bdf8",
                fontFamily: "monospace",
                fontSize: "11px",
                lineHeight: "1.6",
                resize: "vertical",
              }}
              className="focus:outline-none focus:border-amber-500/30"
              spellCheck={false}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleRevert}
                disabled={scriptCode === originalCode}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  color: "white",
                  cursor: scriptCode === originalCode ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  opacity: scriptCode === originalCode ? 0.5 : 1,
                }}
                className="font-bold hover:bg-white/10 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revert
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
                className="font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-indigo-400" />
                Save as .js
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Script Generation */}
        <div className="lg:col-span-3 space-y-6" data-testid="scripting-ai">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Bot className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                AI Script Gen
              </h3>
            </div>

            <div className="space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the script behavior you want..."
                rows={6}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "white",
                  fontSize: "11px",
                  lineHeight: "1.5",
                  resize: "none",
                }}
                className="focus:outline-none focus:border-amber-500/30 placeholder:text-slate-600"
              />

              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                style={{
                  background:
                    aiLoading || !aiPrompt.trim()
                      ? "rgba(168, 85, 247, 0.3)"
                      : "linear-gradient(to right, #a855f7, #7c3aed)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  color: "white",
                  cursor: aiLoading || !aiPrompt.trim() ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  width: "100%",
                }}
                className="font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate Script
              </button>

              {aiError && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-[10px] leading-relaxed">
                  {aiError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
