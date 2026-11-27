import type { Prisma } from '@prisma/client';
import { publicLocation, type StoreLocation } from './ubicacion';

/**
 * OR-B4-054 (Owner, 2026-11-27) — delivery and pickup. The delivery fee is all the courier's
 * and is shown apart from the products: $ 2.500 base + $ 500 per km or fraction, in a straight
 * line from the store to the address. Wapsell sets both values for every store; a store may
 * raise them, never lower them. The store also says how far it delivers (a radius in km).
 */
export const WAPSELL_DELIVERY = { base: 2500, porKm: 500 } as const;
export const MAX_RADIUS_KM = 50;
export const MAX_FEE_PESOS = 1_000_000;

export type DeliverySettings = {
  /** The store delivers. */
  envio: boolean;
  /** The customer can pick the order up at the store. */
  retiro: boolean;
  radioKm: number;
  base: number;
  porKm: number;
};

/** Until the Owner says otherwise: pickup only, and Wapsell's fee for when delivery is turned on. */
export const DEFAULT_DELIVERY: DeliverySettings = {
  envio: false,
  retiro: true,
  radioKm: 5,
  base: WAPSELL_DELIVERY.base,
  porKm: WAPSELL_DELIVERY.porKm,
};

const whole = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** The store's settings (Empresa.configuracion.envios), never below Wapsell's fee. */
export function deliveryOf(configuracion: Prisma.JsonValue | null): DeliverySettings {
  const raw = ((configuracion ?? {}) as { envios?: Record<string, unknown> }).envios;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DELIVERY };
  const envio = raw.envio === true;
  // Something must be offered: a store with neither falls back to pickup.
  const retiro = raw.retiro === true || !envio;
  return {
    envio,
    retiro,
    radioKm: whole(raw.radioKm, DEFAULT_DELIVERY.radioKm, 1, MAX_RADIUS_KM),
    base: whole(raw.base, WAPSELL_DELIVERY.base, WAPSELL_DELIVERY.base, MAX_FEE_PESOS),
    porKm: whole(raw.porKm, WAPSELL_DELIVERY.porKm, WAPSELL_DELIVERY.porKm, MAX_FEE_PESOS),
  };
}

/** Kilometres between two points in a straight line (haversine). */
export function straightKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type DeliveryQuote =
  | { disponible: true; km: number; kmCobrados: number; base: number; porKm: number; costo: number }
  | { disponible: false; motivo: string; km?: number };

/**
 * What a delivery to `to` costs. Kilometres are read to one decimal and every km or fraction is
 * charged (2,1 km → 3 km). A store that shows only its zone is measured from that public,
 * rounded point, so the fee never reveals where the house is.
 */
export function deliveryQuote(
  store: StoreLocation | null,
  settings: DeliverySettings,
  to: { lat: number; lng: number },
): DeliveryQuote {
  if (!settings.envio) {
    return {
      disponible: false,
      motivo: 'Este negocio no hace envíos: podés retirar el pedido en el local.',
    };
  }
  const from = store?.zona ? publicLocation(store) : store;
  if (!from) {
    return {
      disponible: false,
      motivo: 'El negocio todavía no marcó dónde está, así que no puede calcular el envío.',
    };
  }
  const km = Math.round(straightKm(from, to) * 10) / 10;
  if (km > settings.radioKm) {
    return {
      disponible: false,
      km,
      motivo: `Tu dirección está a ${String(km).replace('.', ',')} km y el negocio envía hasta ${settings.radioKm} km.`,
    };
  }
  const kmCobrados = Math.max(1, Math.ceil(km));
  return {
    disponible: true,
    km,
    kmCobrados,
    base: settings.base,
    porKm: settings.porKm,
    costo: settings.base + kmCobrados * settings.porKm,
  };
}
