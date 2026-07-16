"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadLeaflet,
  distanceKm,
  type LatLng,
  type LMap,
} from "@/lib/planner/leaflet";

// The selected day's stops on a real map: numbered markers in order, a line
// between them, and the day's rough distance. Light tiles keep it a calm panel
// rather than a loud centrepiece. Only stops that carry coordinates are plotted.

export type MapStop = {
  name: string;
  lat: number;
  lon: number;
  number: number; // matches the itinerary number for the day
  color: string; // the stop's category colour, shared with its tag and slice
};

function markerHtml(n: number, color: string): string {
  return (
    `<div style="width:22px;height:22px;border-radius:11px;background:${color};` +
    `color:#fff;display:flex;align-items:center;justify-content:center;` +
    `font:600 11px/1 ui-monospace,monospace;box-shadow:0 1px 5px rgba(15,23,42,.4)">${n}</div>`
  );
}

export function DayMap({ stops }: { stops: MapStop[] }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);

  const points: LatLng[] = stops.map((s) => [s.lat, s.lon]);

  const total = points.reduce(
    (sum, p, i) => (i === 0 ? 0 : sum + distanceKm(points[i - 1], p)),
    0
  );

  useEffect(() => {
    if (!points.length || !elRef.current) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => setShown(true));

    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current) return;
        const map = L.map(elRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        mapRef.current = map;

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          { maxZoom: 19, attribution: "OpenStreetMap, CARTO" }
        ).addTo(map);

        if (points.length > 1) {
          L.polyline(points, {
            color: "#475569",
            weight: 2,
            opacity: 0.7,
            dashArray: "1 6",
          }).addTo(map);
        }

        points.forEach((p, i) => {
          L.marker(p, {
            icon: L.divIcon({
              className: "",
              html: markerHtml(stops[i].number, stops[i].color),
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
          }).addTo(map);
        });

        if (points.length === 1) map.setView(points[0], 13);
        else map.fitBounds(points, { padding: [34, 34] });

        setTimeout(() => mapRef.current?.invalidateSize(), 0);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // stops are fixed for a given mounted day; the parent remounts per day
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!points.length) {
    return (
      <p className="text-xs ink-3">No mapped stops for this day.</p>
    );
  }

  return (
    <div
      className="transition-[opacity,transform] duration-[var(--d3)] ease-[var(--ease)]"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(6px)",
      }}
    >
      <div
        ref={elRef}
        className="h-52 w-full overflow-hidden rounded-lg"
        style={{ background: "var(--surface-1)" }}
        role="img"
        aria-label={`Map of ${stops.length} stops`}
      />
      <div className="mt-2 flex items-baseline justify-between text-xs ink-3">
        <span>
          {failed ? "Map could not load." : `${stops.length} mapped stops`}
        </span>
        {total > 0 && !failed && (
          <span className="num">about {Math.round(total)} km across the day</span>
        )}
      </div>
    </div>
  );
}
