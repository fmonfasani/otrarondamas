import { hit, rateLimitKey, resetRateLimits } from './rate-limit';

// Paquete 1 S1 — the anti-spam brake.
describe('rate limit', () => {
  beforeEach(() => resetRateLimits());

  it('lets the limit through, then asks to wait until the window ends', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) expect(hit('k', 3, 60_000, t0 + i)).toBe(0);
    expect(hit('k', 3, 60_000, t0 + 10)).toBe(60);
    expect(hit('k', 3, 60_000, t0 + 30_000)).toBe(30);
    // A new window starts clean.
    expect(hit('k', 3, 60_000, t0 + 60_001)).toBe(0);
  });

  it('counts each person apart, by their session, never by the shared Remix IP', () => {
    const rule = { name: 'chat-send', limit: 1, windowMs: 60_000 };
    const ana = rateLimitKey(rule, { user: { id: 'ana', type: 'cliente' }, ip: '10.0.0.2' });
    const beto = rateLimitKey(rule, { user: { id: 'beto', type: 'cliente' }, ip: '10.0.0.2' });
    expect(ana).not.toBe(beto);
    expect(hit(ana, 1, 60_000)).toBe(0);
    expect(hit(beto, 1, 60_000)).toBe(0);
    expect(hit(ana, 1, 60_000)).toBeGreaterThan(0);
  });

  it('counts sign-in attempts per account (store + e-mail), whatever the case', () => {
    const rule = { name: 'sign-in', limit: 8, windowMs: 300_000, by: 'account' as const };
    const a = rateLimitKey(rule, {
      params: { businessSlug: 'sap-online' },
      body: { email: ' Ana@Mail.com ' },
    });
    const b = rateLimitKey(rule, {
      params: { businessSlug: 'sap-online' },
      body: { email: 'ana@mail.com' },
    });
    expect(a).toBe(b);
    expect(
      rateLimitKey(rule, { params: { businessSlug: 'otra' }, body: { email: 'ana@mail.com' } }),
    ).not.toBe(a);
  });
});
