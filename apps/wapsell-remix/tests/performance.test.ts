import { describe, expect, it } from 'vitest';
import { LIGHTS, perMinute, pointLabel, rangeKey, timeText } from '~/utils/performance';

// Rendimiento — how the platform page says the numbers.
describe('times in words', () => {
  it('goes from milliseconds to hours', () => {
    expect(timeText(8.4)).toBe('8 ms');
    expect(timeText(1234)).toBe('1,2 s');
    expect(timeText(3 * 60_000)).toBe('3 min');
    expect(timeText(80 * 60_000)).toBe('1 h 20 min');
    expect(timeText(120 * 60_000)).toBe('2 h');
    expect(timeText(null)).toBe('—');
  });
});

describe('the traffic lights', () => {
  it('feels answers under 0,3 s instant and over 1 s slow', () => {
    expect(LIGHTS.p95(120)).toBe('bien');
    expect(LIGHTS.p95(600)).toBe('ojo');
    expect(LIGHTS.p95(1500)).toBe('problema');
  });

  it('reads the server load per processor', () => {
    expect(LIGHTS.load(0.9, 8)).toBe('bien');
    expect(LIGHTS.load(6.4, 8)).toBe('ojo');
    expect(LIGHTS.load(9, 8)).toBe('problema');
  });

  it('memory, disk, database and errors', () => {
    expect(LIGHTS.memory(30)).toBe('bien');
    expect(LIGHTS.disk(92)).toBe('problema');
    expect(LIGHTS.database(2)).toBe('bien');
    expect(LIGHTS.errors(1)).toBe('ojo');
  });
});

describe('the charts', () => {
  it('labels points by range in Argentina’s time', () => {
    const at = '2026-11-26T17:05:00Z'; // 14:05 in Buenos Aires, a Thursday
    expect(pointLabel(at, '1h')).toBe('14:05');
    expect(pointLabel(at, '7d')).toBe('jue 14:05');
    expect(pointLabel(at, '30d')).toBe('26/11');
  });

  it('turns a point into requests per minute', () => {
    expect(perMinute(600, '24h')).toBe(60);
    expect(perMinute(600, '1h')).toBe(600);
  });

  it('defaults to the last hour', () => {
    expect(rangeKey('30d')).toBe('30d');
    expect(rangeKey('x')).toBe('1h');
  });
});
