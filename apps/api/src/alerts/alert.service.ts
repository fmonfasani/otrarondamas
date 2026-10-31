import { Injectable, Logger } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types

/**
 * AlertService: Stub for admin alerts on refund failures.
 *
 * Phase 3-3: Basic logging only.
 * Phase 4+: Email/Slack integration planned.
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  /**
   * Send admin alert when refund fails after max retries.
   *
   * Logged as error for visibility.
   * Future: Send email/Slack to admin.
   */
  async sendRefundFailureAlert(details: {
    devolucionId: string;
    monto: any;
    error: string;
    clienteEmail: string;
    empresaNombre: string;
  }): Promise<void> {
    const { devolucionId, monto, error, clienteEmail, empresaNombre } = details;

    const subject = `[REFUND FAILED] ${empresaNombre} - ${devolucionId}`;
    const message = `
Refund failed after max retries:
- Devolución: ${devolucionId}
- Amount: ${monto}
- Customer: ${clienteEmail}
- Error: ${error}

ACTION REQUIRED: Manual refund processing or customer notification needed.
    `;

    // TODO: Implement email/Slack sending in Phase 4
    this.logger.error(`${subject}\n${message}`);
  }
}
