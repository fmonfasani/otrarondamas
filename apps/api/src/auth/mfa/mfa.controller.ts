import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth.types';
import { AuthService } from '../auth.service';
import { MfaService } from './mfa.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessContextService } from '../../business-context/business-context.service';
import {
  AUTHENTICATED,
  CanonicalPermission,
} from '../../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../../authorization/canonical-permissions';

/* eslint-disable indent */
export class MfaTicketDto {
  @IsString()
  @MaxLength(2000)
  ticket: string;
}

export class MfaConfirmDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ticket?: string;

  @IsString()
  @Length(6, 8)
  codigo: string;

  @IsOptional()
  @IsBoolean()
  recordar?: boolean;
}

export class MfaVerifyDto {
  @IsString()
  @MaxLength(2000)
  ticket: string;

  @IsOptional()
  @IsString()
  @Length(6, 8)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoRecuperacion?: string;

  @IsOptional()
  @IsBoolean()
  recordar?: boolean;
}

export class MfaCodeDto {
  @IsString()
  @Length(6, 8)
  codigo: string;
}
/* eslint-enable indent */

/**
 * OR-B4-044 — second factor with an authenticator app.
 *
 * With the ticket from POST /auth/login (password already checked):
 *   POST /auth/mfa/activar/iniciar     QR secret for a first enrolment
 *   POST /auth/mfa/activar/confirmar   code → recovery codes + session (+ remembered device)
 *   POST /auth/mfa/verificar           code or recovery code → session (+ remembered device)
 * Signed in:
 *   GET  /auth/mfa                     state of my second factor
 *   POST /auth/mfa/iniciar|confirmar   turn it on by choice (Vendedor, Gestor de stock)
 *   POST /auth/mfa/codigos             new recovery codes (needs a code)
 *   POST /auth/mfa/desactivar          turn it off, only when it is optional (needs a code)
 *   PATCH /auth/mfa/equipo/:membershipId/resetear   the Owner resets a teammate's factor
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  // ---------------------------------------------------------------- with a ticket

  @Public()
  @Post('activar/iniciar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the first enrolment with the ticket from the login' })
  async startWithTicket(@Body() dto: MfaTicketDto) {
    return this.mfa.startEnrollment(await this.mfa.readTicket(dto.ticket));
  }

  @Public()
  @Post('activar/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm the first enrolment and get the session' })
  async confirmWithTicket(@Body() dto: MfaConfirmDto) {
    const usuarioId = await this.mfa.readTicket(dto.ticket ?? '');
    const { codigosRecuperacion } = await this.mfa.confirmEnrollment(usuarioId, dto.codigo);
    const dispositivo = dto.recordar ? await this.mfa.rememberDevice(usuarioId) : null;
    return { ...(await this.auth.sessionAfterMfa(usuarioId)), codigosRecuperacion, dispositivo };
  }

  @Public()
  @Post('verificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Second step of the sign-in' })
  async verify(@Body() dto: MfaVerifyDto) {
    const usuarioId = await this.mfa.readTicket(dto.ticket);
    const { dispositivo } = await this.mfa.verify(
      usuarioId,
      { codigo: dto.codigo, codigoRecuperacion: dto.codigoRecuperacion },
      dto.recordar === true,
    );
    return { ...(await this.auth.sessionAfterMfa(usuarioId)), dispositivo };
  }

  // ---------------------------------------------------------------- signed in

  @CanonicalPermission(AUTHENTICATED)
  @Get()
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.status(user.id);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('iniciar')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: AuthenticatedUser) {
    return this.mfa.startEnrollment(user.id);
  }

  /** Turning it on keeps the person signed in: the answer carries a session that passed MFA. */
  @CanonicalPermission(AUTHENTICATED)
  @Post('confirmar')
  @HttpCode(HttpStatus.OK)
  async confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaConfirmDto) {
    const { codigosRecuperacion } = await this.mfa.confirmEnrollment(user.id, dto.codigo);
    return { ...(await this.auth.sessionAfterMfa(user.id)), codigosRecuperacion };
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('codigos')
  @HttpCode(HttpStatus.OK)
  regenerate(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    return this.mfa.regenerateRecoveryCodes(user.id, dto.codigo);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('desactivar')
  @HttpCode(HttpStatus.OK)
  async disable(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    await this.mfa.disable(user.id, dto.codigo);
    return { ok: true };
  }

  @CanonicalPermission('USERS_MANAGE')
  @Patch('equipo/:membershipId/resetear')
  async resetTeammate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
  ) {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    // Only the Owner, and never on another Owner (an Owner who lost everything is helped by Wapsell).
    if (context.role !== 'OWNER' || !hasCanonicalPermission(context.role, 'USERS_MANAGE')) {
      throw new ForbiddenException('Solo el Owner puede resetear la verificación de su equipo.');
    }
    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, businessId: context.businessId },
      select: { role: true, User: { select: { usuarioId: true } } },
    });
    if (!target?.User.usuarioId) throw new NotFoundException('No está en tu equipo.');
    if (target.role === 'OWNER') {
      throw new ForbiddenException('La verificación de un Owner solo la resetea Wapsell.');
    }
    const companyId = await this.businessContext.resolveCompanyId(context.businessId);
    return this.mfa.resetForTeammate(user.id, target.User.usuarioId, companyId);
  }
}
