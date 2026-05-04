import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
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
// Plans are hoisted into the right-side LivePlanPanel by ChatPage instead of
// rendering inline. We don't import PlanCard here.

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: D_PAL.cream,
          backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 620, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontFamily: D_SCRIPT, fontSize: 22, color: D_PAL.accent, transform: "rotate(-1.5deg)", display: "inline-block" }}>
              start somewhere —
            </div>
            <div style={{ fontFamily: D_DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.6, marginTop: 4 }}>
              What can I help you plan?
            </div>
            <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink3, marginTop: 6 }}>
              Pick one of these prompts to begin, or write your own below.
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {SUGGESTED_PROMPTS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => prefillInput(p)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: D_PAL.paper,
                    border: `0.5px solid ${D_PAL.rule}`,
                    boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                    padding: "10px 14px",
                    fontFamily: D_SERIF,
                    fontSize: 14,
                    color: D_PAL.ink2,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = D_PAL.accent;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = D_PAL.rule;
                  }}
                >
                  <span style={{ fontFamily: D_SCRIPT, fontSize: 15, color: D_PAL.accent, marginRight: 6 }}>try —</span>
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
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: D_PAL.cream,
        backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        padding: "20px 28px",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => {
          if (m.kind === "user") {
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "78%",
                    background: D_PAL.ink,
                    color: D_PAL.cream,
                    padding: "10px 14px",
                    fontFamily: D_SERIF,
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "assistant") {
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    maxWidth: "82%",
                    background: D_PAL.paper,
                    border: `0.5px solid ${D_PAL.rule}`,
                    boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent, marginBottom: 4 }}>
                    W. — {m.streaming ? "writing…" : ""}
                  </div>
                  <div className="postcard-prose">
                    <ReactMarkdown>{m.text || (m.streaming ? "…" : "")}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          }
          return <ToolCard key={m.id} msg={m} />;
        })}
        {status.kind !== "idle" && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              border: `0.5px dashed ${D_PAL.rule}`,
              background: D_PAL.paperWarm,
              alignSelf: "flex-start",
              fontFamily: D_MONO,
              fontSize: 11,
              color: D_PAL.ink3,
              letterSpacing: 0.5,
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            {status.kind === "thinking" ? (
              <span>thinking…</span>
            ) : (
              <span>
                calling <span style={{ color: D_PAL.accent }}>{status.toolName}</span>…
              </span>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          background: D_PAL.paperWarm,
          border: `0.5px solid ${D_PAL.rule}`,
          boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: D_PAL.ink2,
          }}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Wrench size={13} style={{ color: D_PAL.accent }} />
          <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, letterSpacing: 0.5 }}>{msg.name}</span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: D_SCRIPT,
              fontSize: 13,
              color: msg.pending ? D_PAL.muted : msg.result?.error ? "#a23a28" : D_PAL.green,
            }}
          >
            {msg.pending ? "running…" : msg.result?.error ? "error" : "done"}
          </span>
        </button>
        {open && (
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1, marginBottom: 4 }}>
                ARGUMENTS
              </div>
              <pre
                style={{
                  background: D_PAL.paperHi,
                  border: `0.5px solid ${D_PAL.ruleSoft}`,
                  padding: 8,
                  margin: 0,
                  fontFamily: D_MONO,
                  fontSize: 11,
                  color: D_PAL.ink2,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(msg.args, null, 2)}
              </pre>
            </div>
            {msg.result && (
              <div>
                <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1, marginBottom: 4 }}>
                  RESULT
                </div>
                <pre
                  style={{
                    background: D_PAL.paperHi,
                    border: `0.5px solid ${D_PAL.ruleSoft}`,
                    padding: 8,
                    margin: 0,
                    fontFamily: D_MONO,
                    fontSize: 11,
                    color: D_PAL.ink2,
                    overflowX: "auto",
                    maxHeight: 240,
                  }}
                >
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
      {/* hint === "plan" intentionally not rendered inline — see LivePlanPanel */}
    </div>
  );
}
