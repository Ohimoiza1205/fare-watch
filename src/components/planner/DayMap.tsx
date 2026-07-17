"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadLeaflet,
  distanceKm,
  type LatLng,
  type LMap,
  type LMarker,
  type LPopup,
  type LStatic,
} from "@/lib/planner/leaflet";
import { categoryTagStyle } from "@/lib/planner/categoryColor";

// The selected day's stops on a real map: numbered markers in order, a line
// between them, and the day's rough distance. Light tiles keep it a calm panel
// rather than a loud centrepiece. Only stops that carry coordinates are plotted.
//
// One stop can be selected, from a pin or from its itinerary row. The selected
// pin grows slightly and a small card opens above it, reusing Leaflet's popup
// shell so the caret and the edge panning come free. Clicking elsewhere on the
// map clears the selection; selecting another pin moves it.

export type MapStop = {
  id: number; // the itinerary item this pin stands for
  name: string;
  lat: number;
  lon: number;
  number: number; // matches the itinerary number for the day
  color: string; // the stop's category colour, shared with its tag and slice
  category: string;
  categoryLabel: string;
  time: string; // the row's schedule slot
  priceText: string | null; // preformatted party figure
  priceContext: string | null; // per person, or for the whole party
  isEstimated: boolean;
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

function markerHtml(n: number, color: string): string {
  return `<div class="planner-pin" style="background:${color}">${n}</div>`;
}

// The card is plain HTML because it lives inside Leaflet's popup, outside the
// React tree. Category colour comes from the shared tag style; estimates keep
// the tilde and the dimmer ink, the same honesty the rows carry.
function popupHtml(s: MapStop): string {
  const tag = categoryTagStyle(s.category);
  const price =
    s.priceText == null
      ? ""
      : `<div class="num" style="margin-top:6px;font-size:0.8125rem;color:${
          s.isEstimated ? "var(--ink-2)" : "var(--ink-0)"
        }">` +
        (s.isEstimated ? `<span style="color:var(--ink-3)">~</span> ` : "") +
        esc(s.priceText) +
        (s.priceContext
          ? ` <span style="font-size:0.6875rem;color:var(--ink-3)">${esc(s.priceContext)}</span>`
          : "") +
        `</div>`;
  return (
    `<div>` +
    `<div style="display:flex;align-items:baseline;gap:6px">` +
    `<span class="num" style="font-size:0.6875rem;color:var(--ink-3)">${s.number}</span>` +
    `<span style="font-size:0.8125rem;font-weight:500;color:var(--ink-0)">${esc(s.name)}</span>` +
    `</div>` +
    `<span style="display:inline-block;margin-top:6px;padding:1px 6px;border-radius:999px;` +
    `font-size:0.625rem;font-weight:500;background:${tag.background};color:${tag.color}">` +
    esc(s.categoryLabel) +
    `</span>` +
    price +
    `<div class="num" style="margin-top:4px;font-size:0.6875rem;color:var(--ink-3)">${esc(s.time)}</div>` +
    `<button type="button" data-show-plan style="margin-top:8px;display:block;padding:0;border:0;` +
    `background:none;cursor:pointer;font-size:0.75rem;color:var(--ink-2);text-decoration:underline;` +
    `text-decoration-color:var(--hairline-strong);text-underline-offset:2px">Show in plan</button>` +
    `</div>`
  );
}

export function DayMap({
  stops,
  selectedId = null,
  onSelect,
  onShowInPlan,
}: {
  stops: MapStop[];
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  onShowInPlan?: (id: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const leafletRef = useRef<LStatic | null>(null);
  const markersRef = useRef<Map<number, LMarker>>(new Map());
  const popupRef = useRef<LPopup | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);

  // The map wires its events once, so the latest props live in refs, synced
  // after every render and before the selection effect below runs.
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onShowRef = useRef(onShowInPlan);
  const stopsRef = useRef(stops);
  useEffect(() => {
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
    onShowRef.current = onShowInPlan;
    stopsRef.current = stops;
  });

  const points: LatLng[] = stops.map((s) => [s.lat, s.lon]);

  const total = points.reduce(
    (sum, p, i) => (i === 0 ? 0 : sum + distanceKm(points[i - 1], p)),
    0
  );

  function applySelection(id: number | null) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    markersRef.current.forEach((m, mid) => {
      m.getElement()?.firstElementChild?.classList.toggle("is-selected", mid === id);
    });
    const stop = id == null ? undefined : stopsRef.current.find((s) => s.id === id);
    if (!stop) {
      map.closePopup();
      return;
    }
    if (!popupRef.current) {
      popupRef.current = L.popup({
        closeButton: false,
        offset: [0, -14],
        maxWidth: 240,
        autoPanPadding: [16, 16],
        className: "planner-popup",
      });
    }
    popupRef.current
      .setLatLng([stop.lat, stop.lon])
      .setContent(popupHtml(stop))
      .openOn(map);
  }

  useEffect(() => {
    if (!points.length || !elRef.current) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => setShown(true));
    const container = elRef.current;
    const markers = markersRef.current;

    // The card's one action is plain HTML inside the popup, so it is caught by
    // delegation on the map container rather than a React handler.
    function onContainerClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("[data-show-plan]") && selectedRef.current != null) {
        onShowRef.current?.(selectedRef.current);
      }
    }
    container.addEventListener("click", onContainerClick);

    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current) return;
        leafletRef.current = L;
        const map = L.map(elRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        mapRef.current = map;

        // Clicking open map clears the selection; Leaflet closes the popup on
        // the same click, so state and screen stay in step.
        map.on("click", () => onSelectRef.current?.(null));

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          { maxZoom: 19, attribution: "OpenStreetMap, CARTO" }
        ).addTo(map);

        if (points.length > 1) {
          L.polyline(points, {
            color: "var(--map-route)",
            weight: 2,
            opacity: 0.7,
            dashArray: "1 6",
          }).addTo(map);
        }

        stopsRef.current.forEach((s) => {
          const m = L.marker([s.lat, s.lon], {
            icon: L.divIcon({
              className: "",
              html: markerHtml(s.number, s.color),
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
          });
          m.on("click", () => onSelectRef.current?.(s.id));
          m.addTo(map);
          markers.set(s.id, m);
        });

        if (points.length === 1) map.setView(points[0], 13);
        else map.fitBounds(points, { padding: [34, 34] });

        setTimeout(() => {
          mapRef.current?.invalidateSize();
          // a selection made before the tiles arrived still opens its card
          applySelection(selectedRef.current);
        }, 0);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      container.removeEventListener("click", onContainerClick);
      markers.clear();
      popupRef.current = null;
      leafletRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // stops are fixed for a given mounted day; the parent remounts on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applySelection(selectedId);
  }, [selectedId]);

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
