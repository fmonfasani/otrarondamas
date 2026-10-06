import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-08, limited scope: manual payments on a sale (see
 * payments.service.ts). Nested under /ventas/:ventaId because in this
 * increment a Pago is always associated with a Venta — there is no
 * payments endpoint on Deuda/current account yet.
 */
@ApiTags('pagos')
@ApiBearerAuth()
@Controller('ventas/:ventaId/pagos')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  // The 'ventas.crear' permission is reused (no 'pagos.crear' is invented):
  // the seed's permission catalog does not have that permission, and creating
  // a new one without a decision on which role holds it would be an
  // unauthorized business rule. Registering the payment of a sale is
  // treated, in this increment, as part of the same sale operation.
  @RequirePermission('ventas.crear')
  @Post()
  async create(
    @Param('ventaId') saleId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.create(
      saleId,
      dto,
      await this.resolveCompanyIdFromContext(user),
      user.id,
    );
  }

  @Get()
  async findAll(@Param('ventaId') saleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.findBySale(saleId, await this.resolveCompanyIdFromContext(user));
  }
}
