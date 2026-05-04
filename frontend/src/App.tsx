import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Luggage,
  MessageSquare,
  ScrollText,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useShortcuts } from "./hooks/useShortcuts";
import { ChatPage } from "./pages/ChatPage";
import { PlanDetailPage } from "./pages/PlanDetailPage";
import { PlansPage } from "./pages/PlansPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TripsPage } from "./pages/TripsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function Layout() {
  useShortcuts();
  const location = useLocation();
  const showSidebar = location.pathname === "/";
  return (
    <div className="h-screen flex bg-neutral-950 text-neutral-100">
      <NavRail />
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

function NavRail() {
  return (
    <nav className="w-12 border-r border-neutral-800 bg-neutral-950 flex flex-col items-center py-3 gap-2">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `p-2 rounded-md ${isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`
        }
        title="Chat"
      >
        <MessageSquare size={18} />
      </NavLink>
      <NavLink
        to="/trips"
        className={({ isActive }) =>
          `p-2 rounded-md ${isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`
        }
        title="Trips"
      >
        <Luggage size={18} />
      </NavLink>
      <NavLink
        to="/plans"
        className={({ isActive }) =>
          `p-2 rounded-md ${isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`
        }
        title="Plans"
      >
        <ScrollText size={18} />
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `p-2 rounded-md ${isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`
        }
        title="Settings"
      >
        <SettingsIcon size={18} />
      </NavLink>
    </nav>
  );
}

function Header() {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform);
  const meta = isMac ? "⌘" : "Ctrl";
  return (
    <header className="border-b border-neutral-800 px-6 py-3 text-sm font-medium flex items-center justify-between">
      <span>Travel Agent</span>
      <span className="hidden sm:inline text-xs text-neutral-500 font-normal">
        <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono">
          {meta}K
        </kbd>{" "}
        new chat ·{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono">
          {meta}/
        </kbd>{" "}
        cycle pages
      </span>
    </header>
  );
}
