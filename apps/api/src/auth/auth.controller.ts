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
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser, PerfilUsuario } from './auth.types';
import { GooglePerfil } from './google.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authGoogleService: AuthGoogleService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // A diferencia del resto de /auth, consulta la DB en cada llamada (no
  // solo lo que ya viene en el JWT) — el módulo de perfil necesita datos
  // que pueden cambiar sin relogin (foto, nombre de empresa) y que no
  // tiene sentido embeber en el token firmado.
  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<PerfilUsuario> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: { empresa: true },
    });
    if (!usuario) {
      // El JWT sigue siendo válido pero el usuario ya no existe en la
      // base (borrado entre el login y esta request) — caso raro, pero
      // no hay que asumir que CurrentUser() siempre tiene un registro
      // vivo detrás.
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      empresaId: usuario.empresaId,
      empresaNombre: usuario.empresa.nombre,
      permisos: user.permisos,
      fotoUrl: usuario.fotoUrl,
      metodoLogin: usuario.googleId ? 'google' : 'password',
      createdAt: usuario.createdAt.toISOString(),
    };
  }

  // Dispara el redirect a la pantalla de consentimiento de Google.
  // AuthGuard('google') hace todo el trabajo: no hay handler propio que
  // ejecutar, Passport intercepta la request antes de llegar acá.
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiExcludeEndpoint() // no es un endpoint JSON, no tiene sentido en Swagger
  googleLogin() {}

  // Google redirige acá después del consentimiento, con el código ya
  // canjeado por Passport (GoogleStrategy.validate ya corrió). No devuelve
  // JSON: esta es una navegación del navegador, no un fetch del frontend,
  // así que la única forma de pasarle el token es un redirect con el
  // token en la URL. FRONTEND_URL nunca debe apuntar a un dominio no
  // controlado — si un atacante lograra cambiar esa env var tendría el
  // token de cualquiera que loguee en ese momento, de ahí que no se derive
  // de un header de la request (Origin/Referer son falsificables).
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: { user: GooglePerfil }, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no configurado (ver apps/api/.env)');
    }

    try {
      const sesion = await this.authGoogleService.loginConGoogle(req.user);
      const redirectUrl = new URL('/auth/google/callback', frontendUrl);
      redirectUrl.searchParams.set('token', sesion.accessToken);
      res.redirect(redirectUrl.toString());
    } catch {
      // No se filtra el motivo exacto al navegador (mismo criterio que
      // login por password): la pantalla de login del frontend interpreta
      // ?error=google y muestra un mensaje genérico.
      const redirectUrl = new URL('/login', frontendUrl);
      redirectUrl.searchParams.set('error', 'google');
      res.redirect(redirectUrl.toString());
    }
  }
}
