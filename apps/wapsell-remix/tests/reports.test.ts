import { describe, expect, it } from 'vitest';
import { barHeights, dayLabel, methodName, periodFrom, todayAR, variationText } from '../app/utils/reports';

/** OR-B4-036 — Reportes helpers. */
describe('reports helpers', () => {
  const now = new Date('2026-11-13T15:00:00Z'); // 12:00 in Argentina
  const at = (query: string) => periodFrom(new URLSearchParams(query), now);

  it('uses Argentina days', () => {
    expect(todayAR(new Date('2026-11-14T02:00:00Z'))).toBe('2026-11-13'); // 23:00 in Argentina
  });

  it('reads the period presets', () => {
    expect(at('')).toEqual({ desde: '2026-11-07', hasta: '2026-11-13', periodo: '7d' });
    expect(at('periodo=hoy')).toEqual({ desde: '2026-11-13', hasta: '2026-11-13', periodo: 'hoy' });
    expect(at('periodo=mes')).toEqual({ desde: '2026-11-01', hasta: '2026-11-13', periodo: 'mes' });
    expect(at('periodo=mes-pasado')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31', periodo: 'mes-pasado' });
    expect(at('periodo=30d')).toEqual({ desde: '2026-10-15', hasta: '2026-11-13', periodo: '30d' });
    expect(at('periodo=cualquiera').periodo).toBe('7d');
  });

  it('takes explicit dates only when they make a valid range', () => {
    expect(at('desde=2026-11-01&hasta=2026-11-05')).toEqual({ desde: '2026-11-01', hasta: '2026-11-05', periodo: 'custom' });
    expect(at('desde=2026-11-05&hasta=2026-11-01').periodo).toBe('7d');
    expect(at('desde=ayer&hasta=hoy').periodo).toBe('7d');
  });

  it('formats the comparison, the days and the bars', () => {
    expect(variationText(12.4)).toBe('+12 %');
    expect(variationText(-5.6)).toBe('−6 %');
    expect(variationText(0)).toBe('0 %');
    expect(variationText(null)).toBeNull();
    expect(dayLabel('2026-11-03')).toBe('03/11');
    expect(barHeights([{ vendido: 50 }, { vendido: 100 }, { vendido: 0 }])).toEqual([50, 100, 0]);
    expect(barHeights([{ vendido: 0 }])).toEqual([0]);
    expect(methodName('QR')).toBe('QR / billetera');
    expect(methodName('otro')).toBe('otro');
  });
});
