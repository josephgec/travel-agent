import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageInput } from "../components/MessageInput";
import { MessageList } from "../components/MessageList";
import { type StoredMessage, getMessages } from "../lib/api";
import { type DisplayMessage, useChat } from "../store/chat";

export function ChatPage() {
  const conversationId = useChat((s) => s.conversationId);
  const setMessages = useChat((s) => s.setMessages);

  const { data: stored } = useQuery<StoredMessage[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!stored) return;
    setMessages(storedToDisplay(stored));
  }, [stored, setMessages]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList />
      </div>
      <MessageInput />
    </>
  );
}

function storedToDisplay(stored: StoredMessage[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  for (const m of stored) {
    const c = m.content as Record<string, unknown>;
    if (m.role === "user") {
      out.push({ kind: "user", id: m.id, text: String(c.text ?? "") });
    } else if (m.role === "assistant") {
      out.push({
        kind: "assistant",
        id: m.id,
        text: String(c.text ?? ""),
        streaming: false,
      });
      const calls = (c.tool_calls ?? []) as Array<{
        id?: string;
        function?: { name?: string; arguments?: unknown };
      }>;
      for (const call of calls) {
        out.push({
          kind: "tool",
          id: call.id ?? `${m.id}-${call.function?.name ?? "tool"}`,
          name: call.function?.name ?? "?",
          args: call.function?.arguments,
          pending: true,
        });
      }
    } else if (m.role === "tool") {
      const target = out.find(
        (x) => x.kind === "tool" && x.id === c.tool_call_id,
      ) as Extract<DisplayMessage, { kind: "tool" }> | undefined;
      if (target) {
        target.result = c.result as Record<string, unknown>;
        target.pending = false;
      }
    }
  }
  return out;
}
