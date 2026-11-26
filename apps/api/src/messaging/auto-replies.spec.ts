import {
  DEFAULT_AWAY,
  DEFAULT_GREETING,
  autoRepliesDue,
  autoRepliesOf,
  autoRepliesProblem,
  isOpenAt,
  type AutoReplies,
  type WeekHours,
} from './auto-replies';

// E6b — the greeting and the away message, like WhatsApp Business.
const week = (turns: Array<[string, string]>, days = ['1', '2', '3', '4', '5']): WeekHours =>
  Object.fromEntries(
    ['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, days.includes(d) ? turns : []]),
  ) as WeekHours;
const settings = (overrides: Partial<AutoReplies> = {}): AutoReplies => ({
  bienvenida: { activo: true, texto: 'Hola' },
  ausencia: { activo: true, texto: 'Cerrado' },
  horario: week([
    ['09:00', '13:00'],
    ['17:00', '21:00'],
  ]),
  ...overrides,
});
// Argentina is UTC-3 all year.
const ar = (iso: string) => new Date(`${iso}-03:00`);

describe('automatic messages: the settings', () => {
  it('start off, with an example text, and without hours', () => {
    const empty = autoRepliesOf({});
    expect(empty.bienvenida).toEqual({ activo: false, texto: DEFAULT_GREETING });
    expect(empty.ausencia).toEqual({ activo: false, texto: DEFAULT_AWAY });
    expect(isOpenAt(empty.horario, new Date())).toBeNull();
  });

  it('keep only well written turns', () => {
    const read = autoRepliesOf({
      mensajesAutomaticos: { horario: { '1': [['09:00', '13:00'], ['9', 'x'], 'basura'] } },
    });
    expect(read.horario['1']).toEqual([['09:00', '13:00']]);
  });

  it('refuse turns that close before opening, overlap, or are more than 2', () => {
    expect(autoRepliesProblem(settings())).toBeNull();
    expect(autoRepliesProblem(settings({ horario: week([['13:00', '09:00']]) }))).toContain(
      'cierra después',
    );
    expect(
      autoRepliesProblem(
        settings({
          horario: week([
            ['09:00', '14:00'],
            ['13:00', '18:00'],
          ]),
        }),
      ),
    ).toContain('no se pisan');
    expect(
      autoRepliesProblem(
        settings({
          horario: week([
            ['08:00', '09:00'],
            ['10:00', '11:00'],
            ['12:00', '13:00'],
          ]),
        }),
      ),
    ).toContain('hasta 2 turnos');
    expect(autoRepliesProblem(settings({ horario: week([]) }))).toContain('al menos un día');
    expect(autoRepliesProblem(settings({ bienvenida: { activo: true, texto: '   ' } }))).toContain(
      'bienvenida',
    );
  });
});

describe('automatic messages: open or closed, in Argentina', () => {
  const hours = settings().horario;
  it('knows the two turns of a weekday and the closed weekend', () => {
    expect(isOpenAt(hours, ar('2026-11-26T10:30:00'))).toBe(true); // Thursday morning
    expect(isOpenAt(hours, ar('2026-11-26T14:00:00'))).toBe(false); // siesta
    expect(isOpenAt(hours, ar('2026-11-26T20:59:00'))).toBe(true);
    expect(isOpenAt(hours, ar('2026-11-26T21:00:00'))).toBe(false); // closing time
    expect(isOpenAt(hours, ar('2026-11-29T10:30:00'))).toBe(false); // Sunday
  });
});

describe('automatic messages: when each one goes', () => {
  const now = ar('2026-11-26T22:00:00'); // closed
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600 * 1000);

  it('greets a first message, and closed says so once every 12 hours', () => {
    expect(
      autoRepliesDue(settings(), { now, previousCustomerMessageAt: null, lastAwayAt: null }),
    ).toEqual(['bienvenida', 'ausencia']);
    expect(
      autoRepliesDue(settings(), { now, previousCustomerMessageAt: at(1), lastAwayAt: at(1) }),
    ).toEqual([]);
    expect(
      autoRepliesDue(settings(), { now, previousCustomerMessageAt: at(1), lastAwayAt: at(13) }),
    ).toEqual(['ausencia']);
  });

  it('greets again after 14 days away', () => {
    const open = ar('2026-11-26T10:00:00');
    expect(
      autoRepliesDue(settings(), {
        now: open,
        previousCustomerMessageAt: new Date(open.getTime() - 15 * 86400000),
        lastAwayAt: null,
      }),
    ).toEqual(['bienvenida']);
    expect(
      autoRepliesDue(settings(), {
        now: open,
        previousCustomerMessageAt: new Date(open.getTime() - 13 * 86400000),
        lastAwayAt: null,
      }),
    ).toEqual([]);
  });

  it('sends nothing while turned off', () => {
    const off = settings({
      bienvenida: { activo: false, texto: 'x' },
      ausencia: { activo: false, texto: 'y' },
    });
    expect(autoRepliesDue(off, { now, previousCustomerMessageAt: null, lastAwayAt: null })).toEqual(
      [],
    );
  });
});
