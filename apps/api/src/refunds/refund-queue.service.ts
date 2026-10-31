import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { IPaymentProvider } from '../payments/payment-provider.interface';
import { AuditService } from '../audit/audit.service';
import { AlertService } from '../alerts/alert.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RefundQueueService: Asynchronous refund processing queue.
 *
 * P3-3 Implementation:
 * - Polls database for PENDIENTE refunds every 30 seconds
 * - Calls payment provider for each due refund
 * - Handles retry logic with exponential backoff (max 3 attempts)
 * - Logs all state changes in AuditLog
 * - Sends alerts when refunds fail after max retries
 *
 * Database-backed queue (Reembolso table) — no external dependencies (Redis/RabbitMQ).
 */
@Injectable()
export class RefundQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RefundQueueService.name);
  private pollingJob: NodeJS.Timeout | null = null;

  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    @Inject('IPaymentProvider') private readonly paymentProvider: IPaymentProvider,
    private readonly auditService: AuditService,
    private readonly alertService: AlertService,
    private readonly globalPrisma: PrismaService,
  ) {}

  /**
   * OnModuleInit: Register polling job when app starts.
   *
   * Polling runs every REFUND_POLLING_INTERVAL_MS (default: 30s)
   */
  async onModuleInit(): Promise<void> {
    const intervalMs = parseInt(process.env.REFUND_POLLING_INTERVAL_MS || '30000', 10);
    this.logger.log(`[RefundQueue] Polling job registered: every ${intervalMs}ms`);

    this.pollingJob = setInterval(() => this.processNextBatch(), intervalMs);
  }

  /**
   * OnModuleDestroy: Cleanup polling job on shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.pollingJob) {
      clearInterval(this.pollingJob);
      this.logger.log('[RefundQueue] Polling job stopped');
    }
  }

  /**
   * Enqueue a refund.
   *
   * Called by P3-2 DevolucionClienteService when PROCESADA state reached.
   * Creates or updates Reembolso record with estado=PENDIENTE.
   */
  async enqueueRefund(
    empresaId: string,
    devolucionClienteId: string,
    ventaId: string,
    clienteId: string,
    monto: any,
    metodoReembolso: string,
  ): Promise<void> {
    const db = this.prismaFactory.forCompany(empresaId);
    const now = new Date();

    try {
      // Create or update Reembolso record (idempotent via unique constraint on devolucionClienteId)
      const reembolso = await db.reembolso.upsert({
        where: { devolucionClienteId },
        update: {
          estado: 'PENDIENTE',
          proximoIntento: now,
          intentos: 0,
          resultado: null,
          motivoFalla: null,
          updatedAt: now,
        },
        create: {
          id: `reemb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          empresaId,
          devolucionClienteId,
          estado: 'PENDIENTE',
          montoReembolsable: monto,
          montoActual: monto,
          metodoReembolso,
          intentos: 0,
          proximoIntento: now,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Audit log: Refund enqueued
      await this.auditService.logSystemAction({
        empresaId,
        accion: 'REEMBOLSO_ENQUEUED',
        entidadAfectada: 'Reembolso',
        entidadId: devolucionClienteId,
        valoresPosteriores: {
          estado: 'PENDIENTE',
          monto: monto.toString(),
          id: reembolso.id,
        },
      });

      this.logger.debug(`[RefundQueue] Refund enqueued: ${devolucionClienteId} → ${reembolso.id}`);
    } catch (err) {
      this.logger.error(
        `[RefundQueue] Failed to enqueue refund ${devolucionClienteId}`,
        err as Error,
      );
      throw err;
    }
  }

  /**
   * Process next batch of due refunds.
   *
   * Polling entry point: called every 30s by setInterval.
   * Fetches all PENDIENTE refunds with proximoIntento <= now,
   * processes each independently.
   */
  async processNextBatch(): Promise<void> {
    const batchLogger = new Logger(`${RefundQueueService.name}:batch`);

    try {
      // Query all companies (this is a system-level background job)
      // Get refunds across all tenants that are due for processing
      const due = await this.global any.findMany({
        where: {
          estado: 'PENDIENTE',
          proximoIntento: { lte: new Date() },
        },
        include: {
          DevolucionCliente: true,
          Empresa: true,
        },
        take: 100, // Batch limit to prevent query overload
      });

      batchLogger.debug(`[RefundQueue] Found ${due.length} due refunds`);

      for (const refund of due) {
        await this.processRefund(refund, batchLogger);
      }
    } catch (err) {
      batchLogger.error('[RefundQueue] Batch processing failed', err as Error);
      // Do not rethrow; polling must continue
    }
  }

  /**
   * Process single refund.
   *
   * Calls payment provider, handles success/failure/retry logic.
   * Updates Reembolso record and logs audit events.
   */
  private async processRefund(refund: Record<string, unknown>, logger: Logger): Promise<void> {
    const db = this.prismaFactory.forCompany(refund.empresaId);

    try {
      // Verify provider is configured
      if (!this.paymentProvider.isConfigured()) {
        logger.warn(
          `[RefundQueue] Payment provider not configured; skipping refund ${refund.devolucionClienteId}`,
        );
        return;
      }

      // Call provider
      const result = await this.paymentProvider.createRefund({
        monto: refund.montoActual,
        metodo_pago: (refund.metodoReembolso || 'unknown') as any,
        devolucionId: refund.devolucionClienteId as any,
        ventaId: refund.DevolucionCliente.ventaId as any,
        clienteId: refund.DevolucionCliente.clienteId as any,
      });

      if (result.success) {
        // SUCCESS: Mark as completed (EXITO)
        await db.reembolso.update({
          where: { id: refund.id as any },
          data: {
            estado: 'EXITO',
            procesadoEn: new Date(),
            referenceId: result.provider_refund_id as any,
            updatedAt: new Date(),
          },
        });

        // Audit log: Refund completed
        await this.auditService.logSystemAction({
          empresaId: refund.empresaId as any,
          accion: 'REEMBOLSO_COMPLETADO',
          entidadAfectada: 'Reembolso',
          entidadId: refund.devolucionClienteId as any,
          valoresPosteriores: {
            estado: 'EXITO',
            provider_refund_id: result.provider_refund_id,
          },
        });

        logger.log(
          `[RefundQueue] Refund completed: ${refund.devolucionClienteId} → ${result.provider_refund_id}`,
        );
      } else {
        // FAILURE: Retry logic or mark failed
        const maxRetries = parseInt(process.env.REFUND_MAX_RETRIES || '3', 10);
        const isRetriable = result.retriable !== false; // default to true

        if (refund.intentos < maxRetries && isRetriable) {
          // Schedule retry with exponential backoff
          // Attempt 1 fails → Retry at +5 min (300_000 * 2^0 = 300_000 ms = 5 min)
          // Attempt 2 fails → Retry at +10 min (300_000 * 2^1 = 600_000 ms = 10 min)
          // Attempt 3 fails → Retry at +20 min (300_000 * 2^2 = 1_200_000 ms = 20 min)
          const backoffMs = 300_000 * 2 ** refund.intentos;
          const nextRetryAt = new Date(Date.now() + backoffMs);

          await db.reembolso.update({
            where: { id: refund.id as any },
            data: {
              intentos: refund.intentos + 1,
              proximoIntento: nextRetryAt as any,
              motivoFalla: (result.error || 'Unknown error') as any,
              updatedAt: new Date(),
            },
          });

          // Audit log: Scheduled retry
          await this.auditService.logSystemAction({
            empresaId: refund.empresaId as any,
            accion: 'REEMBOLSO_RETRY_SCHEDULED',
            entidadAfectada: 'Reembolso',
            entidadId: refund.devolucionClienteId as any,
            valoresPosteriores: {
              intentos: refund.intentos + 1,
              proximoIntento: nextRetryAt.toISOString(),
              error: result.error,
            },
          });

          logger.warn(
            `[RefundQueue] Refund retry scheduled: ${refund.devolucionClienteId} (attempt ${refund.intentos + 1}/${maxRetries})`,
          );
        } else {
          // Max retries exceeded or non-retriable: Mark as failed (FALLIDO)
          await db.reembolso.update({
            where: { id: refund.id as any },
            data: {
              estado: 'FALLIDO',
              motivoFalla: (result.error || 'Max retries exceeded') as any,
              updatedAt: new Date(),
            },
          });

          // Audit log: Marked failed
          await this.auditService.logSystemAction({
            empresaId: refund.empresaId as any,
            accion: 'REEMBOLSO_FALLIDO',
            entidadAfectada: 'Reembolso',
            entidadId: refund.devolucionClienteId as any,
            valoresPosteriores: {
              estado: 'FALLIDO',
              final_error: result.error,
            },
          });

          // Send alert to admin
          const devolucion = refund.DevolucionCliente;
          await this.alertService.sendRefundFailureAlert({
            devolucionId: refund.devolucionClienteId as any,
            monto: refund.montoActual,
            error: result.error || 'Unknown error',
            clienteEmail: (devolucion?.Cliente?.email || 'unknown') as any,
            empresaNombre: (refund.Empresa?.nombre || 'Unknown') as any,
          });

          logger.error(
            `[RefundQueue] Refund failed (max retries): ${refund.devolucionClienteId}; alert sent`,
          );
        }
      }
    } catch (err) {
      // Unexpected error: log and mark for manual review
      logger.error(
        `[RefundQueue] Unexpected error processing ${refund.devolucionClienteId}`,
        err as Error,
      );

      try {
        await db.reembolso.update({
          where: { id: refund.id as any },
          data: {
            motivoFalla: ((err as Error).message || 'Unknown error') as any,
            estado: 'PENDIENTE_MANUAL',
            updatedAt: new Date(),
          },
        });

        // Audit log: Error during processing
        await this.auditService.logSystemAction({
          empresaId: refund.empresaId as any,
          accion: 'REEMBOLSO_ERROR',
          entidadAfectada: 'Reembolso',
          entidadId: refund.devolucionClienteId as any,
          valoresPosteriores: {
            estado: 'PENDIENTE_MANUAL',
            error: (err as Error).message,
          },
        });
      } catch (updateErr) {
        logger.error('[RefundQueue] Failed to update error state', updateErr as Error);
      }
    }
  }
}
