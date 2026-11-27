import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import {
  AUTHENTICATED,
  CanonicalPermission,
} from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { NegocioService } from './negocio.service';
import { ownerContext, teamContext } from './team-context';
import { MAX_FEE_PESOS, MAX_RADIUS_KM, WAPSELL_DELIVERY } from './envio';

/* eslint-disable indent */
export class SetDeliveryDto {
  @IsBoolean()
  envio: boolean;

  @IsBoolean()
  retiro: boolean;

  @IsInt()
  @Min(1, { message: 'El radio es de 1 km como mínimo.' })
  @Max(MAX_RADIUS_KM, { message: `El radio es de ${MAX_RADIUS_KM} km como máximo.` })
  radioKm: number;

  @IsInt()
  @Min(WAPSELL_DELIVERY.base, { message: 'La base del envío es de $ 2.500 como mínimo.' })
  @Max(MAX_FEE_PESOS)
  base: number;

  @IsInt()
  @Min(WAPSELL_DELIVERY.porKm, { message: 'Cada km cuesta $ 500 como mínimo.' })
  @Max(MAX_FEE_PESOS)
  porKm: number;
}
/* eslint-enable indent */

/**
 * OR-B4-054 — the store's delivery and pickup, in Ajustes. The team sees them; only whoever
 * changes the Business data (BRAND_MANAGE: the Owner) changes them, checked here in every
 * authorization mode.
 */
@ApiTags('negocio')
@ApiBearerAuth()
@Controller('negocio/envios')
export class EnviosController {
  constructor(
    private readonly negocio: NegocioService,
    private readonly businessContext: BusinessContextService,
  ) {}

  @CanonicalPermission(AUTHENTICATED)
  @Get()
  @ApiOperation({ summary: 'Delivery and pickup of the store' })
  async get(@CurrentUser() user: AuthenticatedUser) {
    const { companyId, role } = await teamContext(this.businessContext, user);
    return {
      ...(await this.negocio.delivery(companyId)),
      puedeEditar: hasCanonicalPermission(role, 'BRAND_MANAGE'),
    };
  }

  @CanonicalPermission('BRAND_MANAGE')
  @Put()
  @ApiOperation({ summary: 'Set delivery and pickup (Owner)' })
  async set(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetDeliveryDto) {
    const { companyId } = await ownerContext(
      this.businessContext,
      user,
      'Solo el Owner cambia los envíos del negocio',
    );
    return this.negocio.setDelivery(companyId, user.id, dto);
  }
}
