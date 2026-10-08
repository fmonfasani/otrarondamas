import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthCustomerService } from './auth.customer.service';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { CustomerRegistrationDto } from './dto/customer-registration.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { AllowCustomer } from './decorators/allow-customer.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.types';
import { GoogleProfile } from './google.strategy';

/**
 * RF-17 (docs/spec-login-roles.md): Customer-side authentication
 * endpoints — entry point at otrarondamas.wapsell.com (online store),
 * separate from the admin panel (admin.otrarondamas.wapsell.com).
 *
 * Registration and login use TIENDA_EMPRESA_ID to know which company
 * this public store belongs to (same pattern as store.service.ts). The
 * customer's Google OAuth redirects to the store callback, not to the
 * admin panel — see the `TIENDA_FRONTEND_URL` env var.
 */
@ApiTags('auth-cliente')
@Controller('auth/cliente')
export class AuthCustomerController {
  constructor(
    private readonly authCustomerService: AuthCustomerService,
    private readonly prisma: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Public self-registration — only for retail Cliente. Uses
   * TIENDA_EMPRESA_ID to know which company to link the customer to.
   */
  @Public()
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CustomerRegistrationDto) {
    const companyId = process.env.TIENDA_EMPRESA_ID;
    if (!companyId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }
    return this.authCustomerService.register(companyId, dto);
  }

  /**
   * Login for any Cliente (retail or wholesale). The resulting JWT
   * includes `esMayorista` so the frontend can know whether to show the
   * dossier flow.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const companyId = process.env.TIENDA_EMPRESA_ID;
    if (!companyId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }
    return this.authCustomerService.login(companyId, dto);
  }

  /**
   * Fresh profile of the authenticated Cliente — parallel to GET /auth/me
   * for Usuario. Only accessible with a token of type 'cliente'.
   *
   * FS-1a: BusinessContext is the sole tenant authority. The legacy
   * empresaId JWT claim is intentionally ignored; the customer and its
   * Business are resolved from persisted Customer data through
   * BusinessContextService, then the profile query is company-scoped.
   */
  @AllowCustomer()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new NotFoundException('Endpoint solo para clientes');
    }
    const context = await this.businessContext.resolveForCustomer(user);
    if (!context.customerId) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const db = this.prisma.forCompany(context.businessId);
    const customer = await db.cliente.findUnique({
      where: { id: context.customerId },
      include: { empresa: true },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return {
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      empresaId: customer.empresaId,
      empresaNombre: customer.empresa.nombre,
      esMayorista: customer.esMayorista,
      estadoLegajo: customer.estadoLegajo,
      metodoLogin: customer.googleId ? 'google' : 'password',
      createdAt: customer.createdAt.toISOString(),
    };
  }

  // Google OAuth for the online store. The Passport 'google' strategy is
  // the same as the admin panel's (same GOOGLE_CLIENT_ID/SECRET) but the
  // callback tells the destination apart by the URL it redirects to.
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiExcludeEndpoint()
  googleLogin() {}

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: { user: GoogleProfile }, @Res() res: Response) {
    // The store redirects to TIENDA_FRONTEND_URL (it may differ from
    // FRONTEND_URL, which points to the admin panel). If it is not
    // configured, it falls back to FRONTEND_URL — that way it does not
    // break a deploy that has not configured the store variable yet.
    const storeUrl = process.env.TIENDA_FRONTEND_URL || process.env.FRONTEND_URL;
    if (!storeUrl) {
      throw new Error('TIENDA_FRONTEND_URL / FRONTEND_URL no configurado');
    }

    try {
      const session = await this.authCustomerService.loginWithGoogle(req.user);
      const redirectUrl = new URL('/auth/google/callback', storeUrl);
      redirectUrl.searchParams.set('token', session.accessToken);
      res.redirect(redirectUrl.toString());
    } catch {
      const redirectUrl = new URL('/login', storeUrl);
      redirectUrl.searchParams.set('error', 'google');
      res.redirect(redirectUrl.toString());
    }
  }
}
