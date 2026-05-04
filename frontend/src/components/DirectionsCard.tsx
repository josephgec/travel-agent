import { Bike, Bus, Car, CornerDownRight, Footprints } from "lucide-react";
import type { ReactNode } from "react";

type Step = {
  instruction: string | null;
  maneuver: string | null;
  distance_meters: number | null;
  duration: string | null;
  mode: string | null;
};

export type DirectionsResult = {
  display_hint: "directions";
  mode: string;
  duration: string | null; // ISO 8601, e.g. "1234s"
  distance_meters: number | null;
  polyline: string | null;
  steps: Step[];
};

const MODE_ICONS: Record<string, ReactNode> = {
  DRIVE: <Car size={14} />,
  WALK: <Footprints size={14} />,
  BICYCLE: <Bike size={14} />,
  TWO_WHEELER: <Bike size={14} />,
  TRANSIT: <Bus size={14} />,
};

export function DirectionsCard({ result }: { result: DirectionsResult }) {
  const { mode, duration, distance_meters, steps } = result;

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-sm">
      <div className="px-4 py-2 border-b border-neutral-800 text-neutral-300 text-xs flex items-center gap-3">
        <span className="flex items-center gap-1">
          {MODE_ICONS[mode] ?? <Car size={14} />}
          {mode.toLowerCase()}
        </span>
        <span>· {fmtDuration(duration)}</span>
        <span>· {fmtDistance(distance_meters)}</span>
        <span className="ml-auto text-neutral-500">{steps.length} steps</span>
      </div>
      {steps.length > 0 ? (
        <ol className="divide-y divide-neutral-800">
          {steps.map((s, i) => (
            <li key={i} className="px-4 py-2 flex items-start gap-3 text-xs">
              <CornerDownRight size={14} className="text-neutral-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-neutral-200">{s.instruction ?? "—"}</div>
                <div className="text-neutral-500 mt-0.5">
                  {fmtDistance(s.distance_meters)} · {fmtDuration(s.duration)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-4 py-6 text-center text-neutral-500 text-xs">No route found.</div>
      )}
    </div>
  );
}

// "1234s" -> "20m 34s" or "2h 5m"
function fmtDuration(d: string | null): string {
  if (!d) return "—";
  const m = /^(\d+)s$/.exec(d);
  if (!m) return d;
  let s = Number(m[1]);
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const min = Math.floor(s / 60);
  s -= min * 60;
  if (h > 0) return `${h}h ${min}m`;
  if (min > 0) return s ? `${min}m ${s}s` : `${min}m`;
  return `${s}s`;
}

function fmtDistance(meters: number | null): string {
  if (meters === null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  return `${meters} m`;
}
