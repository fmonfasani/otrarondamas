import { Module } from '@nestjs/common';
import { RefundQueueService } from './refund-queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentProviderModule } from '../payments/payment-provider.module';
import { AuditModule } from '../audit/audit.module';
import { AlertModule } from '../alerts/alert.module';

/**
 * RefundQueueModule: Async refund processing queue.
 *
 * Provides:
 * - RefundQueueService: Polling + provider integration
 * - OnModuleInit/OnModuleDestroy hooks for polling job lifecycle
 *
 * Dependencies:
 * - PrismaModule: Database access (CompanyScopedPrismaService + PrismaService)
 * - PaymentProviderModule: IPaymentProvider implementation selection
 * - AuditModule: AuditService for logging state changes
 * - AlertModule: AlertService for admin notifications
 */
@Module({
  imports: [PrismaModule, PaymentProviderModule, AuditModule, AlertModule],
  providers: [RefundQueueService],
  exports: [RefundQueueService],
})
export class RefundQueueModule {}
