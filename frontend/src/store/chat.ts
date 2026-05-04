import { create } from "zustand";

export type DisplayMessage =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; streaming?: boolean }
  | {
      kind: "tool";
      id: string;
      name: string;
      args: unknown;
      result?: Record<string, unknown>;
      pending: boolean;
    };

// What the agent is currently doing — drives the inline status indicator.
export type AgentStatus =
  | { kind: "idle" }
  | { kind: "thinking" }
  | { kind: "tool"; toolName: string };

type ChatState = {
  conversationId: string | null;
  messages: DisplayMessage[];
  status: AgentStatus;
  setConversation: (id: string | null) => void;
  setMessages: (messages: DisplayMessage[]) => void;
  pushUser: (text: string) => void;
  startAssistant: () => string;
  appendAssistantText: (id: string, delta: string) => void;
  finishAssistant: (id: string) => void;
  pushToolCall: (id: string, name: string, args: unknown) => void;
  fillToolResult: (id: string, result: Record<string, unknown>) => void;
  setStatus: (status: AgentStatus) => void;
};

export const useChat = create<ChatState>((set) => ({
  conversationId: null,
  messages: [],
  status: { kind: "idle" },

  setConversation: (id) => set({ conversationId: id, messages: [], status: { kind: "idle" } }),
  setMessages: (messages) => set({ messages }),
  setStatus: (status) => set({ status }),

  pushUser: (text) =>
    set((s) => ({
      messages: [...s.messages, { kind: "user", id: cryptoRandom(), text }],
    })),

  startAssistant: () => {
    const id = cryptoRandom();
    set((s) => ({
      messages: [...s.messages, { kind: "assistant", id, text: "", streaming: true }],
    }));
    return id;
  },

  appendAssistantText: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.kind === "assistant" && m.id === id ? { ...m, text: m.text + delta } : m,
      ),
    })),

  finishAssistant: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.kind === "assistant" && m.id === id ? { ...m, streaming: false } : m,
      ),
    })),

  pushToolCall: (id, name, args) =>
    set((s) => ({
      messages: [...s.messages, { kind: "tool", id, name, args, pending: true }],
    })),

  fillToolResult: (id, result) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.kind === "tool" && m.id === id ? { ...m, result, pending: false } : m,
      ),
    })),
}));

function cryptoRandom(): string {
  // crypto.randomUUID is fine in modern browsers; fallback for older.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
