import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { BedDouble, Car, Plane, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { type Trip, deleteTrip, listTrips, triggerTripScan } from "../lib/api";

const KIND_ICON: Record<Trip["kind"], ReactNode> = {
  flight: <Plane size={14} />,
  hotel: <BedDouble size={14} />,
  rental: <Car size={14} />,
  other: <Plane size={14} />,
};

export function TripsPage() {
  const qc = useQueryClient();
  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: listTrips,
  });
  const scanMut = useMutation({
    mutationFn: triggerTripScan,
    onSuccess: () => {
      // Polling once after a few seconds gives the worker time to insert rows.
      setTimeout(() => qc.invalidateQueries({ queryKey: ["trips"] }), 3000);
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-4xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trips</h2>
          <p className="text-sm text-neutral-400">
            Auto-extracted from your Gmail. Connect Google in Settings, then scan to populate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => scanMut.mutate()}
          disabled={scanMut.isPending}
          className="flex items-center gap-2 rounded border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw size={12} className={scanMut.isPending ? "animate-spin" : ""} />
          {scanMut.isPending ? "Scanning…" : "Scan Gmail now"}
        </button>
      </header>

      {scanMut.isSuccess && (
        <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded px-3 py-2">
          Scan queued. New trips appear here once extraction finishes.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : trips.length === 0 ? (
        <div className="rounded-md border border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          No trips yet. Try "Scan Gmail now" if you've connected your Google account.
        </div>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => (
            <li
              key={t.id}
              className="rounded-md border border-neutral-800 px-4 py-3 flex items-start gap-3"
            >
              <span className="mt-0.5 text-neutral-400">{KIND_ICON[t.kind] ?? KIND_ICON.other}</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-neutral-100 font-medium">{t.title ?? "Untitled trip"}</span>
                  <span className="text-xs text-neutral-500 font-mono uppercase">{t.kind}</span>
                </div>
                <div className="text-xs text-neutral-400 flex flex-wrap gap-3">
                  {t.origin && t.destination && (
                    <span>
                      {t.origin} → {t.destination}
                    </span>
                  )}
                  {t.departure_date && <span>{fmtDate(t.departure_date)}</span>}
                  {t.return_date && <span>↩ {fmtDate(t.return_date)}</span>}
                  {t.confirmation_numbers.length > 0 && (
                    <span className="font-mono">
                      conf: {(t.confirmation_numbers as string[]).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this trip record?")) deleteMut.mutate(t.id);
                }}
                aria-label="Delete trip"
                className="text-neutral-500 hover:text-rose-400"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
