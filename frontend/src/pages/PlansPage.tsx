import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ScrollText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
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
    <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Plans</h2>
        <p className="text-sm text-neutral-400">
          Trip plans built by the agent. Drafts and saved plans both show here.
        </p>
      </header>

      {isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : plans.length === 0 ? (
        <div className="rounded-md border border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          No plans yet. Try asking the agent to plan a trip.
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => {
            const data = p.data as {
              dates?: { start?: string; end?: string };
              budget_estimate?: { total?: number; currency?: string };
              days?: unknown[];
            };
            return (
              <li
                key={p.id}
                className="rounded-md border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <ScrollText size={16} className="text-indigo-300 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/plans/${p.id}`}
                      className="text-neutral-100 font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-neutral-400 flex flex-wrap gap-3 mt-1">
                      <StatusPill status={p.status} />
                      {data.dates?.start && data.dates?.end && (
                        <span>
                          {fmt(data.dates.start)} – {fmt(data.dates.end)}
                        </span>
                      )}
                      {data.budget_estimate?.total !== undefined && (
                        <span>~{money(data.budget_estimate.total, data.budget_estimate.currency)}</span>
                      )}
                      {Array.isArray(data.days) && (
                        <span>
                          {data.days.length} day{data.days.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="text-neutral-500">updated {fmt(p.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete plan "${p.title}"?`)) deleteMut.mutate(p.id);
                    }}
                    aria-label="Delete plan"
                    className="text-neutral-500 hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Plan["status"] }) {
  const cls =
    status === "saved"
      ? "bg-emerald-950/40 text-emerald-300"
      : status === "booked"
        ? "bg-amber-950/40 text-amber-300"
        : "bg-neutral-800 text-neutral-400";
  return (
    <span className={`text-xs font-mono uppercase px-1.5 py-0.5 rounded ${cls}`}>{status}</span>
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
