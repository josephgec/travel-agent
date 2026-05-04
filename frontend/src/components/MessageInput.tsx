import { Send, Square } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useStream } from "../hooks/useStream";
import { useChat } from "../store/chat";

export function MessageInput() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Listen for "chat:prefill" events from suggestion buttons.
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string") {
        setDraft(text);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("chat:prefill", handler);
    return () => window.removeEventListener("chat:prefill", handler);
  }, []);
  const conversationId = useChat((s) => s.conversationId);
  const pushUser = useChat((s) => s.pushUser);
  const startAssistant = useChat((s) => s.startAssistant);
  const appendAssistantText = useChat((s) => s.appendAssistantText);
  const finishAssistant = useChat((s) => s.finishAssistant);
  const pushToolCall = useChat((s) => s.pushToolCall);
  const fillToolResult = useChat((s) => s.fillToolResult);
  const setStatus = useChat((s) => s.setStatus);

  let assistantId: string | null = null;
  const pendingTools = new Map<string, string>(); // id -> name

  const { start, stop, streaming } = useStream({
    onEvent: (ev) => {
      switch (ev.type) {
        case "iteration":
          // Each iteration begins a fresh assistant message bubble.
          assistantId = startAssistant();
          setStatus({ kind: "thinking" });
          break;
        case "text_delta":
          if (assistantId) appendAssistantText(assistantId, ev.data.text);
          // First text means model is generating, not waiting on tool.
          setStatus({ kind: "idle" });
          break;
        case "tool_use_start": {
          const id = ev.data.id ?? cryptoRandom();
          const name = ev.data.name ?? "?";
          pendingTools.set(id, name);
          pushToolCall(id, name, ev.data.arguments);
          setStatus({ kind: "tool", toolName: name });
          break;
        }
        case "tool_result":
          if (ev.data.tool_call_id) {
            fillToolResult(ev.data.tool_call_id, ev.data.result);
            pendingTools.delete(ev.data.tool_call_id);
          }
          // If more tools are still pending, keep the indicator on the next one;
          // otherwise we're back to thinking until the next chunk arrives.
          if (pendingTools.size > 0) {
            const [name] = [...pendingTools.values()];
            setStatus({ kind: "tool", toolName: name });
          } else {
            setStatus({ kind: "thinking" });
          }
          break;
        case "error":
          setError(ev.data.message);
          if (assistantId) finishAssistant(assistantId);
          setStatus({ kind: "idle" });
          break;
        case "done":
          if (assistantId) finishAssistant(assistantId);
          setStatus({ kind: "idle" });
          break;
      }
    },
    onError: (e) => {
      setError(e.message);
      setStatus({ kind: "idle" });
    },
    onDone: () => {
      if (assistantId) finishAssistant(assistantId);
      setStatus({ kind: "idle" });
    },
  });

  const send = () => {
    const text = draft.trim();
    if (!text || !conversationId || streaming) return;
    setError(null);
    pushUser(text);
    setDraft("");
    void start({ conversation_id: conversationId, message: text });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950 p-4">
      {error && (
        <div className="mb-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            conversationId
              ? "Ask about flights, hotels, weather, places…"
              : "Start a new chat first"
          }
          disabled={!conversationId}
          rows={1}
          className="flex-1 resize-none bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 max-h-40"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-md bg-rose-600 hover:bg-rose-500 text-white px-3 py-2"
            aria-label="Stop"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!conversationId || !draft.trim()}
            className="rounded-md bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-50 px-3 py-2"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
