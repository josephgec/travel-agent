/**
 * v5 — Split-grow demo.
 *
 * Chat starts full-width. ~4.2s into the response, after a tool call,
 * the screen splits and a live plan panel grows in from the right —
 * filling itself in as the agent works (cities pin to a route map,
 * flight slot drops in, stays fill a 2-col grid, budget bar hatch-fills).
 *
 * Faithful TS port of split-grow.jsx from the design canvas.
 * Timeline-driven; rAF tick. No backend.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../../design/postcard/tokens";

// --- Timeline -------------------------------------------------------------

type City = { name: string; nights: number; lat: number; lng: number };
type Flight = { route: string; carrier: string; date: string; price: number };
type Stay = { city: string; name: string; nights: number; price: number };
type Budget = { spent: number; total: number };

type Plan = {
  title?: string;
  dates?: string;
  cities: City[];
  flight?: Flight;
  stays: Stay[];
  budget?: Budget;
};

type Step =
  | { t: number; kind: "user"; text: string }
  | { t: number; kind: "agent"; text: string }
  | { t: number; kind: "tool"; label: string; sub: string }
  | { t: number; kind: "split" }
  | { t: number; kind: "plan"; op: "set-title"; value: { title: string; dates: string } }
  | { t: number; kind: "plan"; op: "add-city"; value: City }
  | { t: number; kind: "plan"; op: "set-flight"; value: Flight }
  | { t: number; kind: "plan"; op: "add-stay"; value: Stay }
  | { t: number; kind: "plan"; op: "set-budget"; value: Budget };

const SPLIT_AT = 4200;
const TOTAL_DURATION = 16000;

const TIMELINE: Step[] = [
  { t: 0, kind: "user", text: "I want to do a slow loop through Central & Eastern Europe in July — Kraków, Prague, Ljubljana, ending in Dubrovnik. Around 17 days." },
  { t: 1200, kind: "agent", text: "Lovely shape — geographically it's a clean N→S sweep so no backtracking. Drafting the plan now." },
  { t: 3400, kind: "tool", label: "building itinerary", sub: "4 cities · 17 days" },
  { t: 4200, kind: "split" },
  { t: 4800, kind: "plan", op: "set-title", value: { title: "Central & Eastern Europe", dates: "Jul 5 — Jul 22, 2026" } },
  { t: 5600, kind: "plan", op: "add-city", value: { name: "Kraków", nights: 5, lat: 0.20, lng: 0.18 } },
  { t: 6300, kind: "plan", op: "add-city", value: { name: "Prague", nights: 4, lat: 0.34, lng: 0.42 } },
  { t: 7000, kind: "plan", op: "add-city", value: { name: "Ljubljana", nights: 4, lat: 0.62, lng: 0.58 } },
  { t: 7700, kind: "plan", op: "add-city", value: { name: "Dubrovnik", nights: 4, lat: 0.86, lng: 0.78 } },
  { t: 8200, kind: "tool", label: "searching flights", sub: "JFK → KRK · Jul 5" },
  { t: 9100, kind: "plan", op: "set-flight", value: { route: "JFK → KRK", carrier: "LOT 26", date: "Jul 5", price: 612 } },
  { t: 9700, kind: "tool", label: "finding stays", sub: "boutique · walkable" },
  { t: 10400, kind: "plan", op: "add-stay", value: { city: "Kraków", name: "Hotel Indigo", nights: 5, price: 142 } },
  { t: 10900, kind: "plan", op: "add-stay", value: { city: "Prague", name: "Maximilian", nights: 4, price: 168 } },
  { t: 11400, kind: "plan", op: "add-stay", value: { city: "Ljubljana", name: "Vander Urbani", nights: 4, price: 196 } },
  { t: 11900, kind: "plan", op: "add-stay", value: { city: "Dubrovnik", name: "Villa Dubrovnik", nights: 4, price: 412 } },
  { t: 12600, kind: "tool", label: "totaling budget", sub: "flights + stays" },
  { t: 13400, kind: "plan", op: "set-budget", value: { spent: 2840, total: 4200 } },
  { t: 14200, kind: "agent", text: "Done — **$2,840 of $4,200**, 17 days, 4 cities. Tell me what to nudge: pace, neighborhoods, swap a city for somewhere quieter." },
];

// --- Page -----------------------------------------------------------------

export function SplitGrowPage() {
  const [accent, setAccent] = useState(D_PAL.accent);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (startRef.current === null) startRef.current = performance.now() - now;
    const tick = (ts: number) => {
      const t = ts - (startRef.current ?? 0);
      if (t >= TOTAL_DURATION) {
        setNow(TOTAL_DURATION);
        setPlaying(false);
        return;
      }
      setNow(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const replay = () => {
    startRef.current = null;
    setNow(0);
    setPlaying(true);
  };

  // Split progress (0 → 1) over a 1200ms window from SPLIT_AT
  const splitT = Math.max(0, Math.min(1, (now - SPLIT_AT) / 1200));
  const splitEase = splitT < 0.5 ? 2 * splitT * splitT : 1 - Math.pow(-2 * splitT + 2, 2) / 2;

  const active = TIMELINE.filter((s) => s.t <= now);
  const messages = active.filter(
    (s): s is Extract<Step, { kind: "user" } | { kind: "agent" } | { kind: "tool" }> =>
      s.kind === "user" || s.kind === "agent" || s.kind === "tool",
  );
  const planOps = active.filter((s): s is Extract<Step, { kind: "plan" }> => s.kind === "plan");

  const plan = useMemo<Plan>(() => {
    const p: Plan = { cities: [], stays: [] };
    for (const op of planOps) {
      if (op.op === "set-title") {
        p.title = op.value.title;
        p.dates = op.value.dates;
      } else if (op.op === "add-city") {
        p.cities.push(op.value);
      } else if (op.op === "set-flight") {
        p.flight = op.value;
      } else if (op.op === "add-stay") {
        p.stays.push(op.value);
      } else if (op.op === "set-budget") {
        p.budget = op.value;
      }
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planOps.length]);

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
      {/* Chat side — flex grows from full width down to ~46% */}
      <div
        style={{
          flex: `1 1 ${100 - 54 * splitEase}%`,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: splitT > 0.05 ? `1.5px dashed ${D_PAL.rule}` : "none",
          transition: "border-right 200ms ease",
        }}
      >
        <SGHeader acc={accent} setAccent={setAccent} onReplay={replay} now={now} duration={TOTAL_DURATION} />
        <ChatStream messages={messages} acc={accent} maxWidth={splitT > 0.5 ? 520 : 720} />
        <SGComposer />
      </div>

      {/* Plan side — grows from 0 to ~54% */}
      <div
        style={{
          flex: `0 0 ${54 * splitEase}%`,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: D_PAL.paper,
          position: "relative",
        }}
      >
        {splitT > 0.02 && <PlanPanel plan={plan} acc={accent} splitT={splitEase} />}
      </div>

      {/* Brief postal-red seam pulse during the split */}
      {splitT > 0 && splitT < 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${100 - 54 * splitEase}%`,
            transform: "translateX(-1px)",
            width: 2,
            background: accent,
            opacity: (1 - splitT) * 0.7,
            pointerEvents: "none",
          }}
        />
      )}

      <style>
        {`
          @keyframes sgFadeUp { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: none } }
          @keyframes sgPulse { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
          @keyframes sgScaleIn { from { transform: scale(.8); opacity: 0 } to { transform: scale(1); opacity: 1 } }
          @keyframes sgWidth { from { width: 0 } }
        `}
      </style>
    </div>
  );
}

// --- Chrome ---------------------------------------------------------------

function SGHeader({
  acc,
  setAccent,
  onReplay,
  now,
  duration,
}: {
  acc: string;
  setAccent: (c: string) => void;
  onReplay: () => void;
  now: number;
  duration: number;
}) {
  const pct = Math.min(100, (now / duration) * 100);
  const swatches = ["#b04428", "#3f6238", "#2f526e", "#6b3f5e", "#a86c1c"];
  return (
    <div style={{ borderBottom: `1.5px dashed ${D_PAL.rule}`, background: D_PAL.paper }}>
      <div
        style={{
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
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
        </div>
      </div>
      {/* Subtle progress hairline */}
      <div style={{ height: 1, background: D_PAL.ruleSoft }}>
        <div
          style={{
            height: "100%",
            background: acc,
            width: `${pct}%`,
            opacity: 0.5,
            transition: "width 60ms linear",
          }}
        />
      </div>
    </div>
  );
}

function ChatStream({
  messages,
  acc,
  maxWidth,
}: {
  messages: Extract<Step, { kind: "user" } | { kind: "agent" } | { kind: "tool" }>[];
  acc: string;
  maxWidth: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages.length]);
  return (
    <div ref={ref} style={{ flex: 1, overflow: "auto", padding: "32px 0", transition: "padding 400ms ease" }}>
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          transition: "max-width 600ms ease",
        }}
      >
        {messages.map((m, i) => (
          <SGMessage key={i} m={m} acc={acc} />
        ))}
      </div>
    </div>
  );
}

function SGMessage({
  m,
  acc,
}: {
  m: Extract<Step, { kind: "user" } | { kind: "agent" } | { kind: "tool" }>;
  acc: string;
}) {
  const wrap = { animation: "sgFadeUp .35s ease both" } as const;
  if (m.kind === "user") {
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
          "{m.text}"
        </div>
      </div>
    );
  }
  if (m.kind === "agent") {
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
            __html: m.text.replace(
              /\*\*(.+?)\*\*/g,
              `<span style="background:linear-gradient(transparent 65%, ${acc}40 65%);font-weight:500">$1</span>`,
            ),
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 40, ...wrap }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: acc,
          animation: "sgPulse 1.2s infinite",
        }}
      />
      <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2 }}>{m.label}</span>
      <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>· {m.sub}</span>
    </div>
  );
}

function SGComposer() {
  return (
    <div style={{ padding: 24, borderTop: `1.5px dashed ${D_PAL.rule}`, background: D_PAL.paper }}>
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
        <div
          style={{
            fontFamily: D_SERIF,
            fontSize: 14,
            lineHeight: 1.55,
            color: D_PAL.muted,
            fontStyle: "italic",
          }}
        >
          ask for a quieter neighborhood, an earlier flight, a slower pace…
        </div>
      </div>
    </div>
  );
}

// --- Plan panel -----------------------------------------------------------

function PlanPanel({ plan, acc, splitT }: { plan: Plan; acc: string; splitT: number }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "20px 32px 16px",
          borderBottom: `1.5px dashed ${D_PAL.rule}`,
          opacity: splitT > 0.4 ? 1 : 0,
          transition: "opacity 400ms ease 200ms",
        }}
      >
        <div
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 16,
            color: acc,
            transform: "rotate(-1deg)",
            display: "inline-block",
            marginBottom: 2,
          }}
        >
          your trip —
        </div>
        <div
          style={{
            fontFamily: D_DISPLAY,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.6,
            lineHeight: 1.05,
          }}
        >
          {plan.title ? (
            plan.title
          ) : (
            <span style={{ color: D_PAL.muted, fontStyle: "italic", fontSize: 22 }}>drafting…</span>
          )}
        </div>
        {plan.dates && (
          <div
            style={{
              fontFamily: D_MONO,
              fontSize: 10,
              color: D_PAL.muted,
              letterSpacing: 1.5,
              marginTop: 6,
              animation: "sgFadeUp .4s ease both",
            }}
          >
            {plan.dates.toUpperCase()} · {plan.cities.length} CITIES
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <RouteMap plan={plan} acc={acc} />
        {plan.flight && <FlightSlot flight={plan.flight} acc={acc} />}
        {plan.stays.length > 0 && <StaysSlot stays={plan.stays} acc={acc} />}
        {plan.budget && <BudgetSlot budget={plan.budget} acc={acc} />}
      </div>
    </div>
  );
}

function RouteMap({ plan, acc }: { plan: Plan; acc: string }) {
  if (plan.cities.length === 0) {
    return (
      <div
        style={{
          height: 220,
          border: `0.5px dashed ${D_PAL.ruleSoft}`,
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: D_SERIF,
          fontStyle: "italic",
          fontSize: 14,
          color: D_PAL.muted,
          background: D_PAL.paperHi,
        }}
      >
        mapping the route…
      </div>
    );
  }
  const W = 600,
    H = 220;
  return (
    <div
      style={{
        position: "relative",
        height: H,
        border: `0.5px solid ${D_PAL.rule}`,
        background: D_PAL.paperHi,
        overflow: "hidden",
        boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {[0.25, 0.5, 0.75].map((y, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={y * H}
            x2={W}
            y2={y * H}
            stroke={D_PAL.ruleSoft}
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((x, i) => (
          <line
            key={`v${i}`}
            x1={x * W}
            y1={0}
            x2={x * W}
            y2={H}
            stroke={D_PAL.ruleSoft}
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
        ))}
        {plan.cities.length > 1 &&
          (() => {
            const pts = plan.cities.map((c) => [c.lat * W, c.lng * H] as const);
            const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
            return (
              <path
                d={d}
                fill="none"
                stroke={acc}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                style={{ animation: "sgFadeUp .5s ease both" }}
              />
            );
          })()}
        {plan.cities.map((c) => (
          <g
            key={c.name}
            style={{
              animation: "sgScaleIn .4s ease both",
              transformOrigin: `${c.lat * W}px ${c.lng * H}px`,
            }}
          >
            <circle cx={c.lat * W} cy={c.lng * H} r={6} fill={acc} stroke={D_PAL.paper} strokeWidth="2" />
            <text
              x={c.lat * W + 10}
              y={c.lng * H + 4}
              fontFamily={D_DISPLAY}
              fontSize="13"
              fontWeight="600"
              fill={D_PAL.ink}
            >
              {c.name}
            </text>
            <text
              x={c.lat * W + 10}
              y={c.lng * H + 18}
              fontFamily={D_MONO}
              fontSize="9"
              fill={D_PAL.muted}
            >
              {c.nights} NIGHTS
            </text>
          </g>
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          fontFamily: D_MONO,
          fontSize: 9,
          color: D_PAL.muted,
          letterSpacing: 1,
        }}
      >
        ROUTE · N→S
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 12,
          fontFamily: D_SCRIPT,
          fontSize: 14,
          color: acc,
          transform: "rotate(-2deg)",
        }}
      >
        {plan.cities.reduce((s, c) => s + c.nights, 0)} nights total
      </div>
    </div>
  );
}

function FlightSlot({ flight, acc }: { flight: Flight; acc: string }) {
  return (
    <div
      style={{
        animation: "sgFadeUp .4s ease both",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        border: `0.5px solid ${D_PAL.rule}`,
        background: D_PAL.paperHi,
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div
        style={{
          fontFamily: D_SCRIPT,
          fontSize: 15,
          color: acc,
          transform: "rotate(-2deg)",
          minWidth: 80,
        }}
      >
        flight ✈
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: D_DISPLAY,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: -0.3,
          }}
        >
          {flight.route}
        </div>
        <div
          style={{
            fontFamily: D_MONO,
            fontSize: 10,
            color: D_PAL.muted,
            letterSpacing: 0.5,
            marginTop: 3,
          }}
        >
          {flight.carrier.toUpperCase()} · {flight.date.toUpperCase()}
        </div>
      </div>
      <div
        style={{
          fontFamily: D_DISPLAY,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: -0.4,
        }}
      >
        ${flight.price}
      </div>
    </div>
  );
}

function StaysSlot({ stays, acc }: { stays: Stay[]; acc: string }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 17,
            color: acc,
            transform: "rotate(-1deg)",
            display: "inline-block",
          }}
        >
          where you'll sleep —
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {stays.length} STAYS
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {stays.map((st, i) => (
          <div
            key={st.city}
            style={{
              animation: "sgFadeUp .4s ease both",
              padding: "10px 12px",
              background: D_PAL.paperHi,
              border: `0.5px solid ${D_PAL.rule}`,
              position: "relative",
              transform: i % 2 === 0 ? "rotate(-0.3deg)" : "rotate(0.3deg)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                border: `1px dashed ${acc}`,
                color: acc,
                fontFamily: D_DISPLAY,
                fontSize: 10,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {st.nights}
            </div>
            <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1 }}>
              {st.city.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: D_DISPLAY,
                fontSize: 15,
                fontWeight: 600,
                marginTop: 2,
                letterSpacing: -0.2,
              }}
            >
              {st.name}
            </div>
            <div
              style={{
                fontFamily: D_SERIF,
                fontSize: 12,
                color: D_PAL.ink2,
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              ${st.price}/night · ${(st.price * st.nights).toLocaleString()} total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetSlot({ budget, acc }: { budget: Budget; acc: string }) {
  const pct = (budget.spent / budget.total) * 100;
  return (
    <div
      style={{
        animation: "sgFadeUp .4s ease both",
        padding: "16px 18px",
        background: D_PAL.paperHi,
        border: `0.5px solid ${D_PAL.rule}`,
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: D_SCRIPT,
            fontSize: 16,
            color: acc,
            transform: "rotate(-1deg)",
            display: "inline-block",
          }}
        >
          the ledger —
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>
          USD
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>
          ${budget.spent.toLocaleString()}
        </span>
        <span style={{ fontFamily: D_SERIF, fontSize: 14, color: D_PAL.muted, fontStyle: "italic" }}>
          of ${budget.total.toLocaleString()} budget
        </span>
      </div>
      <div
        style={{
          height: 14,
          background: D_PAL.cream,
          border: `0.5px solid ${D_PAL.rule}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: acc,
            backgroundImage: `repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.18) 4px 8px)`,
            animation: "sgWidth 800ms ease-out",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: D_SCRIPT,
          fontSize: 17,
          color: D_PAL.green,
          transform: "rotate(-1deg)",
          display: "inline-block",
        }}
      >
        ${(budget.total - budget.spent).toLocaleString()} room to spare ✓
      </div>
    </div>
  );
}
