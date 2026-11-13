import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * OR-B4-032 — secrets of a Business's Mercado Pago connection.
 *
 * Tokens are stored encrypted (AES-256-GCM) with MERCADOPAGO_TOKEN_KEY, a 32-byte key in
 * base64 that lives only in the API environment. The OAuth `state` is signed with a key
 * derived from the same secret, so a callback can only finish a connection this API started.
 */

const ALGORITHM = 'aes-256-gcm';

export function tokenKeyFrom(base64: string | undefined): Buffer | null {
  if (!base64) return null;
  const key = Buffer.from(base64, 'base64');
  return key.length === 32 ? key : null;
}

/** `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.');
}

export function decryptSecret(sealed: string, key: Buffer): string {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Secreto con formato inválido');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

const stateKey = (key: Buffer) =>
  createHmac('sha256', key).update('mercadopago-oauth-state').digest();

export type OAuthState = { businessId: string; userId: string; exp: number; nonce: string };

/** Signed, expiring OAuth state: `<payload>.<hmac>`, base64url. */
export function signState(state: Omit<OAuthState, 'nonce'>, key: Buffer): string {
  const payload = Buffer.from(
    JSON.stringify({ ...state, nonce: randomBytes(12).toString('hex') }),
  ).toString('base64url');
  const mac = createHmac('sha256', stateKey(key)).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

/** The state's content when the signature is valid and it has not expired; null otherwise. */
export function verifyState(value: string, key: Buffer, now = Date.now()): OAuthState | null {
  const [payload, mac] = value.split('.');
  if (!payload || !mac) return null;
  const expected = Buffer.from(
    createHmac('sha256', stateKey(key)).update(payload).digest('base64url'),
  );
  const received = Buffer.from(mac);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (typeof state.businessId !== 'string' || typeof state.userId !== 'string') return null;
    return typeof state.exp === 'number' && state.exp > now ? state : null;
  } catch {
    return null;
  }
}
