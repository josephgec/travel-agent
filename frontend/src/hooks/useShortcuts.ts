import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createConversation } from "../lib/api";
import { useChat } from "../store/chat";

/**
 * Global keyboard shortcuts.
 *
 * Cmd/Ctrl + K → start a new conversation and focus chat
 * Cmd/Ctrl + / → cycle nav: chat → trips → plans → settings → chat
 */
export function useShortcuts() {
  const navigate = useNavigate();
  const setConversation = useChat((s) => s.setConversation);

  useEffect(() => {
    // Guard against double-invocation: held keys (e.repeat), and the brief window
    // before our async createConversation resolves where another keydown could fire.
    let inFlight = false;

    const handler = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.repeat) return; // ignore auto-repeating keys

      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (inFlight) return;
        inFlight = true;
        try {
          const conv = await createConversation();
          setConversation(conv.id);
          navigate("/");
        } catch {
          // ignore
        } finally {
          inFlight = false;
        }
      } else if (e.key === "/") {
        e.preventDefault();
        const order = ["/", "/trips", "/plans", "/settings"];
        const idx = order.indexOf(window.location.pathname);
        navigate(order[(idx + 1) % order.length]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, setConversation]);
}
