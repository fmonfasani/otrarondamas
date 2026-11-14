import type { Response } from 'express';

/**
 * Sends a chat file with safe headers: the stored type (checked on upload), no sniffing,
 * private caching, images inline and PDFs as downloads.
 */
export function sendChatFile(
  res: Response,
  file: { path: string; filename: string; mimeType: string },
) {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  const disposition = file.mimeType.startsWith('image/') ? 'inline' : 'attachment';
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${file.filename.replace(/"/g, '')}"`,
  );
  res.sendFile(file.path);
}
