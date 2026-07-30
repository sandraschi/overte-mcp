import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, FileCode } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "../lib/api-base";

interface SkillItem {
  name: string;
  description?: string;
}

export function SkillsPage() {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: skills, isLoading: skillsLoading } = useQuery<SkillItem[]>({
    queryKey: ["skills"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/skills"));
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: skillContent, isLoading: contentLoading } = useQuery({
    queryKey: ["skill", selectedSkill],
    queryFn: async () => {
      if (!selectedSkill) return "";
      const r = await fetch(apiUrl(`/api/skill/${selectedSkill}`));
      if (!r.ok) return "Skill content not found.";
      return r.text();
    },
    enabled: !!selectedSkill,
  });

  if (selectedSkill) {
    return (
      <div data-testid="skills-page" className="space-y-6 animate-fade-in">
        <div
          style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
              <FileCode className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">{selectedSkill}</h2>
              <p className="text-xs text-slate-400">Skill documentation</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedSkill(null)}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
            className="text-xs text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to list
          </button>
        </div>

        <div data-testid="skill-content" className="glass-panel">
          {contentLoading ? (
            <p className="text-xs text-slate-500 animate-pulse">Loading skill content...</p>
          ) : (
            <div className="prose prose-invert prose-xs max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children, ...props }) => (
                    <h1
                      style={{
                        color: "#f59e0b",
                        fontSize: "18px",
                        fontWeight: "800",
                        marginBottom: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2
                      style={{
                        color: "#e2e8f0",
                        fontSize: "14px",
                        fontWeight: "700",
                        marginTop: "20px",
                        marginBottom: "6px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        paddingBottom: "4px",
                      }}
                      {...props}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3
                      style={{
                        color: "#cbd5e1",
                        fontSize: "13px",
                        fontWeight: "600",
                        marginTop: "14px",
                        marginBottom: "4px",
                      }}
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        lineHeight: "1.6",
                        marginBottom: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </p>
                  ),
                  code: ({ children, ...props }) => (
                    <code
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "11px",
                        color: "#f59e0b",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...props }) => (
                    <pre
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: "8px",
                        padding: "12px",
                        overflowX: "auto",
                        border: "1px solid rgba(255,255,255,0.05)",
                        marginBottom: "12px",
                      }}
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        paddingLeft: "20px",
                        marginBottom: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </ul>
                  ),
                  li: ({ children, ...props }) => (
                    <li style={{ marginBottom: "4px" }} {...props}>
                      {children}
                    </li>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong style={{ color: "#e2e8f0" }} {...props}>
                      {children}
                    </strong>
                  ),
                  a: ({ children, href, ...props }) => (
                    <a
                      href={href}
                      style={{ color: "#818cf8" }}
                      className="hover:text-indigo-300"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {skillContent || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="skills-page" className="space-y-6 animate-fade-in">
      <div
        style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}
        className="flex items-center gap-4"
      >
        <div className="glass-panel" style={{ padding: "12px", borderRadius: "12px" }}>
          <BookOpen className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Skills</h2>
          <p className="text-xs text-slate-400">Available skill definitions</p>
        </div>
      </div>

      {skillsLoading ? (
        <div className="glass-panel">
          <p className="text-xs text-slate-500 animate-pulse">Loading skills...</p>
        </div>
      ) : !skills || skills.length === 0 ? (
        <div className="glass-panel">
          <p className="text-xs text-slate-500">No skills found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <button
              key={skill.name}
              onClick={() => setSelectedSkill(skill.name)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "16px",
                width: "100%",
              }}
              className="hover:border-amber-500/30 hover:bg-white/[0.02] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                >
                  <FileCode className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{skill.name}</p>
                  {skill.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {skill.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
