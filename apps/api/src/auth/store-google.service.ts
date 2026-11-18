import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * «Continuar con Google» outside the staff sign-in (ADR-IDN-007/008).
 *
 * Google only knows one redirect URI (the staff callback, /auth/google/callback), so these flows
 * travel through it and are told apart by the OAuth `state`:
 *   - `state` is a signed, 10-minute token saying which flow it is:
 *       store   — sign in to one Business store (slug + id, where to return);
 *       buyer   — the universal buyer account of Wapsell;
 *       vender  — «Vendé en Wapsell»: a Google identity without an account registers a Business.
 *   - a random nonce is put in it AND in an httpOnly cookie of the browser that started the
 *     flow. The callback only accepts the state if both match, so a callback URL captured by
 *     someone else cannot sign a victim in to the attacker's account (login CSRF).
 *   - store and buyer also carry `web`, the web app's own browser binding, handed back to it.
 */
export const STORE_GOOGLE_COOKIE = 'wapsell_store_google';
export const STORE_GOOGLE_TTL_SECONDS = 600;

/** Only these return targets exist; anything else falls back to the account page. */
const VOLVER = new Set(['carrito', 'chat']);
const WEB_NONCE = /^[A-Za-z0-9_-]{16,64}$/;

export type GoogleFlowKind = 'store' | 'buyer' | 'vender';

type GoogleFlowState = {
  typ: 'store-google';
  kind: GoogleFlowKind;
  slug: string;
  businessId: string;
  volver: string;
  nonce: string;
  web: string;
};

/** `web` is the web app's own browser binding (opaque here), handed back to it unchanged. */
export type StoreGoogleTarget = {
  kind: GoogleFlowKind;
  slug: string;
  businessId: string;
  volver: string;
  web: string;
};

@Injectable()
export class StoreGoogleService {
  constructor(private readonly jwt: JwtService) {}

  async issue(input: {
    kind: GoogleFlowKind;
    slug?: string;
    businessId?: string;
    volver?: unknown;
    web?: unknown;
  }) {
    const nonce = randomBytes(24).toString('base64url');
    const state = await this.jwt.signAsync(
      {
        typ: 'store-google',
        kind: input.kind,
        slug: input.slug ?? '',
        businessId: input.businessId ?? '',
        volver: typeof input.volver === 'string' && VOLVER.has(input.volver) ? input.volver : '',
        nonce,
        web: typeof input.web === 'string' && WEB_NONCE.test(input.web) ? input.web : '',
      } satisfies GoogleFlowState,
      { expiresIn: STORE_GOOGLE_TTL_SECONDS },
    );
    return { state, nonce };
  }

  /** True when the callback carries a state at all (valid or not): the staff flow never sends one. */
  isStoreState(state: unknown): state is string {
    return typeof state === 'string' && state.length > 0;
  }

  /** Which flow to finish, or null if the state is forged, expired or not from this browser. */
  async read(state: string, cookieHeader: string | undefined): Promise<StoreGoogleTarget | null> {
    let parsed: GoogleFlowState;
    try {
      parsed = await this.jwt.verifyAsync<GoogleFlowState>(state);
    } catch {
      return null;
    }
    if (parsed.typ !== 'store-google' || !parsed.nonce) return null;
    const complete =
      (parsed.kind === 'store' && parsed.slug && parsed.businessId && parsed.web) ||
      (parsed.kind === 'buyer' && parsed.web) ||
      parsed.kind === 'vender';
    if (!complete) return null;
    const cookie = readCookie(cookieHeader, STORE_GOOGLE_COOKIE);
    if (!cookie || !sameText(cookie, parsed.nonce)) return null;
    return {
      kind: parsed.kind,
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
