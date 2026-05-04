/**
 * Outer Options page — wraps the stepper'd detail screens.
 * Reads ?trip and ?stage from the URL so links from the chat / plan can deep-link.
 */
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT } from "../../design/postcard/tokens";
import type { StageId } from "../../design/postcard/components";
import { TRIPS, type TripId } from "../../design/postcard/data";
import { ActivitiesOptionsPage } from "./ActivitiesOptionsPage";
import { FlightsOptionsPage, type FlightsVariant } from "./FlightsOptionsPage";
import { FoodOptionsPage } from "./FoodOptionsPage";
import { StaysOptionsPage } from "./StaysOptionsPage";

const TRIP_LABELS: { id: TripId; label: string }[] = [
  { id: "europe", label: "Central & Eastern Europe" },
  { id: "japan", label: "Japan · cherry blossoms" },
  { id: "patagonia", label: "Patagonia · end of summer" },
];

const ACCENTS = ["#b04428", "#3f6238", "#2f526e", "#6b3f5e", "#a86c1c"];

export function OptionsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const tripId = (params.get("trip") as TripId) || "europe";
  const stage = (params.get("stage") as StageId) || "flights";
  const variantParam = params.get("variant") as FlightsVariant | null;
  const accent = params.get("accent") || ACCENTS[0];

  const trip = TRIPS[tripId] ?? TRIPS.europe;
  const [variant, setVariant] = useState<FlightsVariant>(variantParam ?? "stack");

  const setStage = (s: StageId) => {
    const next = new URLSearchParams(params);
    next.set("stage", s);
    setParams(next, { replace: true });
  };

  const setTrip = (t: TripId) => {
    const next = new URLSearchParams(params);
    next.set("trip", t);
    setParams(next, { replace: true });
  };

  const setAccent = (a: string) => {
    const next = new URLSearchParams(params);
    next.set("accent", a);
    setParams(next, { replace: true });
  };

  const setVariantWithUrl = (v: FlightsVariant) => {
    setVariant(v);
    const next = new URLSearchParams(params);
    next.set("variant", v);
    setParams(next, { replace: true });
  };

  const onBack = () => navigate("/plans");

  const stagePage = useMemo(() => {
    switch (stage) {
      case "stays":
        return <StaysOptionsPage trip={trip} acc={accent} onStage={setStage} onBack={onBack} />;
      case "activities":
        return <ActivitiesOptionsPage trip={trip} acc={accent} onStage={setStage} onBack={onBack} />;
      case "food":
        return <FoodOptionsPage trip={trip} acc={accent} onStage={setStage} onBack={onBack} />;
      case "flights":
      default:
        return (
          <FlightsOptionsPage
            trip={trip}
            acc={accent}
            onStage={setStage}
            onBack={onBack}
            variant={variant}
            onVariant={setVariantWithUrl}
          />
        );
    }
    // setStage / onBack / setVariantWithUrl are stable enough between renders for this scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, trip, accent, variant]);

  return (
    <div className="flex-1 overflow-y-auto">
      <TripBar
        currentTrip={tripId}
        currentAccent={accent}
        onTrip={setTrip}
        onAccent={setAccent}
      />
      {stagePage}
    </div>
  );
}

function TripBar({
  currentTrip,
  currentAccent,
  onTrip,
  onAccent,
}: {
  currentTrip: TripId;
  currentAccent: string;
  onTrip: (t: TripId) => void;
  onAccent: (a: string) => void;
}) {
  return (
    <div
      style={{
        background: D_PAL.cream,
        borderBottom: `1px solid ${D_PAL.rule}`,
        padding: "10px 32px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: D_SCRIPT, fontSize: 16, color: currentAccent, transform: "rotate(-1deg)", display: "inline-block" }}>
        showcase —
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        {TRIP_LABELS.map((t) => {
          const active = t.id === currentTrip;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTrip(t.id)}
              style={{
                background: active ? D_PAL.ink : "transparent",
                color: active ? D_PAL.cream : D_PAL.ink2,
                border: `0.5px solid ${active ? D_PAL.ink : D_PAL.rule}`,
                padding: "5px 10px",
                cursor: "pointer",
                fontFamily: D_DISPLAY,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>POSTAL ACCENT</span>
      <div style={{ display: "flex", gap: 4 }}>
        {ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            aria-label={`Accent ${a}`}
            onClick={() => onAccent(a)}
            style={{
              width: 22,
              height: 22,
              background: a,
              border: a === currentAccent ? `2px solid ${D_PAL.ink}` : `1px solid ${D_PAL.rule}`,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
