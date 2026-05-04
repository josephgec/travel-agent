import { BedDouble, MapPin } from "lucide-react";

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
  query: {
    city_code: string;
    check_in: string;
    check_out: string;
    adults: number;
    radius_km: number;
  };
  offers: HotelOffer[];
  note?: string;
  warning?: string;
};

export function HotelOffersCard({ result }: { result: HotelOffersResult }) {
  const { query, offers, note, warning } = result;
  const nights = nightsBetween(query.check_in, query.check_out);

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-sm">
      <div className="px-4 py-2 border-b border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
        <BedDouble size={14} />
        <span>
          {query.city_code} · {query.check_in} → {query.check_out} ({nights}{" "}
          {nights === 1 ? "night" : "nights"}) · {query.adults} adult
          {query.adults === 1 ? "" : "s"}
        </span>
        <span className="ml-auto">
          {offers.length} offer{offers.length === 1 ? "" : "s"}
        </span>
      </div>
      {warning && (
        <div className="px-4 py-2 text-xs text-amber-400 bg-amber-950/30 border-b border-neutral-800">
          {warning}
        </div>
      )}
      <ul className="divide-y divide-neutral-800">
        {offers.map((o) => (
          <li key={o.offer_id ?? o.hotel_id} className="px-4 py-3 flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <div className="text-neutral-100 font-medium">{o.name ?? "Unnamed hotel"}</div>
              {(o.room_type || o.rate_code) && (
                <div className="text-xs text-neutral-300">
                  {o.room_type ? titleize(o.room_type) : o.rate_code}
                </div>
              )}
              <div className="text-xs text-neutral-500 flex items-center gap-3 flex-wrap">
                {o.description && <span>{o.description}</span>}
                {o.beds && (
                  <span>
                    {o.beds} bed{o.beds === 1 ? "" : "s"}
                  </span>
                )}
                {o.latitude !== null && o.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200"
                  >
                    <MapPin size={12} /> map
                  </a>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-neutral-100">
                {formatPrice(o.total_amount, o.currency)}
              </div>
              <div className="text-xs text-neutral-500">
                {nights > 0 && o.total_amount && o.currency
                  ? `${formatPrice(perNight(o.total_amount, nights), o.currency)} / night`
                  : "total"}
              </div>
            </div>
          </li>
        ))}
        {offers.length === 0 && (
          <li className="px-4 py-6 text-center text-neutral-500">
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
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
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
