import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvitacionesService } from './invitaciones.service';
import { CrearInvitacionDto } from './dto/crear-invitacion.dto';
import { ActivarInvitacionDto } from './dto/activar-invitacion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RF-17 (docs/spec-login-roles.md): crear() requiere usuarios.gestionar
 * (mismo permiso que ya protege el alta/gestión de cuentas). activar()
 * es @Public() — la persona invitada todavía no tiene sesión, el token
 * de la invitación ES su credencial en ese momento.
 */
@ApiTags('invitaciones')
@Controller('invitaciones')
export class InvitacionesController {
  constructor(
    private readonly invitacionesService: InvitacionesService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiBearerAuth()
  @RequierePermiso('usuarios.gestionar')
  @Post()
  crear(@Body() dto: CrearInvitacionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invitacionesService.crear(user.empresaId, user.id, dto);
  }

  @ApiBearerAuth()
  @RequierePermiso('usuarios.gestionar')
  @Get()
  async listar(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.invitacion.findMany({
      where: { empresaId: user.empresaId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        rol: true,
        expiraEn: true,
        usadaEn: true,
        createdAt: true,
        // Nunca se expone `token` en un listado — solo en la respuesta
        // de crear() (una sola vez, para el dueño copiarlo si el email
        // no salió) y en el link que el email en sí ya contiene.
      },
    });
  }

  @Public()
  @Post('activar')
  @HttpCode(HttpStatus.OK)
  activar(@Body() dto: ActivarInvitacionDto) {
    return this.invitacionesService.activar(dto);
  }
}
