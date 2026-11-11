import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import {
  CanonicalPermission,
  AUTHENTICATED,
} from '../authorization/canonical-permission.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Get list of all empresas the authenticated user has access to.
   * Useful for populating a company switcher dropdown.
   */
  @CanonicalPermission(AUTHENTICATED)
  @Get('my-empresas')
  async getMyEmpresas(@CurrentUser() user: AuthenticatedUser) {
    const empresas = await this.tenantsService.getMyEmpresas(user.id);
    return {
      empresas,
      current: user.empresaId,
    };
  }
}
