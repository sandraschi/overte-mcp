import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

// EXPERIMENTAL light mode (invert hack). Not fleet standard — see index.css.
// Toggling `.dark` off the root flips the invert filter; persisted so the
// choice survives reloads. Delete this + the CSS block to revert.
const THEME_KEY = "overte-light-mode";

function useExperimentalTheme() {
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !light);
    try {
      localStorage.setItem(THEME_KEY, light ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [light]);

  return { light, toggle: () => setLight((v) => !v) };
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { light, toggle } = useExperimentalTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-end px-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl shrink-0">
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={
              light
                ? "Switch to dark (experimental light mode)"
                : "Switch to light (experimental, ugly)"
            }
            aria-label="Toggle light mode (experimental)"
          >
            {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
