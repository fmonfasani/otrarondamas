import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailProviderResponse,
  BounceEvent,
  ComplaintEvent,
} from './email-provider.interface';

/**
 * P8-2: Resend Provider Implementation
 *
 * Primary email provider using Resend API.
 * Graceful degradation if RESEND_API_KEY is missing (logs warning, returns sent: false).
 * Falls back to next provider on transient errors.
 */
@Injectable()
export class ResendProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private resend: Resend | null = null;
  readonly name = 'RESEND';

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
  }

  private client(): Resend | null {
    if (this.resend) return this.resend;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — Resend provider unavailable.');
      return null;
    }
    this.resend = new Resend(apiKey);
    return this.resend;
  }

  async send(options: SendEmailOptions): Promise<EmailProviderResponse> {
    const client = this.client();
    const from = process.env.RESEND_FROM_EMAIL;

    if (!client || !from) {
      if (!from) this.logger.warn('RESEND_FROM_EMAIL not configured.');
      return {
        sent: false,
        messageId: '',
        error: 'Resend provider not configured',
      };
    }

    try {
      const response = await client.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });

      if (response.error) {
        this.logger.error(`Resend error sending to ${options.to}: ${response.error.message}`);
        return {
          sent: false,
          messageId: '',
          error: response.error.message,
        };
      }

      this.logger.debug(`Email sent via Resend to ${options.to}, messageId: ${response.data?.id}`);
      return {
        sent: true,
        messageId: response.data?.id || '',
      };
    } catch (err) {
      this.logger.error(
        `Resend exception sending to ${options.to}`,
        err instanceof Error ? err.message : String(err),
      );
      return {
        sent: false,
        messageId: '',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async getBounceEvents(since: Date): Promise<BounceEvent[]> {
    // Resend does not provide a bulk bounce/complaint API in the free tier.
    // Bounce events are typically received via webhooks.
    // For now, return empty; webhook handler will populate EmailLog.
    this.logger.debug('getBounceEvents called for Resend (webhooks only)');
    return [];
  }

  async getComplaintEvents(since: Date): Promise<ComplaintEvent[]> {
    // Same as above: Resend uses webhooks.
    this.logger.debug('getComplaintEvents called for Resend (webhooks only)');
    return [];
  }
}
