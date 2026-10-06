import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ActivateInvitationDto } from './dto/activate-invitation.dto';
import { CreateWholesaleInvitationDto } from './dto/create-wholesale-invitation.dto';
import { ActivateWholesaleInvitationDto } from './dto/activate-wholesale-invitation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RF-17 (docs/spec-login-roles.md): create() requires usuarios.gestionar
 * (same permission that already protects account creation/management).
 * activate() is @Public() — the invited person has no session yet, the
 * invitation token IS their credential at that moment.
 */
@ApiTags('invitaciones')
@Controller('invitaciones')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiBearerAuth()
  @RequirePermission('usuarios.gestionar')
  @Post()
  create(@Body() dto: CreateInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.create(user.empresaId, user.id, dto);
  }

  @ApiBearerAuth()
  @RequirePermission('usuarios.gestionar')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
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
  activate(@Body() dto: ActivateInvitationDto) {
    return this.invitationsService.activate(dto);
  }

  // --- Mayorista (Cliente B2B) ---

  /**
   * The owner invites a new wholesale customer. Creates an Invitacion that
   * can only be activated at the wholesale activation endpoint (not at the
   * Usuario activation one, which creates a Usuario).
   */
  @ApiBearerAuth()
  @RequirePermission('usuarios.gestionar')
  @Post('mayorista')
  createWholesale(
    @Body() dto: CreateWholesaleInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.createWholesale(user.empresaId, user.id, dto);
  }

  /**
   * The invited wholesale customer activates their account. @Public()
   * because they have no session yet — the invitation token is their
   * credential.
   */
  @Public()
  @Post('mayorista/activar')
  @HttpCode(HttpStatus.OK)
  activateWholesale(@Body() dto: ActivateWholesaleInvitationDto) {
    return this.invitationsService.activateWholesale(dto);
  }
}
