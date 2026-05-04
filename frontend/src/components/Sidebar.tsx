import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
  type Conversation,
  createConversation,
  deleteConversation,
  listConversations,
} from "../lib/api";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { useChat } from "../store/chat";

export function Sidebar() {
  const qc = useQueryClient();
  const { conversationId, setConversation } = useChat();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });

  // If nothing is selected, pick the most recent.
  useEffect(() => {
    if (conversationId === null && conversations.length > 0) {
      setConversation(conversations[0].id);
    }
  }, [conversationId, conversations, setConversation]);

  const createMut = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setConversation(conv.id);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (conversationId === id) setConversation(null);
    },
  });

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 260,
        flexShrink: 0,
        background: D_PAL.paperWarm,
        borderRight: `1.5px dashed ${D_PAL.rule}`,
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "16px 18px", borderBottom: `0.5px dashed ${D_PAL.rule}` }}>
        <div
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 16,
            color: D_PAL.accent,
            transform: "rotate(-1deg)",
            display: "inline-block",
          }}
        >
          your conversations —
        </div>
        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          style={{
            marginTop: 10,
            width: "100%",
            background: D_PAL.ink,
            color: D_PAL.cream,
            border: "none",
            padding: "9px 12px",
            cursor: "pointer",
            fontFamily: D_DISPLAY,
            fontSize: 12,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: createMut.isPending ? 0.5 : 1,
          }}
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      <ul style={{ flex: 1, overflowY: "auto", padding: "10px 8px", listStyle: "none", margin: 0 }}>
        {conversations.map((c) => {
          const active = conversationId === c.id;
          return (
            <li key={c.id} style={{ marginBottom: 2 }}>
              <div
                onClick={() => setConversation(c.id)}
                className="group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 10px",
                  cursor: "pointer",
                  background: active ? D_PAL.paper : "transparent",
                  border: `0.5px solid ${active ? D_PAL.rule : "transparent"}`,
                  fontFamily: D_SERIF,
                  fontSize: 14,
                  color: D_PAL.ink2,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.title ?? "Untitled"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this conversation?")) deleteMut.mutate(c.id);
                  }}
                  className="group-hover:opacity-100"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: D_PAL.muted,
                    cursor: "pointer",
                    padding: 2,
                    opacity: 0,
                  }}
                  aria-label="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          );
        })}
        {conversations.length === 0 && (
          <li
            style={{
              padding: "12px 10px",
              fontFamily: D_SERIF,
              fontStyle: "italic",
              fontSize: 12.5,
              color: D_PAL.muted,
            }}
          >
            <span style={{ fontFamily: D_MONO, fontSize: 9, letterSpacing: 1 }}>NO CHATS YET</span>
            <div style={{ marginTop: 4 }}>Start a new conversation above.</div>
          </li>
        )}
      </ul>
    </aside>
  );
}
