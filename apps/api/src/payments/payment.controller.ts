import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import { StripeProviderService } from './providers/stripe-provider.service';
import { MercadoPagoProviderService } from './providers/mercadopago-provider.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';

@ApiTags('pagos')
@ApiBearerAuth()
@Controller('pagos')
@UseGuards(ApprovedDossierGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly businessContext: BusinessContextService,
    private readonly stripeProvider: StripeProviderService,
    private readonly mpProvider: MercadoPagoProviderService,
  ) {}

  private async resolveEmpresaId(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  /**
   * POST /pagos/intents - Create payment intent
   */
  @RequirePermission('ventas.crear')
  @CanonicalPermission('PAYMENTS_REGISTER')
  @Post('intents')
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.createPaymentIntent(empresaId, dto.ventaId, dto);
  }

  /**
   * POST /pagos/confirm - Confirm payment
   */
  @RequirePermission('ventas.editar')
  @CanonicalPermission('PAYMENTS_REGISTER')
  @Post('confirm')
  async confirmPayment(@Body() dto: ConfirmPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.confirmPayment(empresaId, dto);
  }

  /**
   * GET /pagos/:id - Get payment details
   */
  @Get(':id')
  async getPaymentDetail(
    @Param('id') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.getPaymentDetail(empresaId, paymentId);
  }

  /**
   * GET /pagos - List payments (paginated)
   */
  @Get()
  async listPayments(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('estado') estado?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.getPaymentsByBusiness(
      empresaId,
      parseInt(skip || '0'),
      parseInt(take || '20'),
      estado,
    );
  }

  /**
   * POST /pagos/:id/refund - Initiate refund
   */
  @RequirePermission('ventas.reembolsar')
  @CanonicalPermission('PAYMENTS_REFUND')
  @Post(':id/refund')
  async refundPayment(
    @Param('id') paymentId: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.refundPayment(empresaId, paymentId, dto);
  }

  /**
   * GET /pagos/:id/refund - Get refund status
   */
  @Get(':id/refund')
  async getRefundStatus(@Param('id') paymentId: string, @CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    return this.paymentService.getRefundStatus(empresaId, paymentId);
  }

  /**
   * POST /pagos/webhooks/stripe - Stripe webhook endpoint
   * Signature header: stripe-signature
   */
  @Post('webhooks/stripe')
  async handleStripeWebhook(@Headers('stripe-signature') signature: string, @Body() payload: any) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const verification = await this.stripeProvider.verifyWebhookSignature(signature, payload);
    if (!verification.valid) {
      throw new BadRequestException('Invalid stripe signature');
    }

    const tipo = payload.type || 'payment.success';
    return this.dispatchWebhook(tipo, verification.payload);
  }

  /**
   * POST /pagos/webhooks/mercadopago - MercadoPago webhook endpoint
   * Signature header: x-signature
   */
  @Post('webhooks/mercadopago')
  async handleMercadoPagoWebhook(@Headers('x-signature') signature: string, @Body() payload: any) {
    if (!signature) {
      throw new BadRequestException('Missing x-signature header');
    }

    const verification = await this.mpProvider.verifyWebhookSignature(signature, payload);
    if (!verification.valid) {
      throw new BadRequestException('Invalid MercadoPago signature');
    }

    const tipo = payload.action || 'payment.success';
    return this.dispatchWebhook(tipo, verification.payload);
  }

  // The Business comes from the stored record the verified event refers to,
  // never from the request (the former ?empresaId= was caller-controlled). An
  // event about no known record is acknowledged and ignored.
  // NOTE: these routes are still behind the global JwtAuthGuard. Providers send
  // no JWT, so real deliveries are rejected until the providers move from the
  // current mocks to the official SDKs with their real signature schemes.
  private async dispatchWebhook(tipo: string, payload: any) {
    const empresaId = await this.paymentService.resolveWebhookBusiness(tipo, payload);
    if (!empresaId) {
      return { success: true, ignored: true };
    }
    return this.paymentService.handleWebhook(empresaId, tipo, payload);
  }

  /**
   * GET /pagos/analytics/daily - Daily revenue analytics
   */
  @Get('analytics/daily')
  async getDailyRevenue(@CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    const payments = await this.paymentService.getPaymentsByBusiness(empresaId, 0, 1000);

    const dailyRevenue = payments.data.reduce(
      (acc, payment) => {
        const day = new Date(payment.createdAt).toISOString().split('T')[0];
        const montoNum = Number(payment.monto);
        acc[day] = (acc[day] || 0) + (payment.estado === 'COMPLETED' ? montoNum : 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(dailyRevenue).map(([date, monto]) => ({ date, monto }));
  }

  /**
   * GET /pagos/analytics/by-method - Payments by method
   */
  @Get('analytics/by-method')
  async getPaymentsByMethod(@CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    const payments = await this.paymentService.getPaymentsByBusiness(empresaId, 0, 1000);

    const byMethod = payments.data.reduce(
      (acc, payment) => {
        const metodo = payment.metodo || 'UNKNOWN';
        if (!acc[metodo]) {
          acc[metodo] = { count: 0, monto: 0 };
        }
        acc[metodo].count++;
        if (payment.estado === 'COMPLETED') {
          acc[metodo].monto += Number(payment.monto);
        }
        return acc;
      },
      {} as Record<string, { count: number; monto: number }>,
    );

    return Object.entries(byMethod).map(([metodo, data]) => ({
      metodo,
      count: data.count,
      monto: data.monto,
    }));
  }

  /**
   * POST /pagos/:id/retry - Retry failed payment
   */
  @RequirePermission('ventas.editar')
  @CanonicalPermission('PAYMENTS_REGISTER')
  @Post(':id/retry')
  async retryPayment(@Param('id') paymentId: string, @CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    const payment = await this.paymentService.getPaymentDetail(empresaId, paymentId);

    if (payment.empresaId !== empresaId) {
      throw new BadRequestException('Cannot retry this payment');
    }

    if (payment.estado !== 'FAILED') {
      throw new BadRequestException('Can only retry failed payments');
    }

    // Return retry intent creation (would create a new payment intent)
    return { status: 'retry_initiated', paymentId };
  }

  /**
   * DELETE /pagos/:id/cancel - Cancel pending payment
   */
  @RequirePermission('ventas.eliminar')
  @CanonicalPermission('SALES_CANCEL')
  @Post(':id/cancel')
  async cancelPayment(@Param('id') paymentId: string, @CurrentUser() user: AuthenticatedUser) {
    const empresaId = await this.resolveEmpresaId(user);
    const payment = await this.paymentService.getPaymentDetail(empresaId, paymentId);

    if (payment.empresaId !== empresaId) {
      throw new BadRequestException('Cannot cancel this payment');
    }

    if (payment.estado !== 'PENDING') {
      throw new BadRequestException('Can only cancel pending payments');
    }

    // Would update status to CANCELLED
    return { status: 'cancelled', paymentId };
  }
}
