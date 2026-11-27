import { useEffect, useRef } from 'react';
import type { Circle, Map as LMap, Marker } from 'leaflet';
import { OSM_ATTRIBUTION, OSM_TILES, ZONE_RADIUS_M, type LatLng } from '~/utils/map';

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
}>;

type Leaflet = typeof import('leaflet');
/**
 * Leaflet is published as CommonJS: a dynamic import hands it under `default` (the same trap as
 * other CommonJS packages under ESM), so take whichever holds `map`.
 */
const loadLeaflet = async (): Promise<Leaflet> => {
  const mod = (await import('leaflet')) as Leaflet & { default?: Leaflet };
  return typeof mod.map === 'function' ? mod : (mod.default as Leaflet);
};

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Marketplace, step 4 — a map of OpenStreetMap drawn with Leaflet, only in the browser (the
 * server renders an empty box of the same size). Pins are Wapsell's orange dots; a store that
 * shows only its zone is a soft circle, never a dot on a door.
 */
export function LeafletMap({ center, zoom, pins = [], editable = null, onMove, me = null, label, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layers = useRef<Array<Marker | Circle>>([]);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !box.current || map.current) return;
      map.current = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom);
      L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map.current);
      draw(L);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Redraw the pins when they change; recentre when asked.
  useEffect(() => {
    if (!map.current) return;
    void loadLeaflet().then((L) => draw(L));
  }, [JSON.stringify(pins), JSON.stringify(editable), JSON.stringify(me)]);

  useEffect(() => {
    map.current?.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  function draw(L: Leaflet) {
    const m = map.current;
    if (!m) return;
    layers.current.forEach((layer) => layer.remove());
    layers.current = [];
    const dot = (cls: string) => L.divIcon({ className: `wmap-pin ${cls}`, iconSize: [26, 26], iconAnchor: [13, 26], html: '<span></span>' });
    for (const pin of pins) {
      const popup = `<b>${escape(pin.label)}</b>${pin.detail ? `<br><small>${escape(pin.detail)}</small>` : ''}${
        pin.href ? `<br><a href="${escape(pin.href)}">Ver la tienda</a>` : ''
      }`;
      if (pin.zona) {
        const circle = L.circle([pin.lat, pin.lng], { radius: ZONE_RADIUS_M, color: '#d97757', weight: 1, fillOpacity: 0.18 }).bindPopup(popup);
        circle.addTo(m);
        layers.current.push(circle);
      } else {
        const marker = L.marker([pin.lat, pin.lng], { icon: dot(''), title: pin.label, alt: pin.label }).bindPopup(popup);
        marker.addTo(m);
        layers.current.push(marker);
      }
    }
    if (editable) {
      const marker = L.marker([editable.lat, editable.lng], { icon: dot('is-edit'), draggable: true, title: 'Tu negocio (arrastralo)', alt: 'Tu negocio' });
      marker.on('dragend', () => {
        const at = marker.getLatLng();
        moveRef.current?.({ lat: at.lat, lng: at.lng });
      });
      marker.addTo(m);
      layers.current.push(marker);
      if (editable.zona) {
        const circle = L.circle([editable.lat, editable.lng], { radius: ZONE_RADIUS_M, color: '#d97757', weight: 1, fillOpacity: 0.12, interactive: false });
        circle.addTo(m);
        layers.current.push(circle);
      }
    }
    if (me) {
      const marker = L.marker([me.lat, me.lng], { icon: dot('is-me'), title: 'Vos estás acá', alt: 'Vos estás acá', interactive: false });
      marker.addTo(m);
      layers.current.push(marker);
    }
  }

  return <div ref={box} className={`wmap ${className}`} role="region" aria-label={label} />;
}
