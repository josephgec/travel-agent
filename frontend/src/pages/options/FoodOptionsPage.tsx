/**
 * Food detail page — list with price tier, agent notes.
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
  type StageId,
} from "../../design/postcard/components";
import { FOOD_OPTIONS, type FoodOption, type Trip } from "../../design/postcard/data";

export function FoodOptionsPage({
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
  const data = FOOD_OPTIONS[trip.id] ?? FOOD_OPTIONS.europe;
  const [compare, setCompare] = useState<string[]>([]);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  const compareOpts = compare
    .map((id) => data.options.find((o) => o.id === id))
    .filter((o): o is FoodOption => Boolean(o));

  return (
    <PostcardShell>
      <DetailHeader
        trip={trip}
        stage="food"
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
        agentNote="Mix of one big-night reservation, a couple solo-friendly bars, and a $5 zapiekanka. Book Bottiglieria today if you want it."
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
        <div style={{ background: D_PAL.paper, border: `0.5px solid ${D_PAL.rule}`, boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}` }}>
          {data.options.map((o, i) => (
            <RestaurantRow
              key={o.id}
              o={o}
              last={i === data.options.length - 1}
              checked={compare.includes(o.id)}
              onCompare={() => toggleCompare(o.id)}
              disabled={compare.length >= 3}
              acc={acc}
            />
          ))}
        </div>
        {compare.length >= 2 && (
          <CompareRail
            title="Restaurant diff"
            opts={compareOpts as unknown as Record<string, unknown>[]}
            fields={[
              { key: "name", label: "Name" },
              { key: "cuisine", label: "Cuisine" },
              { key: "price", label: "Price" },
              { key: "dishPrice", label: "~Per dish", fmt: (v) => `$${v}` },
              { key: "rating", label: "Rating" },
              { key: "walk", label: "From hotel" },
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

function RestaurantRow({
  o,
  last,
  checked,
  onCompare,
  disabled,
  acc,
}: {
  o: FoodOption;
  last: boolean;
  checked: boolean;
  onCompare: () => void;
  disabled: boolean;
  acc: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 200px 120px",
        padding: "16px 22px",
        alignItems: "flex-start",
        gap: 16,
        borderBottom: last ? "none" : `0.5px dashed ${D_PAL.rule}`,
        background: o.recommended ? D_PAL.paperHi : "transparent",
      }}
    >
      <FitScore value={o.fit} acc={acc} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <RankBadge rank={o.rank} recommended={o.recommended} acc={acc} />
          <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.6 }}>· {o.cuisine.toUpperCase()}</span>
        </div>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{o.name}</div>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink3, marginTop: 2 }}>
          {o.type} · {o.neighborhood} · {o.walk}
        </div>
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink2, lineHeight: 1.55, marginTop: 8 }}>
          <span style={{ fontFamily: D_SCRIPT, fontStyle: "normal", fontSize: 14, color: acc, marginRight: 4 }}>W. —</span>
          {o.why}
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
                background: D_PAL.paper,
                letterSpacing: 0.5,
              }}
            >
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <div>
        <StarRating value={o.rating} count={o.reviews} color={acc} />
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.ink3, marginTop: 8 }}>{o.when}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: D_DISPLAY, fontSize: 24, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>{o.price}</div>
        <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, marginTop: 3 }}>~${o.dishPrice}/dish</div>
        <div style={{ marginTop: 10 }}>
          <CompareToggle checked={checked} onChange={onCompare} disabled={disabled} acc={acc} />
        </div>
      </div>
    </div>
  );
}
