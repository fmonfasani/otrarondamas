import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * OR-B4-044 — time-based one-time codes (TOTP, RFC 6238): HMAC-SHA1, 30-second steps, 6 digits,
 * the format every authenticator app reads (Google Authenticator, Microsoft Authenticator, Authy…).
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replaceAll(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('Clave con caracteres inválidos');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new secret: 20 random bytes (160 bits, RFC 4226's recommendation), base32. */
export const newSecret = () => base32Encode(randomBytes(20));

export const stepAt = (now: number) => Math.floor(now / 1000 / STEP_SECONDS);

export function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(bin).padStart(DIGITS, '0');
}

/**
 * The step that matches `code` (current step ± 1, for clock drift), or null. A step already used
 * (`<= lastStep`) never matches again, so a code seen by someone else cannot be replayed.
 */
export function matchStep(
  secret: string,
  code: string,
  lastStep: number,
  now = Date.now(),
): number | null {
  const typed = code.replaceAll(/\s/g, '');
  if (!/^\d{6}$/.test(typed)) return null;
  const current = stepAt(now);
  for (const step of [current - 1, current, current + 1]) {
    if (step <= lastStep) continue;
    const expected = Buffer.from(codeAt(secret, step));
    if (timingSafeEqual(expected, Buffer.from(typed))) return step;
  }
  return null;
}

/** otpauth:// link the apps read from the QR code. */
export function otpauthUrl(secret: string, account: string, issuer = 'Wapsell') {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
}

/** Ten single-use recovery codes, `xxxx-xxxx`; only their hashes are stored. */
export function newRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(5)).toLowerCase(); // 8 chars
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

export const hashRecoveryCode = (code: string) =>
  createHash('sha256').update(code.toLowerCase().replaceAll(/[\s-]/g, '')).digest('hex');
