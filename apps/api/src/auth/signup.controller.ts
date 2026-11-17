import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from './decorators/public.decorator';
import { SignupService } from './signup.service';

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
}
/* eslint-enable indent */

/**
 * OR-B4-045 — public sign-up of a new Business with its Owner.
 *   POST /auth/registro                 with email (welcome email to create the password)
 *   POST /auth/registro/google/datos    who is registering, from the Google sign-up ticket
 *   POST /auth/registro/google          with Google (then MFA enrolment)
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
    return this.signup.registerWithGoogle(dto.ticket, dto.nombreNegocio);
  }
}
