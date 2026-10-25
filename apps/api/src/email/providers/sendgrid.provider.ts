import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailProviderResponse,
  BounceEvent,
  ComplaintEvent,
} from './email-provider.interface';

/**
 * P8-2: SendGrid Provider Implementation (Fallback)
 *
 * Secondary email provider using SendGrid API.
 * Graceful degradation if SENDGRID_API_KEY is missing.
 * Provides bounce/complaint tracking via API.
 */
@Injectable()
export class SendGridProvider implements IEmailProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  readonly name = 'SENDGRID';

  isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY;
  }

  async send(options: SendEmailOptions): Promise<EmailProviderResponse> {
    if (!this.isConfigured()) {
      this.logger.warn('SENDGRID_API_KEY not configured — SendGrid provider unavailable.');
      return {
        sent: false,
        messageId: '',
        error: 'SendGrid not configured',
      };
    }

    try {
      // Dynamic import to avoid hard dependency
      const sgMail = await import('@sendgrid/mail').then((m) => m.default);
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const response = await sgMail.send({
        to: options.to,
        from: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@wapsell.com',
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        trackingSettings: {
          openTracking: { enable: true },
          clickTracking: { enable: true },
        },
      });

      const messageId = response[0].headers['x-message-id'] || '';
      this.logger.debug(`Email sent via SendGrid to ${options.to}, messageId: ${messageId}`);
      return {
        sent: true,
        messageId,
      };
    } catch (err) {
      this.logger.error(
        `SendGrid exception sending to ${options.to}`,
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
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // TODO: Implement SendGrid Bounce API polling
      // For now, webhooks are the primary mechanism.
      this.logger.debug('getBounceEvents called for SendGrid (webhooks primary)');
      return [];
    } catch (err) {
      this.logger.error('SendGrid getBounceEvents failed', err);
      return [];
    }
  }

  async getComplaintEvents(since: Date): Promise<ComplaintEvent[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // TODO: Implement SendGrid Complaint API polling
      this.logger.debug('getComplaintEvents called for SendGrid (webhooks primary)');
      return [];
    } catch (err) {
      this.logger.error('SendGrid getComplaintEvents failed', err);
      return [];
    }
  }
}
