/**
 * Postcard primitives — the building blocks for any page in the app.
 * Inline styles intentional (matches the design's typographic specificity).
 */
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SANS, D_SCRIPT, D_SERIF } from "./tokens";

// --- Card ---------------------------------------------------------------

export function Card({
  children,
  emphasis = false,
  style = {},
  acc = D_PAL.accent,
  onClick,
  className,
}: {
  children: ReactNode;
  emphasis?: boolean;
  style?: CSSProperties;
  acc?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${emphasis ? acc : D_PAL.rule}`,
        boxShadow: emphasis
          ? `4px 4px 0 ${D_PAL.paperWarm}, 4px 4px 0 0.5px ${acc}33`
          : `3px 3px 0 ${D_PAL.ruleSoft}`,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Button -------------------------------------------------------------

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  acc = D_PAL.accent,
  style = {},
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  acc?: string;
}) {
  const padding = size === "sm" ? "6px 10px" : "9px 14px";
  const fontSize = size === "sm" ? 11 : 12;

  let bg = D_PAL.ink;
  let color = D_PAL.cream;
  let border: string | undefined;

  if (variant === "primary") {
    bg = acc;
    color = D_PAL.cream;
  } else if (variant === "secondary") {
    bg = "transparent";
    color = D_PAL.ink;
    border = `0.5px solid ${D_PAL.rule}`;
  } else if (variant === "ghost") {
    bg = "transparent";
    color = D_PAL.ink2;
    border = "none";
  } else if (variant === "danger") {
    bg = "transparent";
    color = "#a23a28";
    border = "0.5px solid #a23a28";
  }

  return (
    <button
      {...rest}
      style={{
        background: bg,
        color,
        border: border ?? "none",
        padding,
        fontFamily: D_DISPLAY,
        fontSize,
        letterSpacing: 1.4,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
        fontWeight: 600,
        opacity: rest.disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// --- Pill (tag) ---------------------------------------------------------

export function Pill({ children, accent = false, acc = D_PAL.accent }: { children: ReactNode; accent?: boolean; acc?: string }) {
  return (
    <span
      style={{
        fontFamily: D_MONO,
        fontSize: 9,
        color: accent ? acc : D_PAL.ink2,
        padding: "2px 6px",
        border: `0.5px solid ${accent ? acc : D_PAL.rule}`,
        background: accent ? D_PAL.paperHi : D_PAL.paperHi,
        letterSpacing: 0.5,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

// --- Script label (handwritten accent) ---------------------------------

export function ScriptLabel({
  children,
  size = 14,
  acc = D_PAL.accent,
  rotate = -1,
  style = {},
}: {
  children: ReactNode;
  size?: number;
  acc?: string;
  rotate?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: D_SCRIPT,
        fontSize: size,
        color: acc,
        transform: `rotate(${rotate}deg)`,
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// --- Mono caption (tiny uppercase label) -------------------------------

export function MonoCaption({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: D_MONO,
        fontSize: 9.5,
        color: D_PAL.muted,
        letterSpacing: 1,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// --- Display heading ----------------------------------------------------

export function DisplayHeading({
  children,
  size = 22,
  style = {},
}: {
  children: ReactNode;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: D_DISPLAY,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: -0.4,
        lineHeight: 1.1,
        color: D_PAL.ink,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// --- Italic body --------------------------------------------------------

export function ItalicBody({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: D_SERIF,
        fontStyle: "italic",
        fontSize: 13.5,
        color: D_PAL.ink2,
        lineHeight: 1.55,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// --- Dashed rule --------------------------------------------------------

export function DashedRule({ style = {} }: { style?: CSSProperties }) {
  return <div style={{ height: 1, borderTop: `1px dashed ${D_PAL.rule}`, ...style }} />;
}

// --- Inputs -------------------------------------------------------------

export function TextInput({
  style = {},
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.rule}`,
        padding: "6px 10px",
        fontFamily: D_SANS,
        fontSize: 13,
        color: D_PAL.ink,
        outline: "none",
        ...style,
      }}
    />
  );
}

export function Textarea({
  style = {},
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.rule}`,
        padding: "10px 12px",
        fontFamily: D_SANS,
        fontSize: 14,
        color: D_PAL.ink,
        outline: "none",
        resize: "none",
        ...style,
      }}
    />
  );
}

export function Select({
  style = {},
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.rule}`,
        padding: "5px 8px",
        fontFamily: D_DISPLAY,
        fontSize: 12,
        color: D_PAL.ink,
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// --- Page wrapper (has the cream background + radial-dot texture) -------

export function PostcardPage({
  children,
  padded = true,
  style = {},
}: {
  children: ReactNode;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: D_PAL.cream,
        color: D_PAL.ink,
        fontFamily: D_SANS,
        backgroundImage: `radial-gradient(rgba(120,90,40,.06) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        overflow: "auto",
        ...style,
      }}
    >
      {padded ? <div style={{ padding: "28px 32px 40px", maxWidth: 1180 }}>{children}</div> : children}
    </div>
  );
}

// --- Page header (used at top of /plans, /trips, /settings) -------------

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  rightSlot,
  acc = D_PAL.accent,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  acc?: string;
}) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
      <div>
        {eyebrow && (
          <div style={{ marginBottom: 4 }}>
            <ScriptLabel acc={acc} size={17} rotate={-1.5}>
              {eyebrow}
            </ScriptLabel>
          </div>
        )}
        <DisplayHeading size={32} style={{ display: "block", letterSpacing: -0.6 }}>
          {title}
        </DisplayHeading>
        {subtitle && (
          <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 14, color: D_PAL.ink3, marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {rightSlot && <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{rightSlot}</div>}
    </header>
  );
}

// --- Empty state --------------------------------------------------------

export function EmptyState({
  title,
  hint,
  cta,
  acc = D_PAL.accent,
}: {
  title: string;
  hint?: string;
  cta?: ReactNode;
  acc?: string;
}) {
  return (
    <div
      style={{
        background: D_PAL.paper,
        border: `0.5px dashed ${D_PAL.rule}`,
        padding: "48px 32px",
        textAlign: "center",
        boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <ScriptLabel acc={acc} size={20} rotate={-1.5}>
        {title}
      </ScriptLabel>
      {hint && (
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink3, marginTop: 8 }}>
          {hint}
        </div>
      )}
      {cta && <div style={{ marginTop: 16 }}>{cta}</div>}
    </div>
  );
}

// --- Toast / banner -----------------------------------------------------

export function Banner({
  tone = "neutral",
  children,
  acc = D_PAL.accent,
}: {
  tone?: "neutral" | "success" | "warning" | "error";
  children: ReactNode;
  acc?: string;
}) {
  const tones: Record<string, { bg: string; border: string; color: string }> = {
    neutral: { bg: D_PAL.paperWarm, border: D_PAL.rule, color: D_PAL.ink2 },
    success: { bg: "#e9f0e3", border: D_PAL.green, color: D_PAL.green },
    warning: { bg: "#f7e8c8", border: "#a86c1c", color: "#7a4f12" },
    error: { bg: "#f3d9d2", border: "#a23a28", color: "#a23a28" },
  };
  const t = tones[tone];
  return (
    <div
      style={{
        background: t.bg,
        border: `0.5px solid ${t.border}`,
        padding: "10px 14px",
        fontFamily: D_SERIF,
        fontStyle: "italic",
        fontSize: 13,
        color: t.color,
        lineHeight: 1.5,
      }}
    >
      <ScriptLabel acc={acc} size={14} rotate={-1} style={{ marginRight: 6 }}>
        {tone === "success" ? "good —" : tone === "error" ? "trouble —" : tone === "warning" ? "heads up —" : "note —"}
      </ScriptLabel>
      {children}
    </div>
  );
}
