import {
  AppWindow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Terminal,
  TreePine,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../common/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/avatars", label: "Avatars", icon: Users, section: "space" },
  { href: "/entities", label: "Entities Explorer", icon: TreePine, section: "space" },
  { href: "/scripting", label: "JS Scripting", icon: Terminal, section: "systems" },
  { href: "/chat", label: "Chat", icon: MessageSquare, section: "intelligence" },
  { href: "/tools", label: "Tools", icon: Wrench, section: "intelligence" },
  { href: "/skills", label: "Skills", icon: ScrollText, section: "intelligence" },
  { href: "/logs", label: "Logs", icon: ScrollText, section: "meta" },
  { href: "/settings", label: "Settings", icon: Settings, section: "meta" },
  { href: "/apps-hub", label: "Apps Hub", icon: AppWindow, section: "meta" },
  { href: "/help", label: "Help Hub", icon: HelpCircle, section: "meta" },
];

const sections: Record<string, string> = {
  main: "Overview",
  space: "Space",
  systems: "Systems",
  intelligence: "Intelligence",
  meta: "Meta",
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  // Group items by section
  const grouped: Record<string, typeof navItems> = {};
  for (const item of navItems) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  }

  // Handle collapsible states for categories
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      main: true,
      space: true,
      systems: true,
      intelligence: true,
      meta: true,
    };
    for (const item of navItems) {
      if (location.pathname === item.href) {
        initial[item.section] = true;
      }
    }
    return initial;
  });

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  return (
    <aside
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w-expanded)",
        borderRight: "1px solid var(--border-color)",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(20px)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className="flex flex-col h-screen flex-shrink-0 relative"
    >
      {/* Brand Header + Collapse Toggle */}
      <div
        style={{ height: "64px", borderBottom: "1px solid var(--border-color)" }}
        className="flex items-center px-4 gap-3 flex-shrink-0 overflow-hidden"
      >
        <Globe className="h-6 w-6 text-amber-500 flex-shrink-0" />
        {!collapsed && (
          <div className="flex flex-col flex-1 animate-in fade-in duration-300">
            <span className="font-extrabold text-sm tracking-wider text-white">Overte</span>
            <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">
              MCP
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            border: "1px solid transparent",
            background: "none",
            outline: "none",
            borderRadius: "8px",
          }}
          className="p-1.5 text-slate-500 hover:bg-white/5 hover:text-white cursor-pointer hover:border-white/10 transition-all"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-5 scrollbar-none">
        {Object.entries(grouped).map(([sec, items]) => {
          const isExpanded = expandedSections[sec] || collapsed;

          return (
            <div key={sec} className="space-y-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(sec)}
                  style={{ background: "none", border: "none", outline: "none" }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-white cursor-pointer transition-colors"
                >
                  <span>{sections[sec]}</span>
                  <ChevronDown
                    style={{
                      transform: expandedSections[sec] ? "rotate(0)" : "rotate(-90deg)",
                      transition: "transform 0.2s ease",
                    }}
                    className="h-3 w-3 text-slate-500"
                  />
                </button>
              )}

              {isExpanded && (
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        style={{
                          textDecoration: "none",
                          background: active ? "rgba(245, 158, 11, 0.08)" : "transparent",
                          border: active
                            ? "1px solid rgba(245, 158, 11, 0.2)"
                            : "1px solid transparent",
                          color: active ? "var(--text-primary)" : "var(--text-secondary)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: collapsed ? "center" : "flex-start",
                        }}
                        className={cn(
                          "group relative px-3 py-2.5 text-xs font-semibold transition-all hover:text-white hover:bg-white/5",
                          collapsed ? "" : "gap-3",
                        )}
                      >
                        <Icon
                          style={{ color: active ? "var(--accent-amber)" : "inherit" }}
                          className="h-4.5 w-4.5 flex-shrink-0 transition-transform group-hover:scale-110"
                        />
                        {!collapsed && <span>{item.label}</span>}

                        {/* Collapsed Tooltip */}
                        {collapsed && (
                          <span
                            style={{
                              left: "calc(100% + 12px)",
                              background: "#0f172a",
                              border: "1px solid var(--border-color)",
                            }}
                            className="absolute hidden group-hover:block px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white z-50 whitespace-nowrap shadow-2xl glass-morphism animate-in fade-in slide-in-from-left-1"
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
