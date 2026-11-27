import { describe, expect, it } from 'vitest';
import { guardConnection, isCut } from '~/utils/connection';

// A dropped connection while sending a form (2026-11-27): a message and a retry, not an error page.
describe('guardConnection', () => {
  it('passes the answer through when the server answers', async () => {
    expect(await guardConnection(async () => ({ error: 'El código no es correcto.' }))).toEqual({ error: 'El código no es correcto.' });
  });

  it('turns «Failed to fetch» (no answer at all) into a cut connection', async () => {
    const answer = await guardConnection(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(isCut(answer)).toBe(true);
  });

  it('keeps every other failure as it was (redirects, server errors)', async () => {
    const redirect = new Response(null, { status: 302, headers: { Location: '/panel' } });
    await expect(
      guardConnection(async () => {
        throw redirect;
      }),
    ).rejects.toBe(redirect);
    await expect(
      guardConnection(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('recognises only its own mark', () => {
    expect(isCut({ connectionCut: true })).toBe(true);
    expect(isCut({ connectionCut: 'true' })).toBe(false);
    expect(isCut(null)).toBe(false);
    expect(isCut({ error: 'x' })).toBe(false);
  });
});
