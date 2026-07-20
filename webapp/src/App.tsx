import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/dashboard";
import { AvatarsPage } from "./pages/avatars";
import { EntitiesPage } from "./pages/entities";
import { ScriptingPage } from "./pages/scripting";
import { HelpPage } from "./pages/help";

// Initialize TanStack React Query Client
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
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/scripting" element={<ScriptingPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
