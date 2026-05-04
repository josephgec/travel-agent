import {
  Compass,
  Luggage,
  MessageSquare,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT } from "../design/postcard/tokens";

type Item = { to: string; icon: ComponentType<{ size?: number }>; label: string; end?: boolean };

const ITEMS: Item[] = [
  { to: "/", icon: MessageSquare, label: "Chat", end: true },
  { to: "/trips", icon: Luggage, label: "Trips" },
  { to: "/plans", icon: ScrollText, label: "Plans" },
  { to: "/options", icon: Compass, label: "Options" },
  { to: "/demo/split-grow", icon: Sparkles, label: "Demo" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function NavRail({ acc = D_PAL.accent }: { acc?: string }) {
  return (
    <nav
      style={{
        width: 88,
        flexShrink: 0,
        background: D_PAL.paperWarm,
        borderRight: `1.5px dashed ${D_PAL.rule}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 8px",
        gap: 4,
      }}
    >
      <div style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: -0.4 }}>W.</div>
        <div style={{ fontFamily: D_SCRIPT, fontSize: 13, color: acc, marginTop: 2, transform: "rotate(-2deg)" }}>
          travel
        </div>
      </div>
      {ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={label}
          style={({ isActive }) => ({
            width: 64,
            padding: "10px 4px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: isActive ? D_PAL.paper : "transparent",
            border: `0.5px solid ${isActive ? D_PAL.rule : "transparent"}`,
            color: isActive ? D_PAL.ink : D_PAL.ink3,
            textDecoration: "none",
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} />
              <span
                style={{
                  fontFamily: D_MONO,
                  fontSize: 9,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: isActive ? D_PAL.ink : D_PAL.muted,
                }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
