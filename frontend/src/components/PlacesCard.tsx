import { ExternalLink, MapPin, Star } from "lucide-react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";

type Place = {
  place_id: string | null;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null;
  primary_type: string | null;
  types: string[];
  maps_url: string | null;
};

export type PlacesResult = {
  display_hint: "places";
  query: string;
  places: Place[];
};

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export function PlacesCard({ result }: { result: PlacesResult }) {
  const { query, places } = result;
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
        <MapPin size={14} style={{ color: D_PAL.accent }} />
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>places —</span>
        <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          "{query}"
        </span>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {places.length} RESULTS
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {places.map((p, idx) => (
          <li
            key={p.place_id ?? p.name}
            style={{
              padding: "10px 16px",
              borderBottom: idx < places.length - 1 ? `0.5px dashed ${D_PAL.rule}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600 }}>{p.name ?? "—"}</span>
              {p.rating !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: D_DISPLAY, fontSize: 12, color: D_PAL.accent }}>
                  <Star size={11} fill="currentColor" />
                  {p.rating.toFixed(1)}
                  {p.rating_count !== null && (
                    <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, marginLeft: 2 }}>
                      ({p.rating_count})
                    </span>
                  )}
                </span>
              )}
              {p.price_level && (
                <span style={{ fontFamily: D_MONO, fontSize: 10, color: D_PAL.ink2, letterSpacing: 0.5 }}>
                  {PRICE_LABELS[p.price_level] ?? p.price_level}
                </span>
              )}
              {p.primary_type && (
                <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5 }}>
                  {p.primary_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
            {p.address && (
              <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12.5, color: D_PAL.ink3, marginTop: 2 }}>
                {p.address}
              </div>
            )}
            {p.maps_url && (
              <a
                href={p.maps_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: D_MONO,
                  fontSize: 10,
                  color: D_PAL.accent,
                  textDecoration: "none",
                  marginTop: 4,
                  letterSpacing: 0.5,
                }}
              >
                GOOGLE MAPS <ExternalLink size={10} />
              </a>
            )}
          </li>
        ))}
        {places.length === 0 && (
          <li style={{ padding: "20px 16px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>
            No places found.
          </li>
        )}
      </ul>
    </div>
  );
}
