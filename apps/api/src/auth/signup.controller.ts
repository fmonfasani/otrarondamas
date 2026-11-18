import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from './decorators/public.decorator';
import { SignupService } from './signup.service';
import { PROVINCIAS, RUBROS } from './signup-catalog';
import { VenderGoogleStartGuard } from './guards/store-google-start.guard';

/* eslint-disable indent */
export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombreNegocio: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsOptional() @IsString() @MaxLength(80) apellido?: string;

  // «Vendé en Wapsell» (ADR-IDN-008): checked in profileFrom (signup.service.ts).
  @IsOptional() @IsString() @MaxLength(20) cuit?: string;
  @IsOptional() @IsString() @MaxLength(160) direccion?: string;
  @IsOptional() @IsString() @MaxLength(80) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(60) provincia?: string;
  @IsOptional() @IsString() @MaxLength(10) codigoPostal?: string;
  @IsOptional() @IsString() @MaxLength(60) rubro?: string;
  @IsOptional() @IsString() @MaxLength(60) subrubro?: string;
}

export class GoogleSignupTicketDto {
  @IsString()
  @MaxLength(4000)
  ticket: string;
}

export class GoogleSignupDto extends GoogleSignupTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombreNegocio: string;

  // «Vendé en Wapsell» (ADR-IDN-008): checked in profileFrom (signup.service.ts).
  @IsOptional() @IsString() @MaxLength(20) cuit?: string;
  @IsOptional() @IsString() @MaxLength(160) direccion?: string;
  @IsOptional() @IsString() @MaxLength(80) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(60) provincia?: string;
  @IsOptional() @IsString() @MaxLength(10) codigoPostal?: string;
  @IsOptional() @IsString() @MaxLength(60) rubro?: string;
  @IsOptional() @IsString() @MaxLength(60) subrubro?: string;
}
/* eslint-enable indent */

/**
 * OR-B4-045 — public sign-up of a new Business with its Owner.
 *   POST /auth/registro                 with email (welcome email to create the password)
 *   POST /auth/registro/google/datos    who is registering, from the Google sign-up ticket
 *   POST /auth/registro/google          with Google (then MFA enrolment)
 *   GET  /auth/registro/catalogo        rubros and provinces for the form (ADR-IDN-009)
 */
@ApiTags('auth')
@Controller('auth/registro')
export class SignupController {
  constructor(private readonly signup: SignupService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new Business and its Owner (OR-B4-045)' })
  register(@Body() dto: SignupDto) {
    return this.signup.registerWithEmail(dto);
  }

  /** ADR-IDN-008: «Continuar con Google» of «Vendé en Wapsell» (shared Google callback). */
  @Public()
  @UseGuards(VenderGoogleStartGuard)
  @Get('google/iniciar')
  @ApiExcludeEndpoint()
  googleStart() {}

  @Public()
  @Get('catalogo')
  catalog() {
    return { rubros: RUBROS, provincias: PROVINCIAS };
  }

  @Public()
  @Post('google/datos')
  @HttpCode(HttpStatus.OK)
  googleDetails(@Body() dto: GoogleSignupTicketDto) {
    return this.signup.googleDetails(dto.ticket);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.CREATED)
  registerWithGoogle(@Body() dto: GoogleSignupDto) {
    const { ticket, nombreNegocio, ...profile } = dto;
    return this.signup.registerWithGoogle(ticket, nombreNegocio, profile);
  }
}
