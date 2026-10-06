import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CashRegisterService } from './cash-register.service';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { RegisterMovementDto } from './dto/register-movement.dto';
import { RegisterCashCountDto } from './dto/register-cash-count.dto';
import { AuthorizeCashCountDto } from './dto/authorize-cash-count.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-09 (cash register and cash counts). See cash-register.service.ts for
 * the detail of each rule (D-05 unconfirmed, double confirmation of the
 * cash count). D-06 (authorization mechanism) connected — see
 * authorizeCashCount() and authorizations.service.ts.
 *
 * Permissions (audit 21/09/2026, see docs/scaffolding-notas.md): the SDD
 * (RF-09) only explicitly restricts 'expenses and withdrawals' — covered
 * by @RequirePermission('caja.gastos') in registerMovement. It does not
 * ask to restrict viewing the status, opening a shift, viewing the
 * movements of one's own shift, nor counting cash: they are normal
 * operations of any logged-in seller during their shift, with no extra
 * permission (same criterion as users.controller.ts on GET /usuarios).
 * close() DOES require caja.gastos: it irreversibly consolidates the shift
 * (no reopen endpoint) — explicit decision of the owner to treat it with
 * the same weight as expenses/withdrawals, although the SDD does not ask
 * for it in those exact terms.
 */
@ApiTags('caja')
@ApiBearerAuth()
@Controller('caja')
// RF-17: the cash register is the most sensitive business operation of the
// panel (opens/closes a shift, handles cash) — an account with a PENDIENTE
// dossier cannot touch anything here, no exceptions. See
// ApprovedDossierGuard.
@UseGuards(ApprovedDossierGuard)
export class CashRegisterController {
  constructor(
    private readonly cashRegisterService: CashRegisterService,
    private readonly businessContext: BusinessContextService,
  ) {}

  // S-V1-13: the tenant comes from the ACTIVE Membership (BusinessContext),
  // not from the legacy `empresaId` claim of the JWT. user.id stays the
  // legacy Usuario id: the cash FKs (usuarioId, ...) point to Usuario.
  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @Get('estado')
  async status(@CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.status(await this.resolveCompanyIdFromContext(user));
  }

  @Post('apertura')
  async open(@Body() dto: OpenCashRegisterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.open(
      dto,
      await this.resolveCompanyIdFromContext(user),
      user.id,
    );
  }

  // RF-09: 'expenses and withdrawals only by the owner or authorized users'
  // — the already existing 'caja.gastos' permission in the seed's permission
  // catalog is reused for ALL manual movement types
  // (Ingreso/Egreso/Gasto/Retiro), not only expenses: the seed has no more
  // granular permission per type, and creating a new one without a decision
  // on which role holds it would be an unauthorized business rule.
  @RequirePermission('caja.gastos')
  @Post('movimientos')
  async registerMovement(@Body() dto: RegisterMovementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.registerMovement(
      dto,
      await this.resolveCompanyIdFromContext(user),
      user.id,
    );
  }

  @Get('movimientos')
  async listMovements(@CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.listMovements(await this.resolveCompanyIdFromContext(user));
  }

  @Post('arqueo')
  async countCash(@Body() dto: RegisterCashCountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.countCash(
      dto,
      await this.resolveCompanyIdFromContext(user),
      user.id,
    );
  }

  // D-06: no @RequirePermission of its own — the real restriction is in the
  // credentials of the body (who authorizes), not in who requests. See
  // authorizations.service.ts.
  @Patch('arqueo/:id/autorizar')
  async authorizeCashCount(
    @Param('id') id: string,
    @Body() dto: AuthorizeCashCountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashRegisterService.authorizeCashCount(
      await this.resolveCompanyIdFromContext(user),
      id,
      dto,
      user.id,
    );
  }

  // Closes the shift irreversibly (no reopen endpoint) — same permission as
  // expenses/withdrawals, see the controller comment.
  @RequirePermission('caja.gastos')
  @Post('cierre')
  async close(@CurrentUser() user: AuthenticatedUser) {
    return this.cashRegisterService.close(await this.resolveCompanyIdFromContext(user), user.id);
  }
}
