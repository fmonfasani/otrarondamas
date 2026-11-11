import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
    return this.authService.switchEmpresa(user.id, empresaId);
  }

  // Triggers the redirect to the Google consent screen. AuthGuard('google')
  // does all the work: there is no handler of its own to run, Passport
  // intercepts the request before it gets here.
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiExcludeEndpoint() // not a JSON endpoint, makes no sense in Swagger
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
  async googleCallback(@Req() req: { user: GoogleProfile }, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no configurado (ver apps/api/.env)');
    }

    try {
      const session = await this.authGoogleService.loginWithGoogle(req.user);
      const redirectUrl = new URL('/auth/google/callback', frontendUrl);
      redirectUrl.searchParams.set('token', session.accessToken);
      res.redirect(redirectUrl.toString());
    } catch {
      // The exact reason is not leaked to the browser (same criterion as
      // password login): the frontend login screen interprets ?error=google
      // and shows a generic message.
      const redirectUrl = new URL('/login', frontendUrl);
      redirectUrl.searchParams.set('error', 'google');
      res.redirect(redirectUrl.toString());
    }
  }
}
