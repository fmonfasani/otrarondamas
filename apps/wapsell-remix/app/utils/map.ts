/**
 * Marketplace, step 4 (Owner, 2026-11-26) — Wapsell's map: the store's place (confirmed by its
 * Owner) and «cerca mío» distances. Since OR-B4-054 the map is our own (MapLibre over an
 * Argentina extract of Protomaps), with OpenStreetMap's tiles as the fallback.
 */

export type LatLng = { lat: number; lng: number };

/** Where the map opens when nothing better is known: the middle of Argentina. */
export const ARGENTINA_CENTER: LatLng = { lat: -34.6, lng: -63.6 };
export const ARGENTINA_ZOOM = 4;

/** OR-B4-054 — Wapsell's own map: the Argentina extract nginx serves next to the app. */
export const OWN_TILES_PATH = '/tiles/argentina.pmtiles';

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** About the zone shown when the Owner hides the exact point (the API rounds to ~1.1 km). */
export const ZONE_RADIUS_M = 700;

/** The store's place as the panel reads it (GET /negocio/ubicacion). */
export type StoreLocation = LatLng & { zona: boolean; direccion: string; confirmadaAt: string };
export type LocationPanel = {
  ubicacion: StoreLocation | null;
  sugerida: { direccion: string; ciudad: string; provincia: string };
  puedeEditar: boolean;
};
export type GeorefCandidate = LatLng & { etiqueta: string; exacta: boolean };

/** Kilometres between two points (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A zone (the Owner hid the exact point) as a soft circle: a closed ring of [lng, lat] points
 * `radiusM` metres around the centre.
 */
export function circleRing(center: LatLng, radiusM: number, steps = 64): Array<[number, number]> {
  const rad = (d: number) => (d * Math.PI) / 180;
  const deg = (r: number) => (r * 180) / Math.PI;
  const lat1 = rad(center.lat);
  const lng1 = rad(center.lng);
  const arc = radiusM / 6371000;
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (2 * Math.PI * (i % steps)) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(arc) + Math.cos(lat1) * Math.sin(arc) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(lat1), Math.cos(arc) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([deg(lng2), deg(lat2)]);
  }
  return ring;
}

/** «a 350 m», «a 1,2 km», «a 15 km». */
export function distanceLabel(km: number): string {
  if (km < 1) return `a ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `a ${km.toFixed(1).replace('.', ',')} km`;
  return `a ${Math.round(km)} km`;
}

/** The stores with a place, nearest first when the customer shared where they are. */
export function byDistance<T extends { ubicacion?: LatLng | null }>(items: T[], from: LatLng | null): Array<T & { km: number | null }> {
  const placed = items.filter((i) => i.ubicacion);
  const withKm = placed.map((i) => ({ ...i, km: from ? distanceKm(from, i.ubicacion as LatLng) : null }));
  return from ? withKm.sort((a, b) => (a.km ?? 0) - (b.km ?? 0)) : withKm;
}

/** A coordinate the panel can send: a finite number inside Argentina's box. */
export function parsePoint(lat: unknown, lng: unknown): LatLng | null {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -56 || a > -21.5 || b < -74 || b > -53.3) return null;
  return { lat: a, lng: b };
}
