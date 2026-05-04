import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { LivePlanPanel } from "../components/LivePlanPanel";
import { MessageInput } from "../components/MessageInput";
import { MessageList } from "../components/MessageList";
import { D_PAL } from "../design/postcard/tokens";
import {
  type Plan,
  type StoredMessage,
  exportPlanToCalendar,
  getMessages,
  getPlan,
  updatePlan,
} from "../lib/api";
import { type DisplayMessage, useChat } from "../store/chat";

const SPLIT_DURATION_MS = 700;

export function ChatPage() {
  const conversationId = useChat((s) => s.conversationId);
  const setMessages = useChat((s) => s.setMessages);
  const messages = useChat((s) => s.messages);
  const qc = useQueryClient();

  // Hydrate the message store when the conversation changes.
  const { data: stored } = useQuery<StoredMessage[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
  });
  useEffect(() => {
    if (!stored) return;
    setMessages(storedToDisplay(stored));
  }, [stored, setMessages]);

  // Detect the most-recent plan tool result in the chat. When a new plan id
  // arrives, force the panel open even if the user had closed a previous one.
  const latestPlanFromMessages = useMemo(() => findLatestPlan(messages), [messages]);
  const latestPlanIdRef = useRef<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!latestPlanFromMessages) return;
    if (latestPlanFromMessages.id !== latestPlanIdRef.current) {
      latestPlanIdRef.current = latestPlanFromMessages.id;
      setActivePlanId(latestPlanFromMessages.id);
      setPanelOpen(true);
    }
  }, [latestPlanFromMessages]);

  // Reset panel state when switching conversations.
  useEffect(() => {
    latestPlanIdRef.current = null;
    setActivePlanId(null);
    setPanelOpen(false);
  }, [conversationId]);

  // Whenever the message-derived plan updates (e.g. update_plan tool result),
  // invalidate the plan query so the panel re-fetches the latest server state.
  useEffect(() => {
    if (activePlanId) qc.invalidateQueries({ queryKey: ["plan", activePlanId] });
  }, [latestPlanFromMessages, activePlanId, qc]);

  const { data: plan } = useQuery<Plan>({
    queryKey: ["plan", activePlanId],
    queryFn: () => getPlan(activePlanId!),
    enabled: !!activePlanId,
    initialData: latestPlanFromMessages
      ? (latestPlanFromMessages as unknown as Plan)
      : undefined,
  });

  const saveMut = useMutation({
    mutationFn: () => updatePlan(plan!.id, { status: "saved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", activePlanId] }),
  });
  const exportMut = useMutation({
    mutationFn: () => exportPlanToCalendar(plan!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", activePlanId] }),
  });

  // Easing for the split. We use a single CSS transition on grid-template-columns.
  const splitOpen = panelOpen && !!plan;
  const chatFlex = splitOpen ? "1 1 46%" : "1 1 100%";
  const planFlex = splitOpen ? "0 0 54%" : "0 0 0%";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        background: D_PAL.cream,
        color: D_PAL.ink,
        backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Chat column */}
      <div
        style={{
          flex: chatFlex,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: splitOpen ? `1.5px dashed ${D_PAL.rule}` : "none",
          transition: `flex ${SPLIT_DURATION_MS}ms cubic-bezier(.7,.05,.2,1)`,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <MessageList />
        </div>
        <MessageInput />
      </div>

      {/* Plan column */}
      <div
        style={{
          flex: planFlex,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: `flex ${SPLIT_DURATION_MS}ms cubic-bezier(.7,.05,.2,1)`,
        }}
      >
        {splitOpen && plan && (
          <LivePlanPanel
            plan={plan}
            onClose={() => setPanelOpen(false)}
            onSave={() => saveMut.mutate()}
            onExport={() => {
              if (confirm("Add every timed plan item to your Google Calendar?"))
                exportMut.mutate();
            }}
            saving={saveMut.isPending}
            exporting={exportMut.isPending}
          />
        )}
      </div>

      {/* "Plan available" floating reopen button when user has closed the panel */}
      {!panelOpen && plan && <ReopenChip onClick={() => setPanelOpen(true)} />}
    </div>
  );
}

function ReopenChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.accent}`,
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
        padding: "8px 12px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: '"Caveat", cursive',
        fontSize: 14,
        color: D_PAL.accent,
      }}
      title="Reopen the plan panel"
    >
      📍 plan ↗
    </button>
  );
}

// --- Helpers --------------------------------------------------------------

function findLatestPlan(messages: DisplayMessage[]): { id: string; data: Record<string, unknown> } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind !== "tool") continue;
    const r = m.result as Record<string, unknown> | undefined;
    if (!r) continue;
    if (r.display_hint !== "plan") continue;
    if (typeof r.id !== "string") continue;
    return { id: r.id, data: r };
  }
  return null;
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
