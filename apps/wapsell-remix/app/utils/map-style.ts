import type { StyleSpecification } from 'maplibre-gl';
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps';
import { OSM_ATTRIBUTION, OSM_TILES } from '~/utils/map';

/**
 * OR-B4-054 (Owner, 2026-11-27) — Wapsell's own map, so we can customise it: an Argentina
 * extract of Protomaps (OpenStreetMap data) drawn by MapLibre, in two styles. The light one
 * («claro») is for /mapa and Ajustes; the dark one («oscuro») is for the tracking screens, like
 * the mockups. When our file cannot be read, OpenStreetMap's own tiles are drawn instead.
 */
export type MapTheme = 'claro' | 'oscuro';

export const OWN_SOURCE = 'protomaps';
export const OWN_ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const PAPER = '#f4f1eb';
const NIGHT = '#0e1014';

/** The style's colour slots (pois and landcover are sets of their own). */
type ColorKey = { [K in keyof Flavor]-?: Flavor[K] extends string ? K : never }[keyof Flavor];

/**
 * Every part of the map with its two colours: [the style's slots, claro, oscuro]. Light is warm
 * paper with white streets and the highways in a soft Wapsell peach; dark is the tracking
 * mockups' night, the avenues a step lighter, the labels quiet.
 */
export const MAP_ROLES: ReadonlyArray<readonly [readonly ColorKey[], string, string]> = [
  [['background'], '#ece8e1', '#0b0d10'],
  [['earth'], PAPER, NIGHT],
  [['water'], '#cddde3', '#0f1a24'],
  [['park_a', 'zoo'], '#e4eadc', '#111a16'],
  [['park_b'], '#d2e1c6', '#13201a'],
  [['wood_a'], '#e2e9d9', '#101814'],
  [['wood_b'], '#cddcc0', '#12201a'],
  [['scrub_a'], '#e7ebdd', '#111815'],
  [['scrub_b'], '#d5e2c9', '#121c17'],
  [['hospital'], '#f2e7e2', '#161419'],
  [['school'], '#f0eadf', '#141419'],
  [['industrial', 'military', 'aerodrome'], '#ebe8e2', '#121419'],
  [['pedestrian'], '#f0ece4', '#14161b'],
  [['sand'], '#efe9da', '#15151a'],
  [['beach'], '#f2ebd7', '#17171b'],
  [['glacier'], '#f7f7f5', '#16181d'],
  [['runway'], '#f8f6f2', '#1d2129'],
  [['buildings'], '#e7e2d9', '#15181d'],
  [['pier'], '#ece8e1', '#1d2129'],
  // Streets, from the smallest to the highways.
  [['other', 'minor_service', 'bridges_other'], '#f8f6f2', '#181b21'],
  [['minor_a'], '#f6f3ee', '#1a1d23'],
  [['minor_b', 'bridges_minor'], '#ffffff', '#1d2129'],
  [['link', 'major', 'bridges_link', 'bridges_major'], '#ffffff', '#262b35'],
  [['highway', 'bridges_highway'], '#f6dccd', '#2f3440'],
  [
    ['minor_service_casing', 'minor_casing', 'link_casing', 'tunnel_other_casing', 'tunnel_minor_casing', 'tunnel_link_casing', 'tunnel_major_casing', 'tunnel_highway_casing'],
    '#e6e0d6',
    '#0b0d10',
  ],
  [['major_casing_early', 'major_casing_late', 'bridges_other_casing', 'bridges_minor_casing', 'bridges_link_casing', 'bridges_major_casing'], '#e2dbd0', '#0b0d10'],
  [['highway_casing_early', 'highway_casing_late', 'bridges_highway_casing'], '#e9c7b5', '#0b0d10'],
  [['tunnel_other', 'tunnel_minor', 'tunnel_link', 'tunnel_major'], '#efebe4', '#15181d'],
  [['tunnel_highway'], '#f1e2d8', '#1d2129'],
  [['railway'], '#c9c3b8', '#2a2e37'],
  [['boundaries'], '#b9b3a8', '#3a3e48'],
  // Labels and the halos that keep them readable.
  [['roads_label_minor', 'address_label'], '#8a857c', '#6b6862'],
  [['roads_label_major'], '#6f6b64', '#8a867f'],
  [['roads_label_minor_halo', 'roads_label_major_halo', 'address_label_halo'], '#ffffff', NIGHT],
  [['subplace_label', 'country_label'], '#8a857c', '#7d7a73'],
  [['subplace_label_halo', 'city_label_halo', 'state_label_halo'], PAPER, NIGHT],
  [['city_label'], '#3d3a35', '#c9c5bd'],
  [['state_label'], '#a39d93', '#5d5a55'],
  [['ocean_label'], '#6f8a96', '#4b6475'],
];

/** The stores' orange pins are the only bright thing on the map: the places of interest go quiet. */
const POIS: Readonly<Record<MapTheme, Flavor['pois']>> = {
  claro: { blue: '#5b86a3', green: '#5c8a6c', lapis: '#5d74a8', pink: '#a86f95', red: '#a86f78', slategray: '#6f6b80', tangerine: '#9a7b5a', turquoise: '#5c9aa1' },
  oscuro: { blue: '#4f7186', green: '#4a7058', lapis: '#4f5f86', pink: '#86607a', red: '#866068', slategray: '#5f5b70', tangerine: '#7d6650', turquoise: '#4a7c82' },
};
const LANDCOVER: Readonly<Record<MapTheme, Flavor['landcover']>> = {
  claro: { grassland: '#e6ecdc', barren: '#f1ece0', urban_area: '#ece8e1', farmland: '#ecefe0', glacier: '#f7f7f5', scrub: '#e8ecdc', forest: '#dbe6d3' },
  oscuro: { grassland: '#111a15', barren: '#15151a', urban_area: '#121419', farmland: '#111814', glacier: '#16181d', scrub: '#121915', forest: '#101a14' },
};

function flavorFor(theme: MapTheme): Flavor {
  const column: 1 | 2 = theme === 'oscuro' ? 2 : 1;
  const colors = Object.fromEntries(MAP_ROLES.flatMap((role) => role[0].map((slot) => [slot, role[column]])));
  return { ...namedFlavor(theme === 'oscuro' ? 'dark' : 'light'), ...colors, pois: POIS[theme], landcover: LANDCOVER[theme] };
}

export const WAPSELL_LIGHT: Flavor = flavorFor('claro');
export const WAPSELL_DARK: Flavor = flavorFor('oscuro');

/** The archive's absolute address: the loader gives a path on this site or a full http(s) URL. */
export function tilesAddress(raw: string | null | undefined, origin: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Our map: the extract read in pieces (pmtiles://), the fonts and icons served by the app
 * itself (public/map), the names in Spanish.
 */
export function ownStyle(tiles: string, origin: string, theme: MapTheme): StyleSpecification {
  const dark = theme === 'oscuro';
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/map/sprites/v4/${dark ? 'dark' : 'light'}`,
    sources: { [OWN_SOURCE]: { type: 'vector', url: `pmtiles://${tiles}`, attribution: OWN_ATTRIBUTION } },
    layers: layers(OWN_SOURCE, dark ? WAPSELL_DARK : WAPSELL_LIGHT, { lang: 'es' }),
  };
}

/** The fallback: OpenStreetMap's tiles, as before (dimmed and inverted for the dark screens). */
export function osmStyle(theme: MapTheme): StyleSpecification {
  const paint = theme === 'oscuro' ? { 'raster-saturation': -1, 'raster-brightness-min': 0.85, 'raster-brightness-max': 0.08 } : {};
  return {
    version: 8,
    sources: { osm: { type: 'raster', tiles: [OSM_TILES], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION } },
    layers: [{ id: 'osm', type: 'raster', source: 'osm', paint }],
  };
}

/** The map's buttons and messages, in Spanish. */
export const MAP_UI_ES: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'Ver de dónde sale el mapa',
  'AttributionControl.MapFeedback': 'Corregir el mapa',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Lugar en el mapa',
  'NavigationControl.ResetBearing': 'Volver al norte',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'Popup.Close': 'Cerrar',
  'ScaleControl.Meters': 'm',
  'ScaleControl.Kilometers': 'km',
  'CooperativeGesturesHandler.WindowsHelpText': 'Usá Ctrl + rueda para acercar el mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Usá ⌘ + rueda para acercar el mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Usá dos dedos para mover el mapa',
};
