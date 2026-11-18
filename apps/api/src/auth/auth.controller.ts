import {
  Optional,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { PasswordResetService } from './password-reset.service';
import { AccountService } from './account.service';
import { MfaPolicyService } from './mfa/mfa-policy.service';
import { MfaService } from './mfa/mfa.service';
import { SignupService } from './signup.service';
import {
  STORE_GOOGLE_COOKIE,
  StoreGoogleService,
  type StoreGoogleTarget,
} from './store-google.service';
import { AuthCustomerService } from './auth.customer.service';
import { CompradorService } from './comprador/comprador.service';
import { GoogleAccountNotFound } from './auth.google.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/account.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, UserProfile } from './auth.types';
import { GoogleProfile } from './google.strategy';
import {
  CanonicalPermission,
  AUTHENTICATED,
} from '../authorization/canonical-permission.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authGoogleService: AuthGoogleService,
    private readonly membershipService: MembershipService,
    private readonly prisma: PrismaService,
    private readonly passwordReset: PasswordResetService,
    private readonly account: AccountService,
    @Optional() private readonly mfaPolicy?: MfaPolicyService,
    @Optional() private readonly mfa?: MfaService,
    @Optional() private readonly signup?: SignupService,
    @Optional() private readonly storeGoogle?: StoreGoogleService,
    @Optional() private readonly customers?: AuthCustomerService,
    @Optional() private readonly buyers?: CompradorService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.dispositivo);
  }

  /**
   * Figma "Recuperar contraseña": sends a single-use link by email. Always answers the
   * same, so it does not reveal whether an account exists.
   */
  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.passwordReset.requestReset(dto.email);
    return { ok: true };
  }

  /** Figma "Nueva contraseña": consumes the link and sets the new password. */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordReset.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  // Validate JWT without fetching full user data
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@CurrentUser() user: AuthenticatedUser) {
    return { valid: true, userId: user.id };
  }

  // Unlike the rest of /auth, it queries the DB on every call (not only
  // what already comes in the JWT) — the profile module needs data that
  // can change without a re-login (photo, company name) and that makes
  // no sense to embed in the signed token.
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    const userRecord = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: {
        Empresa: true,
        UsuarioPermiso: {
          include: { Permiso: { select: { nombre: true } } },
        },
      },
    });
    if (!userRecord) {
      // The JWT is still valid but the user no longer exists in the database
      // (deleted between login and this request) — rare case, but we must
      // not assume CurrentUser() always has a live record behind it.
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: userRecord.id,
      email: userRecord.email,
      nombre: userRecord.nombre,
      empresaId: userRecord.empresaId,
      empresaNombre: userRecord.Empresa.nombre,
      empresaInterna: userRecord.Empresa.interno,
      permisos: userRecord.UsuarioPermiso.map((assignment) => assignment.Permiso.nombre),
      fotoUrl: userRecord.fotoUrl,
      metodoLogin: userRecord.googleId ? 'google' : 'password',
      createdAt: userRecord.createdAt.toISOString(),
      // Fresh from the database, not from the JWT — GET /auth/me exists
      // precisely to reflect changes without waiting for a new login (see
      // the JwtPayload class comment about this limitation).
      rol: userRecord.rol,
      estadoLegajo: userRecord.estadoLegajo,
      type: 'usuario' as const,
    };
  }

  /** Mi perfil — change your own name. */
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.account.updateProfile(user.id, dto.nombre);
  }

  /** Mi perfil — change your password, confirming the current one. */
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(user.id, dto.actual, dto.nueva);
  }

  // S-V1-01: memberships of the authenticated user (read-only). Uses the
  // session's Usuario.id to resolve the canonical User through the
  // explicit link created by the backfill; without a link it returns an
  // empty list (account not yet migrated). Does not touch login, JWT,
  // /auth/me or permissions.
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Get('memberships')
  async memberships(@CurrentUser() user: AuthenticatedUser) {
    const canonical = await this.membershipService.findUserByLegacyUserId(user.id);
    if (!canonical) return [];
    return this.membershipService.getMembershipsForUser(canonical.id);
  }

  // Multi-business: switch to a different empresa
  @ApiBearerAuth()
  @CanonicalPermission(AUTHENTICATED)
  @Post('switch-empresa/:empresaId')
  @HttpCode(HttpStatus.OK)
  async switchEmpresa(
    @CurrentUser() user: AuthenticatedUser,
    @Param('empresaId') empresaId: string,
  ) {
    return this.authService.switchEmpresa(user.id, empresaId, user.mfa === true);
  }

  // Triggers the redirect to the Google consent screen. AuthGuard('google')
  // does all the work: there is no handler of its own to run, Passport
  // intercepts the request before it gets here.
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiExcludeEndpoint() // not a JSON endpoint, makes no sense in Swagge
  googleLogin() {}

  // Google redirects here after consent, with the code already exchanged
  // by Passport (GoogleStrategy.validate has already run). It does not
  // return JSON: this is a browser navigation, not a frontend fetch, so
  // the only way to hand over the token is a redirect with the token in
  // the URL. FRONTEND_URL must never point to an uncontrolled domain — if
  // an attacker managed to change that env var they would get the token
  // of anyone logging in at that moment, hence it is not derived from a
  // request header (Origin/Referer can be forged).
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req()
    req: { user: GoogleProfile; query: Record<string, unknown>; headers: { cookie?: string } },
    @Res() res: Response,
  ) {
    // The panel (Remix). FRONTEND_URL can override it; it is never taken from the request.
    const web = process.env.FRONTEND_URL || process.env.WEB_APP_URL || 'https://app.wapsell.com';
    const back = (path: string, params: Record<string, string>) => {
      const url = new URL(path, web);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      res.redirect(url.toString());
    };
    // ADR-IDN-007/008: the store, the universal buyer and «Vendé en Wapsell» share this callback
    // and carry a signed `state` (the plain staff sign-in never sends one). Only the browser that
    // started the flow gets in.
    if (this.storeGoogle?.isStoreState(req.query.state)) {
      res.clearCookie(STORE_GOOGLE_COOKIE, { path: '/auth' });
      const target = await this.storeGoogle.read(req.query.state, req.headers.cookie);
      await this.finishGoogleFlow(target, req.user, back);
      return;
    }
    await this.staffGoogle(req.user, back, false);
  }

  /** The store, buyer and «Vendé en Wapsell» flows named by a valid Google state. */
  private async finishGoogleFlow(
    target: StoreGoogleTarget | null,
    profile: GoogleProfile,
    back: (path: string, params: Record<string, string>) => void,
  ) {
    if (target?.kind === 'store' && this.customers) {
      const store = `/tienda/${encodeURIComponent(target.slug)}/cuenta`;
      try {
        const session = await this.customers.loginWithGoogleInBusiness(target.businessId, profile);
        back(`${store}/google`, {
          token: session.accessToken,
          web: target.web,
          ...(target.volver ? { volver: target.volver } : {}),
        });
      } catch {
        back(store, { error: 'google' });
      }
      return;
    }
    if (target?.kind === 'buyer' && this.buyers) {
      try {
        const session = await this.buyers.loginWithGoogle(profile);
        back('/registro/google', { token: session.accessToken, web: target.web });
      } catch {
        back('/registro', { error: 'google' });
      }
      return;
    }
    if (target?.kind === 'vender') {
      await this.staffGoogle(profile, back, true);
      return;
    }
    back('/es/auth/login', { error: 'google' });
  }

  /**
   * Google for a staff account. Without one: from «Vendé en Wapsell» the Google identity may
   * register a Business (OR-B4-045); from the Wapsell entry it continues as a buyer
   * (ADR-IDN-008), which signs in or creates the universal buyer account.
   */
  private async staffGoogle(
    profile: GoogleProfile,
    back: (path: string, params: Record<string, string>) => void,
    fromSell: boolean,
  ) {
    try {
      const session = await this.authGoogleService.loginWithGoogle(profile);
      // OR-B4-044: Google is only the first factor. An account that needs a second one gets the
      // 10-minute ticket (it only allows the second step), never a session.
      const usuarioId = session.usuario.id;
      if (this.mfa && (await this.mfaPolicy?.requiresMfa(usuarioId))) {
        const step = (await this.mfa.isActive(usuarioId)) ? 'verificar' : 'activar';
        back('/auth/google/callback', { mfa: step, ticket: await this.mfa.issueTicket(usuarioId) });
        return;
      }
      back('/auth/google/callback', { token: session.accessToken });
    } catch (error) {
      if (error instanceof GoogleAccountNotFound) {
        if (fromSell && this.signup) {
          back('/vender', { google: await this.signup.signupTicket(error.profile) });
          return;
        }
        if (!fromSell && this.buyers) {
          // The buyer flow binds the browser before any buyer session is handed over.
          back('/registro/google', {});
          return;
        }
      }
      // The exact reason is not leaked to the browser (same criterion as password login).
      back('/es/auth/login', { error: 'google' });
    }
  }
}
