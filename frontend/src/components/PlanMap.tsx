import maplibregl, { type LngLatLike, type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

export type MapPin = {
  id: string;
  longitude: number;
  latitude: number;
  label?: string;
  day?: number; // 1-indexed; pins on the same day get the same color
};

// Free OSM raster tiles — no API key. Be respectful per the OSM tile usage policy
// (https://operations.osmfoundation.org/policies/tiles/) — fine for personal use.
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const DAY_COLORS = [
  "#6366f1", // indigo (default / day 1)
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function PlanMap({ pins, className }: { pins: MapPin[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Init the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when pins change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (pins.length === 0) return;

    pins.forEach((p) => {
      const color = DAY_COLORS[((p.day ?? 1) - 1) % DAY_COLORS.length];
      const marker = new maplibregl.Marker({ color })
        .setLngLat([p.longitude, p.latitude] as LngLatLike)
        .addTo(map);
      if (p.label) {
        marker.setPopup(new maplibregl.Popup({ offset: 24 }).setText(p.label));
      }
      markersRef.current.push(marker);
    });

    // Fit bounds to show all pins.
    if (pins.length === 1) {
      map.flyTo({ center: [pins[0].longitude, pins[0].latitude], zoom: 13, duration: 0 });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of pins) bounds.extend([p.longitude, p.latitude] as LngLatLike);
      map.fitBounds(bounds, { padding: 60, duration: 0, maxZoom: 14 });
    }
  }, [pins]);

  return <div ref={containerRef} className={className ?? "w-full h-96 rounded-md"} />;
}
