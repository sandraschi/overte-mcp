import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Copy, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface ModelEntry {
  name: string;
  description: string;
  category: string;
  exists: boolean;
  url: string;
  size?: number;
}

function formatBytes(n?: number): string {
  if (!n) return "-";
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function ModelsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("uncategorized");

  const { data, isLoading } = useQuery<{ models: ModelEntry[]; count: number }>({
    queryKey: ["modelsList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/models"));
      if (!res.ok) throw new Error("Failed to load models");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Pick a .glb/.gltf/.fbx/.obj file first");
      const form = new FormData();
      form.append("file", file);
      const params = new URLSearchParams({ description, category });
      const res = await fetch(apiUrl(`/api/overte/models?${params}`), {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelsList"] });
      if (fileRef.current) fileRef.current.value = "";
      setDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(apiUrl(`/api/overte/models/${encodeURIComponent(name)}`), {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modelsList"] }),
  });

  const models = data?.models || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <Box className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Model Depot</h2>
          <p className="text-xs text-slate-400">
            GLB/glTF/FBX/OBJ files stored locally and served for spawn's model_url — includes files
            that predate this depot (Nekomimi-chan, the living-room scene)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Upload className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Upload Model
              </h3>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".glb,.gltf,.fbx,.obj"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px",
                color: "white",
                width: "100%",
                fontSize: "11px",
              }}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                width: "100%",
              }}
              className="text-xs"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "white",
                width: "100%",
              }}
              className="text-xs"
            />
            {uploadMutation.isError && (
              <p className="text-[10px] text-red-400">{(uploadMutation.error as Error).message}</p>
            )}
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
              style={{
                background: "linear-gradient(to right, var(--accent-amber), #d97706)",
                border: "none",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
              }}
              className="font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Models</h3>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                {models.length} items
              </span>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Loading...</p>
            ) : (
              <div className="space-y-2">
                {models.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between text-[11px] bg-black/20 px-3 py-2.5 rounded-lg border border-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold truncate">{m.name}</p>
                      <p className="text-slate-500 truncate">
                        {m.description || <span className="italic">no description</span>} ·{" "}
                        {m.category} · {formatBytes(m.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.url)}
                        title="Copy model_url"
                        style={{
                          background: "none",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                        }}
                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(m.name)}
                        title="Delete"
                        style={{
                          background: "none",
                          border: "1px solid transparent",
                          borderRadius: "6px",
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {models.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No models uploaded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
