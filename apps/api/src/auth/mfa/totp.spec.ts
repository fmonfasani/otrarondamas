import {
  base32Decode,
  base32Encode,
  codeAt,
  hashRecoveryCode,
  matchStep,
  newRecoveryCodes,
  newSecret,
  otpauthUrl,
  stepAt,
} from './totp';

/** OR-B4-044 — TOTP must match what authenticator apps compute (RFC 6238). */
describe('totp', () => {
  // RFC 6238 Appendix B, SHA-1 seed "12345678901234567890"; the 8-digit values' last 6 digits.
  const rfcSecret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at T=%i', (seconds, expected) => {
    expect(codeAt(rfcSecret, stepAt(seconds * 1000))).toBe(expected);
  });

  it('round-trips base32 and makes 160-bit secrets', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 7]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Decode(newSecret())).toHaveLength(20);
  });

  it('accepts the current step ±1, never a used one, and only 6 digits', () => {
    const secret = newSecret();
    const now = Date.now();
    const step = stepAt(now);
    expect(matchStep(secret, codeAt(secret, step), 0, now)).toBe(step);
    expect(matchStep(secret, codeAt(secret, step - 1), 0, now)).toBe(step - 1);
    expect(matchStep(secret, codeAt(secret, step + 2), 0, now)).toBeNull();
    expect(matchStep(secret, codeAt(secret, step), step, now)).toBeNull(); // already used
    expect(matchStep(secret, 'abc123', 0, now)).toBeNull();
    expect(
      matchStep(
        secret,
        ` ${codeAt(secret, step).slice(0, 3)} ${codeAt(secret, step).slice(3)} `,
        0,
        now,
      ),
    ).toBe(step);
  });

  it('builds the otpauth link the apps read', () => {
    const url = new URL(otpauthUrl('ABC', 'ana@x.com'));
    expect(url.protocol).toBe('otpauth:');
    expect(decodeURIComponent(url.pathname)).toContain('Wapsell:ana@x.com');
    expect(url.searchParams.get('secret')).toBe('ABC');
    expect(url.searchParams.get('period')).toBe('30');
  });

  it('makes 10 distinct recovery codes, hashed the same with or without dash and case', () => {
    const codes = newRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/);
    expect(hashRecoveryCode(codes[0].toUpperCase().replace('-', ' '))).toBe(
      hashRecoveryCode(codes[0]),
    );
  });
});
