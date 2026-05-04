import { Send, Square } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { D_MONO, D_PAL, D_SANS, D_SCRIPT } from "../design/postcard/tokens";
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
    <div
      style={{
        borderTop: `1.5px dashed ${D_PAL.rule}`,
        background: D_PAL.paper,
        padding: "14px 24px 16px",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {error && (
          <div
            style={{
              marginBottom: 10,
              fontFamily: D_SANS,
              fontSize: 12,
              color: "#a23a28",
              background: "#f3d9d2",
              border: "0.5px solid #a23a28",
              padding: "8px 12px",
            }}
          >
            <span style={{ fontFamily: D_SCRIPT, fontSize: 14, marginRight: 6 }}>trouble —</span>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              conversationId
                ? "ask about flights, hotels, weather, places…"
                : "start a new chat first"
            }
            disabled={!conversationId}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              background: D_PAL.paperHi,
              border: `0.5px solid ${D_PAL.rule}`,
              boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
              padding: "10px 14px",
              fontFamily: D_SANS,
              fontSize: 14,
              color: D_PAL.ink,
              outline: "none",
              maxHeight: 180,
              opacity: conversationId ? 1 : 0.5,
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = D_PAL.accent;
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = D_PAL.rule;
            }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              style={{
                background: "#a23a28",
                color: D_PAL.cream,
                border: "none",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!conversationId || !draft.trim()}
              aria-label="Send"
              style={{
                background: D_PAL.ink,
                color: D_PAL.cream,
                border: "none",
                padding: "10px 14px",
                cursor: !conversationId || !draft.trim() ? "not-allowed" : "pointer",
                opacity: !conversationId || !draft.trim() ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={14} />
              <span style={{ fontFamily: D_MONO, fontSize: 10, letterSpacing: 1 }}>SEND</span>
            </button>
          )}
        </div>
        <div style={{ marginTop: 6, fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1, textAlign: "right" }}>
          ENTER TO SEND · SHIFT+ENTER FOR NEWLINE
        </div>
      </div>
    </div>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
