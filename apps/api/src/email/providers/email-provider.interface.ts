/**
 * P8-2: Email Provider Abstraction Layer
 *
 * Defines the interface for multi-provider email sending (Resend, SendGrid, AWS SES).
 * Each provider implements this interface with graceful fallback on failure.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  metadata?: Record<string, string>;
}

export interface EmailProviderResponse {
  messageId: string;
  sent: boolean;
  error?: string;
}

export interface BounceEvent {
  timestamp: Date;
  email: string;
  bounceType: 'permanent' | 'temporary';
  bounceSubType: string;
}

export interface ComplaintEvent {
  timestamp: Date;
  email: string;
  reason: string;
}

export interface IEmailProvider {
  name: string;
  isConfigured(): boolean;
  send(options: SendEmailOptions): Promise<EmailProviderResponse>;
  getBounceEvents(since: Date): Promise<BounceEvent[]>;
  getComplaintEvents(since: Date): Promise<ComplaintEvent[]>;
}
