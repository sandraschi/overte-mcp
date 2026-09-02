import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { apiUrl } from "../lib/api-base";

interface TextureEntry {
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

export function TexturesPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("uncategorized");

  const { data, isLoading } = useQuery<{ textures: TextureEntry[]; count: number }>({
    queryKey: ["texturesList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/textures"));
      if (!res.ok) throw new Error("Failed to load textures");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Pick a .png/.jpg file first");
      const form = new FormData();
      form.append("file", file);
      const params = new URLSearchParams({ description, category });
      const res = await fetch(apiUrl(`/api/overte/textures?${params}`), {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["texturesList"] });
      if (fileRef.current) fileRef.current.value = "";
      setDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(apiUrl(`/api/overte/textures/${encodeURIComponent(name)}`), {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["texturesList"] }),
  });

  const textures = data?.textures || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <ImageIcon className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Texture Depot</h2>
          <p className="text-xs text-slate-400">
            PNG/JPG files for a Model entity's `textures` override (material-name → URL JSON) —
            confirmed KTX support unverified, PNG/JPG are the safe baseline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="glass-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
              <Upload className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Upload Texture
              </h3>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg"
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Textures</h3>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                {textures.length} items
              </span>
            </div>
            {isLoading ? (
              <p className="text-xs text-slate-400 animate-pulse">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {textures.map((t) => (
                  <div
                    key={t.name}
                    className="bg-black/20 rounded-lg border border-white/[0.03] overflow-hidden group relative"
                  >
                    <img
                      src={t.url}
                      alt={t.name}
                      className="w-full h-24 object-cover"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                    />
                    <div className="p-2 space-y-0.5">
                      <p className="text-[10px] text-white font-bold truncate">{t.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">
                        {t.category} · {formatBytes(t.size)}
                      </p>
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigator.clipboard.writeText(t.url)}
                        title="Copy URL"
                        style={{
                          background: "rgba(0,0,0,0.7)",
                          border: "none",
                          borderRadius: "4px",
                        }}
                        className="p-1 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(t.name)}
                        title="Delete"
                        style={{
                          background: "rgba(0,0,0,0.7)",
                          border: "none",
                          borderRadius: "4px",
                        }}
                        className="p-1 text-slate-300 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {textures.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4 col-span-full">
                    No textures uploaded yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
