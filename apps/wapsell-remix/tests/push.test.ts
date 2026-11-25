import { describe, expect, it } from 'vitest';
import { keyBytes } from '../app/utils/push';

// E3 — the VAPID public key reaches the browser as base64url and PushManager wants bytes.
describe('push key', () => {
  it('decodes base64url without padding into the exact bytes', () => {
    const bytes = new Uint8Array([4, 255, 0, 62, 63, 250]);
    const encoded = Buffer.from(bytes).toString('base64url');
    expect(encoded).not.toContain('=');
    expect([...keyBytes(encoded)]).toEqual([...bytes]);
  });
});
