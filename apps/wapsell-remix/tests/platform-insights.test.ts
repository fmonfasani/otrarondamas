import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie, stubApi } from './helpers/route';
import { loader as healthLoader } from '../app/routes/_platform.$lang.platform-admin.salud';
import { loader as activityLoader } from '../app/routes/_platform.$lang.platform-admin.actividad';
import { loader as adoptionLoader } from '../app/routes/_platform.$lang.platform-admin.uso';
import { loader as auditLoader } from '../app/routes/_platform.$lang.platform-admin.auditoria';
import {
  filterHealth,
  monthBarHeights,
  monthChange,
  monthLabel,
  parseSeverity,
  tooltipSide,
  type HealthReport,
} from '../app/utils/platform';

/** OR-B4-040 — platform insights: health, activity, feature use and the platform audit. */
describe('platform insight helpers', () => {
  const items: HealthReport['items'] = [
    {
      id: 'a',
      nombre: 'A',
      slug: 'a',
      alertas: [
        { tipo: 'OWNER_SIN_ACCESO', severidad: 'alta', detalle: '', accion: '' },
        { tipo: 'SIN_COBROS_ONLINE', severidad: 'baja', detalle: '', accion: '' },
      ],
    },
    {
      id: 'b',
      nombre: 'B',
      slug: 'b',
      alertas: [{ tipo: 'SIN_PRODUCTOS', severidad: 'media', detalle: '', accion: '' }],
    },
  ];

  it('filters alerts by severity and drops Businesses left without any', () => {
    expect(filterHealth(items, null)).toHaveLength(2);
    const urgent = filterHealth(items, 'alta');
    expect(urgent.map((b) => b.id)).toEqual(['a']);
    expect(urgent[0].alertas.map((a) => a.tipo)).toEqual(['OWNER_SIN_ACCESO']);
    expect(parseSeverity('media')).toBe('media');
    expect(parseSeverity('cualquiera')).toBeNull();
  });

  it('names months and compares them', () => {
    expect(monthLabel('2026-11')).toMatch(/nov/);
    expect(monthLabel('2026-11')).toMatch(/2026/);
    expect(monthChange(150, 100)).toBe('+50 % vs. el mes anterior');
    expect(monthChange(50, 100)).toBe('-50 % vs. el mes anterior');
    expect(monthChange(10, 0)).toBeNull();
  });

  it('keeps the edge tooltips inside the chart', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => tooltipSide(i, 6))).toEqual([
      'left-0',
      'left-0',
      'left-1/2 -translate-x-1/2',
      'left-1/2 -translate-x-1/2',
      'right-0',
      'right-0',
    ]);
  });

  it('scales bars to the highest month without hiding small ones', () => {
    expect(monthBarHeights([0, 1, 100])).toEqual([0, 3, 100]);
    expect(monthBarHeights([0, 0])).toEqual([0, 0]);
  });
});

describe('platform insight routes', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  const args = async (path: string) => ({
    request: new Request(`http://app.test${path}`, { headers: { Cookie: await sessionCookie() } }),
    params: { lang: 'es' },
    context: {},
  });
  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 200;
    } catch (thrown) {
      return (thrown as Response).status;
    }
  };

  it('are reserved for the Wapsell team, even for a Business Owner', async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ message: 'No' }), { status: 403 }));
    expect(await status(healthLoader(await args('/es/platform-admin/salud')))).toBe(403);
    expect(await status(activityLoader(await args('/es/platform-admin/actividad')))).toBe(403);
    expect(await status(adoptionLoader(await args('/es/platform-admin/uso')))).toBe(403);
    expect(await status(auditLoader(await args('/es/platform-admin/auditoria')))).toBe(403);
  });

  it('asks the API for the right period and page', async () => {
    api.mockImplementation(async () =>
      ok({ meses: [], total: 0, page: 3, pageSize: 50, items: [] }),
    );
    await activityLoader(await args('/es/platform-admin/actividad?meses=12'));
    await activityLoader(await args('/es/platform-admin/actividad?meses=99'));
    await auditLoader(await args('/es/platform-admin/auditoria?page=3'));
    expect(api.mock.calls.map((c) => c[0])).toEqual([
      'http://api.test/platform-admin/activity?months=12',
      'http://api.test/platform-admin/activity?months=6',
      'http://api.test/platform-admin/audit?page=3',
    ]);
  });
});
