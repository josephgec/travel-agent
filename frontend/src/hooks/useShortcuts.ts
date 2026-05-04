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
    const handler = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        try {
          const conv = await createConversation();
          setConversation(conv.id);
          navigate("/");
        } catch {
          // ignore
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
