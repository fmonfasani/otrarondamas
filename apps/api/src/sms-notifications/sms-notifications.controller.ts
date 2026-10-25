import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SMSNotificationsService } from './sms-notifications.service';
import { SMSAuthGuard } from '../auth/guards/sms-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  SendSMSDto,
  SendOTPDto,
  VerifyOTPDto,
  UpdatePhoneNumberDto,
  SendBulkSMSDto,
  CreateSMSAlertDto,
} from './dto/send-sms.dto';

/**
 * SMS Notifications Controller — endpoints for:
 * - Sending transactional SMS
 * - OTP request and verification
 * - Phone number management
 * - SMS alerts (triggers and preferences)
 * - Bulk SMS (admin only)
 *
 * All endpoints require authentication (Bearer token).
 * All responses are tenant-scoped (empresaId from token).
 */
@ApiTags('SMS Notifications')
@ApiBearerAuth()
@Controller('api/v1/sms-notifications')
@UseGuards(SMSAuthGuard)
export class SMSNotificationsController {
  constructor(private readonly smsService: SMSNotificationsService) {}

  /**
   * POST /sms-notifications/send
   * Send transactional SMS (admin only).
   */
  @Post('send')
  @ApiOperation({
    summary: 'Send SMS message',
    description: 'Send a transactional SMS message. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS sent successfully',
    schema: {
      properties: {
        messageId: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  async sendSMS(@CurrentUser() auth: AuthenticatedUser, @Body() dto: SendSMSDto) {
    return this.smsService.sendSMS(auth, dto);
  }

  /**
   * POST /sms-notifications/send-otp
   * Request OTP for login/verification.
   */
  @Post('send-otp')
  @ApiOperation({
    summary: 'Request OTP code',
    description: 'Send OTP code to phone number. Rate limited: 5 per hour per user.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        expiresIn: { type: 'number', description: 'Seconds until expiry' },
      },
    },
  })
  async sendOTP(@CurrentUser() auth: AuthenticatedUser, @Body() dto: SendOTPDto) {
    return this.smsService.sendOTP(auth, dto);
  }

  /**
   * POST /sms-notifications/verify-otp
   * Verify OTP code (public — no auth required for some flows).
   */
  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP code',
    description: 'Verify OTP code sent to phone number.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        phoneNumberId: { type: 'string' },
      },
    },
  })
  async verifyOTP(@CurrentUser() auth: AuthenticatedUser, @Body() dto: VerifyOTPDto) {
    return this.smsService.verifyOTP(auth, dto);
  }

  /**
   * GET /sms-notifications/phone-numbers
   * Get all phone numbers for authenticated user.
   */
  @Get('phone-numbers')
  @ApiOperation({
    summary: 'Get phone numbers',
    description: 'List all verified phone numbers for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone numbers retrieved',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          phoneNumber: { type: 'string' },
          isVerified: { type: 'boolean' },
          isPrimary: { type: 'boolean' },
          lastUsedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getPhoneNumbers(@CurrentUser() auth: AuthenticatedUser) {
    return this.smsService.getPhoneNumbers(auth);
  }

  /**
   * POST /sms-notifications/phone-numbers
   * Add/update phone number.
   */
  @Post('phone-numbers')
  @ApiOperation({
    summary: 'Add phone number',
    description: 'Add or update a phone number. Requires OTP verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Phone number added',
    schema: {
      properties: {
        id: { type: 'string' },
        phoneNumber: { type: 'string' },
        isVerified: { type: 'boolean' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  async addPhoneNumber(@CurrentUser() auth: AuthenticatedUser, @Body() dto: UpdatePhoneNumberDto) {
    return this.smsService.addPhoneNumber(auth, dto);
  }

  /**
   * DELETE /sms-notifications/phone-numbers/:phoneId
   * Remove phone number.
   */
  @Delete('phone-numbers/:phoneId')
  @ApiOperation({
    summary: 'Delete phone number',
    description: 'Remove a phone number. Cannot delete only primary number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number deleted',
  })
  async removePhoneNumber(
    @CurrentUser() auth: AuthenticatedUser,
    @Param('phoneId') phoneId: string,
  ) {
    return this.smsService.removePhoneNumber(auth, phoneId);
  }

  /**
   * GET /sms-notifications/alerts
   * Get all SMS alerts for user.
   */
  @Get('alerts')
  @ApiOperation({
    summary: 'Get SMS alerts',
    description: 'List all SMS alerts configured by the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS alerts retrieved',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          trigger: { type: 'string' },
          message: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
  })
  async getSMSAlerts(@CurrentUser() auth: AuthenticatedUser) {
    return this.smsService.getSMSAlerts(auth);
  }

  /**
   * POST /sms-notifications/alerts
   * Create SMS alert.
   */
  @Post('alerts')
  @ApiOperation({
    summary: 'Create SMS alert',
    description: 'Create an SMS alert for specific events (order confirmation, inventory, etc).',
  })
  @ApiResponse({
    status: 201,
    description: 'SMS alert created',
    schema: {
      properties: {
        id: { type: 'string' },
        trigger: { type: 'string' },
        isActive: { type: 'boolean' },
      },
    },
  })
  async createSMSAlert(@CurrentUser() auth: AuthenticatedUser, @Body() dto: CreateSMSAlertDto) {
    return this.smsService.createSMSAlert(auth, dto);
  }

  /**
   * DELETE /sms-notifications/alerts/:alertId
   * Remove SMS alert.
   */
  @Delete('alerts/:alertId')
  @ApiOperation({
    summary: 'Delete SMS alert',
    description: 'Remove an SMS alert.',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS alert deleted',
  })
  async removeSMSAlert(@CurrentUser() auth: AuthenticatedUser, @Param('alertId') alertId: string) {
    return this.smsService.removeSMSAlert(auth, alertId);
  }

  /**
   * POST /sms-notifications/bulk-send
   * Send bulk SMS (admin only).
   */
  @Post('bulk-send')
  @ApiOperation({
    summary: 'Send bulk SMS',
    description: 'Send SMS to multiple recipients. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk SMS sent',
    schema: {
      properties: {
        sent: { type: 'number' },
        failed: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendBulkSMS(@CurrentUser() auth: AuthenticatedUser, @Body() dto: SendBulkSMSDto) {
    return this.smsService.sendBulkSMS(auth, dto);
  }
}
