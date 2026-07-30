import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AvatarsPage } from "./pages/avatars";
import { ChatPage } from "./pages/chat";
import { Dashboard } from "./pages/dashboard";
import { EntitiesPage } from "./pages/entities";
import { HelpPage } from "./pages/help";
import { LogsPage } from "./pages/logs";
import { ScriptingPage } from "./pages/scripting";
import { SettingsPage } from "./pages/settings";
import { SkillsPage } from "./pages/skills";
import { ToolsPage } from "./pages/tools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/avatars" element={<AvatarsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/scripting" element={<ScriptingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
