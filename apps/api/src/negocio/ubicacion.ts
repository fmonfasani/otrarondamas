import type { Prisma } from '@prisma/client';

/**
 * Marketplace, step 4 (Owner, 2026-11-26) — where the store is on Wapsell's map, kept in
 * Empresa.configuracion.ubicacion. The address is turned into a point with Georef (Argentina's
 * official address service) and the Owner confirms the pin (or drags it to the door). A store
 * that sells from home can show only its zone: the public point is then rounded to about a
 * kilometre, so the exact address never leaves the panel.
 */
export type StoreLocation = {
  lat: number;
  lng: number;
  /** true = show only the zone (about 1 km around), never the exact point. */
  zona: boolean;
  /** The address the pin was found from, as the Owner wrote it. */
  direccion: string;
  confirmadaAt: string;
};

/** What customers see: the point (rounded for a zone) and whether it is only the zone. */
export type PublicLocation = { lat: number; lng: number; zona: boolean };

/**
 * The box around continental Argentina, Tierra del Fuego and Malvinas, with a little margin. It
 * keeps out points far away (another country's capital, a swapped sign) — a box cannot follow the
 * border, so a point just across it (Montevideo) still passes; the Owner confirms the pin anyway.
 */
export const ARGENTINA = { south: -56, north: -21.5, west: -74, east: -53.3 };

export function insideArgentina(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= ARGENTINA.south &&
    lat <= ARGENTINA.north &&
    lng >= ARGENTINA.west &&
    lng <= ARGENTINA.east
  );
}

/** The confirmed location, or null when there is none (or what is kept is not valid). */
export function locationOf(configuracion: Prisma.JsonValue | null): StoreLocation | null {
  const raw = ((configuracion ?? {}) as { ubicacion?: Record<string, unknown> }).ubicacion;
  if (!raw || typeof raw !== 'object') return null;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!insideArgentina(lat, lng) || typeof raw.confirmadaAt !== 'string') return null;
  return {
    lat,
    lng,
    zona: raw.zona === true,
    direccion: typeof raw.direccion === 'string' ? raw.direccion : '',
    confirmadaAt: raw.confirmadaAt,
  };
}

/** Two decimals of a degree: about 1.1 km. Enough to say «por acá», never the door. */
const ZONE_DECIMALS = 2;
const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

/** The point customers see: exact to the door (5 decimals, ~1 m) or only the zone. */
export function publicLocation(location: StoreLocation | null): PublicLocation | null {
  if (!location) return null;
  const decimals = location.zona ? ZONE_DECIMALS : 5;
  return {
    lat: round(location.lat, decimals),
    lng: round(location.lng, decimals),
    zona: location.zona,
  };
}

/** Kilometres between two points over the Earth (haversine), for «cerca mío». */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
