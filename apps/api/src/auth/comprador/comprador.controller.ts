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
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth.types';
import {
  AUTHENTICATED,
  CanonicalPermission,
} from '../../authorization/canonical-permission.decorator';

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

/** Login por rol: the customer account's password, to join it to the work account. */
export class LinkPasswordDto {
  @IsString() @MinLength(1) @MaxLength(200) password: string;
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
  google() {
    // BuyerGoogleStartGuard redirects to Google before this runs.
  }

  @Public()
  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.buyers.fromSession(bearer(authorization));
  }

  /**
   * Login por rol (Owner, 2026-11-26) — the work account and the customer account of the same
   * person: how they stand, and joining them once (password, one click, or an emailed link).
   * Work sessions only (the global guard checks the staff token; the service refuses others).
   */
  @CanonicalPermission(AUTHENTICATED)
  @Get('vinculo')
  linkStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.buyers.linkStatus(user);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('vinculo/entrar')
  @HttpCode(HttpStatus.OK)
  enterAsBuyer(@CurrentUser() user: AuthenticatedUser) {
    return this.buyers.enterAsBuyer(user);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('vinculo/clave')
  @HttpCode(HttpStatus.OK)
  linkWithPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkPasswordDto) {
    return this.buyers.linkWithPassword(user, dto.password);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('vinculo/crear')
  @HttpCode(HttpStatus.OK)
  linkCreate(@CurrentUser() user: AuthenticatedUser) {
    return this.buyers.linkCreate(user);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('vinculo/mail')
  @HttpCode(HttpStatus.OK)
  linkByEmail(@CurrentUser() user: AuthenticatedUser) {
    return this.buyers.linkByEmail(user);
  }

  @CanonicalPermission(AUTHENTICATED)
  @Post('vinculo/confirmar')
  @HttpCode(HttpStatus.OK)
  linkWithToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: BuyerVerifyDto) {
    return this.buyers.linkWithToken(user, dto.token);
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
