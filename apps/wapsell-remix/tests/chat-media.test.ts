import { describe, expect, it } from 'vitest';
import { EMOJI_GROUPS, fileTooBig, isFileName, mediaOf, quotedText, splitLinks, voiceTime } from '~/utils/messaging';

// E5 — voice notes, videos, links and emojis in the chat.
describe('the links of a message', () => {
  it('makes web links clickable and leaves the rest as text', () => {
    expect(splitLinks('mirá https://tienda.com/remera. ¿Te gusta?')).toEqual([
      { text: 'mirá ', link: false },
      { text: 'https://tienda.com/remera', link: true },
      { text: '. ¿Te gusta?', link: false },
    ]);
    expect(splitLinks('(http://a.com/x) y https://b.com')).toEqual([
      { text: '(', link: false },
      { text: 'http://a.com/x', link: true },
      { text: ') y ', link: false },
      { text: 'https://b.com', link: true },
    ]);
  });

  it('never turns other schemes into links', () => {
    expect(splitLinks('javascript:alert(1) data:text/html,x')).toEqual([{ text: 'javascript:alert(1) data:text/html,x', link: false }]);
  });
});

describe('voice notes and videos', () => {
  it('shows the length like WhatsApp', () => {
    expect(voiceTime(7)).toBe('0:07');
    expect(voiceTime(85.9)).toBe('1:25');
    expect(voiceTime(723)).toBe('12:03');
    expect(voiceTime(null)).toBe('0:00');
    expect(voiceTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('says before uploading when a file is over its limit', () => {
    const mb = 1024 * 1024;
    expect(fileTooBig({ size: 60 * mb, type: 'video/mp4' })).toBeNull();
    expect(fileTooBig({ size: 65 * mb, type: 'video/quicktime' })).toBe('El video puede pesar hasta 64 MB.');
    expect(fileTooBig({ size: 11 * mb, type: 'image/jpeg' })).toBe('El archivo puede pesar hasta 10 MB.');
    expect(fileTooBig({ size: 2 * mb, type: 'application/pdf' })).toBeNull();
  });

  it('quotes them by what they are', () => {
    expect(quotedText({ tipo: 'audio', texto: 'nota-de-voz.webm' })).toBe('🎤 Nota de voz');
    expect(quotedText({ tipo: 'video', texto: 'VID_001.mp4' })).toBe('🎥 Video');
    expect(quotedText({ tipo: 'video', texto: 'así llega' })).toBe('🎥 Video · así llega');
  });
});

describe('what a message shows besides its text', () => {
  const message = {
    content: 'https://tienda.com',
    adjuntos: [
      { tipo: 'enlace', id: 'l', url: 'https://tienda.com', titulo: 'Tienda', descripcion: null, sitio: 'tienda.com', imagen: false },
      { tipo: 'producto', id: 'p', productoId: 'x', nombre: 'Yerba', precio: '1' },
      { tipo: 'audio', id: 'a', nombre: 'nota-de-voz.webm', mimeType: 'audio/webm', tamano: 1, duracion: 4 },
    ],
  };

  it('keeps photos, videos, voice and files, with the link preview last', () => {
    expect(mediaOf(message).map((m) => m.tipo)).toEqual(['audio', 'enlace']);
  });

  it('hides the text only when it repeats a file name, not a link', () => {
    expect(isFileName('https://tienda.com', mediaOf(message))).toBe(false);
    expect(isFileName('nota-de-voz.webm', mediaOf(message))).toBe(true);
  });
});

describe('the emoji picker', () => {
  it('has groups without repeated emojis', () => {
    for (const group of EMOJI_GROUPS) {
      expect(group.emojis.length).toBeGreaterThan(10);
      expect(new Set(group.emojis).size).toBe(group.emojis.length);
    }
  });
});
