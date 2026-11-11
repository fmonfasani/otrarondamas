import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { action as recoverAction } from '../app/routes/$lang.auth.recuperar';
import { action as resetAction } from '../app/routes/$lang.auth.nueva-contrasena';

// Figma "Recuperar contraseña" → "Revisa tu correo" → "Nueva contraseña", wired to
// POST /auth/password/forgot and POST /auth/password/reset.
const post = (url: string, fields: Record<string, string>) =>
  new Request(url, { method: 'POST', body: new URLSearchParams(fields) });

describe('password recovery routes', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  const recover = (fields: Record<string, string>) =>
    recoverAction({
      request: post('http://app.test/es/auth/recuperar', fields),
      params: { lang: 'es' },
      context: {},
    }) as Promise<Response>;
  const reset = (fields: Record<string, string>) =>
    resetAction({
      request: post('http://app.test/es/auth/nueva-contrasena', fields),
      params: { lang: 'es' },
      context: {},
    }) as Promise<Response>;

  it('requests the link and moves to "Revisa tu correo"', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const response = await recover({ email: ' lucia@ejemplo.com ' });
    await expect(response.json()).resolves.toEqual({
      step: 'sent',
      email: 'lucia@ejemplo.com',
      resent: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/auth/password/forgot',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'lucia@ejemplo.com' }) }),
    );
  });

  it('confirms a resend', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const response = await recover({ email: 'lucia@ejemplo.com', intent: 'resend' });
    await expect(response.json()).resolves.toMatchObject({ step: 'sent', resent: true });
  });

  it('stays on the request step when the API is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const response = await recover({ email: 'lucia@ejemplo.com' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ step: 'request' });
  });

  it('asks for an email', async () => {
    const response = await recover({ email: '' });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets the new password and shows the success screen', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const response = await reset({ token: 't'.repeat(43), password: 'nueva-clave', confirm: 'nueva-clave' });
    await expect(response.json()).resolves.toEqual({ done: true });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/auth/password/reset',
      expect.objectContaining({
        body: JSON.stringify({ token: 't'.repeat(43), password: 'nueva-clave' }),
      }),
    );
  });

  it('validates length and confirmation before calling the API', async () => {
    expect((await reset({ token: 'x', password: 'corta', confirm: 'corta' })).status).toBe(400);
    expect((await reset({ token: 'x', password: 'nueva-clave', confirm: 'otra-clave' })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows the API reason for an invalid or expired link', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'El enlace no es válido o ya venció. Pide uno nuevo.' }), {
        status: 400,
      }),
    );
    const response = await reset({ token: 'x'.repeat(43), password: 'nueva-clave', confirm: 'nueva-clave' });
    await expect(response.json()).resolves.toEqual({
      done: false,
      error: 'El enlace no es válido o ya venció. Pide uno nuevo.',
    });
  });
});
