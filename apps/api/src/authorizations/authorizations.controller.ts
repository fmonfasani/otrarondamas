import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationsService } from './authorizations.service';
import { RequestAuthorizationDto } from './dto/request-authorization.dto';

/**
 * D-06. No @RequirePermission here: any authenticated user can REQUEST an
 * authorization (e.g. the seller blocked at cash register closing) — the
 * real restriction is in authorizations.service.ts, on the credentials
 * that arrive in the body (who GRANTS the authorization), not on who
 * asks for it.
 */
@ApiTags('autorizaciones')
@ApiBearerAuth()
@Controller('autorizaciones')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class AuthorizationsController {
  constructor(private readonly authorizationsService: AuthorizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async authorize(@Body() dto: RequestAuthorizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authorizationsService.authorize(user.empresaId, dto, user.id);
  }
}
