/**
 * Activities detail page — grid of curated cards.
 */
import { useState } from "react";
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
import { ACTIVITY_OPTIONS, type ActivityOption, type Trip } from "../../design/postcard/data";

export function ActivitiesOptionsPage({
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
  const data = ACTIVITY_OPTIONS[trip.id] ?? ACTIVITY_OPTIONS.europe;
  const [compare, setCompare] = useState<string[]>([]);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  const compareOpts = compare
    .map((id) => data.options.find((o) => o.id === id))
    .filter((o): o is ActivityOption => Boolean(o));

  return (
    <PostcardShell>
      <DetailHeader
        trip={trip}
        stage="activities"
        onStage={onStage}
        city={data.cityCode}
        onCity={() => {
          /* read-only */
        }}
        onBack={onBack}
        acc={acc}
      />
      <DetailTitleBar
        title={data.title}
        subtitle={data.subtitle}
        agentNote="A mix of essential, idiosyncratic, and easy-on-the-body. The top two are 'don't skip'; the rest scale your trip up or down depending on appetite."
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {data.options.map((o) => (
            <ActivityCard
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
            title="Activity diff"
            opts={compareOpts as unknown as Record<string, unknown>[]}
            fields={[
              { key: "name", label: "Name" },
              { key: "duration", label: "Duration" },
              { key: "price", label: "Price", fmt: (v) => (v === 0 ? "Free" : `$${v}`) },
              { key: "rating", label: "Rating" },
              { key: "when", label: "When" },
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

function ActivityCard({
  o,
  checked,
  onCompare,
  disabled,
  acc,
}: {
  o: ActivityOption;
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
        display: "flex",
        flexDirection: "column",
      }}
    >
      <StripedPlaceholder caption={o.name.split(" ")[0].toUpperCase()} palette={o.photos[0]} style={{ height: 130 }} />
      <div style={{ padding: "14px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <RankBadge rank={o.rank} recommended={o.recommended} acc={acc} />
          <FitScore value={o.fit} size={36} acc={acc} />
          <div style={{ flex: 1 }} />
          <CompareToggle checked={checked} onChange={onCompare} disabled={disabled} acc={acc} />
        </div>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 18, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.15 }}>{o.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 3 }}>
          <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12.5, color: D_PAL.ink3 }}>{o.type}</span>
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted }}>· {o.duration}</span>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
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
            fontSize: 13,
            color: D_PAL.ink2,
            lineHeight: 1.55,
            marginTop: 10,
            paddingTop: 10,
            borderTop: `0.5px dashed ${D_PAL.rule}`,
          }}
        >
          <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 14, color: acc, marginRight: 4 }}>W. —</span>
          {o.why}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 10, borderTop: `0.5px dashed ${D_PAL.rule}` }}>
          <StarRating value={o.rating} count={o.reviews} color={acc} />
          <div>
            <span style={{ fontFamily: D_DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>
              {o.price === 0 ? "Free" : `$${o.price}`}
            </span>
            {o.price !== 0 && <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, marginLeft: 4 }}>{o.priceUnit}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
