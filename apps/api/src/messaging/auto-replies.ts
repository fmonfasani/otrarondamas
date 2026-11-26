import { Prisma } from '@prisma/client';

/**
 * E6b (messaging like WhatsApp Business) — the greeting and the away message, kept in
 * Empresa.configuracion.mensajesAutomaticos.
 *
 * Owner decisions (2026-11-26): both start turned off, with an example text to edit; the
 * greeting goes with a customer's first message, or when they come back after 14 days; the
 * away message goes outside the opening hours, at most once every 12 hours per customer; the
 * hours have up to 2 turns a day, in Argentina's time. They show as the store's bubble marked
 * «Mensaje automático».
 */
export const GREETING_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
export const AWAY_EVERY_MS = 12 * 60 * 60 * 1000;
export const AUTO_TEXT_MAX = 1000;
const TZ = 'America/Argentina/Buenos_Aires';

/** A turn: from and to, «HH:MM», the same day. */
export type Turn = [string, string];
/** Sunday is 0, like Date#getDay. */
export type WeekHours = Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', Turn[]>;

export type AutoReplies = {
  bienvenida: { activo: boolean; texto: string };
  ausencia: { activo: boolean; texto: string };
  horario: WeekHours;
};

export const DEFAULT_GREETING =
  '¡Hola! Gracias por escribirnos. En un ratito te respondemos. Mientras tanto, contanos qué estás buscando.';
export const DEFAULT_AWAY =
  'Gracias por escribir. Ahora estamos cerrados: te respondemos apenas abramos.';
const DAYS = ['0', '1', '2', '3', '4', '5', '6'] as const;
const EMPTY_WEEK = (): WeekHours =>
  Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as WeekHours;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** What is stored, or the defaults (off, with the example texts, no hours). */
export function autoRepliesOf(configuracion: Prisma.JsonValue | null): AutoReplies {
  const raw = ((configuracion ?? {}) as { mensajesAutomaticos?: unknown }).mensajesAutomaticos;
  const stored = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    Record<keyof AutoReplies, unknown>
  >;
  const message = (value: unknown, fallback: string) => {
    const v = (value ?? {}) as { activo?: unknown; texto?: unknown };
    return {
      activo: v.activo === true,
      texto: typeof v.texto === 'string' && v.texto.trim() ? v.texto : fallback,
    };
  };
  const hours = EMPTY_WEEK();
  const storedHours = (stored.horario ?? {}) as Record<string, unknown>;
  for (const day of DAYS) {
    const turns = storedHours[day];
    if (Array.isArray(turns)) {
      hours[day] = turns.filter(
        (t): t is Turn =>
          Array.isArray(t) &&
          t.length === 2 &&
          typeof t[0] === 'string' &&
          typeof t[1] === 'string' &&
          TIME.test(t[0]) &&
          TIME.test(t[1]),
      );
    }
  }
  return {
    bienvenida: message(stored.bienvenida, DEFAULT_GREETING),
    ausencia: message(stored.ausencia, DEFAULT_AWAY),
    horario: hours,
  };
}

/** Why the settings cannot be saved, or null: texts, and up to 2 turns a day in order. */
export function autoRepliesProblem(value: AutoReplies): string | null {
  for (const [name, msg] of [
    ['bienvenida', value.bienvenida],
    ['ausencia', value.ausencia],
  ] as const) {
    const text = msg.texto.trim();
    if (!text) return `Escribí el texto del mensaje de ${name}.`;
    if (text.length > AUTO_TEXT_MAX)
      return `El mensaje de ${name} puede tener hasta ${AUTO_TEXT_MAX} letras.`;
  }
  for (const day of DAYS) {
    const turns = value.horario[day] ?? [];
    if (turns.length > 2) return 'Cada día puede tener hasta 2 turnos.';
    let end = -1;
    for (const [from, to] of turns) {
      if (!TIME.test(from) || !TIME.test(to)) return 'Las horas van como 09:00.';
      if (minutes(to) <= minutes(from)) return 'Cada turno cierra después de abrir (el mismo día).';
      if (minutes(from) < end) return 'Los turnos de un día no se pisan.';
      end = minutes(to);
    }
  }
  const anyHours = DAYS.some((d) => (value.horario[d] ?? []).length > 0);
  if (value.ausencia.activo && !anyHours) {
    return 'Para el mensaje de ausencia cargá al menos un día con horario.';
  }
  return null;
}

/** The weekday (0 Sunday) and minute of the day in Argentina. */
function localTime(at: Date): { day: (typeof DAYS)[number]; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = String(
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  ) as (typeof DAYS)[number];
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Whether the store is open at a moment; null when it has no hours loaded. */
export function isOpenAt(hours: WeekHours, at: Date): boolean | null {
  if (!DAYS.some((d) => (hours[d] ?? []).length > 0)) return null;
  const { day, minute } = localTime(at);
  return (hours[day] ?? []).some(([from, to]) => minute >= minutes(from) && minute < minutes(to));
}

/**
 * Which automatic messages answer a customer's message: the greeting when it is their first
 * one (or the last was more than 14 days ago), the away message when the store is closed and
 * it did not go in the last 12 hours.
 */
export function autoRepliesDue(
  settings: AutoReplies,
  facts: { now: Date; previousCustomerMessageAt: Date | null; lastAwayAt: Date | null },
): Array<'bienvenida' | 'ausencia'> {
  const due: Array<'bienvenida' | 'ausencia'> = [];
  const { now, previousCustomerMessageAt, lastAwayAt } = facts;
  if (
    settings.bienvenida.activo &&
    (!previousCustomerMessageAt ||
      now.getTime() - previousCustomerMessageAt.getTime() > GREETING_AFTER_MS)
  ) {
    due.push('bienvenida');
  }
  if (
    settings.ausencia.activo &&
    isOpenAt(settings.horario, now) === false &&
    (!lastAwayAt || now.getTime() - lastAwayAt.getTime() >= AWAY_EVERY_MS)
  ) {
    due.push('ausencia');
  }
  return due;
}
