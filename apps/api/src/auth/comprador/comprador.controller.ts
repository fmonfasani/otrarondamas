import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../decorators/public.decorator';
import { BuyerGoogleStartGuard } from '../guards/store-google-start.guard';
import { CompradorService } from './comprador.service';

/* eslint-disable indent */
export class BuyerSignupDto {
  @IsString() @MinLength(2) @MaxLength(120) nombre: string;
  @IsEmail() @MaxLength(200) email: string;
  @IsString() @MinLength(8) @MaxLength(200) password: string;
}

export class BuyerLoginDto {
  @IsEmail() @MaxLength(200) email: string;
  @IsString() @MinLength(1) @MaxLength(200) password: string;
}

export class BuyerVerifyDto {
  @IsString() @MinLength(10) @MaxLength(200) token: string;
}
/* eslint-enable indent */

const bearer = (header: string | undefined) => {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new UnauthorizedException('Ingresá con tu cuenta.');
  return token;
};

/**
 * ADR-IDN-001/008 — the universal buyer account.
 *   POST /auth/comprador/registro            email + password; a verification email follows
 *   POST /auth/comprador/verificar           the email link → buyer session
 *   POST /auth/comprador/login               email + password of a verified buyer
 *   GET  /auth/comprador/google              «Continuar con Google» (shared callback)
 *   GET  /auth/comprador/me                  who the buyer session is
 *   GET  /auth/comprador/negocios            businesses on Wapsell (public store data)
 *   POST /auth/comprador/negocio/:slug       enter one store → that store's customer session
 * Buyer sessions are not accepted by the global JWT guard (they carry `typ`): these endpoints
 * are @Public and read the buyer token themselves.
 */
@ApiTags('auth-comprador')
@Controller('auth/comprador')
export class CompradorController {
  constructor(private readonly buyers: CompradorService) {}

  @Public()
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: BuyerSignupDto) {
    return this.buyers.register(dto);
  }

  @Public()
  @Post('verificar')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: BuyerVerifyDto) {
    return this.buyers.verify(dto.token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: BuyerLoginDto) {
    return this.buyers.login(dto.email, dto.password);
  }

  @Public()
  @UseGuards(BuyerGoogleStartGuard)
  @Get('google')
  @ApiExcludeEndpoint()
  google() {}

  @Public()
  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.buyers.fromSession(bearer(authorization));
  }

  @Public()
  @Get('negocios')
  businesses() {
    return this.buyers.businesses();
  }

  @Public()
  @Post('negocio/:businessSlug')
  @HttpCode(HttpStatus.OK)
  enter(
    @Param('businessSlug') businessSlug: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.buyers.enterBusiness(bearer(authorization), businessSlug);
  }
}
