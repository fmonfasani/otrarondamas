import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { BusinessContextService } from '../../business-context/business-context.service';
import {
  STORE_GOOGLE_COOKIE,
  STORE_GOOGLE_TTL_SECONDS,
  StoreGoogleService,
} from '../store-google.service';

type StartRequest = Request & { storeGoogleState?: string };

/**
 * Starts «Continuar con Google» for one store (ADR-IDN-007): resolves the store by its public
 * slug (404 if it does not exist), binds a nonce to this browser with an httpOnly cookie and
 * hands Google a signed `state`. The callback is the shared /auth/google/callback.
 */
@Injectable()
export class StoreGoogleStartGuard extends AuthGuard('google') {
  constructor(
    private readonly businessContext: BusinessContextService,
    private readonly storeGoogle: StoreGoogleService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<StartRequest>();
    const res = http.getResponse<Response>();
    const slug = String(req.params.businessSlug ?? '');
    const { businessId } = await this.businessContext.resolveForAnonymous(slug);
    const { state, nonce } = await this.storeGoogle.issue(
      slug,
      businessId,
      req.query.volver,
      req.query.web,
    );
    res.cookie(STORE_GOOGLE_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: STORE_GOOGLE_TTL_SECONDS * 1000,
    });
    req.storeGoogleState = state;
    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { state: context.switchToHttp().getRequest<StartRequest>().storeGoogleState };
  }
}
