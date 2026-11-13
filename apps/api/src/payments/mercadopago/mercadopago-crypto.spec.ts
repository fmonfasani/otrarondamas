import { randomBytes } from 'node:crypto';
import {
  decryptSecret,
  encryptSecret,
  signState,
  tokenKeyFrom,
  verifyState,
} from './mercadopago-crypto';

describe('Mercado Pago secrets (OR-B4-032)', () => {
  const key = randomBytes(32);
  const otherKey = randomBytes(32);

  it('accepts only a 32-byte base64 key', () => {
    expect(tokenKeyFrom(key.toString('base64'))?.equals(key)).toBe(true);
    expect(tokenKeyFrom(randomBytes(16).toString('base64'))).toBeNull();
    expect(tokenKeyFrom(undefined)).toBeNull();
  });

  it('encrypts tokens so the stored value does not contain them, and decrypts them back', () => {
    const token = `APP_USR-${randomBytes(8).toString('hex')}`;
    const sealed = encryptSecret(token, key);
    expect(sealed).not.toContain(token);
    expect(encryptSecret(token, key)).not.toBe(sealed);
    expect(decryptSecret(sealed, key)).toBe(token);
  });

  it('refuses a tampered value or the wrong key', () => {
    const sealed = encryptSecret('secret-token', key);
    const parts = sealed.split('.');
    parts[3] = Buffer.from('other-data').toString('base64url');
    expect(() => decryptSecret(parts.join('.'), key)).toThrow();
    expect(() => decryptSecret(sealed, otherKey)).toThrow();
  });

  it('verifies a signed state until it expires', () => {
    const state = signState({ businessId: 'b-1', userId: 'u-1', exp: 2_000 }, key);
    expect(verifyState(state, key, 1_000)).toMatchObject({ businessId: 'b-1', userId: 'u-1' });
    expect(verifyState(state, key, 2_000)).toBeNull();
    expect(verifyState(state, otherKey, 1_000)).toBeNull();
  });

  it('refuses a state whose content was changed', () => {
    const [, mac] = signState({ businessId: 'b-1', userId: 'u-1', exp: 2_000 }, key).split('.');
    const forged = Buffer.from(
      JSON.stringify({ businessId: 'b-2', userId: 'u-1', exp: 2_000, nonce: 'x' }),
    ).toString('base64url');
    expect(verifyState(`${forged}.${mac}`, key, 1_000)).toBeNull();
    expect(verifyState('garbage', key, 1_000)).toBeNull();
  });
});
