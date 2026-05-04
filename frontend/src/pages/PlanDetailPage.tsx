import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Compass,
  Map as MapIcon,
  MapPin,
  Plane,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlanMap, type MapPin as MapPinType } from "../components/PlanMap";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { Banner, Button, PostcardPage, ScriptLabel } from "../design/postcard/primitives";
import { type Plan, exportPlanToCalendar, getPlan, updatePlan } from "../lib/api";

type PlanItem = {
  time?: string;
  title?: string;
  kind?: string;
  notes?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
};
type PlanDay = { date?: string; items?: PlanItem[] };
type PlanData = {
  summary?: string;
  dates?: { start?: string; end?: string };
  budget_estimate?: { total?: number; currency?: string; breakdown?: Record<string, number> };
  flights?: { offer_id?: string; summary?: string }[];
  lodging?: { hotel_id?: string; nights?: number; summary?: string; latitude?: number; longitude?: number }[];
  days?: PlanDay[];
  open_questions?: string[];
};

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: plan, isLoading } = useQuery<Plan>({
    queryKey: ["plan", id],
    queryFn: () => getPlan(id!),
    enabled: !!id,
  });

  const saveMut = useMutation({
    mutationFn: () => updatePlan(plan!.id, { status: "saved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", id] }),
  });

  const exportMut = useMutation({
    mutationFn: () => exportPlanToCalendar(plan!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", id] }),
  });

  const data = (plan?.data ?? {}) as PlanData;

  const pins: MapPinType[] = useMemo(() => {
    const out: MapPinType[] = [];
    (data.lodging ?? []).forEach((l, i) => {
      if (l.latitude !== undefined && l.longitude !== undefined) {
        out.push({
          id: `lodging-${i}`,
          latitude: l.latitude,
          longitude: l.longitude,
          label: l.summary ?? "Lodging",
        });
      }
    });
    (data.days ?? []).forEach((day, i) => {
      (day.items ?? []).forEach((item, j) => {
        if (item.latitude !== undefined && item.longitude !== undefined) {
          out.push({
            id: `d${i}-i${j}`,
            latitude: item.latitude,
            longitude: item.longitude,
            label: item.title,
            day: i + 1,
          });
        }
      });
    });
    return out;
  }, [data]);

  if (isLoading) {
    return (
      <PostcardPage>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>Loading plan…</div>
      </PostcardPage>
    );
  }
  if (!plan) {
    return (
      <PostcardPage>
        <Banner tone="error">
          Plan not found.{" "}
          <button
            type="button"
            onClick={() => navigate("/plans")}
            style={{ background: "transparent", border: "none", color: D_PAL.accent, cursor: "pointer", textDecoration: "underline" }}
          >
            Back to plans
          </button>
        </Banner>
      </PostcardPage>
    );
  }

  return (
    <PostcardPage padded={false}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 32px 40px" }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            to="/plans"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: D_SCRIPT,
              fontSize: 14,
              color: D_PAL.muted,
              textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} />
            all plans
          </Link>
        </div>

        <header style={{ marginBottom: 24 }}>
          <ScriptLabel size={17} rotate={-1.5}>your trip —</ScriptLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontFamily: D_DISPLAY, fontSize: 32, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.1 }}>
              {plan.title}
            </span>
            <StatusPill status={plan.status} />
            {data.dates?.start && data.dates?.end && (
              <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.muted, letterSpacing: 1 }}>
                · {fmt(data.dates.start).toUpperCase()} – {fmt(data.dates.end).toUpperCase()}
              </span>
            )}
            {data.budget_estimate?.total !== undefined && (
              <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink3 }}>
                · ~{money(data.budget_estimate.total, data.budget_estimate.currency)}
              </span>
            )}
          </div>
          {data.summary && (
            <div
              style={{
                fontFamily: D_SERIF,
                fontStyle: "italic",
                fontSize: 14,
                color: D_PAL.ink2,
                lineHeight: 1.55,
                marginTop: 10,
                maxWidth: 700,
              }}
            >
              <ScriptLabel size={15} style={{ marginRight: 6 }}>W. —</ScriptLabel>
              {data.summary}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {plan.status !== "saved" && (
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                <CheckCircle2 size={12} />
                {saveMut.isPending ? "Saving…" : "Save plan"}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm("Add every timed plan item to your Google Calendar?")) exportMut.mutate();
              }}
              disabled={exportMut.isPending || !data.days?.length}
            >
              <CalendarPlus size={12} />
              {exportMut.isPending ? "Exporting…" : "Export to Calendar"}
            </Button>
            <Link
              to="/options"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                color: D_PAL.accent,
                border: `0.5px solid ${D_PAL.accent}`,
                padding: "9px 14px",
                fontFamily: D_DISPLAY,
                fontSize: 12,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 600,
                textDecoration: "none",
              }}
              title="Browse ranked options for this trip"
            >
              <Compass size={12} />
              Browse options
            </Link>
            {exportMut.data && (
              <span style={{ alignSelf: "center", fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.green }}>
                exported {exportMut.data.created} event(s)
              </span>
            )}
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
          className="grid-cols-1 lg:grid-cols-2"
        >
          <div>
            <SectionTitle>Map</SectionTitle>
            {pins.length === 0 ? (
              <div
                style={{
                  background: D_PAL.paperHi,
                  border: `0.5px dashed ${D_PAL.rule}`,
                  height: 360,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "0 24px",
                  fontFamily: D_SERIF,
                  fontStyle: "italic",
                  fontSize: 13,
                  color: D_PAL.muted,
                }}
              >
                No coordinates on this plan yet. Plan items need latitude / longitude to pin them.
              </div>
            ) : (
              <PlanMap pins={pins} className="w-full h-96" />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {data.flights && data.flights.length > 0 && (
              <div>
                <SectionTitle>Flights</SectionTitle>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.flights.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`, fontFamily: D_SERIF, fontSize: 14, color: D_PAL.ink2 }}>
                      <Plane size={14} style={{ color: D_PAL.muted }} />
                      {f.summary}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.lodging && data.lodging.length > 0 && (
              <div>
                <SectionTitle>Lodging</SectionTitle>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.lodging.map((l, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`, fontFamily: D_SERIF, fontSize: 14, color: D_PAL.ink2 }}>
                      <MapPin size={14} style={{ color: D_PAL.muted }} />
                      {l.summary}
                      {l.nights ? (
                        <span style={{ color: D_PAL.muted, marginLeft: 4 }}>· {l.nights} nights</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.budget_estimate?.breakdown && (
              <div>
                <SectionTitle>Budget</SectionTitle>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.entries(data.budget_estimate.breakdown).map(([k, v]) => (
                    <li key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`, fontFamily: D_SERIF, fontSize: 14 }}>
                      <span style={{ color: D_PAL.muted, textTransform: "capitalize" }}>{k}</span>
                      <span style={{ color: D_PAL.ink2 }}>{money(v, data.budget_estimate?.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.open_questions && data.open_questions.length > 0 && (
              <div>
                <SectionTitle script="open questions">Open questions</SectionTitle>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {data.open_questions.map((q, i) => (
                    <li key={i} style={{ padding: "4px 0", fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink2 }}>
                      — {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {data.days && data.days.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <SectionTitle script="day by day">Itinerary</SectionTitle>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {data.days.map((day, i) => (
                <li
                  key={day.date ?? i}
                  style={{
                    background: D_PAL.paper,
                    border: `0.5px solid ${D_PAL.rule}`,
                    boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 16px",
                      borderBottom: `0.5px dashed ${D_PAL.rule}`,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>DAY {i + 1}</span>
                    {day.date && (
                      <span style={{ fontFamily: D_DISPLAY, fontSize: 14, fontWeight: 600 }}>{fmt(day.date)}</span>
                    )}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {(day.items ?? []).map((item, j) => (
                      <li
                        key={j}
                        style={{
                          padding: "10px 16px",
                          borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 14,
                        }}
                      >
                        {item.time && (
                          <span
                            style={{
                              fontFamily: D_MONO,
                              fontSize: 12,
                              color: D_PAL.ink3,
                              letterSpacing: 0.5,
                              flexShrink: 0,
                              width: 56,
                            }}
                          >
                            {item.time}
                          </span>
                        )}
                        <div style={{ flex: 1 }}>
                          <div>
                            <span style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 500 }}>{item.title ?? "—"}</span>
                            {item.kind && (
                              <span style={{ marginLeft: 6, fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                                {item.kind}
                              </span>
                            )}
                          </div>
                          {(item.location || item.notes) && (
                            <div
                              style={{
                                marginTop: 4,
                                fontFamily: D_SERIF,
                                fontStyle: "italic",
                                fontSize: 12.5,
                                color: D_PAL.ink3,
                                display: "flex",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              {item.location && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <MapIcon size={11} />
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
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </PostcardPage>
  );
}

function SectionTitle({ children, script }: { children: React.ReactNode; script?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1.2 }}>
        {String(children).toUpperCase()}
      </span>
      <span style={{ flex: 1, height: 1, borderTop: `0.5px dashed ${D_PAL.rule}`, marginBottom: 4 }} />
      {script && (
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent, transform: "rotate(-1deg)", display: "inline-block" }}>
          {script}
        </span>
      )}
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

function fmt(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
