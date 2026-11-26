import { describe, expect, it } from 'vitest';
import { autoRepliesFrom, turnsText } from '~/utils/messaging';
import { openNowLabel } from '~/components/chat/StoreChatExtras';

// E6b — the Ajustes form of the automatic messages and the hours.
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe('the automatic messages form', () => {
  it('reads both messages and up to two turns a day', () => {
    const parsed = autoRepliesFrom(
      form({
        'bienvenida-activo': 'on',
        'bienvenida-texto': ' ¡Hola! ',
        'ausencia-texto': 'Cerrado',
        'd1-1-desde': '09:00',
        'd1-1-hasta': '13:00',
        'd1-2-desde': '17:00',
        'd1-2-hasta': '21:00',
        'd6-1-desde': '10:00',
        'd6-1-hasta': '14:00',
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.bienvenida).toEqual({ activo: true, texto: '¡Hola!' });
    expect(parsed.value.ausencia.activo).toBe(false);
    expect(parsed.value.horario['1']).toEqual([
      ['09:00', '13:00'],
      ['17:00', '21:00'],
    ]);
    expect(parsed.value.horario['6']).toEqual([['10:00', '14:00']]);
    expect(parsed.value.horario['0']).toEqual([]);
  });

  it('asks for both hours of a turn', () => {
    const parsed = autoRepliesFrom(form({ 'd3-1-desde': '09:00' }));
    expect(parsed).toEqual({ ok: false, message: 'Miércoles: completá las dos horas del turno 1 (por ejemplo 09:00 y 13:00).' });
  });
});

describe('the hours as words', () => {
  it('says the turns, closed, and open now', () => {
    expect(turnsText([['09:00', '13:00'], ['17:00', '21:00']])).toBe('09:00–13:00 y 17:00–21:00');
    expect(turnsText([])).toBe('Cerrado');
    expect(openNowLabel(true)).toBe('Abierto ahora');
    expect(openNowLabel(false)).toBe('Cerrado ahora');
    expect(openNowLabel(null)).toBeNull();
  });
});
