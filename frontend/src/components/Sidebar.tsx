import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
  type Conversation,
  createConversation,
  deleteConversation,
  listConversations,
} from "../lib/api";
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
    <aside className="hidden md:flex w-64 shrink-0 border-r border-neutral-800 bg-neutral-950 flex-col">
      <div className="p-3 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-neutral-100 text-neutral-900 px-3 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((c) => (
          <li key={c.id}>
            <div
              className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer ${
                conversationId === c.id
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-300 hover:bg-neutral-900"
              }`}
              onClick={() => setConversation(c.id)}
            >
              <span className="flex-1 truncate">{c.title ?? "Untitled"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this conversation?")) deleteMut.mutate(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400"
                aria-label="Delete conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {conversations.length === 0 && (
          <li className="text-xs text-neutral-500 px-3 py-2">
            No conversations yet. Start a new chat.
          </li>
        )}
      </ul>
    </aside>
  );
}
