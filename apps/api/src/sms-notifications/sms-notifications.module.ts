import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessContextModule } from '../business-context/business-context.module';
import { SMSNotificationsService } from './sms-notifications.service';
import { SMSNotificationsController } from './sms-notifications.controller';
import { SMSRateLimiter } from './sms-rate-limiter';

/**
 * SMS Notifications Module — Twilio integration for OTP and alerts.
 *
 * Responsibilities:
 * - Initialize Twilio client (once per application startup)
 * - Provide SMS sending service (OTP, transactional, bulk, alerts)
 * - Enforce rate limiting per user and per phone
 * - Manage phone number verification and preferences
 * - Log all SMS delivery status
 *
 * Configuration (environment variables):
 * - TWILIO_ACCOUNT_SID: Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Twilio Auth Token
 * - TWILIO_DID: Twilio phone number (e.g., +1234567890)
 *
 * Multi-tenancy:
 * - Phone numbers are scoped to empresa (empresaId)
 * - SMS logs are per-phone-number
 * - SMS alerts are per-user and per-empresa
 */
@Module({
  imports: [PrismaModule, BusinessContextModule],
  controllers: [SMSNotificationsController],
  providers: [SMSNotificationsService, SMSRateLimiter],
  exports: [SMSNotificationsService],
})
export class SMSNotificationsModule implements OnModuleInit {
  constructor(private readonly smsService: SMSNotificationsService) {}

  /**
   * Initialize Twilio on application startup.
   * If credentials are missing, the service will log a warning.
   */
  onModuleInit() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const did = process.env.TWILIO_DID;

    if (!accountSid || !authToken || !did) {
      console.warn(
        'Twilio not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_DID required',
      );
      return;
    }

    try {
      this.smsService.initializeTwilio(accountSid, authToken, did);
      console.log('Twilio SMS service initialized');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error);
    }
  }
}
