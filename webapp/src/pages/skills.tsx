import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "../lib/api-base";

interface SkillInfo {
  name: string;
  title: string;
  description: string;
}

export function SkillsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: skillsData } = useQuery<{ skills: SkillInfo[] }>({
    queryKey: ["skills"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/skills"));
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const { data: content } = useQuery<{ content: string }>({
    queryKey: ["skill", selected],
    queryFn: async () => {
      if (!selected) return { content: "" };
      const r = await fetch(apiUrl(`/api/skill/${selected}`));
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selected,
  });
  const skills = skillsData?.skills || [];

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--border-color)" }} className="pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
            <BookOpen className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Skills</h2>
            <p className="text-xs text-slate-400">Overte MCP skills and usage guides</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          {skills.map((s) => (
            <button
              key={s.name}
              onClick={() => setSelected(s.name)}
              className={`glass-card w-full text-left text-xs transition-all ${selected === s.name ? "border-amber-500/30" : ""}`}
            >
              <h4 className="font-bold text-white">{s.title}</h4>
              <p className="text-slate-400 text-[10px] mt-1">{s.description}</p>
            </button>
          ))}
          {skills.length === 0 && <p className="text-xs text-slate-500">No skills available.</p>}
        </div>
        <div className="md:col-span-3">
          {selected && content ? (
            <div className="glass-panel text-sm leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-white mb-3 mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-white mb-2 mt-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold text-amber-400 mb-1 mt-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-300 mb-3 text-xs leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 space-y-1 mb-3 text-xs text-slate-300">
                      {children}
                    </ul>
                  ),
                  code: ({ children }) => (
                    <code className="bg-black/30 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">
                      {children}
                    </code>
                  ),
                }}
              >
                {content.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="glass-panel flex items-center justify-center h-40 text-slate-500 text-xs">
              Select a skill to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
