import { Bike, Bus, Car, CornerDownRight, Footprints } from "lucide-react";
import type { ReactNode } from "react";
import { D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";

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
  duration: string | null;
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
    <div style={{ background: D_PAL.paper, border: `0.5px solid ${D_PAL.rule}`, boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}` }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `0.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: D_PAL.paperWarm,
        }}
      >
        <span style={{ color: D_PAL.accent }}>{MODE_ICONS[mode] ?? <Car size={14} />}</span>
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>directions —</span>
        <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, letterSpacing: 0.5 }}>
          {mode.toLowerCase()} · {fmtDuration(duration)} · {fmtDistance(distance_meters)}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {steps.length} STEPS
        </span>
      </div>
      {steps.length > 0 ? (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {steps.map((s, i) => (
            <li
              key={i}
              style={{
                padding: "8px 14px",
                borderBottom: i < steps.length - 1 ? `0.5px dotted ${D_PAL.ruleSoft}` : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CornerDownRight size={12} style={{ color: D_PAL.muted, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: D_SERIF, fontSize: 13, color: D_PAL.ink2, lineHeight: 1.5 }}>
                  {s.instruction ?? "—"}
                </div>
                <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5, marginTop: 2 }}>
                  {fmtDistance(s.distance_meters)} · {fmtDuration(s.duration)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div style={{ padding: "20px 16px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>
          No route found.
        </div>
      )}
    </div>
  );
}

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

