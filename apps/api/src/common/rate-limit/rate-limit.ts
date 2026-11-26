import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Anti-spam brake (paquete 1, S1): how many times one person may do something per window, like
 * WhatsApp refusing a flood of messages. In memory, as the gateway's presence: right for one API
 * container (a second one would need Redis, as presence would).
 *
 * The key is the signed-in actor (staff or customer), never the IP: every store customer reaches
 * the API through the Remix server, so they would all share one IP. Public routes (sign-in) key
 * on what they protect: the account (business + e-mail).
 */
export type RateLimitRule = {
  /** A name per action, so each one has its own count. */
  name: string;
  limit: number;
  windowMs: number;
  /** `account`: business slug + e-mail of the body (sign-in); default: the signed-in actor. */
  by?: 'actor' | 'account';
};

const RATE_LIMIT_KEY = 'wapsell:rate-limit';

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();
let lastSweep = 0;

/** Test seam: forget every count. */
export function resetRateLimits(): void {
  windows.clear();
}

/** Counts one hit; returns the seconds to wait when over the limit, else 0. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()): number {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  current.count += 1;
  return current.count > limit ? Math.ceil((current.resetAt - now) / 1000) : 0;
}

/** RATE_LIMIT_FACTOR multiplies every limit (e.g. 10 in load tests); 0 turns the brake off. */
function factor(): number {
  const raw = Number(process.env.RATE_LIMIT_FACTOR ?? '1');
  return Number.isFinite(raw) && raw >= 0 ? raw : 1;
}

type RequestLike = {
  user?: { id?: string; sub?: string; type?: string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  ip?: string;
};

export function rateLimitKey(rule: RateLimitRule, request: RequestLike): string {
  if (rule.by === 'account') {
    const slug = String(request.params?.businessSlug ?? '');
    const email = String(request.body?.email ?? '')
      .trim()
      .toLowerCase();
    return `${rule.name}:account:${slug}:${email}`;
  }
  const user = request.user;
  const id = user?.id ?? user?.sub;
  return id
    ? `${rule.name}:${user?.type ?? 'usuario'}:${id}`
    : `${rule.name}:ip:${request.ip ?? ''}`;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.get<RateLimitRule | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    const multiplier = factor();
    if (!rule || multiplier === 0) return true;
    const request = context.switchToHttp().getRequest<RequestLike>();
    const wait = hit(rateLimitKey(rule, request), rule.limit * multiplier, rule.windowMs);
    if (wait > 0) {
      const response = context
        .switchToHttp()
        .getResponse<{ setHeader?: (k: string, v: string) => void }>();
      response.setHeader?.('Retry-After', String(wait));
      throw new HttpException(
        `Vas muy rápido. Esperá ${wait} segundo${wait === 1 ? '' : 's'} y probá de nuevo.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

/** `@RateLimit({ name: 'chat-send', limit: 30, windowMs: 60_000 })` on a route. */
export const RateLimit = (rule: RateLimitRule) =>
  applyDecorators(SetMetadata(RATE_LIMIT_KEY, rule), UseGuards(RateLimitGuard));

/** The limits of the chat and of the customer's sign-in, in one place. */
export const LIMITS = {
  send: { name: 'chat-send', limit: 30, windowMs: 60_000 },
  typing: { name: 'chat-typing', limit: 40, windowMs: 60_000 },
  files: { name: 'chat-files', limit: 10, windowMs: 60_000 },
  read: { name: 'chat-read', limit: 120, windowMs: 60_000 },
  react: { name: 'chat-react', limit: 60, windowMs: 60_000 },
  search: { name: 'chat-search', limit: 30, windowMs: 60_000 },
  products: { name: 'chat-products', limit: 30, windowMs: 60_000 },
  push: { name: 'push-subscribe', limit: 10, windowMs: 60_000 },
  conversations: { name: 'chat-open', limit: 20, windowMs: 60_000 },
  signIn: { name: 'customer-sign-in', limit: 8, windowMs: 5 * 60_000, by: 'account' },
  signUp: { name: 'customer-sign-up', limit: 5, windowMs: 5 * 60_000, by: 'account' },
} satisfies Record<string, RateLimitRule>;
