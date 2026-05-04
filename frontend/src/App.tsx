import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { NavRail } from "./components/NavRail";
import { Sidebar } from "./components/Sidebar";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT } from "./design/postcard/tokens";
import { useShortcuts } from "./hooks/useShortcuts";
import { ChatPage } from "./pages/ChatPage";
import { InlineMaterializationPage } from "./pages/demo/InlineMaterializationPage";
import { SplitGrowPage } from "./pages/demo/SplitGrowPage";
import { OptionsPage } from "./pages/options/OptionsPage";
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
  // Options + demo pages render their own header, skip the global one
  const fullBleed =
    location.pathname.startsWith("/options") || location.pathname.startsWith("/demo");

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: D_PAL.cream,
        color: D_PAL.ink,
      }}
    >
      <NavRail />
      {showSidebar && <Sidebar />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!fullBleed && <Header />}
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/demo/inline-materialization" element={<InlineMaterializationPage />} />
          <Route path="/demo/split-grow" element={<SplitGrowPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

function Header() {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform);
  const meta = isMac ? "⌘" : "Ctrl";
  return (
    <header
      style={{
        background: D_PAL.paper,
        borderBottom: `1.5px dashed ${D_PAL.rule}`,
        padding: "14px 32px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 17,
            color: D_PAL.accent,
            transform: "rotate(-1.5deg)",
            display: "inline-block",
          }}
        >
          welcome —
        </span>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
          Wanderlist
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>
          · TRAVEL AGENT
        </span>
      </div>
      <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
        <Kbd>{meta}K</Kbd> NEW CHAT &nbsp;·&nbsp; <Kbd>{meta}/</Kbd> CYCLE PAGES
      </div>
    </header>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <span
      style={{
        background: D_PAL.paperHi,
        border: `0.5px solid ${D_PAL.rule}`,
        padding: "1px 5px",
        fontFamily: D_MONO,
        fontSize: 9.5,
        color: D_PAL.ink2,
        letterSpacing: 0.6,
      }}
    >
      {children}
    </span>
  );
}
