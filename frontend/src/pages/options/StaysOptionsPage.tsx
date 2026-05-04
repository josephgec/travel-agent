/**
 * Stays detail page — single rich variant: stack of cards w/ photos.
 */
import { useMemo, useState } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../../design/postcard/tokens";
import {
  CompareRail,
  CompareToggle,
  DetailHeader,
  DetailTitleBar,
  FitScore,
  PostcardShell,
  RankBadge,
  StarRating,
  StripedPlaceholder,
  type StageId,
} from "../../design/postcard/components";
import { STAY_OPTIONS, type StayOption, type Trip } from "../../design/postcard/data";

export function StaysOptionsPage({
  trip,
  acc = D_PAL.accent,
  onStage,
  onBack,
}: {
  trip: Trip;
  acc?: string;
  onStage: (s: StageId) => void;
  onBack?: () => void;
}) {
  const data = STAY_OPTIONS[trip.id] ?? STAY_OPTIONS.europe;
  const [sort, setSort] = useState("rank");
  const [compare, setCompare] = useState<string[]>([]);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));

  const sorted = useMemo(() => {
    const arr = [...data.options];
    if (sort === "price") arr.sort((a, b) => a.price - b.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    else if (sort === "fit") arr.sort((a, b) => b.fit - a.fit);
    else arr.sort((a, b) => a.rank - b.rank);
    return arr;
  }, [data, sort]);

  const compareOpts = compare.map((id) => data.options.find((o) => o.id === id)).filter((o): o is StayOption => Boolean(o));

  return (
    <PostcardShell>
      <DetailHeader
        trip={trip}
        stage="stays"
        onStage={onStage}
        city={data.cityCode}
        onCity={() => {
          /* read-only for now */
        }}
        onBack={onBack}
        acc={acc}
      />
      <DetailTitleBar
        title={data.title}
        subtitle={data.subtitle}
        agentNote="I weighted walkability, neighborhood character, and solo-traveler fit over price and stars. Top pick balances quiet sleep with everything within 10 minutes on foot."
        sortValue={sort}
        onSort={setSort}
        sortOptions={[
          { value: "rank", label: "agent's ranking" },
          { value: "fit", label: "fit score" },
          { value: "price", label: "price (low → high)" },
          { value: "rating", label: "rating" },
        ]}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sorted.map((o) => (
            <StayCard
              key={o.id}
              o={o}
              checked={compare.includes(o.id)}
              onCompare={() => toggleCompare(o.id)}
              disabled={compare.length >= 3}
              acc={acc}
            />
          ))}
        </div>
        {compare.length >= 2 && (
          <CompareRail
            title="Stay diff"
            opts={compareOpts as unknown as Record<string, unknown>[]}
            fields={[
              { key: "price", label: "Per night", fmt: (v) => `$${v}` },
              { key: "total", label: "Total stay", fmt: (v) => `$${v}` },
              { key: "rating", label: "Rating" },
              { key: "neighborhood", label: "Neighborhood" },
              { key: "walk", label: "Walk" },
              { key: "beds", label: "Room" },
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

function StayCard({
  o,
  checked,
  onCompare,
  disabled,
  acc,
}: {
  o: StayOption;
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
        display: "grid",
        gridTemplateColumns: "320px 1fr 220px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, background: D_PAL.rule }}>
        <StripedPlaceholder
          caption={o.name.split(" ")[0]}
          palette={o.photos[0]}
          style={{ gridRow: "span 2", minHeight: 220 }}
        />
        <StripedPlaceholder caption="ROOM" palette={o.photos[1]} style={{ minHeight: 110 }} />
        <StripedPlaceholder caption="VIEW" palette={o.photos[2] ?? o.photos[0]} style={{ minHeight: 110 }} />
      </div>

      <div style={{ padding: "16px 22px", borderRight: `0.5px dashed ${D_PAL.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <RankBadge rank={o.rank} recommended={o.recommended} acc={acc} />
          <FitScore value={o.fit} size={42} acc={acc} />
          <div style={{ flex: 1 }} />
          <CompareToggle checked={checked} onChange={onCompare} disabled={disabled} acc={acc} />
        </div>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.1 }}>{o.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink3 }}>{o.type}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted }}>· {o.neighborhood.toUpperCase()}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted }}>· {o.walk}</span>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
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
        <div
          style={{
            fontFamily: D_SERIF,
            fontStyle: "italic",
            fontSize: 13.5,
            color: D_PAL.ink2,
            lineHeight: 1.55,
            marginTop: 12,
            paddingTop: 10,
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
        <StarRating value={o.rating} count={o.reviews} color={acc} />
        <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: D_DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.7, lineHeight: 1 }}>${o.price}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted }}>{o.priceUnit}</span>
        </div>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.ink3, marginTop: 2 }}>
          ${o.total.toLocaleString()} for the stay
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `0.5px dashed ${D_PAL.rule}` }}>
          <div style={{ fontFamily: D_MONO, fontSize: 8.5, color: D_PAL.muted, letterSpacing: 1, marginBottom: 6 }}>ROOM</div>
          <div style={{ fontFamily: D_SERIF, fontSize: 12.5, color: D_PAL.ink2 }}>{o.beds}</div>
          <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.muted, marginTop: 2 }}>{o.view}</div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `0.5px dashed ${D_PAL.rule}` }}>
          <div style={{ fontFamily: D_MONO, fontSize: 8.5, color: D_PAL.muted, letterSpacing: 1, marginBottom: 6 }}>AMENITIES</div>
          <div style={{ fontFamily: D_SERIF, fontSize: 12.5, color: D_PAL.ink2, lineHeight: 1.6 }}>
            {o.amenities.map((a, i) => (
              <span key={i}>
                {a}
                {i < o.amenities.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          style={{
            marginTop: 14,
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
          Book this stay →
        </button>
      </div>
    </div>
  );
}
