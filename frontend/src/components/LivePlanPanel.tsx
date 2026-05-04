/**
 * LivePlanPanel — the split-grow plan panel, driven by real Plan data.
 *
 * Adapted from the v5 split-grow demo. Same visual language (route map / flight slot /
 * stays grid / budget bar) but resilient to missing fields — falls back gracefully
 * when the agent hasn't filled everything in.
 */
import { format, parseISO } from "date-fns";
import { CalendarPlus, CheckCircle2, ExternalLink, X } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { type Plan } from "../lib/api";

type City = { name: string; nights?: number; lat: number; lng: number };
type Flight = { route?: string; carrier?: string; date?: string; price?: number; summary?: string };
type Stay = { city?: string; name?: string; nights?: number; price?: number; summary?: string };
type Budget = { spent?: number; total?: number; currency?: string };

type RealPlanData = {
  summary?: string;
  dates?: { start?: string; end?: string };
  budget_estimate?: { total?: number; currency?: string; breakdown?: Record<string, number> };
  flights?: Array<{ offer_id?: string; summary?: string }>;
  lodging?: Array<{
    hotel_id?: string;
    nights?: number;
    summary?: string;
    latitude?: number;
    longitude?: number;
  }>;
  days?: Array<{ date?: string; items?: unknown[] }>;
  open_questions?: string[];
};

export function LivePlanPanel({
  plan,
  acc = D_PAL.accent,
  onClose,
  onSave,
  onExport,
  saving = false,
  exporting = false,
}: {
  plan: Plan;
  acc?: string;
  onClose: () => void;
  onSave?: () => void;
  onExport?: () => void;
  saving?: boolean;
  exporting?: boolean;
}) {
  const data = (plan.data ?? {}) as RealPlanData;

  // Map real plan data → demo-shape, with synthetic positions when coords are missing.
  const cities: City[] = useMemo(() => {
    const lodging = data.lodging ?? [];
    if (lodging.length === 0) return [];
    return lodging.map((l, i) => {
      const haveCoords = l.latitude !== undefined && l.longitude !== undefined;
      const cityName = extractCity(l.summary) ?? `City ${i + 1}`;
      // Synthetic positions for the route map — even spacing across an arc so the
      // map still feels like a route even when the agent didn't ship lat/lon.
      const t = lodging.length === 1 ? 0.5 : i / (lodging.length - 1);
      const synLat = 0.15 + t * 0.7;
      const synLng = 0.2 + (i % 2 === 0 ? 0.15 : 0.6);
      return {
        name: cityName,
        nights: l.nights,
        lat: haveCoords ? mapLngToFraction(l.longitude!) : synLat,
        lng: haveCoords ? mapLatToFraction(l.latitude!) : synLng,
      };
    });
  }, [data.lodging]);

  const haveRealCoords = (data.lodging ?? []).every(
    (l) => l.latitude !== undefined && l.longitude !== undefined,
  );

  const flight: Flight | null = (() => {
    const f = data.flights?.[0];
    if (!f) return null;
    return { summary: f.summary };
  })();

  const stays: Stay[] = (data.lodging ?? []).map((l) => ({
    city: extractCity(l.summary) ?? "—",
    name: extractName(l.summary),
    nights: l.nights,
    summary: l.summary,
  }));

  const budget: Budget | null = data.budget_estimate
    ? {
        spent:
          (data.budget_estimate.breakdown
            ? Object.values(data.budget_estimate.breakdown).reduce((a, b) => a + b, 0)
            : undefined) ?? data.budget_estimate.total,
        total: data.budget_estimate.total,
        currency: data.budget_estimate.currency ?? "USD",
      }
    : null;

  const datesLine = data.dates?.start && data.dates?.end ? `${fmt(data.dates.start)} — ${fmt(data.dates.end)}` : null;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: D_PAL.paper,
      }}
    >
      <PlanHeader
        title={plan.title}
        datesLine={datesLine}
        cityCount={cities.length}
        status={plan.status}
        planId={plan.id}
        onClose={onClose}
        acc={acc}
      />

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {data.summary && (
          <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink2, lineHeight: 1.55 }}>
            <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 15, color: acc, marginRight: 6 }}>
              W. —
            </span>
            {data.summary}
          </div>
        )}

        <RouteMap cities={cities} acc={acc} synthetic={!haveRealCoords && cities.length > 0} />

        {flight && <FlightSlot flight={flight} acc={acc} />}

        {stays.length > 0 && <StaysSlot stays={stays} acc={acc} />}

        {budget && <BudgetSlot budget={budget} acc={acc} />}

        {data.open_questions && data.open_questions.length > 0 && (
          <OpenQuestions questions={data.open_questions} acc={acc} />
        )}

        <Footer
          status={plan.status}
          planId={plan.id}
          onSave={onSave}
          onExport={onExport}
          saving={saving}
          exporting={exporting}
          hasDays={(data.days ?? []).length > 0}
          acc={acc}
        />
      </div>

      <style>{`
        @keyframes lpFadeUp { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: none } }
        @keyframes lpScaleIn { from { transform: scale(.8); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes lpWidth { from { width: 0 } }
      `}</style>
    </div>
  );
}

// --- Header --------------------------------------------------------------

function PlanHeader({
  title,
  datesLine,
  cityCount,
  status,
  planId,
  onClose,
  acc,
}: {
  title: string;
  datesLine: string | null;
  cityCount: number;
  status: Plan["status"];
  planId: string;
  onClose: () => void;
  acc: string;
}) {
  return (
    <div
      style={{
        padding: "20px 32px 16px",
        borderBottom: `1.5px dashed ${D_PAL.rule}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <Link
            to={`/plans/${planId}`}
            style={{
              fontFamily: D_DISPLAY,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: -0.6,
              lineHeight: 1.05,
              color: D_PAL.ink,
              textDecoration: "none",
              borderBottom: `0.5px dotted ${D_PAL.rule}`,
            }}
          >
            {title || "drafting…"}
          </Link>
          <StatusPill status={status} />
        </div>
        {datesLine && (
          <div
            style={{
              fontFamily: D_MONO,
              fontSize: 10,
              color: D_PAL.muted,
              letterSpacing: 1.5,
              marginTop: 6,
              animation: "lpFadeUp .4s ease both",
            }}
          >
            {datesLine.toUpperCase()}
            {cityCount > 0 ? ` · ${cityCount} ${cityCount === 1 ? "CITY" : "CITIES"}` : ""}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close plan panel"
        title="Close plan panel"
        style={{
          background: "transparent",
          border: `0.5px solid ${D_PAL.rule}`,
          padding: "6px 8px",
          cursor: "pointer",
          color: D_PAL.muted,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: D_MONO,
          fontSize: 9.5,
          letterSpacing: 1,
        }}
      >
        <X size={12} /> CLOSE
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: Plan["status"] }) {
  const colors: Record<Plan["status"], { bg: string; color: string; border: string }> = {
    saved: { bg: "#e9f0e3", color: D_PAL.green, border: D_PAL.green },
    booked: { bg: "#f7e8c8", color: "#7a4f12", border: "#a86c1c" },
    draft: { bg: D_PAL.paperHi, color: D_PAL.muted, border: D_PAL.rule },
  };
  const c = colors[status];
  return (
    <span
      style={{
        fontFamily: D_DISPLAY,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: c.color,
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        padding: "2px 7px",
      }}
    >
      {status}
    </span>
  );
}

// --- Route map -----------------------------------------------------------

function RouteMap({ cities, acc, synthetic }: { cities: City[]; acc: string; synthetic: boolean }) {
  if (cities.length === 0) {
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
  const totalNights = cities.reduce((s, c) => s + (c.nights ?? 0), 0);
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {[0.25, 0.5, 0.75].map((y, i) => (
          <line key={`h${i}`} x1={0} y1={y * H} x2={W} y2={y * H} stroke={D_PAL.ruleSoft} strokeWidth="0.5" strokeDasharray="2 4" />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((x, i) => (
          <line key={`v${i}`} x1={x * W} y1={0} x2={x * W} y2={H} stroke={D_PAL.ruleSoft} strokeWidth="0.5" strokeDasharray="2 4" />
        ))}
        {cities.length > 1 &&
          (() => {
            const pts = cities.map((c) => [c.lat * W, c.lng * H] as const);
            const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
            return (
              <path
                d={d}
                fill="none"
                stroke={acc}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                style={{ animation: "lpFadeUp .5s ease both" }}
              />
            );
          })()}
        {cities.map((c) => (
          <g
            key={c.name}
            style={{
              animation: "lpScaleIn .4s ease both",
              transformOrigin: `${c.lat * W}px ${c.lng * H}px`,
            }}
          >
            <circle cx={c.lat * W} cy={c.lng * H} r={6} fill={acc} stroke={D_PAL.paper} strokeWidth="2" />
            <text x={c.lat * W + 10} y={c.lng * H + 4} fontFamily={D_DISPLAY} fontSize="13" fontWeight="600" fill={D_PAL.ink}>
              {c.name}
            </text>
            {c.nights !== undefined && (
              <text x={c.lat * W + 10} y={c.lng * H + 18} fontFamily={D_MONO} fontSize="9" fill={D_PAL.muted}>
                {c.nights} {c.nights === 1 ? "NIGHT" : "NIGHTS"}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", top: 8, left: 12, fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1 }}>
        ROUTE{synthetic ? " · SCHEMATIC" : ""}
      </div>
      {totalNights > 0 && (
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
          {totalNights} {totalNights === 1 ? "night" : "nights"} total
        </div>
      )}
    </div>
  );
}

// --- Slots --------------------------------------------------------------

function FlightSlot({ flight, acc }: { flight: Flight; acc: string }) {
  return (
    <div
      style={{
        animation: "lpFadeUp .4s ease both",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        border: `0.5px solid ${D_PAL.rule}`,
        background: D_PAL.paperHi,
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div style={{ fontFamily: D_SCRIPT, fontSize: 15, color: acc, transform: "rotate(-2deg)", minWidth: 80 }}>
        flight ✈
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>
          {flight.summary ?? flight.route ?? "—"}
        </div>
        {(flight.carrier || flight.date) && (
          <div style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 0.5, marginTop: 3 }}>
            {flight.carrier?.toUpperCase() ?? ""}
            {flight.carrier && flight.date ? " · " : ""}
            {flight.date?.toUpperCase() ?? ""}
          </div>
        )}
      </div>
      {flight.price !== undefined && (
        <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>${flight.price}</div>
      )}
    </div>
  );
}

function StaysSlot({ stays, acc }: { stays: Stay[]; acc: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: D_SCRIPT, fontSize: 17, color: acc, transform: "rotate(-1deg)", display: "inline-block" }}>
          where you'll sleep —
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {stays.length} {stays.length === 1 ? "STAY" : "STAYS"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {stays.map((st, i) => (
          <div
            key={`${st.city}-${i}`}
            style={{
              animation: "lpFadeUp .4s ease both",
              padding: "10px 12px",
              background: D_PAL.paperHi,
              border: `0.5px solid ${D_PAL.rule}`,
              position: "relative",
              transform: i % 2 === 0 ? "rotate(-0.3deg)" : "rotate(0.3deg)",
            }}
          >
            {st.nights !== undefined && (
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
            )}
            <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1 }}>
              {(st.city ?? "—").toUpperCase()}
            </div>
            <div style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600, marginTop: 2, letterSpacing: -0.2 }}>
              {st.name ?? st.summary ?? "—"}
            </div>
            {st.price !== undefined && (
              <div style={{ fontFamily: D_SERIF, fontSize: 12, color: D_PAL.ink2, marginTop: 4, fontStyle: "italic" }}>
                ${st.price}/night
                {st.nights !== undefined ? ` · $${(st.price * st.nights).toLocaleString()} total` : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetSlot({ budget, acc }: { budget: Budget; acc: string }) {
  const spent = budget.spent ?? budget.total ?? 0;
  const total = budget.total ?? spent;
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const room = total - spent;
  const currency = budget.currency ?? "USD";
  return (
    <div
      style={{
        animation: "lpFadeUp .4s ease both",
        padding: "16px 18px",
        background: D_PAL.paperHi,
        border: `0.5px solid ${D_PAL.rule}`,
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: D_SCRIPT, fontSize: 16, color: acc, transform: "rotate(-1deg)", display: "inline-block" }}>
          the ledger —
        </span>
        <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>{currency}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
          {money(spent, currency)}
        </span>
        {total !== spent && (
          <span style={{ fontFamily: D_SERIF, fontSize: 14, color: D_PAL.muted, fontStyle: "italic" }}>
            of {money(total, currency)} budget
          </span>
        )}
      </div>
      <div style={{ height: 14, background: D_PAL.cream, border: `0.5px solid ${D_PAL.rule}`, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: acc,
            backgroundImage: `repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.18) 4px 8px)`,
            animation: "lpWidth 800ms ease-out",
          }}
        />
      </div>
      {room > 0 && (
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
          {money(room, currency)} room to spare ✓
        </div>
      )}
      {room < 0 && (
        <div
          style={{
            marginTop: 8,
            fontFamily: D_SCRIPT,
            fontSize: 17,
            color: "#a23a28",
            transform: "rotate(-1deg)",
            display: "inline-block",
          }}
        >
          {money(-room, currency)} over budget
        </div>
      )}
    </div>
  );
}

function OpenQuestions({ questions, acc }: { questions: string[]; acc: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: D_PAL.paperWarm,
        border: `0.5px dashed ${acc}`,
      }}
    >
      <div style={{ fontFamily: D_SCRIPT, fontSize: 15, color: acc, marginBottom: 6 }}>open questions —</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {questions.map((q, i) => (
          <li
            key={i}
            style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink2, padding: "2px 0" }}
          >
            — {q}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer({
  status,
  planId,
  onSave,
  onExport,
  saving,
  exporting,
  hasDays,
  acc,
}: {
  status: Plan["status"];
  planId: string;
  onSave?: () => void;
  onExport?: () => void;
  saving: boolean;
  exporting: boolean;
  hasDays: boolean;
  acc: string;
}) {
  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: 12,
        borderTop: `0.5px dashed ${D_PAL.rule}`,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {status !== "saved" && onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            background: D_PAL.ink,
            color: D_PAL.cream,
            border: "none",
            padding: "8px 14px",
            fontFamily: D_DISPLAY,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            opacity: saving ? 0.5 : 1,
          }}
        >
          <CheckCircle2 size={11} />
          {saving ? "Saving…" : "Save plan"}
        </button>
      )}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || !hasDays}
          title={!hasDays ? "Plan has no day-by-day items to export" : undefined}
          style={{
            background: "transparent",
            color: acc,
            border: `0.5px solid ${acc}`,
            padding: "8px 14px",
            fontFamily: D_DISPLAY,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: !hasDays ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            opacity: !hasDays ? 0.5 : 1,
          }}
        >
          <CalendarPlus size={11} />
          {exporting ? "Exporting…" : "Export to Calendar"}
        </button>
      )}
      <Link
        to={`/plans/${planId}`}
        style={{
          color: D_PAL.muted,
          fontFamily: D_MONO,
          fontSize: 9.5,
          letterSpacing: 1,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        FULL PLAN VIEW <ExternalLink size={10} />
      </Link>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: D_MONO,
          fontSize: 9.5,
          color: D_PAL.muted,
          letterSpacing: 0.5,
        }}
      >
        {planId.slice(-8)}
      </span>
    </div>
  );
}

// --- Helpers --------------------------------------------------------------

function fmt(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return iso;
  }
}

function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// Pull "Hotel Name" out of summaries like "Hotel Indigo, $77/night" or
// "APA Ryogoku — Old Town · $142".
function extractName(summary?: string): string {
  if (!summary) return "—";
  // Take everything before the first comma / em-dash / dollar sign.
  const m = summary.split(/[,—·$]|\s-\s/)[0];
  return m.trim() || summary;
}

// Pull a city name out of a hotel summary if present (e.g. "Tokyo · Trunk Hotel").
// Falls back to undefined; caller assigns "City N" then.
function extractCity(summary?: string): string | undefined {
  if (!summary) return undefined;
  // Heuristic: common pattern "City: Hotel" or "City · Hotel" or "Hotel, City"
  const colon = summary.split(":");
  if (colon.length > 1 && colon[0].trim().length < 30) return colon[0].trim();
  const dot = summary.split("·");
  if (dot.length > 1 && dot[0].trim().length < 30) return dot[0].trim();
  return undefined;
}

// Convert lat/lon to a 0..1 fraction roughly suitable for our 600x220 canvas.
// World lon -180..180 → 0..1; lat -90..90 → 0..1 (inverted Y).
function mapLngToFraction(lng: number): number {
  return Math.max(0.05, Math.min(0.95, (lng + 180) / 360));
}
function mapLatToFraction(lat: number): number {
  // Higher lat → top of canvas (smaller y / smaller fraction).
  return Math.max(0.05, Math.min(0.95, (90 - lat) / 180));
}
