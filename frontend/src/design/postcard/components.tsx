/**
 * Postcard shared components — chrome, primitives, and compare rail.
 * Ported from detail-chrome.jsx + the CompareRail in detail-flights.jsx.
 */
import type { CSSProperties, ReactNode } from "react";
import { Fragment } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SANS, D_SCRIPT, D_SERIF } from "./tokens";
import type { Trip } from "./data";

export type StageId = "flights" | "stays" | "activities" | "food";

const STAGES: { id: StageId; label: string; glyph: string }[] = [
  { id: "flights", label: "Flights", glyph: "✈" },
  { id: "stays", label: "Stays", glyph: "⌂" },
  { id: "activities", label: "Activities", glyph: "◇" },
  { id: "food", label: "Food", glyph: "◉" },
];

export function DetailHeader({
  trip,
  stage,
  onStage,
  city,
  onCity,
  onBack,
  acc = D_PAL.accent,
}: {
  trip: Trip;
  stage: StageId;
  onStage: (s: StageId) => void;
  city?: string;
  onCity?: (c: string) => void;
  onBack?: () => void;
  acc?: string;
}) {
  const stepIdx = STAGES.findIndex((s) => s.id === stage);
  return (
    <div style={{ background: D_PAL.paper, borderBottom: `1.5px dashed ${D_PAL.rule}`, padding: "14px 32px 0" }}>
      {/* Top row: trip + actions */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontFamily: D_SCRIPT, fontSize: 17, color: acc, transform: "rotate(-1.5deg)", display: "inline-block" }}>
            your trip —
          </span>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>{trip.title}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 1 }}>· {trip.dates.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: D_SCRIPT,
              fontSize: 15,
              color: D_PAL.muted,
              transform: "rotate(-1deg)",
              display: "inline-block",
              cursor: onBack ? "pointer" : "default",
              padding: 0,
            }}
          >
            ← back to plan
          </button>
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
            STEP {stepIdx + 1} OF {STAGES.length}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, marginTop: 6, flexWrap: "wrap" }}>
        {STAGES.map((s, i) => {
          const active = s.id === stage;
          const done = stepIdx > i;
          return (
            <Fragment key={s.id}>
              <button
                type="button"
                onClick={() => onStage(s.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 4px 10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  borderBottom: active ? `2.5px solid ${acc}` : "2.5px solid transparent",
                  marginBottom: -1.5,
                  position: "relative",
                  minWidth: 110,
                }}
              >
                <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: active ? acc : done ? D_PAL.ink2 : D_PAL.muted, letterSpacing: 1 }}>
                  {String(i + 1).padStart(2, "0")} {done && "· ✓"}
                </span>
                <span style={{ fontFamily: D_DISPLAY, fontSize: 17, fontWeight: active ? 600 : 500, color: active ? D_PAL.ink : D_PAL.ink3, letterSpacing: -0.2 }}>
                  {s.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <span style={{ flex: "0 0 28px", height: 1, borderTop: `1px dashed ${D_PAL.rule}`, marginBottom: 16 }} />
              )}
            </Fragment>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* City tabs */}
        {onCity && (
          <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
            {trip.cities.map((c) => {
              const isActive = c.code === city;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onCity(c.code)}
                  style={{
                    background: isActive ? D_PAL.ink : "transparent",
                    color: isActive ? D_PAL.cream : D_PAL.ink2,
                    border: `0.5px solid ${isActive ? D_PAL.ink : D_PAL.rule}`,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontFamily: D_DISPLAY,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: 0.2,
                  }}
                >
                  {c.city}
                  <span style={{ fontFamily: D_MONO, fontSize: 9, marginLeft: 6, opacity: 0.7 }}>{c.code}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailTitleBar({
  title,
  subtitle,
  agentNote,
  sortValue,
  onSort,
  sortOptions,
  rightSlot,
  compareCount,
  maxCompare = 3,
  onClearCompare,
  acc = D_PAL.accent,
}: {
  title: string;
  subtitle: string;
  agentNote?: string;
  sortValue?: string;
  onSort?: (v: string) => void;
  sortOptions?: { value: string; label: string }[];
  rightSlot?: ReactNode;
  compareCount?: number;
  maxCompare?: number;
  onClearCompare?: () => void;
  acc?: string;
}) {
  return (
    <div style={{ padding: "18px 32px 14px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, borderBottom: `0.5px dashed ${D_PAL.rule}`, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 32, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontFamily: D_SCRIPT, fontSize: 19, color: acc, marginTop: 4 }}>{subtitle}</div>
        {agentNote && (
          <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink3, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 16, color: acc }}>W. notes —</span> {agentNote}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {rightSlot}
        {compareCount !== undefined && compareCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: D_PAL.paperWarm, border: `0.5px solid ${acc}` }}>
            <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: acc }}>comparing</span>
            <span style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600 }}>{compareCount}</span>
            <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>/ {maxCompare}</span>
            <button
              type="button"
              onClick={onClearCompare}
              style={{ background: "transparent", border: "none", fontFamily: D_SCRIPT, fontSize: 13, color: D_PAL.muted, cursor: "pointer", marginLeft: 4 }}
            >
              clear
            </button>
          </div>
        )}
        {sortOptions && onSort && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>SORT</span>
            <select
              value={sortValue}
              onChange={(e) => onSort(e.target.value)}
              style={{
                background: D_PAL.paper,
                border: `0.5px solid ${D_PAL.rule}`,
                padding: "5px 8px",
                fontFamily: D_DISPLAY,
                fontSize: 12,
                color: D_PAL.ink,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export function FitScore({ value, acc = D_PAL.accent, size = 52, label = "fit" }: { value: number; acc?: string; size?: number; label?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={D_PAL.ruleSoft} strokeWidth="2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={acc}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: size > 50 ? 18 : 14, fontWeight: 600, lineHeight: 1, color: D_PAL.ink, letterSpacing: -0.5 }}>{value}</div>
        <div style={{ fontFamily: D_SCRIPT, fontSize: 11, color: D_PAL.muted, lineHeight: 1, marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

export function RankBadge({ rank, recommended, acc = D_PAL.accent }: { rank: number; recommended?: boolean; acc?: string }) {
  const labels = ["1st pick", "2nd", "3rd", "4th", "5th"];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontFamily: D_DISPLAY,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: rank === 1 ? acc : D_PAL.muted,
          background: rank === 1 ? D_PAL.paperHi : "transparent",
          border: `0.5px solid ${rank === 1 ? acc : D_PAL.rule}`,
          padding: "3px 8px",
        }}
      >
        {labels[rank - 1] ?? `${rank}th`}
      </span>
      {recommended && (
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: acc, transform: "rotate(-2deg)", display: "inline-block" }}>
          ★ recommended
        </span>
      )}
    </div>
  );
}

export function CompareToggle({
  checked,
  onChange,
  disabled,
  acc = D_PAL.accent,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  acc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        cursor: disabled && !checked ? "not-allowed" : "pointer",
        padding: "4px 6px",
        opacity: disabled && !checked ? 0.4 : 1,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          border: `1px solid ${checked ? acc : D_PAL.rule}`,
          background: checked ? acc : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: D_PAL.cream,
          fontSize: 10,
          lineHeight: 1,
          fontFamily: D_MONO,
        }}
      >
        {checked && "✓"}
      </span>
      <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: checked ? acc : D_PAL.muted }}>compare</span>
    </button>
  );
}

export function DSectionTitle({ title, script, acc = D_PAL.accent }: { title: string; script?: string; acc?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1.2 }}>{title.toUpperCase()}</span>
      <span style={{ flex: 1, height: 1, borderTop: `0.5px dashed ${D_PAL.rule}`, marginBottom: 4 }} />
      {script && (
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: acc, transform: "rotate(-1deg)", display: "inline-block" }}>
          {script}
        </span>
      )}
    </div>
  );
}

export function StarRating({ value, count, color = D_PAL.accent }: { value: number; count: number; color?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ color, fontSize: 12 }}>★</span>
      <span style={{ fontFamily: D_DISPLAY, fontSize: 13, fontWeight: 600 }}>{value}</span>
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted }}>· {count.toLocaleString()}</span>
    </div>
  );
}

const PALETTES: Record<string, { bg: string; fg: string; text: string }> = {
  warm: { bg: "#e8dfd1", fg: "#c2b39a", text: "#7a6a52" },
  cool: { bg: "#dbe2e6", fg: "#aebbc4", text: "#5a6975" },
  dark: { bg: "#2a2620", fg: "#3d362d", text: "#8a7d6a" },
  ink: { bg: "#1a1815", fg: "#2a2622", text: "#9a8e7a" },
  sun: { bg: "#f0d9a8", fg: "#d9b878", text: "#7a5a28" },
};

export function StripedPlaceholder({
  caption,
  palette = "warm",
  style = {},
}: {
  caption: string;
  palette?: keyof typeof PALETTES | string;
  style?: CSSProperties;
}) {
  const p = PALETTES[palette as string] ?? PALETTES.warm;
  return (
    <div
      style={{
        position: "relative",
        background: `repeating-linear-gradient(135deg, ${p.bg} 0 8px, ${p.fg} 8px 9px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 10,
          letterSpacing: 0.5,
          color: p.text,
          background: p.bg,
          padding: "3px 6px",
          borderRadius: 2,
          textTransform: "uppercase",
        }}
      >
        {caption}
      </span>
    </div>
  );
}

export function SpecRow({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 6,
        padding: "2px 0",
        borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`,
      }}
    >
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.4 }}>{l.toUpperCase()}</span>
      <span style={{ textAlign: "right" }}>
        {v}
        {sub && <span style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.green, marginLeft: 4 }}>({sub})</span>}
      </span>
    </div>
  );
}

// --- Compare rail (shared across stages) ---

export type CompareField = {
  key: string;
  label: string;
  fmt?: (v: unknown) => string;
  get?: (o: Record<string, unknown>) => unknown;
};

export function CompareRail({
  title,
  opts,
  fields,
  acc = D_PAL.accent,
  onClose,
}: {
  title: string;
  opts: Record<string, unknown>[];
  fields: CompareField[];
  acc?: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${acc}`,
        padding: "18px 18px 16px",
        boxShadow: `4px 4px 0 ${D_PAL.ruleSoft}`,
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: D_SCRIPT, fontSize: 16, color: acc, transform: "rotate(-1.5deg)", display: "inline-block", marginRight: 8 }}>
            side by side
          </span>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600 }}>{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "transparent", border: "none", fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.muted, cursor: "pointer" }}
        >
          close ✕
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `90px repeat(${opts.length}, 1fr)`, fontSize: 11.5 }}>
        <span></span>
        {opts.map((o, i) => (
          <span
            key={i}
            style={{
              fontFamily: D_DISPLAY,
              fontSize: 13,
              fontWeight: 600,
              padding: "0 6px",
              borderBottom: `1px solid ${D_PAL.ruleSoft}`,
              paddingBottom: 6,
            }}
          >
            {(o.carrier as string) || (o.name as string)}
          </span>
        ))}
        {fields.map((f) => {
          const vals = opts.map((o) => (f.get ? f.get(o) : o[f.key]));
          let bestIdx = -1;
          if (typeof vals[0] === "number") {
            const isHigher = f.key === "fit" || f.key === "rating";
            const target = isHigher ? Math.max(...(vals as number[])) : Math.min(...(vals as number[]));
            bestIdx = (vals as number[]).indexOf(target);
          }
          return (
            <Fragment key={f.key}>
              <span
                style={{
                  fontFamily: D_MONO,
                  fontSize: 9,
                  color: D_PAL.muted,
                  letterSpacing: 0.6,
                  padding: "8px 0",
                  borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`,
                }}
              >
                {f.label.toUpperCase()}
              </span>
              {vals.map((v, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: D_SERIF,
                    fontSize: 12.5,
                    padding: "8px 6px",
                    borderBottom: `0.5px dotted ${D_PAL.ruleSoft}`,
                    color: bestIdx === i ? acc : D_PAL.ink2,
                    fontWeight: bestIdx === i ? 600 : 400,
                  }}
                >
                  {f.fmt ? f.fmt(v) : String(v ?? "—")}
                  {bestIdx === i && <span style={{ fontFamily: D_SCRIPT, fontSize: 11, marginLeft: 4 }}>★</span>}
                </span>
              ))}
            </Fragment>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          background: D_PAL.paperWarm,
          fontFamily: D_SERIF,
          fontStyle: "italic",
          fontSize: 12.5,
          color: D_PAL.ink2,
          lineHeight: 1.55,
        }}
      >
        <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 14, color: acc, marginRight: 4 }}>W. —</span>
        {opts.length === 2 && (
          <CompareNote2 a={opts[0]} b={opts[1]} />
        )}
        {opts.length === 3 && (
          <>Three different shapes here — the ranking depends on what you weight. My pick still goes to fit over price.</>
        )}
      </div>
    </div>
  );
}

function CompareNote2({ a, b }: { a: Record<string, unknown>; b: Record<string, unknown> }) {
  const aFit = (a.fit as number) ?? 0;
  const bFit = (b.fit as number) ?? 0;
  const winner = (aFit > bFit ? a : b) as Record<string, unknown>;
  const aPrice = typeof a.price === "number" ? (a.price as number) : 0;
  const bPrice = typeof b.price === "number" ? (b.price as number) : 0;
  const diff = Math.abs(aPrice - bPrice);
  const name = (winner.carrier as string) || (winner.name as string);
  return (
    <>
      On the numbers, {name} edges ahead. The trade is {diff} dollars for the convenience.
    </>
  );
}

// Page shell — every detail stage page wraps this around its content.
export function PostcardShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: D_PAL.cream,
        color: D_PAL.ink,
        fontFamily: D_SANS,
        backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
    >
      {children}
    </div>
  );
}
