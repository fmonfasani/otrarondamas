import { OWN_TILES_PATH } from '~/utils/map';

/**
 * OR-B4-054 — where the browser reads Wapsell's own map. In production nginx serves the
 * Argentina extract at /tiles/argentina.pmtiles (kept out of the backups: it can be cut again).
 * MAP_TILES_URL points elsewhere while developing, for example at a public Protomaps build.
 * Until the file is there, the map falls back to OpenStreetMap by itself.
 */
export function mapTiles(): string {
  return process.env.MAP_TILES_URL?.trim() || OWN_TILES_PATH;
}
