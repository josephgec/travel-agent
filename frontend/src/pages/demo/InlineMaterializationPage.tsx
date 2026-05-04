/**
 * v4 — Inline materialization demo.
 *
 * Chat-first view where the plan progressively grows inside the chat thread.
 * Click the plan card to slide open the full plan beside the chat.
 *
 * Faithful TS port of inline-materialization.jsx from the design canvas.
 * Uses canned data — drives a self-running animation. No backend.
 */
import { useEffect, useRef, useState } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../../design/postcard/tokens";

// --- Script ---------------------------------------------------------------

type Stay = { city: string; name: string; nights: number; price: number };
type Flight = { route: string; carrier: string; date: string; price: number };
type Budget = { spent: number; total: number };

type Plan = {
  title?: string;
  dates?: string;
  cities?: string[];
  flight?: Flight;
  stays?: Stay[];
  budget?: Budget;
};

type Step =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; label: string; sub: string }
  | {
      kind: "plan-init";
      adds: { title: string; dates: string; cities: string[] };
    }
  | { kind: "plan-add"; target: "flight"; value: Flight }
  | { kind: "plan-add"; target: "cities"; value: string[] }
  | { kind: "plan-add"; target: "stay"; value: Stay }
  | { kind: "plan-add"; target: "budget"; value: Budget };

const SCRIPT: Step[] = [
  { kind: "user", text: "I want to do a slow loop through Central & Eastern Europe in July — Kraków, Prague, Ljubljana, ending in Dubrovnik. Around 17 days." },
  { kind: "agent", text: "Lovely shape for a trip. Geographic order is N→S already so no backtracking. Let me draft this as a route." },
  { kind: "plan-init", adds: { title: "Central & Eastern Europe", dates: "Jul 5 — Jul 22, 2026", cities: ["Kraków"] } },
  { kind: "tool", label: "searching flights", sub: "JFK → KRK · Jul 5" },
  { kind: "plan-add", target: "flight", value: { route: "JFK → KRK", carrier: "LOT 26", date: "Jul 5", price: 612 } },
  { kind: "agent", text: "Found a good overnight on LOT — lands Kraków mid-afternoon. Adding stays now." },
  { kind: "tool", label: "finding stays", sub: "4 cities · boutique, walkable" },
  { kind: "plan-add", target: "cities", value: ["Prague", "Ljubljana", "Dubrovnik"] },
  { kind: "plan-add", target: "stay", value: { city: "Kraków", name: "Hotel Indigo", nights: 5, price: 142 } },
  { kind: "plan-add", target: "stay", value: { city: "Prague", name: "Maximilian", nights: 4, price: 168 } },
  { kind: "plan-add", target: "stay", value: { city: "Ljubljana", name: "Vander Urbani", nights: 4, price: 196 } },
  { kind: "plan-add", target: "stay", value: { city: "Dubrovnik", name: "Villa Dubrovnik", nights: 4, price: 412 } },
  { kind: "tool", label: "optimizing route", sub: "rail vs flight, 4 segments" },
  { kind: "plan-add", target: "budget", value: { spent: 2840, total: 4200 } },
  { kind: "agent", text: "Here's the trip. **$2,840 of $4,200**, 4 cities, 17 days — open the card to see the full plan." },
];

// --- Page ------------------------------------------------------------------

export function InlineMaterializationPage() {
  const [accent, setAccent] = useState(D_PAL.accent);
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [plan, setPlan] = useState<Plan>({ stays: [], cities: [] });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-stream the canned script
  useEffect(() => {
    if (step >= SCRIPT.length) return;
    const s = SCRIPT[step];
    const delay =
      s.kind === "agent" ? 1400 : s.kind === "tool" ? 800 : s.kind === "user" ? 600 : 500;
    const t = setTimeout(() => {
      if (s.kind === "plan-init") {
        setPlan((p) => ({ ...p, ...s.adds }));
      } else if (s.kind === "plan-add") {
        setPlan((p) => {
          if (s.target === "flight") return { ...p, flight: s.value };
          if (s.target === "budget") return { ...p, budget: s.value };
          if (s.target === "cities") return { ...p, cities: [...(p.cities ?? []), ...s.value] };
          if (s.target === "stay") return { ...p, stays: [...(p.stays ?? []), s.value] };
          return p;
        });
      }
      setStep((x) => x + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [step]);

  const replay = () => {
    setStep(0);
    setPlan({ stays: [], cities: [] });
    setExpanded(false);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: expanded ? "0fr 1fr" : "1fr 0fr",
        transition: "grid-template-columns 700ms cubic-bezier(.7,.05,.2,1)",
        background: D_PAL.cream,
        color: D_PAL.ink,
        backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        overflow: "hidden",
      }}
    >
      {/* Chat column */}
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: expanded ? `1.5px dashed ${D_PAL.rule}` : "none",
        }}
      >
        <ChatHeader acc={accent} onReplay={replay} setAccent={setAccent} />
        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "32px 0" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "0 32px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {SCRIPT.slice(0, step).map((s, i) => (
              <Moment
                key={i}
                step={s}
                acc={accent}
                plan={plan}
                latest={i === step - 1}
                onOpen={() => setExpanded(true)}
              />
            ))}
            {step < SCRIPT.length && step > 0 && <TypingIndicator acc={accent} />}
          </div>
        </div>
        <Composer />
      </div>

      {/* Plan column */}
      <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {expanded && <ExpandedPlan plan={plan} acc={accent} onClose={() => setExpanded(false)} />}
      </div>

      {/* Inline keyframes */}
      <style>
        {`@keyframes idot{0%,100%{opacity:.2}50%{opacity:1}}
          @keyframes ifadeup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}
      </style>
    </div>
  );
}

// --- Chrome ---------------------------------------------------------------

function ChatHeader({
  acc,
  onReplay,
  setAccent,
}: {
  acc: string;
  onReplay: () => void;
  setAccent: (c: string) => void;
}) {
  const swatches = ["#b04428", "#3f6238", "#2f526e", "#6b3f5e", "#a86c1c"];
  return (
    <div
      style={{
        padding: "14px 32px",
        borderBottom: `1.5px dashed ${D_PAL.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: D_PAL.paper,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
          Wanderlist
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          · TRAVEL CONCIERGE · DEMO
        </span>
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Accent ${c}`}
              onClick={() => setAccent(c)}
              style={{
                width: 18,
                height: 18,
                background: c,
                border: c === acc ? `2px solid ${D_PAL.ink}` : `1px solid ${D_PAL.rule}`,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onReplay}
          style={{
            background: "transparent",
            border: "none",
            fontFamily: D_SCRIPT,
            fontSize: 15,
            color: D_PAL.muted,
            cursor: "pointer",
          }}
        >
          ↻ replay
        </button>
        <span
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 15,
            color: acc,
            transform: "rotate(-1deg)",
            display: "inline-block",
          }}
        >
          + new chat
        </span>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div
      style={{
        padding: 24,
        borderTop: `1.5px dashed ${D_PAL.rule}`,
        background: D_PAL.paper,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: D_PAL.cream,
          padding: "12px 14px 10px",
          border: `0.5px solid ${D_PAL.rule}`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 14,
            background: D_PAL.paper,
            padding: "0 8px",
            fontFamily: D_SCRIPT,
            fontSize: 14,
            color: D_PAL.muted,
          }}
        >
          send a note —
        </div>
        <textarea
          rows={1}
          placeholder="ask for a quieter neighborhood, an earlier flight, a slower pace…"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: D_SERIF,
            fontSize: 14,
            lineHeight: 1.55,
            color: D_PAL.ink,
            fontStyle: "italic",
          }}
        />
      </div>
    </div>
  );
}

function TypingIndicator({ acc }: { acc: string }) {
  return (
    <div
      style={{
        fontFamily: D_SCRIPT,
        fontSize: 18,
        color: acc,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      writing
      <span>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ animation: `idot 1.2s ${i * 0.15}s infinite` }}>
            .
          </span>
        ))}
      </span>
    </div>
  );
}

// --- Moments --------------------------------------------------------------

function Moment({
  step,
  acc,
  plan,
  latest,
  onOpen,
}: {
  step: Step;
  acc: string;
  plan: Plan;
  latest: boolean;
  onOpen: () => void;
}) {
  const wrap = { animation: "ifadeup .35s ease both" } as const;

  if (step.kind === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "78%", ...wrap }}>
        <div
          style={{
            background: D_PAL.ink,
            color: D_PAL.cream,
            padding: "10px 14px",
            fontSize: 14,
            lineHeight: 1.55,
            fontFamily: D_SERIF,
            fontStyle: "italic",
          }}
        >
          "{step.text}"
        </div>
      </div>
    );
  }
  if (step.kind === "agent") {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", ...wrap }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1px solid ${acc}`,
            color: acc,
            fontFamily: D_DISPLAY,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          W
        </div>
        <div
          style={{ flex: 1, fontFamily: D_SERIF, fontSize: 15, lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{
            __html: step.text.replace(
              /\*\*(.+?)\*\*/g,
              `<span style="background:linear-gradient(transparent 65%, ${acc}40 65%);font-weight:500">$1</span>`,
            ),
          }}
        />
      </div>
    );
  }
  if (step.kind === "tool") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 40, ...wrap }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: acc,
            animation: "idot 1.2s infinite",
          }}
        />
        <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2 }}>{step.label}</span>
        <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>· {step.sub}</span>
      </div>
    );
  }

  // Plan-init renders the full growing card.
  if (step.kind === "plan-init") {
    return <PlanCardInChat plan={plan} acc={acc} latest={latest} onOpen={onOpen} />;
  }

  // Plan-add renders a small handwritten "+ added" line.
  let txt = "";
  if (step.target === "flight") txt = `+ flight — ${step.value.route}, ${step.value.carrier}`;
  else if (step.target === "cities")
    txt = `+ ${step.value.length} more cit${step.value.length === 1 ? "y" : "ies"} — ${step.value.join(", ")}`;
  else if (step.target === "stay")
    txt = `+ stay — ${step.value.name}, ${step.value.city} (${step.value.nights}n)`;
  else if (step.target === "budget")
    txt = `· budget locked — $${step.value.spent.toLocaleString()} / $${step.value.total.toLocaleString()}`;
  return (
    <div
      style={{
        paddingLeft: 40,
        fontFamily: D_SCRIPT,
        fontSize: 14,
        color: D_PAL.muted,
        animation: "ifadeup .35s ease both",
      }}
    >
      {txt}
    </div>
  );
}

// --- Growing plan card (in-chat) ------------------------------------------

function PlanCardInChat({
  plan,
  acc,
  onOpen,
}: {
  plan: Plan;
  acc: string;
  latest: boolean;
  onOpen: () => void;
}) {
  const stayTotal = (plan.stays ?? []).reduce((s, x) => s + x.price * x.nights, 0);
  const total = (plan.flight?.price ?? 0) + stayTotal;
  return (
    <div
      onClick={onOpen}
      style={{
        marginLeft: 40,
        marginTop: 4,
        marginBottom: 4,
        background: D_PAL.paper,
        border: `0.5px solid ${acc}`,
        boxShadow: `4px 4px 0 ${D_PAL.paperWarm}, 4px 4px 0 0.5px ${acc}33`,
        animation: "ifadeup .4s ease both",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          padding: "14px 18px 10px",
          borderBottom: `0.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: D_SCRIPT,
              fontSize: 14,
              color: acc,
              transform: "rotate(-1deg)",
              display: "inline-block",
            }}
          >
            your trip —
          </div>
          <div
            style={{
              fontFamily: D_DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.4,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {plan.title ? (
              plan.title
            ) : (
              <span style={{ color: D_PAL.muted, fontStyle: "italic" }}>drafting…</span>
            )}
          </div>
          {plan.dates && (
            <div
              style={{
                fontFamily: D_MONO,
                fontSize: 9.5,
                color: D_PAL.muted,
                letterSpacing: 1,
                marginTop: 4,
              }}
            >
              {plan.dates.toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          {plan.budget ? (
            <>
              <span style={{ fontFamily: D_SCRIPT, fontSize: 13, color: D_PAL.green }}>
                under budget by
              </span>
              <span
                style={{
                  fontFamily: D_DISPLAY,
                  fontSize: 18,
                  fontWeight: 600,
                  color: D_PAL.green,
                }}
              >
                ${(plan.budget.total - plan.budget.spent).toLocaleString()}
              </span>
            </>
          ) : total > 0 ? (
            <span
              style={{
                fontFamily: D_DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                color: D_PAL.ink,
              }}
            >
              ${total.toLocaleString()}
            </span>
          ) : null}
        </div>
      </div>

      {/* Cities row */}
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: `0.5px dashed ${D_PAL.rule}`,
        }}
      >
        <span
          style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1 }}
        >
          CITIES
        </span>
        {(plan.cities ?? []).map((c, i) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: D_DISPLAY,
                fontSize: 13,
                fontWeight: 600,
                color: D_PAL.ink,
                padding: "3px 10px",
                background: D_PAL.paperWarm,
                border: `0.5px solid ${D_PAL.rule}`,
                animation: "ifadeup .35s ease both",
              }}
            >
              {c}
            </span>
            {i < (plan.cities?.length ?? 0) - 1 && (
              <span style={{ color: D_PAL.muted, fontSize: 10 }}>›</span>
            )}
          </span>
        ))}
        {(!plan.cities || plan.cities.length === 0) && (
          <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.muted }}>
            gathering…
          </span>
        )}
      </div>

      {/* Body grid — slots fill in */}
      <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            padding: "10px 12px",
            background: D_PAL.paperHi,
            border: `0.5px dashed ${plan.flight ? D_PAL.rule : D_PAL.ruleSoft}`,
            minHeight: 64,
          }}
        >
          <div
            style={{
              fontFamily: D_MONO,
              fontSize: 9,
              color: D_PAL.muted,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            OUTBOUND FLIGHT
          </div>
          {plan.flight ? (
            <div style={{ animation: "ifadeup .35s ease both" }}>
              <div style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600 }}>
                {plan.flight.route}
              </div>
              <div
                style={{
                  fontFamily: D_MONO,
                  fontSize: 10,
                  color: D_PAL.muted,
                  marginTop: 3,
                }}
              >
                {plan.flight.carrier} · {plan.flight.date} · ${plan.flight.price}
              </div>
            </div>
          ) : (
            <div
              style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.muted }}
            >
              looking…
            </div>
          )}
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: D_PAL.paperHi,
            border: `0.5px dashed ${(plan.stays ?? []).length ? D_PAL.rule : D_PAL.ruleSoft}`,
            minHeight: 64,
          }}
        >
          <div
            style={{
              fontFamily: D_MONO,
              fontSize: 9,
              color: D_PAL.muted,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            STAYS · {(plan.stays ?? []).length}/{(plan.cities ?? []).length || 4}
          </div>
          {(plan.stays ?? []).length === 0 ? (
            <div
              style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.muted }}
            >
              not yet…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {plan.stays!.map((st, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontFamily: D_SERIF,
                    fontSize: 12.5,
                    color: D_PAL.ink2,
                    animation: "ifadeup .35s ease both",
                  }}
                >
                  <span>
                    <strong style={{ fontFamily: D_DISPLAY, fontWeight: 600 }}>{st.city}</strong> ·{" "}
                    <em>{st.name}</em>
                  </span>
                  <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>
                    {st.nights}n · ${st.price}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer cta */}
      <div
        style={{
          padding: "10px 18px 12px",
          borderTop: `0.5px dashed ${D_PAL.rule}`,
          background: D_PAL.paperWarm,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.muted }}>
          click anywhere to open the full plan →
        </span>
        <span
          style={{
            fontFamily: D_DISPLAY,
            fontSize: 11,
            color: acc,
            letterSpacing: 1.5,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Open ↗
        </span>
      </div>
    </div>
  );
}

// --- Expanded plan view ----------------------------------------------------

function ExpandedPlan({
  plan,
  acc,
  onClose,
}: {
  plan: Plan;
  acc: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: D_PAL.paper,
        animation: "ifadeup .4s ease both",
      }}
    >
      <div
        style={{
          padding: "18px 30px",
          borderBottom: `1.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: D_SCRIPT,
              fontSize: 17,
              color: acc,
              transform: "rotate(-1deg)",
              display: "inline-block",
            }}
          >
            your trip —
          </div>
          <div
            style={{
              fontFamily: D_DISPLAY,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: -0.5,
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            {plan.title}
          </div>
          <div
            style={{
              fontFamily: D_MONO,
              fontSize: 10,
              color: D_PAL.muted,
              letterSpacing: 1,
              marginTop: 6,
            }}
          >
            {plan.dates?.toUpperCase()} · {plan.cities?.join(" · ")}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: `0.5px solid ${D_PAL.rule}`,
            padding: "6px 12px",
            fontFamily: D_DISPLAY,
            fontSize: 11,
            letterSpacing: 1,
            cursor: "pointer",
            color: D_PAL.ink2,
            textTransform: "uppercase",
          }}
        >
          ← back to chat
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 30 }}>
        <div
          style={{
            background: D_PAL.paperHi,
            border: `0.5px solid ${D_PAL.rule}`,
            boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}`,
            padding: 24,
          }}
        >
          <div style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            The route
          </div>
          {plan.flight && (
            <div
              style={{
                padding: "10px 0",
                borderBottom: `0.5px dashed ${D_PAL.rule}`,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: D_SERIF,
                fontSize: 14,
              }}
            >
              <span>
                <span style={{ fontFamily: D_SCRIPT, color: acc, marginRight: 6 }}>flight —</span>
                {plan.flight.route} · {plan.flight.carrier}
              </span>
              <span style={{ fontFamily: D_DISPLAY, fontWeight: 600 }}>${plan.flight.price}</span>
            </div>
          )}
          {(plan.stays ?? []).map((st, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderBottom: `0.5px dashed ${D_PAL.rule}`,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: D_SERIF,
                fontSize: 14,
              }}
            >
              <span>
                <span style={{ fontFamily: D_SCRIPT, color: acc, marginRight: 6 }}>stay —</span>
                {st.nights} nights in {st.city}, {st.name}
              </span>
              <span style={{ fontFamily: D_DISPLAY, fontWeight: 600 }}>
                ${(st.price * st.nights).toLocaleString()}
              </span>
            </div>
          ))}
          {plan.budget && (
            <div
              style={{
                padding: "14px 0 4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontFamily: D_SCRIPT, fontSize: 16, color: D_PAL.green }}>
                under budget by
              </span>
              <span
                style={{
                  fontFamily: D_DISPLAY,
                  fontSize: 22,
                  fontWeight: 600,
                  color: D_PAL.green,
                  letterSpacing: -0.4,
                }}
              >
                ${(plan.budget.total - plan.budget.spent).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
