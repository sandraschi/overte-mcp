import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AvatarsPage } from "./pages/avatars";
import { Dashboard } from "./pages/dashboard";
import { EntitiesPage } from "./pages/entities";
import { HelpPage } from "./pages/help";
import { ScriptingPage } from "./pages/scripting";

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
