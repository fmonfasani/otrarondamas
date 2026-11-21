import { Body, Controller, ForbiddenException, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import {
  AUTHENTICATED,
  CanonicalPermission,
} from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { NegocioService } from './negocio.service';

/* eslint-disable indent */
export class UpdateNegocioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  horario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  // OR-B4-046 rule 3: hide published products without stock instead of showing «Sin stock».
  @IsOptional()
  @IsBoolean()
  ocultarSinStock?: boolean;
}
/* eslint-enable indent */

/** OR-B4-051 rule 1: the payment-method discounts (0 means none). */
export class UpdatePricingDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50)
  descuentoEfectivo: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(50)
  descuentoTransferencia: number;
}

/**
 * Ajustes del negocio. GET /negocio: any member of the Business's team. PATCH /negocio: the
 * Owner (BRAND_MANAGE — the Business's identity), checked against the role matrix here so
 * it holds in every authorization mode.
 */
@ApiTags('negocio')
@ApiBearerAuth()
@Controller('negocio')
export class NegocioController {
  constructor(
    private readonly negocio: NegocioService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async context(user: AuthenticatedUser) {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    if (!context.role) throw new ForbiddenException('Solo el equipo del negocio');
    return {
      role: context.role,
      companyId: await this.businessContext.resolveCompanyId(context.businessId),
    };
  }

  @CanonicalPermission(AUTHENTICATED)
  @Get()
  @ApiOperation({ summary: 'The Business name and contact details' })
  async get(@CurrentUser() user: AuthenticatedUser) {
    const { companyId, role } = await this.context(user);
    return {
      ...(await this.negocio.get(companyId)),
      puedeEditar: hasCanonicalPermission(role, 'BRAND_MANAGE'),
      puedeEditarPrecios: hasCanonicalPermission(role, 'PRICING_CHANGE'),
    };
  }

  @CanonicalPermission('BRAND_MANAGE')
  @Patch()
  @ApiOperation({ summary: 'Change the Business name and contact details (Owner)' })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNegocioDto) {
    const { companyId, role } = await this.context(user);
    if (!hasCanonicalPermission(role, 'BRAND_MANAGE')) {
      throw new ForbiddenException('Solo el Owner cambia los datos del negocio');
    }
    return {
      ...(await this.negocio.update(companyId, user.id, dto)),
      puedeEditar: true,
      puedeEditarPrecios: true,
    };
  }

  /**
   * OR-B4-051 rule 1 (stage C4) — the payment-method discounts. They are prices, so whoever changes
   * prices sets them (PRICING_CHANGE: Owner and Admin), checked here in every authorization mode.
   */
  @CanonicalPermission('PRICING_CHANGE')
  @Patch('precios')
  @ApiOperation({ summary: 'Change the payment-method discounts (Owner, Admin)' })
  async updatePricing(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePricingDto) {
    const { companyId, role } = await this.context(user);
    if (!hasCanonicalPermission(role, 'PRICING_CHANGE')) {
      throw new ForbiddenException('Solo el Owner o un Administrador cambian los precios');
    }
    return this.negocio.updatePricing(companyId, user.id, dto);
  }
}
