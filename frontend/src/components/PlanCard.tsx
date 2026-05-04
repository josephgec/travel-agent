import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Map as MapIcon,
  MapPin,
  Plane,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { type Plan, exportPlanToCalendar, getPlan, updatePlan } from "../lib/api";

type PlanItem = {
  time?: string;
  duration_min?: number;
  kind?: string;
  title?: string;
  place_id?: string;
  location?: string;
  notes?: string;
};

type PlanDay = { date?: string; items?: PlanItem[] };

type PlanData = {
  summary?: string;
  dates?: { start?: string; end?: string };
  budget_estimate?: { currency?: string; total?: number; breakdown?: Record<string, number> };
  flights?: { offer_id?: string; summary?: string }[];
  lodging?: { hotel_id?: string; nights?: number; summary?: string }[];
  days?: PlanDay[];
  open_questions?: string[];
};

export type PlanResult = {
  display_hint: "plan";
  id: string;
  title: string;
  status: Plan["status"];
  data: PlanData;
  created_at: string;
  updated_at: string;
};

export function PlanCard({ result }: { result: PlanResult }) {
  const qc = useQueryClient();

  const { data: plan } = useQuery<Plan>({
    queryKey: ["plan", result.id],
    queryFn: () => getPlan(result.id),
    initialData: result as unknown as Plan,
    staleTime: 2_000,
  });

  const saveMut = useMutation({
    mutationFn: () => updatePlan(plan!.id, { status: "saved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", result.id] }),
  });

  const exportMut = useMutation({
    mutationFn: () => exportPlanToCalendar(plan!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", result.id] }),
  });

  if (!plan) return null;
  const data = (plan.data ?? {}) as PlanData;

  return (
    <div
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.accent}`,
        boxShadow: `4px 4px 0 ${D_PAL.paperWarm}, 4px 4px 0 0.5px ${D_PAL.accent}33`,
      }}
    >
      <div style={{ padding: "12px 16px", borderBottom: `0.5px dashed ${D_PAL.rule}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ScrollText size={16} style={{ color: D_PAL.accent, marginTop: 3 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>plan —</span>
            <span style={{ fontFamily: D_DISPLAY, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{plan.title}</span>
            <StatusPill status={plan.status} />
            {data.dates?.start && data.dates?.end && (
              <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>
                {fmt(data.dates.start).toUpperCase()} – {fmt(data.dates.end).toUpperCase()}
              </span>
            )}
            {data.budget_estimate?.total !== undefined && (
              <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12.5, color: D_PAL.ink3 }}>
                · ~{money(data.budget_estimate.total, data.budget_estimate.currency)}
              </span>
            )}
          </div>
          {data.summary && (
            <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink2, marginTop: 6, lineHeight: 1.55 }}>
              {data.summary}
            </div>
          )}
        </div>
      </div>

      {(data.flights?.length || data.lodging?.length) ? (
        <div style={{ padding: "8px 16px", borderBottom: `0.5px dashed ${D_PAL.rule}`, fontFamily: D_SERIF, fontSize: 12.5 }}>
          {data.flights?.map((f, i) => (
            <div key={`f${i}`} style={{ display: "flex", alignItems: "center", gap: 8, color: D_PAL.ink2, padding: "2px 0" }}>
              <Plane size={11} style={{ color: D_PAL.muted }} />
              {f.summary}
            </div>
          ))}
          {data.lodging?.map((l, i) => (
            <div key={`l${i}`} style={{ display: "flex", alignItems: "center", gap: 8, color: D_PAL.ink2, padding: "2px 0" }}>
              <MapPin size={11} style={{ color: D_PAL.muted }} />
              {l.summary}
              {l.nights ? <span style={{ color: D_PAL.muted, marginLeft: 4 }}> · {l.nights} nights</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {data.days && data.days.length > 0 && (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {data.days.map((d, i) => (
            <DayRow key={d.date ?? `d${i}`} day={d} index={i} />
          ))}
        </ol>
      )}

      {data.budget_estimate?.breakdown && (
        <div
          style={{
            padding: "8px 16px",
            borderTop: `0.5px dashed ${D_PAL.rule}`,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            fontFamily: D_SERIF,
            fontSize: 12.5,
          }}
        >
          {Object.entries(data.budget_estimate.breakdown).map(([k, v]) => (
            <span key={k}>
              <span style={{ color: D_PAL.muted, marginRight: 4 }}>{k}:</span>
              <span style={{ color: D_PAL.ink2 }}>{money(v, data.budget_estimate?.currency)}</span>
            </span>
          ))}
        </div>
      )}

      {data.open_questions && data.open_questions.length > 0 && (
        <div style={{ padding: "8px 16px", borderTop: `0.5px dashed ${D_PAL.rule}` }}>
          <div style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent, marginBottom: 4 }}>open questions —</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12.5, color: D_PAL.ink2 }}>
            {data.open_questions.map((q, i) => (
              <li key={i} style={{ padding: "2px 0" }}>— {q}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          padding: "10px 16px",
          background: D_PAL.paperWarm,
          borderTop: `0.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {plan.status !== "saved" && (
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            style={{
              background: D_PAL.ink,
              color: D_PAL.cream,
              border: "none",
              padding: "7px 12px",
              fontFamily: D_DISPLAY,
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              opacity: saveMut.isPending ? 0.5 : 1,
            }}
          >
            <CheckCircle2 size={11} />
            {saveMut.isPending ? "Saving…" : "Save plan"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Add every timed plan item to your Google Calendar?")) exportMut.mutate();
          }}
          disabled={exportMut.isPending || !data.days?.length}
          style={{
            background: "transparent",
            color: D_PAL.accent,
            border: `0.5px solid ${D_PAL.accent}`,
            padding: "7px 12px",
            fontFamily: D_DISPLAY,
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: !data.days?.length ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            opacity: !data.days?.length ? 0.5 : 1,
          }}
        >
          <CalendarPlus size={11} />
          {exportMut.isPending ? "Exporting…" : "Export to Calendar"}
        </button>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5 }}>
          {plan.id.slice(-8)}
        </span>
      </div>

      {exportMut.data && (
        <div
          style={{
            padding: "8px 16px",
            background: "#e9f0e3",
            borderTop: `0.5px solid ${D_PAL.green}`,
            fontFamily: D_SERIF,
            fontStyle: "italic",
            fontSize: 12.5,
            color: D_PAL.green,
          }}
        >
          <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 14, marginRight: 4 }}>good —</span>
          Exported {exportMut.data.created} event(s)
          {exportMut.data.errors.length > 0 && (
            <span style={{ color: "#a23a28" }}> · {exportMut.data.errors.length} error(s)</span>
          )}
        </div>
      )}
    </div>
  );
}

function DayRow({ day, index }: { day: PlanDay; index: number }) {
  const [open, setOpen] = useState(true);
  const items = day.items ?? [];
  return (
    <li style={{ borderBottom: `0.5px dotted ${D_PAL.ruleSoft}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "8px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: D_PAL.ink2,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>DAY {index + 1}</span>
        {day.date && (
          <span style={{ fontFamily: D_DISPLAY, fontSize: 13, fontWeight: 500 }}>· {fmt(day.date)}</span>
        )}
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5 }}>
          {items.length} ITEM{items.length === 1 ? "" : "S"}
        </span>
      </button>
      {open && items.length > 0 && (
        <ul style={{ listStyle: "none", padding: "0 16px 8px 38px", margin: 0 }}>
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                fontFamily: D_SERIF,
                fontSize: 12.5,
                color: D_PAL.ink2,
                padding: "4px 0",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              {item.time && (
                <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.muted, width: 48, flexShrink: 0 }}>{item.time}</span>
              )}
              <div style={{ flex: 1 }}>
                <div>
                  <span style={{ color: D_PAL.ink }}>{item.title ?? "—"}</span>
                  {item.kind && (
                    <span style={{ marginLeft: 6, fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                      {item.kind}
                    </span>
                  )}
                </div>
                {(item.location || item.notes) && (
                  <div style={{ color: D_PAL.muted, marginTop: 2, fontStyle: "italic", fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {item.location && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapIcon size={10} />
                        {item.location}
                      </span>
                    )}
                    {item.notes && <span>{item.notes}</span>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
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
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: c.color,
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        padding: "1.5px 6px",
      }}
    >
      {status}
    </span>
  );
}

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
