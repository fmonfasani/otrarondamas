import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CanonicalPermission } from '../../authorization/canonical-permission.decorator';
import { BusinessContextService } from '../../business-context/business-context.service';
import { hasCanonicalPermission } from '../../authorization/canonical-permissions';
import { MercadoPagoAccountService } from './mercadopago-account.service';

const DEFAULT_WEB_APP_URL = 'https://app.wapsell.com';

/**
 * OR-B4-032 / OR-B4-033 — the Business's Mercado Pago account (Owner only).
 *   GET    /cobros/mercadopago           status (never tokens)
 *   POST   /cobros/mercadopago/conectar  URL to authorize Wapsell in Mercado Pago
 *   GET    /cobros/mercadopago/callback  Mercado Pago's redirect (no session: signed state)
 *   DELETE /cobros/mercadopago           disconnect
 */
@ApiTags('cobros')
@Controller('cobros/mercadopago')
export class MercadoPagoAccountController {
  private readonly logger = new Logger(MercadoPagoAccountController.name);

  constructor(
    private readonly accounts: MercadoPagoAccountService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * The Owner's Business. PAYMENTS_CONFIGURE is checked here against the role matrix too,
   * so the rule holds in every authorization mode: in `shadow` the legacy guard decides and
   * would let any staff user through a route without a legacy permission (OR-B4-027 pattern).
   */
  private async ownerBusiness(user: AuthenticatedUser) {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    if (!hasCanonicalPermission(context.role, 'PAYMENTS_CONFIGURE')) {
      throw new ForbiddenException('Solo el Owner del negocio puede configurar los cobros');
    }
    return context;
  }

  @CanonicalPermission('PAYMENTS_CONFIGURE')
  @Get()
  async status(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.ownerBusiness(user);
    return this.accounts.status(context.businessId);
  }

  @CanonicalPermission('PAYMENTS_CONFIGURE')
  @Post('conectar')
  @HttpCode(200)
  async connect(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.ownerBusiness(user);
    return { url: this.accounts.authorizationUrl(context.businessId, context.userId as string) };
  }

  @CanonicalPermission('PAYMENTS_CONFIGURE')
  @Delete()
  @HttpCode(204)
  async disconnect(@CurrentUser() user: AuthenticatedUser) {
    const context = await this.ownerBusiness(user);
    await this.accounts.disconnect(context.businessId);
  }

  /** Back to the panel with the outcome; details stay in the API log, never in the URL. */
  @Public()
  @ApiExcludeEndpoint()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const back = new URL('/es/dashboard/cobros', process.env.WEB_APP_URL || DEFAULT_WEB_APP_URL);
    if (error) {
      back.searchParams.set('mp', 'cancelado');
      return res.redirect(back.toString());
    }
    try {
      await this.accounts.completeAuthorization(code, state);
      back.searchParams.set('mp', 'conectado');
    } catch (failure) {
      const status = (failure as { status?: number }).status;
      this.logger.warn(JSON.stringify({ event: 'mercadopago.callback.failed', status }));
      back.searchParams.set('mp', status === 409 ? 'otra-cuenta' : 'error');
    }
    return res.redirect(back.toString());
  }
}
