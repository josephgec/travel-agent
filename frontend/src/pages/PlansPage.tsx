import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ScrollText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { EmptyState, PageHeader, PostcardPage } from "../design/postcard/primitives";
import { type Plan, deletePlan, listPlans } from "../lib/api";

export function PlansPage() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: listPlans,
  });

  const deleteMut = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  return (
    <PostcardPage>
      <PageHeader
        eyebrow="your trips —"
        title="Plans"
        subtitle="Trip plans built by the agent. Drafts and saved plans both show here."
      />

      {isLoading ? (
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>Loading…</div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="no plans yet"
          hint="Ask the agent to plan a trip — once it builds a draft, it'll show up here."
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.map((p) => {
            const data = p.data as {
              dates?: { start?: string; end?: string };
              budget_estimate?: { total?: number; currency?: string };
              days?: unknown[];
            };
            return (
              <li key={p.id}>
                <div
                  style={{
                    background: D_PAL.paper,
                    border: `0.5px solid ${D_PAL.rule}`,
                    boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}`,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <ScrollText size={18} style={{ color: D_PAL.accent, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/plans/${p.id}`}
                      style={{
                        fontFamily: D_DISPLAY,
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: -0.3,
                        color: D_PAL.ink,
                        textDecoration: "none",
                        borderBottom: `0.5px dotted ${D_PAL.rule}`,
                      }}
                    >
                      {p.title}
                    </Link>
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 14,
                        flexWrap: "wrap",
                        alignItems: "baseline",
                      }}
                    >
                      <StatusPill status={p.status} />
                      {data.dates?.start && data.dates?.end && (
                        <Item label="dates" value={`${fmt(data.dates.start)} – ${fmt(data.dates.end)}`} />
                      )}
                      {data.budget_estimate?.total !== undefined && (
                        <Item label="est. budget" value={money(data.budget_estimate.total, data.budget_estimate.currency)} />
                      )}
                      {Array.isArray(data.days) && (
                        <Item
                          label="days"
                          value={`${data.days.length} day${data.days.length === 1 ? "" : "s"}`}
                        />
                      )}
                      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.6 }}>
                        UPDATED {fmtShort(p.updated_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete plan "${p.title}"?`)) deleteMut.mutate(p.id);
                    }}
                    aria-label="Delete plan"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: D_PAL.muted,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PostcardPage>
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontFamily: D_SCRIPT, fontSize: 13, color: D_PAL.accent }}>{label} —</span>
      <span style={{ fontFamily: D_SERIF, fontSize: 13, color: D_PAL.ink2 }}>{value}</span>
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

function fmtShort(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d");
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
