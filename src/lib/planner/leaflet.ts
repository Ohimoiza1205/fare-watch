// Leaflet loaded from a public CDN at runtime, so the map needs no build step
// and no package. The tracker never pulls this in; only the planner map does,
// and only in the browser. A minimal typed surface covers the pieces we use.

export type LatLng = [number, number];

export interface LLayer {
  addTo(map: LMap): LLayer;
  remove(): void;
}

export interface LMarker extends LLayer {
  on(type: string, fn: () => void): LMarker;
  getElement(): HTMLElement | undefined;
}

export interface LPopup {
  setLatLng(latlng: LatLng): LPopup;
  setContent(html: string): LPopup;
  openOn(map: LMap): LPopup;
}

export interface LMap {
  setView(center: LatLng, zoom: number): LMap;
  fitBounds(bounds: LatLng[], options?: Record<string, unknown>): LMap;
  on(type: string, fn: () => void): LMap;
  closePopup(): LMap;
  invalidateSize(): void;
  remove(): void;
}

export interface LDivIcon {
  _brand?: "divicon";
}

export interface LStatic {
  map(el: HTMLElement, options?: Record<string, unknown>): LMap;
  tileLayer(url: string, options?: Record<string, unknown>): LLayer;
  marker(latlng: LatLng, options?: { icon?: LDivIcon }): LMarker;
  polyline(points: LatLng[], options?: Record<string, unknown>): LLayer;
  divIcon(options: Record<string, unknown>): LDivIcon;
  popup(options?: Record<string, unknown>): LPopup;
}

declare global {
  interface Window {
    L?: LStatic;
  }
}

const VERSION = "1.9.4";
let pending: Promise<LStatic> | null = null;

export function loadLeaflet(): Promise<LStatic> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.L) return Promise.resolve(window.L);
  if (pending) return pending;

  pending = new Promise<LStatic>((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`;
    script.async = true;
    script.onload = () =>
      window.L ? resolve(window.L) : reject(new Error("leaflet missing"));
    script.onerror = () => reject(new Error("leaflet failed to load"));
    document.body.appendChild(script);
  });

  return pending;
}

// Great circle distance in kilometres, for the day's rough total.
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
