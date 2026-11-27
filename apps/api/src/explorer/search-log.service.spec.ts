import { SearchLogService, termOf } from './search-log.service';

describe('SearchLogService — what is counted', () => {
  it('counts plain words: no accents, capitals or signs; at most 6 words and 60 letters', () => {
    expect(termOf('  Café   CON leche!! ')).toBe('cafe con leche');
    expect(termOf('a')).toBeNull();
    expect(termOf('uno dos tres cuatro cinco seis siete')).toBe('uno dos tres cuatro cinco seis');
    expect(termOf('x'.repeat(80))?.length).toBe(60);
  });

  it('adds the same word of the same day in memory and writes once per word', async () => {
    const executed: unknown[][] = [];
    const prisma = {
      $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        executed.push(values);
        return Promise.resolve(1);
      },
      busquedaDiaria: { deleteMany: () => Promise.resolve({ count: 0 }) },
    };
    const log = new SearchLogService(prisma as never);
    const at = new Date('2026-11-27T12:00:00Z');
    log.record('Yerba', at);
    log.record('yerba', at);
    log.record('YERBA ', at);
    log.record('fideos', at);
    await log.flush(at);
    expect(executed).toEqual([
      ['2026-11-27', 'yerba', 3],
      ['2026-11-27', 'fideos', 1],
    ]);
    await log.flush(at);
    expect(executed).toHaveLength(2);
  });
});
