import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  Map as MapIcon,
  MapPin,
  Plane,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type Plan, exportPlanToCalendar, getPlan, updatePlan } from "../lib/api";
import { type MapPin as MapPinType, PlanMap } from "../components/PlanMap";

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
      <div className="flex-1 px-6 py-6 text-sm text-neutral-500">Loading plan…</div>
    );
  }
  if (!plan) {
    return (
      <div className="flex-1 px-6 py-6 text-sm text-rose-400">
        Plan not found.{" "}
        <button type="button" onClick={() => navigate("/plans")} className="underline">
          Back to plans
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <Link
            to="/plans"
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            <ChevronLeft size={14} />
            All plans
          </Link>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-neutral-100">{plan.title}</h1>
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
              <span className="text-sm text-neutral-400">
                {fmt(data.dates.start)} – {fmt(data.dates.end)}
              </span>
            )}
            {data.budget_estimate?.total !== undefined && (
              <span className="text-sm text-neutral-400">
                · ~{money(data.budget_estimate.total, data.budget_estimate.currency)}
              </span>
            )}
          </div>
          {data.summary && <p className="text-sm text-neutral-300">{data.summary}</p>}
          <div className="flex gap-2 pt-2">
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
            >
              <CalendarPlus size={12} />
              {exportMut.isPending ? "Exporting…" : "Export to Calendar"}
            </button>
            {exportMut.data && (
              <span className="text-xs text-emerald-300 self-center">
                Exported {exportMut.data.created} event(s)
              </span>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-300 mb-2">Map</h2>
            {pins.length === 0 ? (
              <div className="rounded-md border border-neutral-800 bg-neutral-950 h-96 flex items-center justify-center text-xs text-neutral-500 text-center px-4">
                No coordinates on this plan yet.
                <br />
                Plan items need <span className="font-mono">latitude</span> /{" "}
                <span className="font-mono">longitude</span> to pin them.
              </div>
            ) : (
              <PlanMap pins={pins} className="w-full h-96 rounded-md overflow-hidden" />
            )}
          </div>

          <div className="space-y-4">
            {data.flights && data.flights.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-300 mb-2">Flights</h2>
                <ul className="space-y-1 text-sm">
                  {data.flights.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-neutral-300">
                      <Plane size={14} className="text-neutral-500" />
                      {f.summary}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.lodging && data.lodging.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-300 mb-2">Lodging</h2>
                <ul className="space-y-1 text-sm">
                  {data.lodging.map((l, i) => (
                    <li key={i} className="flex items-center gap-2 text-neutral-300">
                      <MapPin size={14} className="text-neutral-500" />
                      {l.summary}
                      {l.nights ? <span className="text-neutral-500"> · {l.nights} nights</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.budget_estimate?.breakdown && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-300 mb-2">Budget</h2>
                <ul className="text-sm space-y-1">
                  {Object.entries(data.budget_estimate.breakdown).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-neutral-300">
                      <span className="text-neutral-500">{k}</span>
                      <span>{money(v, data.budget_estimate?.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.open_questions && data.open_questions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-300 mb-2">Open questions</h2>
                <ul className="list-disc list-inside text-sm text-neutral-300 space-y-1">
                  {data.open_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {data.days && data.days.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-300 mb-2">Itinerary</h2>
            <ol className="space-y-4">
              {data.days.map((day, i) => (
                <li key={day.date ?? i} className="rounded-md border border-neutral-800">
                  <div className="px-4 py-2 border-b border-neutral-800 text-xs flex items-center gap-2">
                    <span className="font-mono text-neutral-300">Day {i + 1}</span>
                    {day.date && <span className="text-neutral-400">· {fmt(day.date)}</span>}
                  </div>
                  <ul className="divide-y divide-neutral-800">
                    {(day.items ?? []).map((item, j) => (
                      <li key={j} className="px-4 py-2 flex items-start gap-3 text-sm">
                        {item.time && (
                          <span className="text-neutral-500 font-mono shrink-0 w-16">
                            {item.time}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-100">
                            {item.title ?? "—"}
                            {item.kind && (
                              <span className="text-neutral-500 ml-2 text-xs font-mono">
                                {item.kind}
                              </span>
                            )}
                          </div>
                          {(item.location || item.notes) && (
                            <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-3 flex-wrap">
                              {item.location && (
                                <span className="flex items-center gap-1">
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
    </div>
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
