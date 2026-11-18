import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * ADR-IDN-007 — «Continuar con Google» in a Business store.
 *
 * Google only knows one redirect URI (the staff callback, /auth/google/callback), so the store
 * flow travels through it and is told apart by the OAuth `state`:
 *   - `state` is a signed, 10-minute token with the store (slug + id) and where to return.
 *   - a random nonce is put in it AND in an httpOnly cookie of the browser that started the
 *     flow. The callback only accepts the state if both match, so a callback URL captured by
 *     someone else cannot sign a victim in to the attacker's account (login CSRF).
 */
export const STORE_GOOGLE_COOKIE = 'wapsell_store_google';
export const STORE_GOOGLE_TTL_SECONDS = 600;

/** Only these return targets exist; anything else falls back to the account page. */
const VOLVER = new Set(['carrito', 'chat']);

type StoreGoogleState = {
  typ: 'store-google';
  slug: string;
  businessId: string;
  volver: string;
  nonce: string;
  web: string;
};

/** `web` is the web app's own browser binding (opaque here), handed back to it unchanged. */
export type StoreGoogleTarget = { slug: string; businessId: string; volver: string; web: string };

const WEB_NONCE = /^[A-Za-z0-9_-]{16,64}$/;

@Injectable()
export class StoreGoogleService {
  constructor(private readonly jwt: JwtService) {}

  async issue(slug: string, businessId: string, volver: unknown, web: unknown) {
    const nonce = randomBytes(24).toString('base64url');
    const state = await this.jwt.signAsync(
      {
        typ: 'store-google',
        slug,
        businessId,
        volver: typeof volver === 'string' && VOLVER.has(volver) ? volver : '',
        nonce,
        web: typeof web === 'string' && WEB_NONCE.test(web) ? web : '',
      } satisfies StoreGoogleState,
      { expiresIn: STORE_GOOGLE_TTL_SECONDS },
    );
    return { state, nonce };
  }

  /** True when the callback carries a store state at all (valid or not). */
  isStoreState(state: unknown): state is string {
    return typeof state === 'string' && state.length > 0;
  }

  /** The store to sign in to, or null if the state is forged, expired or not from this browser. */
  async read(state: string, cookieHeader: string | undefined): Promise<StoreGoogleTarget | null> {
    let parsed: StoreGoogleState;
    try {
      parsed = await this.jwt.verifyAsync<StoreGoogleState>(state);
    } catch {
      return null;
    }
    if (
      parsed.typ !== 'store-google' ||
      !parsed.slug ||
      !parsed.businessId ||
      !parsed.nonce ||
      !parsed.web
    )
      return null;
    const cookie = readCookie(cookieHeader, STORE_GOOGLE_COOKIE);
    if (!cookie || !sameText(cookie, parsed.nonce)) return null;
    return {
      slug: parsed.slug,
      businessId: parsed.businessId,
      volver: parsed.volver,
      web: parsed.web,
    };
  }
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
