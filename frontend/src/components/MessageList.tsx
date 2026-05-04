import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "../store/chat";
import {
  CalendarEventCreatedCard,
  type CalendarEventCreatedResult,
  CalendarEventsCard,
  type CalendarEventsResult,
} from "./CalendarCards";
import { DirectionsCard, type DirectionsResult } from "./DirectionsCard";
import { FlightOffersCard, type FlightOffersResult } from "./FlightOffersCard";
import { HotelOffersCard, type HotelOffersResult } from "./HotelOffersCard";
import { PlacesCard, type PlacesResult } from "./PlacesCard";
import { PlanCard, type PlanResult } from "./PlanCard";

const SUGGESTED_PROMPTS = [
  "Plan a long weekend in Mexico City — foodie focus, ~$1500",
  "Find me a flight home for Thanksgiving",
  "What's the weather in Tokyo next week?",
  "What flights do I have booked this year?",
  "Block December 15-22 on my calendar as 'Tokyo trip'",
];

export function MessageList() {
  const messages = useChat((s) => s.messages);
  const status = useChat((s) => s.status);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Stick to bottom on new messages or status changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full space-y-4">
          <div className="text-center text-neutral-300">
            <h2 className="text-lg font-medium">What can I help you plan?</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Try one of these — or type anything in the box below.
            </p>
          </div>
          <ul className="space-y-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => prefillInput(p)}
                  className="w-full text-left rounded-md border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 px-3 py-2 text-sm text-neutral-300"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((m) => {
        if (m.kind === "user") {
          return (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 whitespace-pre-wrap">
                {m.text}
              </div>
            </div>
          );
        }
        if (m.kind === "assistant") {
          return (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[80%] text-neutral-100 prose prose-invert prose-sm">
                <ReactMarkdown>{m.text || (m.streaming ? "…" : "")}</ReactMarkdown>
              </div>
            </div>
          );
        }
        return <ToolCard key={m.id} msg={m} />;
      })}
      {status.kind !== "idle" && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 size={12} className="animate-spin" />
          {status.kind === "thinking" ? (
            <span>Thinking…</span>
          ) : (
            <span>
              Calling <span className="font-mono text-neutral-300">{status.toolName}</span>…
            </span>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// Briefly fills the input textarea via a custom event the input listens for.
// Avoids a tighter coupling between MessageList and MessageInput.
function prefillInput(text: string) {
  window.dispatchEvent(new CustomEvent("chat:prefill", { detail: text }));
}

function ToolCard({
  msg,
}: {
  msg: {
    id: string;
    name: string;
    args: unknown;
    result?: Record<string, unknown>;
    pending: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const hint = msg.result?.display_hint as string | undefined;
  const isRich = !msg.pending && !msg.result?.error && hint !== undefined;

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-xs">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:bg-neutral-900"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Wrench size={14} className="text-amber-400" />
          <span className="font-mono">{msg.name}</span>
          <span className="ml-auto text-neutral-500">
            {msg.pending ? "running…" : msg.result?.error ? "error" : "done"}
          </span>
        </button>
        {open && (
          <div className="px-3 pb-3 space-y-2 font-mono">
            <div>
              <div className="text-neutral-500 mb-1">arguments</div>
              <pre className="bg-neutral-950 rounded p-2 overflow-x-auto">
                {JSON.stringify(msg.args, null, 2)}
              </pre>
            </div>
            {msg.result && (
              <div>
                <div className="text-neutral-500 mb-1">result</div>
                <pre className="bg-neutral-950 rounded p-2 overflow-x-auto max-h-64">
                  {JSON.stringify(msg.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
      {isRich && hint === "flight_offers" && (
        <FlightOffersCard result={msg.result as unknown as FlightOffersResult} />
      )}
      {isRich && hint === "hotel_offers" && (
        <HotelOffersCard result={msg.result as unknown as HotelOffersResult} />
      )}
      {isRich && hint === "places" && (
        <PlacesCard result={msg.result as unknown as PlacesResult} />
      )}
      {isRich && hint === "directions" && (
        <DirectionsCard result={msg.result as unknown as DirectionsResult} />
      )}
      {isRich && hint === "calendar_events" && (
        <CalendarEventsCard result={msg.result as unknown as CalendarEventsResult} />
      )}
      {isRich && hint === "calendar_event_created" && (
        <CalendarEventCreatedCard
          result={msg.result as unknown as CalendarEventCreatedResult}
        />
      )}
      {isRich && hint === "plan" && (
        <PlanCard result={msg.result as unknown as PlanResult} />
      )}
    </div>
  );
}
