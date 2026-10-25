import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  SendEmailOptions,
  EmailProviderResponse,
  BounceEvent,
  ComplaintEvent,
} from './email-provider.interface';

/**
 * P8-2: AWS SES Provider Implementation (Fallback)
 *
 * Tertiary email provider using Amazon SES.
 * Graceful degradation if AWS credentials are missing.
 * Provides bounce/complaint tracking via SNS webhooks.
 */
@Injectable()
export class AwsSesProvider implements IEmailProvider {
  private readonly logger = new Logger(AwsSesProvider.name);
  readonly name = 'SES';

  isConfigured(): boolean {
    return (
      !!process.env.AWS_REGION && (!!process.env.AWS_ACCESS_KEY_ID || !!process.env.AWS_ROLE_ARN)
    );
  }

  async send(options: SendEmailOptions): Promise<EmailProviderResponse> {
    if (!this.isConfigured()) {
      this.logger.warn('AWS SES credentials not configured — SES provider unavailable.');
      return {
        sent: false,
        messageId: '',
        error: 'AWS SES not configured',
      };
    }

    try {
      // Dynamic import to avoid hard dependency
      const SES = await import('@aws-sdk/client-ses').then((m) => m.SESClient);
      const SendEmailCommand = await import('@aws-sdk/client-ses').then((m) => m.SendEmailCommand);

      const ses = new SES({
        region: process.env.AWS_REGION,
      });

      const command = new SendEmailCommand({
        Source: options.from || process.env.AWS_SES_FROM_EMAIL || 'noreply@wapsell.com',
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: { Data: options.subject },
          Body: { Html: { Data: options.html } },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      });

      const response = await ses.send(command);
      const messageId = response.MessageId || '';

      this.logger.debug(`Email sent via SES to ${options.to}, messageId: ${messageId}`);
      return {
        sent: true,
        messageId,
      };
    } catch (err) {
      this.logger.error(
        `SES exception sending to ${options.to}`,
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
      // AWS SES sends bounce/complaint events via SNS.
      // Webhook handler processes those.
      this.logger.debug('getBounceEvents called for SES (SNS webhooks primary)');
      return [];
    } catch (err) {
      this.logger.error('SES getBounceEvents failed', err);
      return [];
    }
  }

  async getComplaintEvents(since: Date): Promise<ComplaintEvent[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      // AWS SES sends complaint events via SNS.
      this.logger.debug('getComplaintEvents called for SES (SNS webhooks primary)');
      return [];
    } catch (err) {
      this.logger.error('SES getComplaintEvents failed', err);
      return [];
    }
  }
}
