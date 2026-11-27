import { distanceKm, insideArgentina, locationOf, publicLocation } from './ubicacion';
import { GeorefService } from './georef.service';

describe('Ubicación del negocio — the rules', () => {
  const rosario = { lat: -32.9468, lng: -60.6393 };

  it('only accepts points in Argentina', () => {
    expect(insideArgentina(rosario.lat, rosario.lng)).toBe(true);
    expect(insideArgentina(-51.7, -57.85)).toBe(true); // Puerto Argentino, Malvinas
    expect(insideArgentina(-54.8, -68.3)).toBe(true); // Ushuaia
    expect(insideArgentina(40.4, -3.7)).toBe(false); // Madrid
    expect(insideArgentina(-23.55, -46.63)).toBe(false); // São Paulo
    expect(insideArgentina(Number.NaN, -60)).toBe(false);
  });

  it('reads only a confirmed, valid location from the configuration', () => {
    expect(locationOf(null)).toBeNull();
    expect(locationOf({ ubicacion: { lat: 40, lng: -3, confirmadaAt: 'x' } })).toBeNull();
    expect(locationOf({ ubicacion: { ...rosario, zona: false } })).toBeNull();
    expect(
      locationOf({
        ubicacion: {
          ...rosario,
          zona: true,
          direccion: 'Córdoba 1000',
          confirmadaAt: '2026-11-27',
        },
      }),
    ).toEqual({ ...rosario, zona: true, direccion: 'Córdoba 1000', confirmadaAt: '2026-11-27' });
  });

  it('shows the door when the Owner wants it, and only the zone (about 1 km) when not', () => {
    const at = { lat: -32.946812, lng: -60.639347, direccion: '', confirmadaAt: 'x' };
    expect(publicLocation({ ...at, zona: false })).toEqual({
      lat: -32.94681,
      lng: -60.63935,
      zona: false,
    });
    const zone = publicLocation({ ...at, zona: true });
    expect(zone).toEqual({ lat: -32.95, lng: -60.64, zona: true });
    expect(distanceKm(at, zone as { lat: number; lng: number })).toBeLessThan(1.2);
    expect(publicLocation(null)).toBeNull();
  });

  it('measures kilometres between two points', () => {
    const cordoba = { lat: -31.4201, lng: -64.1888 };
    expect(Math.round(distanceKm(rosario, cordoba))).toBe(375);
    expect(distanceKm(rosario, rosario)).toBe(0);
  });
});

describe('Georef — the address to a point', () => {
  const realFetch = global.fetch;
  const calls: string[] = [];
  const answer = (routes: Record<string, unknown>) => {
    global.fetch = (async (url: string) => {
      calls.push(url);
      const path = Object.keys(routes).find((p) => url.includes(`/${p}?`));
      const body = path ? routes[path] : null;
      return body === 'fail'
        ? new Response('nope', { status: 500 })
        : new Response(JSON.stringify(body ?? {}), { status: 200 });
    }) as typeof fetch;
  };
  beforeEach(() => {
    calls.length = 0;
    process.env.GEOREF_URL = 'http://georef.test/api';
  });
  afterAll(() => {
    global.fetch = realFetch;
    delete process.env.GEOREF_URL;
  });

  it('offers the exact address when Georef finds the number', async () => {
    answer({
      direcciones: {
        direcciones: [
          {
            nomenclatura: 'CORDOBA 1000, Rosario, Santa Fe',
            ubicacion: { lat: -32.94, lon: -60.64 },
          },
          { nomenclatura: 'Sin punto', ubicacion: { lat: null, lon: null } },
        ],
      },
    });
    const found = await new GeorefService().find('Córdoba 1000', 'Rosario', 'Santa Fe');
    expect(found).toEqual([
      { lat: -32.94, lng: -60.64, etiqueta: 'CORDOBA 1000, Rosario, Santa Fe', exacta: true },
    ]);
    expect(calls[0]).toContain('http://georef.test/api/direcciones?');
    expect(calls[0]).toContain('localidad=Rosario');
  });

  it('offers the city centre when the number is not found', async () => {
    answer({
      direcciones: { direcciones: [] },
      localidades: {
        localidades: [
          {
            nombre: 'Rosario',
            provincia: { nombre: 'Santa Fe' },
            centroide: { lat: -32.95, lon: -60.66 },
          },
        ],
      },
    });
    expect(await new GeorefService().find('Calle Nueva 99', 'Rosario')).toEqual([
      { lat: -32.95, lng: -60.66, etiqueta: 'Rosario, Santa Fe', exacta: false },
    ]);
  });

  it('says so when Georef does not answer, so the pin can be placed by hand', async () => {
    answer({ direcciones: 'fail' });
    await expect(new GeorefService().find('Córdoba 1000')).rejects.toThrow(
      'marcar el punto a mano',
    );
  });
});
