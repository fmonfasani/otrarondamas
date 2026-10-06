import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuoteSaleDto } from './dto/quote-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * RF-05: in-person sales. No DELETE — INV-02 forbids physically deleting
 * a confirmed sale; cancellations/returns are separate linked operations
 * (RF-05, RF-12), not implemented yet.
 */
@ApiTags('ventas')
@ApiBearerAuth()
@Controller('ventas')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // Inc-1: product search for the New sale screen (RF-VTA-02). Route before
  // ':id' so that Express does not interpret 'productos' as an ID.
  @Get('productos')
  searchProducts(@Query('search') search: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.searchProducts(user.empresaId, search ?? '');
  }

  // Inc-2 (RF-VTA-09, RF-VTA-10): preliminary quote without creating the
  // sale. The frontend calls it 300 ms after the last change in the cart to
  // show the exact total computed with Prisma.Decimal on the server.
  @RequirePermission('ventas.crear')
  @Post('cotizacion')
  @HttpCode(HttpStatus.OK)
  quote(@Body() dto: QuoteSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.quote(dto, user.empresaId);
  }

  @RequirePermission('ventas.crear')
  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.create(dto, user.empresaId, user.id);
  }

  @RequirePermission('ventas.ver')
  @Get()
  findAll(@Query() dto: ListSalesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findAll(user.empresaId, dto);
  }

  @RequirePermission('ventas.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findOne(id, user.empresaId);
  }

  @RequirePermission('ventas.ver')
  @Get(':id/comprobante')
  getReceipt(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.getReceipt(id, user.empresaId);
  }

  // Inc-3 (RF-VTA-14, RF-VTA-15, RF-VTA-16): record a payment on a sale.
  @RequirePermission('ventas.crear')
  @Post(':id/pagos')
  @HttpCode(HttpStatus.CREATED)
  createPayment(
    @Param('id') id: string,
    @Body() dto: CreateSalePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.createPayment(id, dto, user.empresaId, user.id);
  }
}
