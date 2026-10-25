import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  SendSMSDto,
  SendOTPDto,
  VerifyOTPDto,
  UpdatePhoneNumberDto,
  SendBulkSMSDto,
  CreateSMSAlertDto,
} from './dto/send-sms.dto';
import { SMSRateLimiter } from './sms-rate-limiter';

/**
 * SMS Notifications Service — Twilio integration for OTP, alerts, and transactional SMS.
 *
 * Responsibilities:
 * - Initialize and manage Twilio client
 * - Send SMS (OTP, alerts, transactional, bulk)
 * - Generate, verify, and expire OTP codes
 * - Track phone number verification status
 * - Manage SMS alerts (triggers, preferences)
 * - Rate limiting and abuse prevention
 * - Logging and error tracking
 *
 * Design:
 * - Phone number storage is per-empresa (multi-tenant)
 * - OTP sessions are short-lived (5 minutes) with attempt limits
 * - SMS logs track delivery status via Twilio webhook (future integration)
 * - Rate limiter protects against OTP brute force and SMS spam
 *
 * Error Handling:
 * - Twilio errors (network, auth) → log and return user-friendly error
 * - Phone number not found → 404
 * - Rate limit exceeded → 429 (via SMSRateLimiter)
 * - Invalid OTP → increment attempts, 400
 */
@Injectable()
export class SMSNotificationsService {
  private readonly logger = new Logger('SMSNotificationsService');
  private twilioClient: Twilio | null = null;
  private twilioDid: string | null = null;
  private rateLimiter = new SMSRateLimiter();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly businessContext?: BusinessContextService,
  ) {}

  /**
   * Initialize Twilio client.
   * Call this during module initialization.
   *
   * @param accountSid Twilio Account SID (from environment)
   * @param authToken Twilio Auth Token (from environment)
   * @param did Twilio phone number (from environment)
   */
  initializeTwilio(accountSid: string, authToken: string, did: string): void {
    try {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.twilioDid = did;
      this.logger.log('Twilio client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio', error);
      throw new Error('Twilio initialization failed');
    }
  }

  /**
   * Send an SMS message.
   */
  async sendSMS(
    auth: AuthenticatedUser,
    dto: SendSMSDto,
  ): Promise<{ messageId: string; status: string }> {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const context = await this.getBusinessContext(auth);

    try {
      // Rate limit check
      this.rateLimiter.checkSMSLimit(auth.id, phoneNumber);

      // Send via Twilio
      const message = await this.twilioClient.messages.create({
        body: dto.message,
        from: this.twilioDid!,
        to: phoneNumber,
      });

      // Log to database
      const phoneRecord = await this.prisma.phoneNumber.findFirst({
        where: {
          phoneNumber,
          empresaId: context.empresaId,
        },
      });

      if (phoneRecord) {
        await this.prisma.sMSLog.create({
          data: {
            phoneNumberId: phoneRecord.id,
            toPhone: phoneNumber,
            message: dto.message,
            type: (dto.type as any) || 'TRANSACTIONAL',
            status: 'SENT',
            twilioSid: message.sid,
            sentAt: new Date(),
          },
        });

        // Update last used timestamp
        await this.prisma.phoneNumber.update({
          where: { id: phoneRecord.id },
          data: { lastUsedAt: new Date() },
        });
      }

      this.rateLimiter.recordSMS(auth.id, phoneNumber);

      this.logger.debug(`SMS sent: ${message.sid} to ${phoneNumber}`);
      return {
        messageId: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error);
      throw new BadRequestException('No se pudo enviar el SMS. Por favor, intenta de nuevo.');
    }
  }

  /**
   * Send OTP (One-Time Password) for login/verification.
   */
  async sendOTP(
    auth: AuthenticatedUser,
    dto: SendOTPDto,
  ): Promise<{ success: boolean; expiresIn: number }> {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const context = await this.getBusinessContext(auth);

    try {
      // Rate limit check (5 per hour)
      this.rateLimiter.checkOTPLimit(auth.id, phoneNumber);

      // Get or create phone number record
      let phoneRecord = await this.prisma.phoneNumber.findFirst({
        where: {
          phoneNumber,
          empresaId: context.empresaId,
        },
      });

      if (!phoneRecord) {
        // Auto-create phone record on first OTP request
        phoneRecord = await this.prisma.phoneNumber.create({
          data: {
            phoneNumber,
            empresaId: context.empresaId,
            ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
            ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
            countryCode: '+54',
            isVerified: false,
          },
        });
      }

      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Create OTP session
      const otpSession = await this.prisma.oTPSession.create({
        data: {
          phoneNumberId: phoneRecord.id,
          purpose: dto.purpose as any,
          code,
          expiresAt,
        },
      });

      // Send OTP via SMS
      const message = await this.twilioClient.messages.create({
        body: `Tu código de verificación es: ${code}. No lo compartas con nadie.`,
        from: this.twilioDid!,
        to: phoneNumber,
      });

      // Log SMS
      await this.prisma.sMSLog.create({
        data: {
          phoneNumberId: phoneRecord.id,
          toPhone: phoneNumber,
          message: `Tu código de verificación es: ${code}. No lo compartas con nadie.`,
          type: 'OTP',
          status: 'SENT',
          twilioSid: message.sid,
          sentAt: new Date(),
        },
      });

      this.rateLimiter.recordOTP(auth.id, phoneNumber);

      this.logger.debug(`OTP sent: ${otpSession.id} to ${phoneNumber} (expires in 5 min)`);
      return {
        success: true,
        expiresIn: 5 * 60, // 5 minutes in seconds
      };
    } catch (error: any) {
      // If it's a rate limit error, re-throw it
      if (error.message.includes('intentos')) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(`Failed to send OTP: ${error.message}`, error);
      throw new BadRequestException(
        'No se pudo enviar el código OTP. Por favor, intenta de nuevo.',
      );
    }
  }

  /**
   * Verify OTP code.
   */
  async verifyOTP(
    auth: AuthenticatedUser,
    dto: VerifyOTPDto,
  ): Promise<{ success: boolean; phoneNumberId: string }> {
    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const context = await this.getBusinessContext(auth);

    // Find phone number record
    const phoneRecord = await this.prisma.phoneNumber.findFirst({
      where: {
        phoneNumber,
        empresaId: context.empresaId,
      },
    });

    if (!phoneRecord) {
      throw new NotFoundException('Número de teléfono no encontrado');
    }

    // Find active OTP session for this purpose
    const otpSession = await this.prisma.oTPSession.findFirst({
      where: {
        phoneNumberId: phoneRecord.id,
        purpose: dto.purpose as any,
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpSession) {
      throw new BadRequestException('Código OTP inválido o expirado. Solicita uno nuevo.');
    }

    // Check attempt limit
    if (otpSession.attempts >= otpSession.maxAttempts) {
      throw new BadRequestException('Demasiados intentos fallidos. Solicita un código nuevo.');
    }

    // Verify code
    if (otpSession.code !== dto.code) {
      // Increment attempts
      await this.prisma.oTPSession.update({
        where: { id: otpSession.id },
        data: { attempts: otpSession.attempts + 1 },
      });

      throw new BadRequestException('Código OTP incorrecto');
    }

    // Mark as verified
    await this.prisma.oTPSession.update({
      where: { id: otpSession.id },
      data: { verifiedAt: new Date() },
    });

    // Mark phone as verified
    await this.prisma.phoneNumber.update({
      where: { id: phoneRecord.id },
      data: { isVerified: true },
    });

    this.logger.debug(`OTP verified: ${otpSession.id} for ${phoneNumber}`);
    return {
      success: true,
      phoneNumberId: phoneRecord.id,
    };
  }

  /**
   * Add/update phone number for user.
   */
  async addPhoneNumber(
    auth: AuthenticatedUser,
    dto: UpdatePhoneNumberDto,
  ): Promise<{
    id: string;
    phoneNumber: string;
    isVerified: boolean;
    isPrimary: boolean;
  }> {
    const phoneNumber = this.normalizePhoneNumber(dto.phoneNumber);
    const context = await this.getBusinessContext(auth);

    // Create or update phone number
    const record = await this.prisma.phoneNumber.upsert({
      where: {
        empresaId_phoneNumber: {
          empresaId: context.empresaId,
          phoneNumber,
        },
      },
      create: {
        phoneNumber,
        empresaId: context.empresaId,
        ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
        ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
        countryCode: '+54',
        isPrimary: dto.isPrimary ?? false,
      },
      update: {
        isPrimary: dto.isPrimary ?? false,
      },
    });

    return {
      id: record.id,
      phoneNumber: record.phoneNumber,
      isVerified: record.isVerified,
      isPrimary: record.isPrimary,
    };
  }

  /**
   * Remove phone number.
   */
  async removePhoneNumber(
    auth: AuthenticatedUser,
    phoneNumberId: string,
  ): Promise<{ success: boolean }> {
    const context = await this.getBusinessContext(auth);

    const phoneRecord = await this.prisma.phoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        empresaId: context.empresaId,
      },
    });

    if (!phoneRecord) {
      throw new NotFoundException('Número de teléfono no encontrado');
    }

    // Authorization check: only owner can delete
    if (auth.type === 'usuario' && phoneRecord.usuarioId !== auth.id) {
      throw new ForbiddenException('No tienes permiso para eliminar este número');
    }
    if (auth.type === 'cliente' && phoneRecord.clienteId !== auth.id) {
      throw new ForbiddenException('No tienes permiso para eliminar este número');
    }

    // Don't allow deletion if it's the only primary number
    const primaryCount = await this.prisma.phoneNumber.count({
      where: {
        ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
        ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
        isPrimary: true,
      },
    });

    if (phoneRecord.isPrimary && primaryCount === 1) {
      throw new BadRequestException('No puedes eliminar tu único número de teléfono principal');
    }

    // Delete associated logs and sessions
    await this.prisma.sMSLog.deleteMany({
      where: { phoneNumberId },
    });

    await this.prisma.oTPSession.deleteMany({
      where: { phoneNumberId },
    });

    // Delete phone number
    await this.prisma.phoneNumber.delete({
      where: { id: phoneNumberId },
    });

    return { success: true };
  }

  /**
   * Get all phone numbers for authenticated user.
   */
  async getPhoneNumbers(auth: AuthenticatedUser): Promise<
    Array<{
      id: string;
      phoneNumber: string;
      isVerified: boolean;
      isPrimary: boolean;
      lastUsedAt: Date | null;
    }>
  > {
    const context = await this.getBusinessContext(auth);

    const phoneNumbers = await this.prisma.phoneNumber.findMany({
      where: {
        empresaId: context.empresaId,
        ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
        ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
      },
      select: {
        id: true,
        phoneNumber: true,
        isVerified: true,
        isPrimary: true,
        lastUsedAt: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return phoneNumbers;
  }

  /**
   * Create SMS alert for user.
   */
  async createSMSAlert(
    auth: AuthenticatedUser,
    dto: CreateSMSAlertDto,
  ): Promise<{ id: string; trigger: string; isActive: boolean }> {
    const context = await this.getBusinessContext(auth);

    // If no phone number ID provided, use primary
    let phoneNumberId = dto.phoneNumberId;
    if (!phoneNumberId) {
      const primary = await this.prisma.phoneNumber.findFirst({
        where: {
          empresaId: context.empresaId,
          ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
          ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
          isPrimary: true,
        },
      });

      if (!primary) {
        throw new BadRequestException(
          'No tienes un número de teléfono principal. Por favor, agrega uno.',
        );
      }

      phoneNumberId = primary.id;
    }

    const alert = await this.prisma.sMSAlert.create({
      data: {
        empresaId: context.empresaId,
        ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
        ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
        trigger: dto.trigger,
        message: dto.message,
        phoneNumberId,
        isActive: true,
      },
    });

    return {
      id: alert.id,
      trigger: alert.trigger,
      isActive: alert.isActive,
    };
  }

  /**
   * Get all SMS alerts for user.
   */
  async getSMSAlerts(auth: AuthenticatedUser): Promise<
    Array<{
      id: string;
      trigger: string;
      message: string;
      isActive: boolean;
    }>
  > {
    const context = await this.getBusinessContext(auth);

    const alerts = await this.prisma.sMSAlert.findMany({
      where: {
        empresaId: context.empresaId,
        ...(auth.type === 'usuario' ? { usuarioId: auth.id } : {}),
        ...(auth.type === 'cliente' ? { clienteId: auth.id } : {}),
      },
      select: {
        id: true,
        trigger: true,
        message: true,
        isActive: true,
      },
    });

    return alerts;
  }

  /**
   * Remove SMS alert.
   */
  async removeSMSAlert(auth: AuthenticatedUser, alertId: string): Promise<{ success: boolean }> {
    const context = await this.getBusinessContext(auth);

    const alert = await this.prisma.sMSAlert.findFirst({
      where: {
        id: alertId,
        empresaId: context.empresaId,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }

    // Authorization check
    if (auth.type === 'usuario' && alert.usuarioId !== auth.id) {
      throw new ForbiddenException('No tienes permiso para eliminar esta alerta');
    }
    if (auth.type === 'cliente' && alert.clienteId !== auth.id) {
      throw new ForbiddenException('No tienes permiso para eliminar esta alerta');
    }

    await this.prisma.sMSAlert.delete({
      where: { id: alertId },
    });

    return { success: true };
  }

  /**
   * Send bulk SMS (admin only).
   */
  async sendBulkSMS(
    auth: AuthenticatedUser,
    dto: SendBulkSMSDto,
  ): Promise<{
    sent: number;
    failed: number;
    results: Array<{
      phoneNumber: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
  }> {
    if (!this.twilioClient) {
      throw new Error('Twilio not initialized');
    }

    const context = await this.getBusinessContext(auth);

    // Check authorization (admin/owner only)
    if (auth.rol !== 'OWNER') {
      throw new ForbiddenException('Solo administradores pueden enviar SMS en lote');
    }

    const results: Array<{
      phoneNumber: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    for (const phoneNumber of dto.phoneNumbers) {
      try {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const message = await this.twilioClient.messages.create({
          body: dto.message,
          from: this.twilioDid!,
          to: normalizedPhone,
        });

        results.push({
          phoneNumber,
          success: true,
          messageId: message.sid,
        });
      } catch (error: any) {
        results.push({
          phoneNumber,
          success: false,
          error: error.message,
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    this.logger.debug(`Bulk SMS sent: ${sent} successful, ${failed} failed`);

    return { sent, failed, results };
  }

  /**
   * Helper: normalize phone number to E.164 format.
   * Supports: +54 9 11 1234 5678, 11 1234 5678, etc.
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/\D/g, '');

    // Add country code if missing
    if (!phone.startsWith('+')) {
      // Assume Argentina (+54) if no country code
      if (normalized.length === 10) {
        normalized = '54' + normalized; // 11 1234 5678 → 5411 1234 5678
      } else if (normalized.length === 11 && normalized.startsWith('9')) {
        normalized = '54' + normalized; // 9 11 1234 5678 → 549 11 1234 5678
      } else if (normalized.length === 11) {
        normalized = '54' + normalized; // Already includes 0, remove it
      }
    }

    // Ensure E.164 format with leading +
    return '+' + normalized.replace(/^\+/, '');
  }

  /**
   * Get business context from auth.
   */
  private async getBusinessContext(auth: AuthenticatedUser): Promise<{ empresaId: string }> {
    // If businessContext service is available, use it
    if (this.businessContext) {
      const context =
        auth.type === 'cliente'
          ? await this.businessContext.resolveForCustomer(auth)
          : await this.businessContext.resolveForAuthenticatedUser(auth);
      return { empresaId: context.businessId };
    }

    // Fallback: use empresaId from token
    return { empresaId: auth.empresaId };
  }
}
