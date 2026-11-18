import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { BusinessContextService } from '../../business-context/business-context.service';
import {
  STORE_GOOGLE_COOKIE,
  STORE_GOOGLE_TTL_SECONDS,
  StoreGoogleService,
  type GoogleFlowKind,
} from '../store-google.service';

type StartRequest = Request & { storeGoogleState?: string };

/**
 * Starts a «Continuar con Google» flow: binds a nonce to this browser with an httpOnly cookie
 * and hands Google a signed `state` saying which flow it is. The callback is the shared
 * /auth/google/callback (AuthController), which finishes the flow the state names.
 */
abstract class GoogleFlowStartGuard extends AuthGuard('google') {
  constructor(protected readonly storeGoogle: StoreGoogleService) {
    super();
  }

  protected abstract target(req: StartRequest): Promise<{
    kind: GoogleFlowKind;
    slug?: string;
    businessId?: string;
  }>;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<StartRequest>();
    const res = http.getResponse<Response>();
    const target = await this.target(req);
    const { state, nonce } = await this.storeGoogle.issue({
      ...target,
      volver: req.query.volver,
      web: req.query.web,
    });
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

/** One Business store (ADR-IDN-007): the store is resolved by its public slug (404 if unknown). */
@Injectable()
export class StoreGoogleStartGuard extends GoogleFlowStartGuard {
  constructor(
    private readonly businessContext: BusinessContextService,
    storeGoogle: StoreGoogleService,
  ) {
    super(storeGoogle);
  }

  protected async target(req: StartRequest) {
    const slug = String(req.params.businessSlug ?? '');
    const { businessId } = await this.businessContext.resolveForAnonymous(slug);
    return { kind: 'store' as const, slug, businessId };
  }
}

/** The universal buyer account of Wapsell (ADR-IDN-001/008). */
@Injectable()
export class BuyerGoogleStartGuard extends GoogleFlowStartGuard {
  constructor(storeGoogle: StoreGoogleService) {
    super(storeGoogle);
  }

  protected async target() {
    return { kind: 'buyer' as const };
  }
}

/** «Vendé en Wapsell» (ADR-IDN-008): a Google identity without an account registers a Business. */
@Injectable()
export class VenderGoogleStartGuard extends GoogleFlowStartGuard {
  constructor(storeGoogle: StoreGoogleService) {
    super(storeGoogle);
  }

  protected async target() {
    return { kind: 'vender' as const };
  }
}
