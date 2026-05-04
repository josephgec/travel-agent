import { BedDouble, MapPin } from "lucide-react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";

type HotelOffer = {
  hotel_id: string | null;
  name: string | null;
  city_code: string | null;
  latitude: number | null;
  longitude: number | null;
  offer_id: string | null;
  check_in: string | null;
  check_out: string | null;
  total_amount: string | null;
  currency: string | null;
  rate_code: string | null;
  room_type: string | null;
  beds: number | null;
  description: string | null;
};

export type HotelOffersResult = {
  display_hint: "hotel_offers";
  query: { city_code: string; check_in: string; check_out: string; adults: number; radius_km: number };
  offers: HotelOffer[];
  note?: string;
  warning?: string;
};

export function HotelOffersCard({ result }: { result: HotelOffersResult }) {
  const { query, offers, note, warning } = result;
  const nights = nightsBetween(query.check_in, query.check_out);

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
        <BedDouble size={14} style={{ color: D_PAL.accent }} />
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>stays —</span>
        <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, letterSpacing: 0.5 }}>
          {query.city_code} · {query.check_in} → {query.check_out} ({nights} {nights === 1 ? "night" : "nights"}) ·{" "}
          {query.adults} adult{query.adults === 1 ? "" : "s"}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {offers.length} OFFER{offers.length === 1 ? "" : "S"}
        </span>
      </div>
      {warning && (
        <div
          style={{
            padding: "8px 14px",
            background: "#f7e8c8",
            borderBottom: `0.5px solid #a86c1c`,
            fontFamily: D_SERIF,
            fontStyle: "italic",
            fontSize: 12,
            color: "#7a4f12",
          }}
        >
          {warning}
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {offers.map((o, idx) => (
          <li
            key={o.offer_id ?? o.hotel_id}
            style={{
              padding: "12px 16px",
              borderBottom: idx < offers.length - 1 ? `0.5px dashed ${D_PAL.rule}` : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 18,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>
                {o.name ?? "Unnamed hotel"}
              </div>
              {(o.room_type || o.rate_code) && (
                <div style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 13, color: D_PAL.ink2, marginTop: 2 }}>
                  {o.room_type ? titleize(o.room_type) : o.rate_code}
                </div>
              )}
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  fontFamily: D_MONO,
                  fontSize: 10,
                  color: D_PAL.muted,
                  letterSpacing: 0.5,
                }}
              >
                {o.description && <span>{o.description}</span>}
                {o.beds && <span>{o.beds} bed{o.beds === 1 ? "" : "s"}</span>}
                {o.latitude !== null && o.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: D_PAL.accent, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <MapPin size={11} /> map
                  </a>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>
                {formatPrice(o.total_amount, o.currency)}
              </div>
              <div style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, marginTop: 4, letterSpacing: 0.5 }}>
                {nights > 0 && o.total_amount && o.currency
                  ? `${formatPrice(perNight(o.total_amount, nights), o.currency)} / NIGHT`
                  : "TOTAL"}
              </div>
            </div>
          </li>
        ))}
        {offers.length === 0 && (
          <li style={{ padding: "20px 16px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>
            {note ?? "No offers returned."}
          </li>
        )}
      </ul>
    </div>
  );
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function perNight(total: string, nights: number): string {
  const n = Number(total);
  if (Number.isNaN(n) || nights <= 0) return total;
  return (n / nights).toFixed(0);
}

function formatPrice(amount: string | null, currency: string | null): string {
  if (!amount || !currency) return amount ?? "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${amount} ${currency}`;
  }
}

function titleize(s: string): string {
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
