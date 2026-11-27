import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { namedFlavor } from '@protomaps/basemaps';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { circleRing, distanceKm, OSM_TILES, OWN_TILES_PATH } from '~/utils/map';
import { MAP_ROLES, OWN_SOURCE, WAPSELL_DARK, WAPSELL_LIGHT, osmStyle, ownStyle, tilesAddress } from '~/utils/map-style';
import { mapTiles } from '~/services/map.server';

// OR-B4-054 — Wapsell's own map: the rules that do not need a browser.
const ORIGIN = 'https://app.wapsell.com';
const PUBLIC = fileURLToPath(new URL('../public/map/', import.meta.url));
const OWN = `${ORIGIN}${OWN_TILES_PATH}`;

/** Every string inside a style value (fonts sit inside literals and cases). */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

const fontsOf = (theme: 'claro' | 'oscuro') =>
  new Set(
    ownStyle(OWN, ORIGIN, theme)
      .layers.flatMap((l) => strings((l as { layout?: Record<string, unknown> }).layout?.['text-font']))
      .filter((s) => s.startsWith('Noto Sans')),
  );

describe('Mapa propio', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads our Argentina file in pieces, with fonts and icons served by the app, names in Spanish', () => {
    const style = ownStyle(OWN, ORIGIN, 'claro');
    expect(style.sources[OWN_SOURCE]).toMatchObject({ type: 'vector', url: `pmtiles://${OWN}` });
    expect(JSON.stringify(style.sources[OWN_SOURCE])).toContain('OpenStreetMap');
    expect(style.glyphs).toBe(`${ORIGIN}/map/fonts/{fontstack}/{range}.pbf`);
    expect(style.sprite).toBe(`${ORIGIN}/map/sprites/v4/light`);
    expect(ownStyle(OWN, ORIGIN, 'oscuro').sprite).toBe(`${ORIGIN}/map/sprites/v4/dark`);
    expect(JSON.stringify(style.layers)).toContain('name:es');
  });

  it('paints the light map and the dark one in Wapsell colours', () => {
    // Every colour slot of the style is ours, in both themes: none keeps Protomaps' grey.
    const painted = new Set<string>(MAP_ROLES.flatMap(([slots]) => slots));
    const slots = Object.entries(namedFlavor('light'))
      .filter(([, value]) => typeof value === 'string')
      .map(([slot]) => slot);
    expect(slots.filter((slot) => !painted.has(slot))).toEqual([]);
    const background = (theme: 'claro' | 'oscuro') =>
      (ownStyle(OWN, ORIGIN, theme).layers.find((l) => l.type === 'background') as { paint?: Record<string, unknown> } | undefined)?.paint?.['background-color'];
    expect(background('claro')).toBe(WAPSELL_LIGHT.background);
    expect(background('oscuro')).toBe(WAPSELL_DARK.background);
    expect(WAPSELL_DARK.earth).toBe('#0e1014');
    expect(WAPSELL_DARK.water).toBe('#0f1a24');
    // Nothing on the map competes with the stores' orange pins.
    expect(Object.values(WAPSELL_LIGHT.pois ?? {})).not.toContain('#CB6704');
  });

  it('ships every font the styles ask for, and the icons both styles draw', () => {
    const fonts = new Set([...fontsOf('claro'), ...fontsOf('oscuro')]);
    expect([...fonts].sort()).toEqual(['Noto Sans Italic', 'Noto Sans Medium', 'Noto Sans Regular']);
    for (const font of fonts) {
      for (const range of ['0-255', '256-511', '8192-8447']) expect(existsSync(`${PUBLIC}fonts/${font}/${range}.pbf`), `${font} ${range}`).toBe(true);
    }
    expect(existsSync(`${PUBLIC}fonts/OFL.txt`)).toBe(true);
    for (const sheet of ['light', 'dark']) {
      const icons = JSON.parse(readFileSync(`${PUBLIC}sprites/v4/${sheet}.json`, 'utf8')) as Record<string, unknown>;
      for (const name of ['townspot', 'capital', 'arrow', 'generic_shield-3char']) expect(icons[name], `${sheet} ${name}`).toBeDefined();
      expect(existsSync(`${PUBLIC}sprites/v4/${sheet}@2x.png`)).toBe(true);
    }
  });

  it('falls back to OpenStreetMap, dimmed for the dark screens', () => {
    const light = osmStyle('claro');
    expect(light.sources.osm).toMatchObject({ type: 'raster', tiles: [OSM_TILES] });
    expect(JSON.stringify(light.sources.osm)).toContain('OpenStreetMap');
    expect(light.layers[0]).toMatchObject({ type: 'raster', paint: {} });
    expect(osmStyle('oscuro').layers[0]).toMatchObject({ paint: { 'raster-saturation': -1 } });
  });

  it('turns the configured file into an address the browser can read', () => {
    expect(tilesAddress(OWN_TILES_PATH, ORIGIN)).toBe(OWN);
    expect(tilesAddress(' https://build.protomaps.com/20261126.pmtiles ', ORIGIN)).toBe('https://build.protomaps.com/20261126.pmtiles');
    expect(tilesAddress('javascript:alert(1)', ORIGIN)).toBeNull();
    expect(tilesAddress('', ORIGIN)).toBeNull();
    expect(tilesAddress(null, ORIGIN)).toBeNull();
  });

  it('serves our file unless MAP_TILES_URL says otherwise', () => {
    vi.stubEnv('MAP_TILES_URL', '');
    expect(mapTiles()).toBe(OWN_TILES_PATH);
    vi.stubEnv('MAP_TILES_URL', ' https://build.protomaps.com/20261126.pmtiles ');
    expect(mapTiles()).toBe('https://build.protomaps.com/20261126.pmtiles');
  });

  it('draws a zone as a closed circle of about 700 m', () => {
    const center = { lat: -32.9468, lng: -60.6393 };
    const ring = circleRing(center, 700);
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring[64]);
    for (const [lng, lat] of ring) expect(distanceKm(center, { lat, lng })).toBeCloseTo(0.7, 2);
  });
});
