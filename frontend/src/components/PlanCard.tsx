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
import {
  type Plan,
  exportPlanToCalendar,
  getPlan,
  updatePlan,
} from "../lib/api";

type PlanItem = {
  time?: string;
  duration_min?: number;
  kind?: string;
  title?: string;
  place_id?: string;
  location?: string;
  notes?: string;
};

type PlanDay = {
  date?: string;
  items?: PlanItem[];
};

type PlanData = {
  summary?: string;
  dates?: { start?: string; end?: string };
  budget_estimate?: {
    currency?: string;
    total?: number;
    breakdown?: Record<string, number>;
  };
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

  // Re-fetch by id so the card stays current after updates from elsewhere.
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
    <div className="rounded-md border border-indigo-900 bg-indigo-950/20 text-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-indigo-900 flex items-start gap-3">
        <ScrollText size={16} className="text-indigo-300 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-100 font-semibold truncate">{plan.title}</span>
            <span
              className={`text-xs font-mono uppercase px-2 py-0.5 rounded ${
                plan.status === "saved"
                  ? "bg-emerald-950/40 text-emerald-300"
                  : plan.status === "booked"
                    ? "bg-amber-950/40 text-amber-300"
                    : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {plan.status}
            </span>
            {data.dates?.start && data.dates?.end && (
              <span className="text-xs text-neutral-400">
                {fmtDate(data.dates.start)} – {fmtDate(data.dates.end)}
              </span>
            )}
            {data.budget_estimate?.total !== undefined && (
              <span className="text-xs text-neutral-400">
                · ~{formatPrice(data.budget_estimate.total, data.budget_estimate.currency)}
              </span>
            )}
          </div>
          {data.summary && <p className="text-xs text-neutral-300 mt-1.5">{data.summary}</p>}
        </div>
      </div>

      {(data.flights?.length || data.lodging?.length) ? (
        <div className="px-4 py-2 border-b border-indigo-900/60 text-xs space-y-1">
          {data.flights?.map((f, i) => (
            <div key={`f${i}`} className="flex items-center gap-2 text-neutral-300">
              <Plane size={12} className="text-neutral-500" />
              <span>{f.summary}</span>
            </div>
          ))}
          {data.lodging?.map((l, i) => (
            <div key={`l${i}`} className="flex items-center gap-2 text-neutral-300">
              <MapPin size={12} className="text-neutral-500" />
              <span>
                {l.summary}
                {l.nights ? ` · ${l.nights} nights` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {data.days && data.days.length > 0 && (
        <ol className="divide-y divide-indigo-900/60">
          {data.days.map((d, i) => (
            <DayRow key={d.date ?? `d${i}`} day={d} index={i} />
          ))}
        </ol>
      )}

      {data.budget_estimate?.breakdown && (
        <div className="px-4 py-2 border-t border-indigo-900/60 text-xs text-neutral-400 flex flex-wrap gap-3">
          {Object.entries(data.budget_estimate.breakdown).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="text-neutral-500">{k}:</span>
              <span className="text-neutral-300">
                {formatPrice(v, data.budget_estimate?.currency)}
              </span>
            </span>
          ))}
        </div>
      )}

      {data.open_questions && data.open_questions.length > 0 && (
        <div className="px-4 py-2 border-t border-indigo-900/60 text-xs">
          <div className="text-neutral-400 mb-1">Open questions</div>
          <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
            {data.open_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 py-3 bg-indigo-950/40 flex items-center gap-2 flex-wrap">
        {plan.status !== "saved" && (
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-1 rounded bg-neutral-100 text-neutral-900 px-3 py-1.5 text-xs font-medium hover:bg-white disabled:opacity-50"
          >
            <CheckCircle2 size={12} />
            {saveMut.isPending ? "Saving…" : "Save plan"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Add every timed plan item to your Google Calendar?"))
              exportMut.mutate();
          }}
          disabled={exportMut.isPending || !data.days?.length}
          className="inline-flex items-center gap-1 rounded border border-indigo-700 text-indigo-200 px-3 py-1.5 text-xs hover:bg-indigo-950/60 disabled:opacity-50"
          title={!data.days?.length ? "Plan has no day-by-day items to export" : undefined}
        >
          <CalendarPlus size={12} />
          {exportMut.isPending ? "Exporting…" : "Export to Calendar"}
        </button>
        <span className="text-xs text-neutral-500 font-mono ml-auto">{plan.id.slice(-8)}</span>
      </div>

      {exportMut.data && (
        <div className="px-4 py-2 bg-emerald-950/30 border-t border-emerald-900 text-xs text-emerald-300">
          Exported {exportMut.data.created} event(s)
          {exportMut.data.errors.length > 0 && (
            <span className="text-rose-400">
              {" "}
              · {exportMut.data.errors.length} error(s)
            </span>
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
    <li className="px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-xs text-neutral-300 hover:text-neutral-100"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-mono">Day {index + 1}</span>
        {day.date && <span className="text-neutral-400">· {fmtDate(day.date)}</span>}
        <span className="text-neutral-500 ml-auto">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </button>
      {open && items.length > 0 && (
        <ul className="mt-1.5 ml-5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
              {item.time && (
                <span className="text-neutral-500 font-mono shrink-0 w-12">{item.time}</span>
              )}
              <div className="flex-1 min-w-0">
                <div>
                  <span className="text-neutral-100">{item.title ?? "—"}</span>
                  {item.kind && (
                    <span className="text-neutral-500 ml-2 font-mono">{item.kind}</span>
                  )}
                </div>
                {(item.location || item.notes) && (
                  <div className="text-neutral-500 mt-0.5 flex items-center gap-2">
                    {item.location && (
                      <span className="flex items-center gap-1">
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

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return iso;
  }
}

function formatPrice(amount: number, currency = "USD"): string {
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
