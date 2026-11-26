import type { Response } from 'express';

/**
 * Sends a chat file with safe headers: the stored type (checked on upload), no sniffing,
 * private caching, images, audio and video inline and PDFs as downloads.
 */
export function sendChatFile(
  res: Response,
  file: { path: string; filename: string; mimeType: string },
) {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  // E5: voice notes and videos play in the page; sendFile answers Range requests (seeking).
  const disposition = /^(image|audio|video)\//.test(file.mimeType) ? 'inline' : 'attachment';
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${file.filename.replace(/"/g, '')}"`,
  );
  res.sendFile(file.path);
}
