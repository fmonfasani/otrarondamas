import * as path from 'node:path';
import { sniffChatFile } from '../messaging/chat-files';

/**
 * OR-B4-046 rule 12 — photos of a product for the store. Pure rules: how many, how heavy, which
 * formats (read from the first bytes, never from what the browser says), and where the files live.
 */

/** Photos per product. */
export const MAX_PHOTOS = 5;
/** Per photo. The panel shrinks a photo in the browser before sending it, so this is generous. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export type PhotoKind = { mimeType: string; ext: string };

/** A JPG, PNG or WebP photo; anything else (a PDF included) is refused. */
export function sniffPhoto(buffer: Buffer): PhotoKind | null {
  const kind = sniffChatFile(buffer);
  return kind?.type === 'IMAGE' ? { mimeType: kind.mimeType, ext: kind.ext } : null;
}

/**
 * Where product photos live: `CATALOG_STORAGE_DIR`, or a `catalogo` folder inside the chat files
 * volume (`MESSAGING_STORAGE_DIR`, OR-B4-037), so they need no new volume. Null when neither is
 * set: photos are off.
 */
export function photoStorageDir(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.CATALOG_STORAGE_DIR) return env.CATALOG_STORAGE_DIR;
  if (env.MESSAGING_STORAGE_DIR) return path.join(env.MESSAGING_STORAGE_DIR, 'catalogo');
  return null;
}

/** The file of a stored key, refusing any key that would step outside the folder. */
export function photoPath(dir: string, storageKey: string): string | null {
  const root = path.resolve(dir);
  const full = path.resolve(root, storageKey);
  return full.startsWith(root + path.sep) ? full : null;
}

/** New order of the photos: the ids given first, in that order, then any other one as it was. */
export function reorder(current: string[], wanted: string[]): string[] {
  const known = new Set(current);
  const first = [...new Set(wanted)].filter((id) => known.has(id));
  return [...first, ...current.filter((id) => !first.includes(id))];
}
