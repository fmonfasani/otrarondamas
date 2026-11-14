import { cleanFileName, sniffChatFile } from './chat-files';

describe('chat files (OR-B4-037)', () => {
  it('recognises photos and PDF by their first bytes, not by their name', () => {
    expect(sniffChatFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mimeType).toBe('image/jpeg');
    expect(
      sniffChatFile(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mimeType,
    ).toBe('image/png');
    expect(sniffChatFile(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))?.mimeType).toBe('image/webp');
    expect(sniffChatFile(Buffer.from('%PDF-1.7'))).toEqual({
      mimeType: 'application/pdf',
      ext: 'pdf',
      type: 'FILE',
    });
    expect(sniffChatFile(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffChatFile(Buffer.from('GIF89a'))).toBeNull();
  });

  it('keeps a safe file name with the real extension', () => {
    expect(cleanFileName('foto de la caja.png', 'jpg')).toBe('foto de la caja.jpg');
    const traversal = cleanFileName('../../etc/passwd', 'pdf');
    expect(traversal).not.toMatch(/[\/]/);
    expect(traversal.endsWith('.pdf')).toBe(true);
    expect(cleanFileName('"><img>.jpg', 'jpg')).toBe('img.jpg');
    expect(cleanFileName('', 'png')).toBe('archivo.png');
  });
});
