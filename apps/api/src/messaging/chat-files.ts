/**
 * OR-B4-037 — photos and PDFs in the conversation. The format is read from the first bytes
 * of the file, never from what the browser says it is.
 */
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024;

export type ChatFileKind = { mimeType: string; ext: string; type: 'IMAGE' | 'FILE' };

export function sniffChatFile(buffer: Buffer): ChatFileKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg', type: 'IMAGE' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', ext: 'png', type: 'IMAGE' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: 'webp', type: 'IMAGE' };
  }
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return { mimeType: 'application/pdf', ext: 'pdf', type: 'FILE' };
  }
  return null;
}

/** A file name safe to show and to send back in Content-Disposition. */
export function cleanFileName(name: string, ext: string) {
  const base = name
    .replace(/\.[^.]*$/, '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'archivo'}.${ext}`;
}
