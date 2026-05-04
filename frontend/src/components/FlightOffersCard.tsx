import { ArrowRight, Plane } from "lucide-react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";

type Slice = {
  origin: string | null;
  destination: string | null;
  departing_at: string | null;
  arriving_at: string | null;
  duration: string | null;
  stops: number;
  carriers: string[];
};

type Offer = {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: string | null;
  expires_at: string | null;
  slices: Slice[];
};

export type FlightOffersResult = {
  display_hint: "flight_offers";
  query: {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string | null;
    adults: number;
    cabin_class: string;
  };
  offers: Offer[];
};

export function FlightOffersCard({ result }: { result: FlightOffersResult }) {
  const { query, offers } = result;
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
          padding: "10px 14px",
          borderBottom: `0.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: D_PAL.paperWarm,
        }}
      >
        <Plane size={14} style={{ color: D_PAL.accent }} />
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>flights —</span>
        <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, letterSpacing: 0.5 }}>
          {query.origin} → {query.destination} · {query.departure_date}
          {query.return_date ? ` ↔ ${query.return_date}` : ""} · {query.adults} adult{query.adults === 1 ? "" : "s"} · {query.cabin_class}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {offers.length} OFFERS
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {offers.map((o, idx) => (
          <li
            key={o.id}
            style={{
              padding: "12px 16px",
              borderBottom: idx < offers.length - 1 ? `0.5px dashed ${D_PAL.rule}` : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {o.slices.map((s, i) => (
                <SliceRow key={`${o.id}-${i}`} slice={s} />
              ))}
              <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5 }}>
                {o.owner ?? "—"} · expires {o.expires_at ? new Date(o.expires_at).toLocaleString() : "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>
                {formatPrice(o.total_amount, o.total_currency)}
              </div>
              <div style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, marginTop: 4, letterSpacing: 0.5 }}>
                {o.id.slice(-10)}
              </div>
            </div>
          </li>
        ))}
        {offers.length === 0 && (
          <li style={{ padding: "20px 16px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>
            No offers returned.
          </li>
        )}
      </ul>
    </div>
  );
}

function SliceRow({ slice }: { slice: Slice }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: D_SERIF, fontSize: 13 }}>
      <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink, fontWeight: 600, width: 36 }}>{slice.origin}</span>
      <ArrowRight size={12} style={{ color: D_PAL.muted }} />
      <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink, fontWeight: 600, width: 36 }}>{slice.destination}</span>
      <span style={{ color: D_PAL.ink3 }}>
        {fmtTime(slice.departing_at)} → {fmtTime(slice.arriving_at)}
      </span>
      <span style={{ color: D_PAL.muted, fontStyle: "italic", fontSize: 12 }}>{fmtDuration(slice.duration)}</span>
      <span style={{ color: D_PAL.muted, fontSize: 12 }}>
        {slice.stops === 0 ? "nonstop" : `${slice.stops} stop${slice.stops === 1 ? "" : "s"}`}
      </span>
      <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 10, color: D_PAL.ink2 }}>
        {slice.carriers.join(", ")}
      </span>
    </div>
  );
}

function formatPrice(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${amount} ${currency}`;
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(d: string | null): string {
  if (!d) return "";
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(d);
  if (!m) return d;
  const [, h, mm] = m;
  return `${h ? `${h}h` : ""}${h && mm ? " " : ""}${mm ? `${mm}m` : ""}`.trim();
}
