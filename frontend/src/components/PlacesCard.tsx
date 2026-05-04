import { ExternalLink, MapPin, Star } from "lucide-react";

type Place = {
  place_id: string | null;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null; // PRICE_LEVEL_INEXPENSIVE | _MODERATE | _EXPENSIVE | _VERY_EXPENSIVE
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
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-sm">
      <div className="px-4 py-2 border-b border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
        <MapPin size={14} />
        <span className="truncate">"{query}"</span>
        <span className="ml-auto">{places.length} results</span>
      </div>
      <ul className="divide-y divide-neutral-800">
        {places.map((p) => (
          <li key={p.place_id ?? p.name} className="px-4 py-3 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-neutral-100 font-medium">{p.name ?? "—"}</span>
              {p.rating !== null && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <Star size={11} fill="currentColor" />
                  {p.rating.toFixed(1)}
                  {p.rating_count !== null && (
                    <span className="text-neutral-500">({p.rating_count})</span>
                  )}
                </span>
              )}
              {p.price_level && (
                <span className="text-xs text-neutral-400">
                  {PRICE_LABELS[p.price_level] ?? p.price_level}
                </span>
              )}
              {p.primary_type && (
                <span className="text-xs text-neutral-500">{p.primary_type.replace(/_/g, " ")}</span>
              )}
            </div>
            {p.address && <div className="text-xs text-neutral-400">{p.address}</div>}
            {p.maps_url && (
              <a
                href={p.maps_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-neutral-400 hover:text-neutral-200 inline-flex items-center gap-1"
              >
                Google Maps <ExternalLink size={11} />
              </a>
            )}
          </li>
        ))}
        {places.length === 0 && (
          <li className="px-4 py-6 text-center text-neutral-500">No places found.</li>
        )}
      </ul>
    </div>
  );
}
