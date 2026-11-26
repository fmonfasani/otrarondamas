/**
 * OR-B4-037 — photos and PDFs in the conversation; E5 adds voice notes and videos. The format
 * is read from the first bytes of the file, never from what the browser says it is.
 */
export const CHAT_FILE_MAX_BYTES = 10 * 1024 * 1024;
/** E5 (Owner, 2026-11-26): a video up to 64 MB, stored as it comes. */
export const CHAT_VIDEO_MAX_BYTES = 64 * 1024 * 1024;
/** E5 — a voice note: about an hour of Opus, far more than anyone records. */
export const CHAT_VOICE_MAX_BYTES = 16 * 1024 * 1024;
/** What the upload accepts before looking inside: the largest of the three. */
export const CHAT_UPLOAD_MAX_BYTES = CHAT_VIDEO_MAX_BYTES;

export type ChatFileKind = {
  mimeType: string;
  ext: string;
  type: 'IMAGE' | 'FILE' | 'VOICE';
  /** The most this kind may weigh. */
  maxBytes: number;
};

/** ISO media (MP4, MOV, 3GP) brands a phone or a browser records; HEIC photos are not video. */
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'M4V ',
  'M4A ',
  'MSNV',
  'dash',
  'mmp4',
]);
const GPP_BRANDS = new Set(['3gp4', '3gp5', '3gp6', '3g2a']);

/** The EBML header names its document type in the first bytes: only WebM, which browsers play. */
function isWebm(buffer: Buffer) {
  return (
    buffer.length >= 4 &&
    buffer.readUInt32BE(0) === 0x1a45dfa3 &&
    buffer.subarray(0, 64).includes(Buffer.from('webm', 'ascii'))
  );
}

function isoBrand(buffer: Buffer): string | null {
  if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') return null;
  return buffer.toString('ascii', 8, 12);
}

/**
 * E5 — a voice note recorded in the browser: Chrome and Firefox give WebM or Ogg (Opus),
 * Safari gives MP4 (AAC).
 */
function sniffVoice(buffer: Buffer): ChatFileKind | null {
  const voice = (mimeType: string, ext: string): ChatFileKind => ({
    mimeType,
    ext,
    type: 'VOICE',
    maxBytes: CHAT_VOICE_MAX_BYTES,
  });
  if (isWebm(buffer)) return voice('audio/webm', 'webm');
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS')
    return voice('audio/ogg', 'ogg');
  const brand = isoBrand(buffer);
  if (brand && MP4_BRANDS.has(brand)) return voice('audio/mp4', 'm4a');
  return null;
}

function sniffVideo(buffer: Buffer): ChatFileKind | null {
  const video = (mimeType: string, ext: string): ChatFileKind => ({
    mimeType,
    ext,
    type: 'FILE',
    maxBytes: CHAT_VIDEO_MAX_BYTES,
  });
  if (isWebm(buffer)) return video('video/webm', 'webm');
  const brand = isoBrand(buffer);
  if (!brand || brand === 'M4A ') return null;
  if (brand === 'qt  ') return video('video/quicktime', 'mov');
  if (GPP_BRANDS.has(brand)) return video('video/3gpp', '3gp');
  if (MP4_BRANDS.has(brand)) return video('video/mp4', 'mp4');
  return null;
}

/**
 * What a chat file is. `voice` says it came from the microphone button, so WebM or MP4 is a
 * voice note and not a video.
 */
export function sniffChatFile(
  buffer: Buffer,
  options: { voice?: boolean } = {},
): ChatFileKind | null {
  if (options.voice) return sniffVoice(buffer);
  const photo = (mimeType: string, ext: string): ChatFileKind => ({
    mimeType,
    ext,
    type: 'IMAGE',
    maxBytes: CHAT_FILE_MAX_BYTES,
  });
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return photo('image/jpeg', 'jpg');
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return photo('image/png', 'png');
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return photo('image/webp', 'webp');
  }
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return { mimeType: 'application/pdf', ext: 'pdf', type: 'FILE', maxBytes: CHAT_FILE_MAX_BYTES };
  }
  return sniffVideo(buffer);
}

/** The files the API hands back as they are: photos, PDFs, voice notes and videos. */
export function isServableChatFile(mimeType: string) {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/') ||
    mimeType === 'application/pdf'
  );
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
