import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { insideArgentina } from './ubicacion';

/** A place Georef found: exact (the address) or only the city (its centre). */
export type GeorefCandidate = { lat: number; lng: number; etiqueta: string; exacta: boolean };

const DEFAULT_URL = 'https://apis.datos.gob.ar/georef/api';
const TIMEOUT_MS = 6000;
const MAX = 5;

type Point = { lat?: unknown; lon?: unknown } | null | undefined;
const pointOf = (p: Point) => {
  const lat = Number(p?.lat);
  const lng = Number(p?.lon);
  return insideArgentina(lat, lng) ? { lat, lng } : null;
};

/**
 * Marketplace, step 4 — Georef, Argentina's official address service (datos.gob.ar, free, no
 * key): the address to a point. When the street number is not found, the city's centre is
 * offered and the Owner drags the pin to the door. GEOREF_URL points elsewhere only in tests.
 */
@Injectable()
export class GeorefService {
  private readonly logger = new Logger(GeorefService.name);

  private base() {
    return (process.env.GEOREF_URL || DEFAULT_URL).replace(/\/+$/, '');
  }

  private async get(path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, max: String(MAX) });
    const response = await fetch(`${this.base()}/${path}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Georef ${path} respondió ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  }

  async find(direccion: string, ciudad?: string, provincia?: string): Promise<GeorefCandidate[]> {
    const where: Record<string, string> = {};
    if (ciudad?.trim()) where.localidad = ciudad.trim();
    if (provincia?.trim()) where.provincia = provincia.trim();
    try {
      const found = await this.get('direcciones', { direccion: direccion.trim(), ...where });
      const exact = ((found.direcciones as Array<Record<string, unknown>>) ?? [])
        .map((d) => {
          const point = pointOf(d.ubicacion as Point);
          return point
            ? { ...point, etiqueta: String(d.nomenclatura ?? direccion), exacta: true }
            : null;
        })
        .filter((c): c is GeorefCandidate => c !== null);
      if (exact.length > 0) return exact;
      if (!where.localidad) return [];
      // The number was not found: the city's centre, to drag the pin from there.
      const cities = await this.get('localidades', {
        nombre: where.localidad,
        ...(where.provincia ? { provincia: where.provincia } : {}),
      });
      return ((cities.localidades as Array<Record<string, unknown>>) ?? [])
        .map((l) => {
          const point = pointOf(l.centroide as Point);
          const province = (l.provincia as { nombre?: unknown } | undefined)?.nombre;
          return point
            ? {
                ...point,
                etiqueta: [l.nombre, province].filter(Boolean).join(', '),
                exacta: false,
              }
            : null;
        })
        .filter((c): c is GeorefCandidate => c !== null);
    } catch (error) {
      this.logger.warn(`Georef no respondió: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'El buscador de direcciones no responde ahora. Podés marcar el punto a mano en el mapa.',
      );
    }
  }
}
