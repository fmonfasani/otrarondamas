import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MLMap, Marker, PopupOptions } from 'maplibre-gl';
import type { Protocol } from 'pmtiles';
import { ZONE_RADIUS_M, circleRing, type LatLng } from '~/utils/map';
import type { MapTheme } from '~/utils/map-style';

export type MapPin = LatLng & { id: string; label: string; href?: string; zona?: boolean; detail?: string };

type Props = Readonly<{
  center: LatLng;
  zoom: number;
  pins?: MapPin[];
  /** The Owner's pin: draggable; every move is reported. */
  editable?: (LatLng & { zona: boolean }) | null;
  onMove?: (point: LatLng) => void;
  /** The customer's own place («cerca mío»), as a blue dot. */
  me?: LatLng | null;
  label: string;
  className?: string;
  /** Where Wapsell's own map is read (the route's loader says). */
  tiles: string | null;
  theme?: MapTheme;
}>;

type Maplibre = typeof import('maplibre-gl');
/** MapLibre is published as UMD: a dynamic import may hand it under `default`. */
const loadMaplibre = async (): Promise<Maplibre> => {
  const mod = (await import('maplibre-gl')) as Maplibre & { default?: Maplibre };
  return typeof mod.Map === 'function' ? mod : (mod.default as Maplibre);
};

/** One reader of the pmtiles:// archives for the whole page. */
let protocol: Protocol | null = null;
const HEADER_TIMEOUT_MS = 8000;

/** Can our file be read? (Until nginx serves it, or when it fails, the map uses OpenStreetMap.) */
async function ownMapReady(ml: Maplibre, url: string): Promise<boolean> {
  try {
    const pmtiles = await import('pmtiles');
    if (!protocol) {
      protocol = new pmtiles.Protocol();
      ml.addProtocol('pmtiles', protocol.tile);
    }
    const archive = protocol.get(url) ?? new pmtiles.PMTiles(url);
    protocol.add(archive);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('El mapa tardó demasiado')), HEADER_TIMEOUT_MS);
    });
    await Promise.race([archive.getHeader(), late]).finally(() => clearTimeout(timer));
    return true;
  } catch {
    return false;
  }
}

/**
 * The pages speak OpenStreetMap's zoom (256 px tiles, as with Leaflet: 4 is Argentina, 14 a
 * neighbourhood, 17 a door). MapLibre counts 512 px tiles: the same view is one level less.
 */
const glZoom = (zoom: number) => Math.max(0, zoom - 1);

const ZONES = 'wapsell-zonas';
const ORANGE = '#d97757';
/** The teardrop pin's tip sits 7 px below its 32 px box: lift it so the tip marks the place. */
const PIN_OFFSET: [number, number] = [0, -7];
/** Its round head then spans 39 px to 7 px above the place: bubbles open clear of it. */
const POPUP_OFFSET: PopupOptions['offset'] = {
  center: [0, -23],
  top: [0, 4],
  'top-left': [0, 4],
  'top-right': [0, 4],
  bottom: [0, -40],
  'bottom-left': [0, -40],
  'bottom-right': [0, -40],
  left: [18, -23],
  right: [-18, -23],
};

function pinElement(kind: '' | 'is-edit' | 'is-me', label: string, role: 'button' | 'img'): HTMLElement {
  const el = document.createElement('div');
  el.className = `wmap-pin ${kind}`.trim();
  el.setAttribute('aria-label', label);
  el.setAttribute('role', role);
  el.title = label;
  el.append(document.createElement('span'));
  return el;
}

/** The pin's bubble, built from text (never from HTML). */
function popupNode(pin: MapPin): HTMLElement {
  const root = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = pin.label;
  root.append(name);
  if (pin.detail) {
    const detail = document.createElement('small');
    detail.textContent = pin.detail;
    root.append(document.createElement('br'), detail);
  }
  if (pin.href) {
    const link = document.createElement('a');
    link.href = pin.href;
    link.textContent = 'Ver la tienda';
    root.append(document.createElement('br'), link);
  }
  return root;
}

function zoneFeature(center: LatLng, opacity: number, id: string | null): GeoJSON.Feature<GeoJSON.Polygon> {
  return { type: 'Feature', properties: { id, opacidad: opacity }, geometry: { type: 'Polygon', coordinates: [circleRing(center, ZONE_RADIUS_M)] } };
}

/** The zones' layer: soft orange circles; tapping one tells whose it is. */
function addZoneLayer(m: MLMap, ml: Maplibre, pinById: (id: unknown) => MapPin | undefined) {
  m.addSource(ZONES, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  m.addLayer({ id: `${ZONES}-fill`, type: 'fill', source: ZONES, paint: { 'fill-color': ORANGE, 'fill-opacity': ['get', 'opacidad'] } });
  m.addLayer({ id: `${ZONES}-line`, type: 'line', source: ZONES, paint: { 'line-color': ORANGE, 'line-width': 1 } });
  m.on('click', `${ZONES}-fill`, (e) => {
    const pin = pinById(e.features?.[0]?.properties?.id);
    if (pin) new ml.Popup({ offset: 6 }).setLngLat(e.lngLat).setDOMContent(popupNode(pin)).addTo(m);
  });
  m.on('mouseenter', `${ZONES}-fill`, () => {
    m.getCanvas().style.cursor = 'pointer';
  });
  m.on('mouseleave', `${ZONES}-fill`, () => {
    m.getCanvas().style.cursor = '';
  });
}

/** A place of interest whose kind has no icon in the sheet keeps its name, without an icon. */
function quietMissingIcons(m: MLMap) {
  m.on('styleimagemissing', (e) => {
    if (!m.hasImage(e.id)) m.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
  });
}

/** A map that cannot load a piece says so once in the console, not once per piece. */
function warnOnce(m: MLMap) {
  let warned = false;
  m.on('error', (e) => {
    if (warned) return;
    warned = true;
    console.warn('Mapa:', e.error?.message ?? e);
  });
}

/**
 * OR-B4-054 — Wapsell's own map (MapLibre over our Protomaps extract, OpenStreetMap when our
 * file cannot be read), only in the browser: the server renders an empty box of the same size.
 * Pins are Wapsell's orange drops; a store that shows only its zone is a soft circle, never a
 * dot on a door.
 */
export function WapsellMap({ center, zoom, pins = [], editable = null, onMove, me = null, label, className = '', tiles, theme = 'claro' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<Maplibre | null>(null);
  const markers = useRef<Marker[]>([]);
  const [source, setSource] = useState<'cargando' | 'propio' | 'osm'>('cargando');
  const [failed, setFailed] = useState(false);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const latest = useRef({ pins, editable, me, center, zoom });
  latest.current = { pins, editable, me, center, zoom };

  // Create the map (again only if the file or the style changes).
  useEffect(() => {
    let cancelled = false;
    let created: MLMap | null = null;
    void (async () => {
      try {
        const [ml, styles] = await Promise.all([loadMaplibre(), import('~/utils/map-style')]);
        const origin = window.location.origin;
        const url = styles.tilesAddress(tiles, origin);
        const own = url ? await ownMapReady(ml, url) : false;
        if (cancelled || !box.current) return;
        const at = latest.current;
        const m = new ml.Map({
          container: box.current,
          style: own && url ? styles.ownStyle(url, origin, theme) : styles.osmStyle(theme),
          center: [at.center.lng, at.center.lat],
          zoom: glZoom(at.zoom),
          maxZoom: glZoom(19),
          locale: styles.MAP_UI_ES,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        created = m;
        m.touchZoomRotate.disableRotation();
        m.keyboard.disableRotation();
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
        quietMissingIcons(m);
        warnOnce(m);
        m.on('load', () => {
          addZoneLayer(m, ml, (id) => latest.current.pins.find((p) => p.id === id));
          paintZones(m);
        });
        lib.current = ml;
        map.current = m;
        setSource(own ? 'propio' : 'osm');
        draw();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      created?.remove();
      map.current = null;
    };
  }, [tiles, theme]);

  // Redraw the pins when they change; recentre when asked.
  useEffect(() => {
    draw();
  }, [JSON.stringify(pins), JSON.stringify(editable), JSON.stringify(me)]);

  useEffect(() => {
    map.current?.jumpTo({ center: [center.lng, center.lat], zoom: glZoom(zoom) });
  }, [center.lat, center.lng, zoom]);

  function paintZones(m: MLMap) {
    const zones = m.getSource(ZONES) as GeoJSONSource | undefined;
    if (!zones) return; // the style is still loading: 'load' paints them
    const { pins: all, editable: own } = latest.current;
    const features = all.filter((p) => p.zona).map((p) => zoneFeature(p, 0.18, p.id));
    if (own?.zona) features.push(zoneFeature(own, 0.12, null));
    zones.setData({ type: 'FeatureCollection', features });
  }

  function draw() {
    const m = map.current;
    const ml = lib.current;
    if (!m || !ml) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const { pins: all, editable: own, me: here } = latest.current;
    for (const pin of all.filter((p) => !p.zona)) {
      const popup = new ml.Popup({ offset: POPUP_OFFSET }).setDOMContent(popupNode(pin));
      const marker = new ml.Marker({ element: pinElement('', pin.label, 'button'), anchor: 'bottom', offset: PIN_OFFSET })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(m);
      markers.current.push(marker);
    }
    if (own) {
      const marker = new ml.Marker({ element: pinElement('is-edit', 'Tu negocio (arrastralo)', 'img'), anchor: 'bottom', offset: PIN_OFFSET, draggable: true })
        .setLngLat([own.lng, own.lat])
        .addTo(m);
      marker.on('dragend', () => {
        const at = marker.getLngLat();
        moveRef.current?.({ lat: at.lat, lng: at.lng });
      });
      markers.current.push(marker);
    }
    if (here) {
      markers.current.push(new ml.Marker({ element: pinElement('is-me', 'Vos estás acá', 'img'), anchor: 'center' }).setLngLat([here.lng, here.lat]).addTo(m));
    }
    paintZones(m);
  }

  return (
    <div ref={box} className={`wmap wmap--${theme} ${className}`} role="region" aria-label={label} data-mapa={failed ? 'sin-mapa' : source}>
      {failed ? <p className="wmap__fail">No pudimos mostrar el mapa en este dispositivo.</p> : null}
    </div>
  );
}
