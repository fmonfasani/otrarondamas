import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { StripeProviderService } from './providers/stripe-provider.service';
import { MercadoPagoProviderService } from './providers/mercadopago-provider.service';
import { IPaymentProvider } from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProviderService,
    private readonly mpProvider: MercadoPagoProviderService,
  ) {}

  /**
   * Create payment intent with provider routing
   * PRIMARY: Stripe, FALLBACK: MercadoPago
   */
  async createPaymentIntent(empresaId: string, ventaId: string, dto: CreatePaymentIntentDto) {
    // Verify venta ownership
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: { Payment: true },
    });

    if (!venta) {
      throw new NotFoundException('Venta not found');
    }

    if (venta.empresaId !== empresaId) {
      throw new UnauthorizedException('Cannot create payment for this order');
    }

    // Compare total (convert Decimal to number for comparison)
    const ventaTotalCents = Math.round(Number(venta.total) * 100);
    if (ventaTotalCents !== dto.monto) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    // Check if payment already exists
    const existingPayment = venta.Payment.find((p) => p.estado === 'PENDING');
    if (existingPayment) {
      return this.getPaymentDetail(empresaId, existingPayment.id);
    }

    let provider: IPaymentProvider = this.stripeProvider;
    let providerName = 'STRIPE';

    try {
      // Try Stripe first
      const intentResult = await provider.createPaymentIntent(dto.monto, dto.moneda, {
        empresaId,
        ventaId,
        clienteId: venta.clienteId,
        ...dto.metadata,
      });

      // Create Payment record (convert monto from cents to currency units)
      const payment = await this.prisma.payment.create({
        data: {
          empresaId,
          ventaId,
          monto: dto.monto / 100,
          moneda: dto.moneda,
          proveedor: providerName,
          providerPaymentId: intentResult.providerIntentId,
          estado: 'PENDING',
        },
      });

      // Create PaymentIntent record
      await this.prisma.paymentIntent.create({
        data: {
          empresaId,
          paymentId: payment.id,
          clientSecret: intentResult.clientSecret,
          providerIntentId: intentResult.providerIntentId,
          metadata: {
            ...dto.metadata,
            ventaId,
            clienteId: venta.clienteId,
          },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      return {
        paymentId: payment.id,
        clientSecret: intentResult.clientSecret,
        monto: payment.monto,
        moneda: payment.moneda,
        proveedor: providerName,
      };
    } catch (error) {
      // Fallback to MercadoPago
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Stripe failed, falling back to MercadoPago:', errorMessage);
      provider = this.mpProvider;
      providerName = 'MERCADOPAGO';

      const intentResult = await provider.createPaymentIntent(dto.monto, dto.moneda, {
        empresaId,
        ventaId,
        clienteId: venta.clienteId,
        ...dto.metadata,
      });

      const payment = await this.prisma.payment.create({
        data: {
          empresaId,
          ventaId,
          monto: dto.monto / 100,
          moneda: dto.moneda,
          proveedor: providerName,
          providerPaymentId: intentResult.providerIntentId,
          estado: 'PENDING',
        },
      });

      await this.prisma.paymentIntent.create({
        data: {
          empresaId,
          paymentId: payment.id,
          clientSecret: intentResult.clientSecret,
          providerIntentId: intentResult.providerIntentId,
          metadata: {
            ...dto.metadata,
            ventaId,
            clienteId: venta.clienteId,
          },
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      return {
        paymentId: payment.id,
        clientSecret: intentResult.clientSecret,
        monto: payment.monto,
        moneda: payment.moneda,
        proveedor: providerName,
      };
    }
  }

  /**
   * Confirm payment with provider
   */
  async confirmPayment(empresaId: string, dto: ConfirmPaymentDto) {
    // Find payment intent by client secret
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { clientSecret: dto.clientSecret },
      include: { payment: true },
    });

    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    if (paymentIntent.payment.empresaId !== empresaId) {
      throw new UnauthorizedException('Cannot confirm this payment');
    }

    // Check expiration
    if (paymentIntent.expiresAt < new Date()) {
      throw new BadRequestException('Payment intent has expired');
    }

    const provider = this.getProvider(paymentIntent.payment.proveedor);

    try {
      const confirmResult = await provider.confirmPayment(
        paymentIntent.providerIntentId,
        dto.stripeToken,
      );

      // Update payment status
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentIntent.paymentId },
        data: {
          estado: 'COMPLETED',
          metodo: dto.metodo || 'CARD',
          ultimosDigitos: dto.ultimosDigitos || confirmResult.ultimos4Digitos,
          updatedAt: new Date(),
        },
      });

      return {
        paymentId: updatedPayment.id,
        estado: updatedPayment.estado,
        monto: updatedPayment.monto,
      };
    } catch (error) {
      // Update payment as failed
      await this.prisma.payment.update({
        where: { id: paymentIntent.paymentId },
        data: {
          estado: 'FAILED',
          updatedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Get payment details within the authenticated business boundary.
   * Related records are scoped independently because their empresaId is
   * stored directly and the database does not enforce composite tenant FKs.
   */
  async getPaymentDetail(empresaId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, empresaId },
      include: {
        PaymentIntent: { where: { empresaId } },
        Refund: { where: { empresaId } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      id: payment.id,
      empresaId: payment.empresaId,
      ventaId: payment.ventaId,
      monto: payment.monto,
      moneda: payment.moneda,
      proveedor: payment.proveedor,
      estado: payment.estado,
      metodo: payment.metodo,
      ultimosDigitos: payment.ultimosDigitos,
      createdAt: payment.createdAt,
      refunds: payment.Refund,
    };
  }

  /**
   * Get payments by empresa (paginated)
   */
  async getPaymentsByBusiness(
    empresaId: string,
    skip: number = 0,
    take: number = 20,
    estado?: string,
  ) {
    const where: any = { empresaId };
    if (estado) {
      where.estado = estado;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { PaymentIntent: { select: { clientSecret: false } }, Refund: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      pagination: {
        skip,
        take,
        total,
      },
    };
  }

  /**
   * Initiate refund
   */
  async refundPayment(empresaId: string, paymentId: string, dto: RefundDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.empresaId !== empresaId) {
      throw new UnauthorizedException('Cannot refund this payment');
    }

    if (payment.estado !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    if (dto.monto > Number(payment.monto) * 100) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const provider = this.getProvider(payment.proveedor);

    try {
      const refundResult = await provider.refundPayment(
        payment.providerPaymentId,
        dto.monto,
        dto.razon,
      );

      const refund = await this.prisma.refund.create({
        data: {
          empresaId,
          paymentId,
          monto: dto.monto / 100,
          razon: dto.razon,
          estado: 'COMPLETED',
          providerRefundId: refundResult.providerRefundId,
        },
      });

      return {
        refundId: refund.id,
        estado: refund.estado,
        monto: refund.monto,
        providerRefundId: refund.providerRefundId,
      };
    } catch (error) {
      const refund = await this.prisma.refund.create({
        data: {
          empresaId,
          paymentId,
          monto: dto.monto / 100,
          razon: dto.razon,
          estado: 'FAILED',
        },
      });

      console.error('Refund failed:', error);
      throw new BadRequestException('Refund processing failed');
    }
  }

  /**
   * Get refund status
   */
  async getRefundStatus(empresaId: string, paymentId: string) {
    const refunds = await this.prisma.refund.findMany({
      where: {
        paymentId,
        empresaId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (refunds.length === 0) {
      throw new NotFoundException('No refunds found for this payment');
    }

    return refunds;
  }

  /**
   * Handle webhook payload (route to appropriate handler)
   */
  async handleWebhook(empresaId: string, tipo: string, payload: any) {
    const providerEventId = payload.id || payload.data?.id || `${Date.now()}`;

    // Providers retry deliveries, so the same event can arrive more than once.
    // providerEventId is unique: an event already processed is acknowledged
    // and ignored; one recorded but not processed (a previous attempt failed)
    // is processed again, but only for the Business that recorded it.
    const existing = await this.prisma.paymentWebhook.findUnique({
      where: { providerEventId },
      select: { id: true, empresaId: true, processed: true },
    });
    if (existing && (existing.processed || existing.empresaId !== empresaId)) {
      return { success: true, duplicate: true };
    }

    let webhookId = existing?.id;
    if (!webhookId) {
      try {
        const webhook = await this.prisma.paymentWebhook.create({
          data: { empresaId, tipo, providerEventId, payload, processed: false },
          select: { id: true },
        });
        webhookId = webhook.id;
      } catch (error) {
        // A concurrent delivery of the same event recorded it first.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return { success: true, duplicate: true };
        }
        throw error;
      }
    }

    try {
      switch (tipo) {
        case 'payment.success':
          await this.handlePaymentSuccess(empresaId, payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(empresaId, payload);
          break;
        case 'refund.completed':
          await this.handleRefundCompleted(empresaId, payload);
          break;
        default:
          console.warn(`Unknown webhook type: ${tipo}`);
      }

      await this.prisma.paymentWebhook.update({
        where: { id: webhookId },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  // The provider ids are unique, but a webhook only acts on records of the
  // Business it was delivered for: a provider id that belongs to another
  // Business updates nothing.

  /**
   * Handle payment success webhook
   */
  private async handlePaymentSuccess(empresaId: string, payload: any) {
    const paymentId = payload.paymentId || payload.id;
    if (!paymentId) return;

    await this.prisma.payment.updateMany({
      where: { providerPaymentId: paymentId, empresaId },
      data: {
        estado: 'COMPLETED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(empresaId: string, payload: any) {
    const paymentId = payload.paymentId || payload.id;
    if (!paymentId) return;

    await this.prisma.payment.updateMany({
      where: { providerPaymentId: paymentId, empresaId },
      data: {
        estado: 'FAILED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Handle refund completed webhook
   */
  private async handleRefundCompleted(empresaId: string, payload: any) {
    const refundId = payload.refundId || payload.id;
    if (!refundId) return;

    await this.prisma.refund.updateMany({
      where: { providerRefundId: refundId, empresaId },
      data: {
        estado: 'COMPLETED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get provider instance
   */
  private getProvider(providerName: string) {
    if (providerName === 'STRIPE') {
      return this.stripeProvider;
    } else if (providerName === 'MERCADOPAGO') {
      return this.mpProvider;
    }
    throw new BadRequestException(`Unknown provider: ${providerName}`);
  }
}
