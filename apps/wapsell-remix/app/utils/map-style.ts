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

/** Light: warm paper, white streets, the highways in a soft Wapsell peach. */
export const WAPSELL_LIGHT: Flavor = {
  ...namedFlavor('light'),
  background: '#ece8e1',
  earth: PAPER,
  park_a: '#e4eadc',
  park_b: '#d2e1c6',
  wood_a: '#e2e9d9',
  wood_b: '#cddcc0',
  scrub_a: '#e7ebdd',
  scrub_b: '#d5e2c9',
  zoo: '#e4eadc',
  hospital: '#f2e7e2',
  school: '#f0eadf',
  industrial: '#ebe8e2',
  military: '#ebe8e2',
  pedestrian: '#f0ece4',
  sand: '#efe9da',
  beach: '#f2ebd7',
  glacier: '#f7f7f5',
  aerodrome: '#eae8e3',
  runway: '#f8f6f2',
  water: '#cddde3',
  buildings: '#e7e2d9',
  pier: '#ece8e1',
  other: '#f8f6f2',
  minor_service: '#f8f6f2',
  minor_a: '#f6f3ee',
  minor_b: '#ffffff',
  link: '#ffffff',
  major: '#ffffff',
  highway: '#f6dccd',
  minor_service_casing: '#e6e0d6',
  minor_casing: '#e6e0d6',
  link_casing: '#e6e0d6',
  major_casing_early: '#e2dbd0',
  major_casing_late: '#e2dbd0',
  highway_casing_early: '#e9c7b5',
  highway_casing_late: '#e9c7b5',
  tunnel_other_casing: '#e6e0d6',
  tunnel_minor_casing: '#e6e0d6',
  tunnel_link_casing: '#e6e0d6',
  tunnel_major_casing: '#e6e0d6',
  tunnel_highway_casing: '#e6e0d6',
  tunnel_other: '#efebe4',
  tunnel_minor: '#efebe4',
  tunnel_link: '#efebe4',
  tunnel_major: '#efebe4',
  tunnel_highway: '#f1e2d8',
  bridges_other_casing: '#e2dbd0',
  bridges_minor_casing: '#e2dbd0',
  bridges_link_casing: '#e2dbd0',
  bridges_major_casing: '#e2dbd0',
  bridges_highway_casing: '#e9c7b5',
  bridges_other: '#f8f6f2',
  bridges_minor: '#ffffff',
  bridges_link: '#ffffff',
  bridges_major: '#ffffff',
  bridges_highway: '#f6dccd',
  railway: '#c9c3b8',
  boundaries: '#b9b3a8',
  roads_label_minor: '#8a857c',
  roads_label_minor_halo: '#ffffff',
  roads_label_major: '#6f6b64',
  roads_label_major_halo: '#ffffff',
  ocean_label: '#6f8a96',
  subplace_label: '#8a857c',
  subplace_label_halo: PAPER,
  city_label: '#3d3a35',
  city_label_halo: PAPER,
  state_label: '#a39d93',
  state_label_halo: PAPER,
  country_label: '#8a857c',
  address_label: '#8a857c',
  address_label_halo: '#ffffff',
  // The stores' orange pins are the only bright thing on the map: the places of interest go quiet.
  pois: { blue: '#5b86a3', green: '#5c8a6c', lapis: '#5d74a8', pink: '#a86f95', red: '#a86f78', slategray: '#6f6b80', tangerine: '#9a7b5a', turquoise: '#5c9aa1' },
  landcover: { grassland: '#e6ecdc', barren: '#f1ece0', urban_area: '#ece8e1', farmland: '#ecefe0', glacier: '#f7f7f5', scrub: '#e8ecdc', forest: '#dbe6d3' },
};

/** Dark, like the tracking mockups: night streets, the avenues a step lighter, quiet labels. */
export const WAPSELL_DARK: Flavor = {
  ...namedFlavor('dark'),
  background: '#0b0d10',
  earth: NIGHT,
  park_a: '#111a16',
  park_b: '#13201a',
  wood_a: '#101814',
  wood_b: '#12201a',
  scrub_a: '#111815',
  scrub_b: '#121c17',
  zoo: '#111a16',
  hospital: '#161419',
  school: '#141419',
  industrial: '#121419',
  military: '#121419',
  pedestrian: '#14161b',
  sand: '#15151a',
  beach: '#17171b',
  glacier: '#16181d',
  aerodrome: '#121419',
  runway: '#1d2129',
  water: '#0f1a24',
  buildings: '#15181d',
  pier: '#1d2129',
  other: '#181b21',
  minor_service: '#181b21',
  minor_a: '#1a1d23',
  minor_b: '#1d2129',
  link: '#262b35',
  major: '#262b35',
  highway: '#2f3440',
  minor_service_casing: '#0b0d10',
  minor_casing: '#0b0d10',
  link_casing: '#0b0d10',
  major_casing_early: '#0b0d10',
  major_casing_late: '#0b0d10',
  highway_casing_early: '#0b0d10',
  highway_casing_late: '#0b0d10',
  tunnel_other_casing: '#0b0d10',
  tunnel_minor_casing: '#0b0d10',
  tunnel_link_casing: '#0b0d10',
  tunnel_major_casing: '#0b0d10',
  tunnel_highway_casing: '#0b0d10',
  tunnel_other: '#15181d',
  tunnel_minor: '#15181d',
  tunnel_link: '#15181d',
  tunnel_major: '#15181d',
  tunnel_highway: '#1d2129',
  bridges_other_casing: '#0b0d10',
  bridges_minor_casing: '#0b0d10',
  bridges_link_casing: '#0b0d10',
  bridges_major_casing: '#0b0d10',
  bridges_highway_casing: '#0b0d10',
  bridges_other: '#181b21',
  bridges_minor: '#1d2129',
  bridges_link: '#262b35',
  bridges_major: '#262b35',
  bridges_highway: '#2f3440',
  railway: '#2a2e37',
  boundaries: '#3a3e48',
  roads_label_minor: '#6b6862',
  roads_label_minor_halo: NIGHT,
  roads_label_major: '#8a867f',
  roads_label_major_halo: NIGHT,
  ocean_label: '#4b6475',
  subplace_label: '#7d7a73',
  subplace_label_halo: NIGHT,
  city_label: '#c9c5bd',
  city_label_halo: NIGHT,
  state_label: '#5d5a55',
  state_label_halo: NIGHT,
  country_label: '#7d7a73',
  address_label: '#7d7a73',
  address_label_halo: NIGHT,
  pois: { blue: '#4f7186', green: '#4a7058', lapis: '#4f5f86', pink: '#86607a', red: '#866068', slategray: '#5f5b70', tangerine: '#7d6650', turquoise: '#4a7c82' },
  landcover: { grassland: '#111a15', barren: '#15151a', urban_area: '#121419', farmland: '#111814', glacier: '#16181d', scrub: '#121915', forest: '#101a14' },
};

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
