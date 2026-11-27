import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import {
  AUTHENTICATED,
  CanonicalPermission,
} from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { NegocioService } from './negocio.service';
import { GeorefService } from './georef.service';
import { insideArgentina } from './ubicacion';
import { ownerContext, teamContext } from './team-context';

/* eslint-disable indent */
export class FindLocationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  direccion: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provincia?: string;
}

export class SetLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  /** true = show only the zone (about 1 km), never the exact point. */
  @IsBoolean()
  zona: boolean;

  @IsString()
  @MaxLength(200)
  direccion: string;
}
/* eslint-enable indent */

/**
 * Marketplace, step 4 (Owner, 2026-11-26) — the store on Wapsell's map. The team sees it; only
 * whoever changes the Business data (BRAND_MANAGE: the Owner) searches the address and confirms
 * the pin, checked here in every authorization mode.
 */
@ApiTags('negocio')
@ApiBearerAuth()
@Controller('negocio/ubicacion')
export class UbicacionController {
  constructor(
    private readonly negocio: NegocioService,
    private readonly georef: GeorefService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private owner(user: AuthenticatedUser) {
    return ownerContext(
      this.businessContext,
      user,
      'Solo el Owner cambia la ubicación del negocio',
    );
  }

  @CanonicalPermission(AUTHENTICATED)
  @Get()
  @ApiOperation({ summary: 'The store on the map, and the address to search it from' })
  async get(@CurrentUser() user: AuthenticatedUser) {
    const { companyId, role } = await teamContext(this.businessContext, user);
    return {
      ...(await this.negocio.location(companyId)),
      puedeEditar: hasCanonicalPermission(role, 'BRAND_MANAGE'),
    };
  }

  @CanonicalPermission('BRAND_MANAGE')
  @Post('buscar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Find the address with Georef (Owner)' })
  async find(@CurrentUser() user: AuthenticatedUser, @Body() dto: FindLocationDto) {
    await this.owner(user);
    return { candidatos: await this.georef.find(dto.direccion, dto.ciudad, dto.provincia) };
  }

  @CanonicalPermission('BRAND_MANAGE')
  @Put()
  @ApiOperation({ summary: 'Confirm the pin (Owner)' })
  async set(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetLocationDto) {
    const { companyId } = await this.owner(user);
    if (!insideArgentina(dto.lat, dto.lng)) {
      throw new BadRequestException('Ese punto no está en Argentina.');
    }
    return this.negocio.setLocation(companyId, user.id, {
      lat: dto.lat,
      lng: dto.lng,
      zona: dto.zona,
      direccion: dto.direccion,
    });
  }

  @CanonicalPermission('BRAND_MANAGE')
  @Delete()
  @ApiOperation({ summary: 'Take the store off the map (Owner)' })
  async remove(@CurrentUser() user: AuthenticatedUser) {
    const { companyId } = await this.owner(user);
    return this.negocio.setLocation(companyId, user.id, null);
  }
}
