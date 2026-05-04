/**
 * Flights detail page — three comparison-view variations.
 * Ported from detail-flights.jsx.
 */
import { useEffect, useMemo, useState } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../../design/postcard/tokens";
import {
  CompareRail,
  CompareToggle,
  DSectionTitle,
  DetailHeader,
  DetailTitleBar,
  FitScore,
  PostcardShell,
  RankBadge,
  SpecRow,
  StarRating,
  type StageId,
} from "../../design/postcard/components";
import { FLIGHT_OPTIONS, type FlightOption, type Trip } from "../../design/postcard/data";

export type FlightsVariant = "stack" | "table" | "filmstrip";

export function FlightsOptionsPage({
  trip,
  acc = D_PAL.accent,
  onStage,
  onBack,
  variant = "stack",
  onVariant,
}: {
  trip: Trip;
  acc?: string;
  onStage: (s: StageId) => void;
  onBack?: () => void;
  variant?: FlightsVariant;
  onVariant?: (v: FlightsVariant) => void;
}) {
  const data = FLIGHT_OPTIONS[trip.id] ?? FLIGHT_OPTIONS.europe;
  const [sort, setSort] = useState("rank");
  const [compare, setCompare] = useState<string[]>([]);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));

  const sorted = useMemo(() => {
    const arr = [...data.options];
    if (sort === "price") arr.sort((a, b) => a.price - b.price);
    else if (sort === "duration") arr.sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
    else if (sort === "fit") arr.sort((a, b) => b.fit - a.fit);
    else arr.sort((a, b) => a.rank - b.rank);
    return arr;
  }, [data, sort]);

  const compareOpts = compare
    .map((id) => data.options.find((o) => o.id === id))
    .filter((o): o is FlightOption => Boolean(o));

  return (
    <PostcardShell>
      <DetailHeader trip={trip} stage="flights" onStage={onStage} onBack={onBack} acc={acc} />
      <DetailTitleBar
        title={data.title}
        subtitle={data.subtitle}
        agentNote={`I ranked ${data.options.length} routes by fit for a solo traveler — convenience over rock-bottom price. The top pick lands in time to walk the city in afternoon light.`}
        sortValue={sort}
        onSort={setSort}
        sortOptions={[
          { value: "rank", label: "agent's ranking" },
          { value: "fit", label: "fit score" },
          { value: "price", label: "price (low → high)" },
          { value: "duration", label: "shortest" },
        ]}
        rightSlot={
          onVariant && (
            <VariantSelector value={variant} onChange={onVariant} acc={acc} />
          )
        }
        compareCount={compare.length}
        onClearCompare={() => setCompare([])}
        acc={acc}
      />
      <div
        style={{
          flex: 1,
          padding: "20px 32px 24px",
          display: "grid",
          gridTemplateColumns: compare.length >= 2 ? "1fr 380px" : "1fr",
          gap: 22,
          alignItems: "flex-start",
        }}
      >
        <div>
          {variant === "stack" && <FlightStack options={sorted} compare={compare} toggleCompare={toggleCompare} acc={acc} />}
          {variant === "table" && <FlightTable options={sorted} compare={compare} toggleCompare={toggleCompare} acc={acc} />}
          {variant === "filmstrip" && (
            <FlightFilmstrip options={sorted} compare={compare} toggleCompare={toggleCompare} acc={acc} />
          )}
        </div>
        {compare.length >= 2 && (
          <CompareRail
            title="Flight diff"
            opts={compareOpts as unknown as Record<string, unknown>[]}
            fields={[
              { key: "price", label: "Price", fmt: (v) => `$${v}` },
              { key: "duration", label: "Duration" },
              { key: "stops", label: "Stops" },
              { key: "carrier", label: "Carrier" },
              { key: "departTime", label: "Departs", get: (o) => `${(o.depart as { time: string; date: string }).time} ${(o.depart as { time: string; date: string }).date}` },
              { key: "arriveTime", label: "Arrives", get: (o) => `${(o.arrive as { time: string; date: string; dayShift?: string }).time} ${(o.arrive as { time: string; date: string; dayShift?: string }).date}${(o.arrive as { dayShift?: string }).dayShift ?? ""}` },
              { key: "baggage", label: "Baggage" },
              { key: "aircraft", label: "Aircraft" },
              { key: "co2", label: "CO₂" },
              { key: "fit", label: "Fit score" },
            ]}
            acc={acc}
            onClose={() => setCompare([])}
          />
        )}
      </div>
    </PostcardShell>
  );
}

function VariantSelector({
  value,
  onChange,
  acc,
}: {
  value: FlightsVariant;
  onChange: (v: FlightsVariant) => void;
  acc: string;
}) {
  const opts: { id: FlightsVariant; label: string }[] = [
    { id: "stack", label: "Stack" },
    { id: "table", label: "Table" },
    { id: "filmstrip", label: "Filmstrip" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>VIEW</span>
      <div style={{ display: "flex", border: `0.5px solid ${D_PAL.rule}` }}>
        {opts.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              style={{
                background: active ? D_PAL.ink : "transparent",
                color: active ? D_PAL.cream : D_PAL.ink2,
                border: "none",
                padding: "5px 10px",
                fontFamily: D_DISPLAY,
                fontSize: 11.5,
                cursor: "pointer",
                borderRight: o.id !== "filmstrip" ? `0.5px solid ${D_PAL.rule}` : undefined,
              }}
            >
              {o.label}
              {active && (
                <span style={{ fontFamily: D_SCRIPT, fontSize: 11, color: acc, marginLeft: 4 }}>★</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Variation 1: STACK
function FlightStack({
  options,
  compare,
  toggleCompare,
  acc,
}: {
  options: FlightOption[];
  compare: string[];
  toggleCompare: (id: string) => void;
  acc: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {options.map((o) => (
        <FlightCard
          key={o.id}
          o={o}
          checked={compare.includes(o.id)}
          onCompare={() => toggleCompare(o.id)}
          disabled={compare.length >= 3}
          acc={acc}
        />
      ))}
    </div>
  );
}

function FlightCard({
  o,
  checked,
  onCompare,
  disabled,
  acc,
}: {
  o: FlightOption;
  checked: boolean;
  onCompare: () => void;
  disabled: boolean;
  acc: string;
}) {
  return (
    <div
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${o.recommended ? acc : D_PAL.rule}`,
        boxShadow: o.recommended
          ? `4px 4px 0 ${D_PAL.paperWarm}, 4px 4px 0 0.5px ${acc}33`
          : `3px 3px 0 ${D_PAL.ruleSoft}`,
        position: "relative",
        display: "grid",
        gridTemplateColumns: "74px 1fr 240px",
      }}
    >
      <div
        style={{
          background: D_PAL.paperWarm,
          borderRight: `0.5px dashed ${D_PAL.rule}`,
          padding: "18px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <FitScore value={o.fit} acc={acc} />
        <CompareToggle checked={checked} onChange={onCompare} disabled={disabled} acc={acc} />
      </div>

      <div style={{ padding: "16px 22px", borderRight: `0.5px dashed ${D_PAL.rule}` }}>
        <div style={{ marginBottom: 10 }}>
          <RankBadge rank={o.rank} recommended={o.recommended} acc={acc} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {o.tags.map((t, i) => (
            <span
              key={i}
              style={{
                fontFamily: D_MONO,
                fontSize: 9,
                color: D_PAL.ink2,
                padding: "2px 6px",
                border: `0.5px solid ${D_PAL.rule}`,
                background: D_PAL.paperHi,
                letterSpacing: 0.5,
              }}
            >
              {t.toUpperCase()}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600 }}>{o.carrier}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 0.5 }}>{o.code}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>· {o.aircraft}</span>
        </div>

        <FlightRoute o={o} acc={acc} />

        <div
          style={{
            fontFamily: D_SERIF,
            fontStyle: "italic",
            fontSize: 13.5,
            color: D_PAL.ink2,
            lineHeight: 1.55,
            marginTop: 14,
            paddingTop: 12,
            borderTop: `0.5px dashed ${D_PAL.rule}`,
          }}
        >
          <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 15, color: acc, marginRight: 4 }}>W. —</span>
          {o.why}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <div>
            <div style={{ fontFamily: D_MONO, fontSize: 8.5, color: D_PAL.muted, letterSpacing: 1, marginBottom: 4 }}>WHY YES</div>
            {o.pros.map((p, i) => (
              <div key={i} style={{ fontFamily: D_SERIF, fontSize: 12.5, color: D_PAL.ink2, lineHeight: 1.5 }}>
                + {p}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: D_MONO, fontSize: 8.5, color: D_PAL.muted, letterSpacing: 1, marginBottom: 4 }}>WHY NOT</div>
            {o.cons.map((p, i) => (
              <div key={i} style={{ fontFamily: D_SERIF, fontSize: 12.5, color: D_PAL.ink2, lineHeight: 1.5 }}>
                − {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 32, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1 }}>${o.price}</div>
        <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5, marginTop: 2 }}>
          {o.cabin.toUpperCase()} · ROUNDTRIP
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `0.5px dashed ${D_PAL.rule}`, fontSize: 11.5, lineHeight: 1.7, fontFamily: D_SERIF, color: D_PAL.ink2 }}>
          <SpecRow l="Baggage" v={o.baggage} />
          <SpecRow l="Meals" v={o.meals} />
          <SpecRow l="Legroom" v={o.legroom} />
          <SpecRow l="Wi-Fi" v={typeof o.wifi === "string" ? o.wifi : o.wifi ? "Yes" : "No"} />
          <SpecRow l="Power" v={o.power} />
          <SpecRow l="CO₂" v={o.co2} sub={o.co2Note} />
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `0.5px dashed ${D_PAL.rule}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <StarRating value={o.review.score} count={o.review.count} color={acc} />
        </div>
        <button
          type="button"
          style={{
            marginTop: 10,
            background: o.recommended ? acc : D_PAL.ink,
            color: D_PAL.cream,
            border: "none",
            padding: "9px 14px",
            fontFamily: D_DISPLAY,
            fontSize: 12,
            letterSpacing: 1.5,
            cursor: "pointer",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Choose this flight →
        </button>
      </div>
    </div>
  );
}

function FlightRoute({ o, acc }: { o: FlightOption; acc: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginTop: 4, padding: "8px 0" }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1 }}>{o.depart.time}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, fontWeight: 600 }}>{o.depart.airport}</span>
        </div>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.muted, marginTop: 2 }}>
          {o.depart.city} · {o.depart.date}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
        <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>{o.duration.toUpperCase()}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: acc }} />
          <span style={{ width: 80, height: 1, borderTop: `1px dashed ${D_PAL.muted}` }} />
          <span style={{ fontSize: 11, color: D_PAL.muted }}>✈</span>
          <span style={{ width: 80, height: 1, borderTop: `1px dashed ${D_PAL.muted}` }} />
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: acc }} />
        </div>
        <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 11, color: D_PAL.ink3, marginTop: 3 }}>
          {o.stops}
          {o.via !== "—" ? ` · via ${o.via}` : ""}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
          <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, fontWeight: 600 }}>{o.arrive.airport}</span>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1 }}>
            {o.arrive.time}
            {o.arrive.dayShift && (
              <sup style={{ fontSize: 11, color: acc, fontWeight: 500 }}>{o.arrive.dayShift}</sup>
            )}
          </span>
        </div>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.muted, marginTop: 2 }}>
          {o.arrive.city} · {o.arrive.date}
        </div>
      </div>
    </div>
  );
}

// ── Variation 2: TABLE
function FlightTable({
  options,
  compare,
  toggleCompare,
  acc,
}: {
  options: FlightOption[];
  compare: string[];
  toggleCompare: (id: string) => void;
  acc: string;
}) {
  return (
    <div
      style={{
        background: D_PAL.paper,
        border: `0.5px solid ${D_PAL.rule}`,
        boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "36px 70px 1fr 130px 120px 70px 90px 90px",
          padding: "10px 16px",
          borderBottom: `1px solid ${D_PAL.rule}`,
          background: D_PAL.paperWarm,
          fontFamily: D_MONO,
          fontSize: 9,
          letterSpacing: 1,
          color: D_PAL.muted,
        }}
      >
        <span>CMP</span>
        <span>FIT</span>
        <span>CARRIER & ROUTE</span>
        <span>DEPART</span>
        <span>ARRIVE</span>
        <span>STOPS</span>
        <span>BAGS</span>
        <span style={{ textAlign: "right" }}>PRICE</span>
      </div>
      {options.map((o, i) => (
        <div
          key={o.id}
          style={{
            display: "grid",
            gridTemplateColumns: "36px 70px 1fr 130px 120px 70px 90px 90px",
            padding: "14px 16px",
            alignItems: "center",
            borderBottom: i < options.length - 1 ? `0.5px dashed ${D_PAL.rule}` : "none",
            background: o.recommended ? D_PAL.paperHi : "transparent",
          }}
        >
          <CompareToggle checked={compare.includes(o.id)} onChange={() => toggleCompare(o.id)} disabled={compare.length >= 3} acc={acc} />
          <FitScore value={o.fit} size={42} acc={acc} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RankBadge rank={o.rank} recommended={o.recommended} acc={acc} />
              <span style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600 }}>{o.carrier}</span>
              <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted }}>{o.code}</span>
            </div>
            <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.ink3, marginTop: 4, lineHeight: 1.45 }}>
              <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 13, color: acc }}>W. —</span> {o.why}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: D_DISPLAY, fontSize: 17, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1 }}>{o.depart.time}</div>
            <div style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, marginTop: 3 }}>
              {o.depart.airport} · {o.depart.date}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: D_DISPLAY, fontSize: 17, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1 }}>
              {o.arrive.time}
              {o.arrive.dayShift && <sup style={{ fontSize: 9, color: acc }}>{o.arrive.dayShift}</sup>}
            </div>
            <div style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, marginTop: 3 }}>
              {o.arrive.airport} · {o.duration}
            </div>
          </div>
          <div style={{ fontFamily: D_SERIF, fontSize: 12.5, fontStyle: "italic", color: D_PAL.ink2 }}>{o.stops}</div>
          <div style={{ fontFamily: D_MONO, fontSize: 10.5, color: D_PAL.ink2 }}>{o.baggage}</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>${o.price}</div>
            <div style={{ marginTop: 5 }}>
              <StarRating value={o.review.score} count={o.review.count} color={acc} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Variation 3: FILMSTRIP
function FlightFilmstrip({
  options,
  compare,
  toggleCompare,
  acc,
}: {
  options: FlightOption[];
  compare: string[];
  toggleCompare: (id: string) => void;
  acc: string;
}) {
  const [featuredId, setFeaturedId] = useState(options[0]?.id);
  useEffect(() => {
    setFeaturedId(options[0]?.id);
  }, [options]);
  const featured = options.find((o) => o.id === featuredId) ?? options[0];
  const rest = options.filter((o) => o.id !== featured.id);
  return (
    <div>
      <div
        style={{
          background: D_PAL.paper,
          border: `0.5px solid ${acc}`,
          boxShadow: `5px 5px 0 ${D_PAL.paperWarm}`,
          padding: "22px 26px",
          display: "grid",
          gridTemplateColumns: "1fr 200px",
          gap: 24,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <FitScore value={featured.fit} acc={acc} size={62} />
            <div>
              <RankBadge rank={featured.rank} recommended={featured.recommended} acc={acc} />
              <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: -0.4 }}>
                {featured.carrier} · {featured.code}
              </div>
              <div style={{ fontFamily: D_MONO, fontSize: 10.5, color: D_PAL.muted, marginTop: 3 }}>{featured.aircraft}</div>
            </div>
            <div style={{ flex: 1 }} />
            <CompareToggle
              checked={compare.includes(featured.id)}
              onChange={() => toggleCompare(featured.id)}
              disabled={compare.length >= 3}
              acc={acc}
            />
          </div>
          <FlightRoute o={featured} acc={acc} />
          <div
            style={{
              fontFamily: D_SERIF,
              fontStyle: "italic",
              fontSize: 14,
              color: D_PAL.ink2,
              lineHeight: 1.55,
              marginTop: 14,
              paddingTop: 14,
              borderTop: `0.5px dashed ${D_PAL.rule}`,
            }}
          >
            <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 16, color: acc }}>W. —</span> {featured.why}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, fontFamily: D_MONO, fontSize: 10, color: D_PAL.muted, letterSpacing: 0.5 }}>
            {featured.tags.map((t, i) => (
              <span key={i}>· {t.toUpperCase()}</span>
            ))}
          </div>
        </div>
        <div style={{ borderLeft: `0.5px dashed ${D_PAL.rule}`, paddingLeft: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: D_DISPLAY, fontSize: 36, fontWeight: 600, letterSpacing: -0.9, lineHeight: 1 }}>${featured.price}</div>
          <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, marginTop: 3, letterSpacing: 0.5 }}>
            ROUNDTRIP · {featured.cabin.toUpperCase()}
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.7, fontFamily: D_SERIF, color: D_PAL.ink2 }}>
            <SpecRow l="Baggage" v={featured.baggage} />
            <SpecRow l="Meals" v={featured.meals} />
            <SpecRow l="Legroom" v={featured.legroom} />
            <SpecRow l="CO₂" v={featured.co2} sub={featured.co2Note} />
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            style={{
              marginTop: 14,
              background: acc,
              color: D_PAL.cream,
              border: "none",
              padding: "10px 14px",
              fontFamily: D_DISPLAY,
              fontSize: 12,
              letterSpacing: 1.5,
              cursor: "pointer",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Choose this →
          </button>
        </div>
      </div>

      <DSectionTitle title="Other options" script={`${rest.length} more`} acc={acc} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${rest.length}, 1fr)`, gap: 12 }}>
        {rest.map((o) => (
          <div
            key={o.id}
            onClick={() => setFeaturedId(o.id)}
            role="button"
            tabIndex={0}
            style={{
              background: D_PAL.paper,
              border: `0.5px solid ${D_PAL.rule}`,
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FitScore value={o.fit} size={36} acc={acc} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: D_DISPLAY, fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{o.carrier}</div>
                <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, marginTop: 2 }}>
                  {o.code} · {o.duration}
                </div>
              </div>
              <div style={{ fontFamily: D_DISPLAY, fontSize: 17, fontWeight: 600, letterSpacing: -0.4 }}>${o.price}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.ink3, marginTop: 4 }}>
              <span>
                {o.depart.time} {o.depart.airport}
              </span>
              <span style={{ flex: 1, height: 1, borderTop: `1px dashed ${D_PAL.muted}` }} />
              <span>
                {o.arrive.airport} {o.arrive.time}
              </span>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
                paddingTop: 6,
                borderTop: `0.5px dashed ${D_PAL.ruleSoft}`,
              }}
            >
              <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 11, color: D_PAL.muted }}>{o.stops}</span>
              <CompareToggle checked={compare.includes(o.id)} onChange={() => toggleCompare(o.id)} disabled={compare.length >= 3} acc={acc} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
