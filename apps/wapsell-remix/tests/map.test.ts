import { describe, expect, it } from 'vitest';
import { byDistance, distanceKm, distanceLabel, parsePoint } from '~/utils/map';

// Marketplace, step 4 — the map's pure rules.
const rosario = { lat: -32.9468, lng: -60.6393 };

describe('Mapa', () => {
  it('measures and says distances the way people read them', () => {
    expect(Math.round(distanceKm(rosario, { lat: -31.4201, lng: -64.1888 }))).toBe(375);
    expect(distanceLabel(0.01)).toBe('a 50 m');
    expect(distanceLabel(0.34)).toBe('a 350 m');
    expect(distanceLabel(1.24)).toBe('a 1,2 km');
    expect(distanceLabel(15.4)).toBe('a 15 km');
  });

  it('lists only stores on the map, nearest first when the customer shared where they are', () => {
    const stores = [
      { slug: 'lejos', ubicacion: { lat: -31.42, lng: -64.19 } },
      { slug: 'sin-mapa', ubicacion: null },
      { slug: 'cerca', ubicacion: { lat: -32.95, lng: -60.64 } },
    ];
    expect(byDistance(stores, rosario).map((s) => s.slug)).toEqual(['cerca', 'lejos']);
    expect(byDistance(stores, null).map((s) => [s.slug, s.km])).toEqual([
      ['lejos', null],
      ['cerca', null],
    ]);
  });

  it('only sends points in Argentina', () => {
    expect(parsePoint('-32.9468', '-60.6393')).toEqual(rosario);
    expect(parsePoint('40.4', '-3.7')).toBeNull();
    expect(parsePoint('abc', '-60')).toBeNull();
    expect(parsePoint(null, null)).toBeNull();
  });
});
