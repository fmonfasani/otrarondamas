import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from '../sales/sales.service';
import { CreateSalePaymentDto } from '../sales/dto/create-sale-payment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('pagos')
@ApiBearerAuth()
@Controller('ventas/:ventaId/pagos')
@UseGuards(ApprovedDossierGuard)
export class PaymentsController {
  constructor(
    private readonly salesService: SalesService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('ventas.crear')
  @Post()
  async create(
    @Param('ventaId') saleId: string,
    @Body() dto: CreateSalePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.createPayment(
      saleId,
      dto,
      await this.resolveCompanyIdFromContext(user),
      user.id,
    );
  }

  @Get()
  async findAll(@Param('ventaId') saleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findPaymentsBySale(
      saleId,
      await this.resolveCompanyIdFromContext(user),
    );
  }
}
