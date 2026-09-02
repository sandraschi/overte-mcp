import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, RotateCcw, Save } from "lucide-react";
import { apiUrl } from "../lib/api-base";

interface BackupEntry {
  name: string;
  size: number;
  created_at: string;
}

function formatBytes(n: number): string {
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function BackupsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ backups: BackupEntry[]; count: number }>({
    queryKey: ["backupsList"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/overte/backups"));
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/overte/backup"), { method: "POST" });
      if (!res.ok) throw new Error("Backup failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backupsList"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(apiUrl(`/api/overte/backups/${encodeURIComponent(name)}/restore`), {
        method: "POST",
      });
      if (!res.ok) throw new Error("Restore failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelsList"] });
      queryClient.invalidateQueries({ queryKey: ["texturesList"] });
    },
  });

  const backups = data?.backups || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <Archive className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Backups</h2>
          <p className="text-xs text-slate-400">
            Zip snapshots of the scripts/models/textures depots + tracked entities. Local to this
            server — does not back up the Overte domain-server's own world data.
          </p>
        </div>
      </div>

      <div className="glass-panel border border-amber-500/20 flex items-start gap-2 text-amber-300 text-xs px-4 py-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Restoring overwrites current depot files with the backup's versions (matching names only —
          it won't delete anything the backup doesn't mention). This can take a while for large
          model files.
        </span>
      </div>

      <div className="glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Snapshots</h3>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            style={{
              background: "linear-gradient(to right, var(--accent-amber), #d97706)",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "white",
              cursor: "pointer",
              fontSize: "11px",
            }}
            className="font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {createMutation.isPending ? "Backing up..." : "Create Backup"}
          </button>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 animate-pulse">Loading...</p>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between text-[11px] bg-black/20 px-3 py-2.5 rounded-lg border border-white/[0.03]"
              >
                <div>
                  <p className="text-white font-mono">{b.name}</p>
                  <p className="text-slate-500">
                    {formatBytes(b.size)} · {new Date(b.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Restore ${b.name}? This overwrites current depot files.`)) {
                      restoreMutation.mutate(b.name);
                    }
                  }}
                  disabled={restoreMutation.isPending}
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "8px",
                    padding: "6px 10px",
                  }}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            ))}
            {backups.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No backups yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
