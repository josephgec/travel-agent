import { ArrowRight, Plane } from "lucide-react";

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
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-sm">
      <div className="px-4 py-2 border-b border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
        <Plane size={14} />
        <span>
          {query.origin} → {query.destination} · {query.departure_date}
          {query.return_date ? ` ↔ ${query.return_date}` : ""} · {query.adults} adult
          {query.adults === 1 ? "" : "s"} · {query.cabin_class}
        </span>
        <span className="ml-auto">{offers.length} offers</span>
      </div>
      <ul className="divide-y divide-neutral-800">
        {offers.map((o) => (
          <li key={o.id} className="px-4 py-3 flex items-start gap-4">
            <div className="flex-1 space-y-2">
              {o.slices.map((s, i) => (
                <SliceRow key={`${o.id}-${i}`} slice={s} />
              ))}
              <div className="text-xs text-neutral-500">
                {o.owner ?? "—"} · offer expires{" "}
                {o.expires_at ? new Date(o.expires_at).toLocaleString() : "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-neutral-100">
                {formatPrice(o.total_amount, o.total_currency)}
              </div>
              <div className="text-xs text-neutral-500 font-mono mt-1">{o.id.slice(-10)}</div>
            </div>
          </li>
        ))}
        {offers.length === 0 && (
          <li className="px-4 py-6 text-center text-neutral-500">No offers returned.</li>
        )}
      </ul>
    </div>
  );
}

function SliceRow({ slice }: { slice: Slice }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-neutral-100 w-12">{slice.origin}</span>
      <ArrowRight size={14} className="text-neutral-500" />
      <span className="font-mono text-neutral-100 w-12">{slice.destination}</span>
      <span className="text-neutral-400 text-xs">
        {fmtTime(slice.departing_at)} → {fmtTime(slice.arriving_at)}
      </span>
      <span className="text-neutral-500 text-xs">{fmtDuration(slice.duration)}</span>
      <span className="text-neutral-500 text-xs">
        {slice.stops === 0 ? "nonstop" : `${slice.stops} stop${slice.stops === 1 ? "" : "s"}`}
      </span>
      <span className="text-neutral-500 text-xs ml-auto">{slice.carriers.join(", ")}</span>
    </div>
  );
}

function formatPrice(amount: string, currency: string): string {
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

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "PT12H35M" -> "12h 35m"
function fmtDuration(d: string | null): string {
  if (!d) return "";
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(d);
  if (!m) return d;
  const [, h, mm] = m;
  return `${h ? `${h}h` : ""}${h && mm ? " " : ""}${mm ? `${mm}m` : ""}`.trim();
}
