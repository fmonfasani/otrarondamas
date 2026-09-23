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
import { AuthClienteService } from './auth.cliente.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.types';
import { GooglePerfil } from './google.strategy';

/**
 * RF-17 (docs/spec-login-roles.md): endpoints de autenticación del lado
 * Cliente — puerta de entrada en otrarondamas.wapsell.com (tienda online),
 * separada del panel de admin (admin.otrarondamas.wapsell.com).
 *
 * Registro y login usan TIENDA_EMPRESA_ID para saber a qué empresa
 * pertenece esta tienda pública (mismo patrón que tienda.service.ts).
 * El Google OAuth del cliente redirige al callback de la tienda, no al
 * panel de admin — ver `TIENDA_FRONTEND_URL` env var.
 */
@ApiTags('auth-cliente')
@Controller('auth/cliente')
export class AuthClienteController {
  constructor(
    private readonly authClienteService: AuthClienteService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Auto-registro público — solo para Cliente minorista.
   * Usa TIENDA_EMPRESA_ID para saber a qué empresa vincular el cliente.
   */
  @Public()
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  async registro(@Body() dto: RegistroClienteDto) {
    const empresaId = process.env.TIENDA_EMPRESA_ID;
    if (!empresaId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }
    return this.authClienteService.registrar(empresaId, dto);
  }

  /**
   * Login para cualquier Cliente (minorista o mayorista). El JWT
   * resultante incluye `esMayorista` para que el frontend pueda saber
   * si mostrar el flujo de legajo.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const empresaId = process.env.TIENDA_EMPRESA_ID;
    if (!empresaId) {
      throw new Error('TIENDA_EMPRESA_ID no configurado');
    }
    return this.authClienteService.login(empresaId, dto);
  }

  /**
   * Perfil fresco del Cliente autenticado — paralelo a GET /auth/me
   * para Usuario. Solo accesible con un token de tipo 'cliente'.
   */
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (user.type !== 'cliente') {
      throw new NotFoundException('Endpoint solo para clientes');
    }
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: user.id },
      include: { empresa: true },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      empresaId: cliente.empresaId,
      empresaNombre: cliente.empresa.nombre,
      esMayorista: cliente.esMayorista,
      estadoLegajo: cliente.estadoLegajo,
      metodoLogin: cliente.googleId ? 'google' : 'password',
      createdAt: cliente.createdAt.toISOString(),
    };
  }

  // Google OAuth para la tienda online. La estrategia Passport 'google'
  // es la misma que la del panel de admin (mismo GOOGLE_CLIENT_ID/SECRET)
  // pero el callback diferencia el destino por la URL a la que redirige.
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiExcludeEndpoint()
  googleLogin() {}

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: { user: GooglePerfil }, @Res() res: Response) {
    // La tienda redirige a TIENDA_FRONTEND_URL (puede ser distinta de
    // FRONTEND_URL que apunta al panel de admin). Si no está configurada,
    // cae de vuelta a FRONTEND_URL — de ese modo no rompe un deploy que
    // todavía no configuró la variable de la tienda.
    const tiendaUrl = process.env.TIENDA_FRONTEND_URL || process.env.FRONTEND_URL;
    if (!tiendaUrl) {
      throw new Error('TIENDA_FRONTEND_URL / FRONTEND_URL no configurado');
    }

    try {
      const sesion = await this.authClienteService.loginConGoogle(req.user);
      const redirectUrl = new URL('/auth/google/callback', tiendaUrl);
      redirectUrl.searchParams.set('token', sesion.accessToken);
      res.redirect(redirectUrl.toString());
    } catch {
      const redirectUrl = new URL('/login', tiendaUrl);
      redirectUrl.searchParams.set('error', 'google');
      res.redirect(redirectUrl.toString());
    }
  }
}
