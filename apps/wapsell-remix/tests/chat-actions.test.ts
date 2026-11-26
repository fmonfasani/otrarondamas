import { describe, expect, it } from 'vitest';
import { canStillDelete, canStillEdit, quotedText, shortText } from '~/utils/messaging';

// E4 — what can be done with a message, like WhatsApp.
describe('the time to edit or delete', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('edits for 15 minutes', () => {
    expect(canStillEdit(ago(14 * 60 * 1000), now)).toBe(true);
    expect(canStillEdit(ago(16 * 60 * 1000), now)).toBe(false);
  });

  it('deletes for everyone for 2 days', () => {
    expect(canStillDelete(ago(47 * 60 * 60 * 1000), now)).toBe(true);
    expect(canStillDelete(ago(49 * 60 * 60 * 1000), now)).toBe(false);
  });
});

describe('the quote above a reply', () => {
  it('says what the quoted message was', () => {
    expect(quotedText({ tipo: 'texto', texto: '¿Tienen talle 40?' })).toBe('¿Tienen talle 40?');
    expect(quotedText({ tipo: 'imagen', texto: 'foto.jpg' })).toBe('📷 Foto');
    expect(quotedText({ tipo: 'imagen', texto: 'así quedó' })).toBe('📷 Foto · así quedó');
    expect(quotedText({ tipo: 'archivo', texto: 'factura.pdf' })).toBe('📄 Documento');
    expect(quotedText({ tipo: 'producto', texto: 'Yerba 1 kg · $ 5.000,00' })).toBe('🛍️ Producto · Yerba 1 kg · $ 5.000,00');
  });

  it('never repeats what a deleted message said', () => {
    expect(quotedText({ tipo: 'texto', texto: null, eliminado: true })).toBe('Se eliminó este mensaje');
  });
});

describe('the start of a message', () => {
  it('keeps one line and cuts long ones', () => {
    expect(shortText('hola\n\n  qué tal')).toBe('hola qué tal');
    expect(shortText('a'.repeat(200), 10)).toBe(`${'a'.repeat(9)}…`);
    expect(shortText(null)).toBe('');
  });
});
