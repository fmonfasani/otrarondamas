import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { EmailTemplateService } from './templates/email-template.service';
import { EmailPreferenceService } from './preferences/email-preference.service';
import { ResendProvider } from './providers/resend.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { AwsSesProvider } from './providers/aws-ses.provider';
import { EmailController } from './email.controller';

/**
 * P8-2: Email Notifications Module
 *
 * Provides:
 * - Multi-provider email sending (Resend, SendGrid, AWS SES)
 * - Email template management (CRUD, validation)
 * - Email preference management (subscription, frequency, categories)
 * - Email logging & tracking (EmailLog, webhook integration)
 *
 * Backwards compatible with RF-17 (Resend-based email).
 */
@Module({
  imports: [PrismaModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailPreferenceService,
    ResendProvider,
    SendGridProvider,
    AwsSesProvider,
  ],
  exports: [EmailService, EmailTemplateService, EmailPreferenceService],
})
export class EmailModule {}
