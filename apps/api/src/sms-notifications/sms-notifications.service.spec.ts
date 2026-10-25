import { Test, TestingModule } from '@nestjs/testing';
import { SMSNotificationsService } from './sms-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('SMSNotificationsService', () => {
  let service: SMSNotificationsService;
  let prisma: jest.Mocked<PrismaService>;
  let businessContext: jest.Mocked<BusinessContextService>;

  const mockAuth: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    nombre: 'Test User',
    empresaId: 'empresa-123',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  };

  const mockCustomer: AuthenticatedUser = {
    id: 'cliente-123',
    email: 'client@example.com',
    nombre: 'Test Client',
    empresaId: 'empresa-123',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'cliente',
  };

  beforeEach(async () => {
    prisma = {
      phoneNumber: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      oTPSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      sMSLog: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      sMSAlert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    businessContext = {
      resolveForAuthenticatedUser: jest
        .fn()
        .mockResolvedValue({ businessId: 'empresa-123', userId: 'user-123' }),
      resolveForCustomer: jest
        .fn()
        .mockResolvedValue({ businessId: 'empresa-123', customerId: 'cliente-123' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SMSNotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessContextService, useValue: businessContext },
      ],
    }).compile();

    service = module.get<SMSNotificationsService>(SMSNotificationsService);
  });

  describe('sendOTP', () => {
    it('should generate and send OTP', async () => {
      const dto = {
        phoneNumber: '11 1234 5678',
        purpose: 'LOGIN' as const,
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(null);
      prisma.phoneNumber.create.mockResolvedValueOnce({
        id: 'phone-123',
        phoneNumber: '+541112345678',
        empresaId: 'empresa-123',
        usuarioId: 'user-123',
        clienteId: null,
        countryCode: '+54',
        isVerified: false,
        isPrimary: false,
        verificationCode: null,
        verificationCodeExpires: null,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.oTPSession.create.mockResolvedValueOnce({
        id: 'otp-123',
        phoneNumberId: 'phone-123',
        purpose: 'LOGIN',
        code: '123456',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock Twilio (requires client initialization, which we skip for unit test)
      service['twilioClient'] = {
        messages: {
          create: jest.fn().mockResolvedValueOnce({ sid: 'msg-123', status: 'sent' }),
        },
      } as any;
      service['twilioDid'] = '+1234567890';

      const result = await service.sendOTP(mockAuth, dto);

      expect(result.success).toBe(true);
      expect(result.expiresIn).toBe(5 * 60); // 5 minutes
      expect(prisma.sMSLog.create).toHaveBeenCalled();
    });

    it('should throw on rate limit exceeded', async () => {
      const dto = {
        phoneNumber: '+541112345678',
        purpose: 'LOGIN' as const,
      };

      // Initialize Twilio for this test
      service['twilioClient'] = {
        messages: {
          create: jest.fn().mockResolvedValueOnce({ sid: 'msg-123', status: 'sent' }),
        },
      } as any;
      service['twilioDid'] = '+1234567890';

      // Simulate rate limiter throwing
      service['rateLimiter'].checkOTPLimit = jest.fn().mockImplementation(() => {
        throw new Error('Demasiados intentos de OTP');
      });

      await expect(service.sendOTP(mockAuth, dto)).rejects.toThrow(BadRequestException);
    });

    it('should normalize phone numbers', async () => {
      const testCases = [
        { input: '11 1234 5678', expected: '+541112345678' },
        { input: '+54 9 11 1234 5678', expected: '+5491112345678' },
        { input: '1112345678', expected: '+541112345678' },
      ];

      for (const { input, expected } of testCases) {
        // Access private method via any cast for testing
        const normalized = (service as any).normalizePhoneNumber(input);
        expect(normalized).toBe(expected);
      }
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP code', async () => {
      const dto = {
        phoneNumber: '+541112345678',
        code: '123456',
        purpose: 'LOGIN' as const,
      };

      const mockPhoneRecord = {
        id: 'phone-123',
        phoneNumber: '+541112345678',
        empresaId: 'empresa-123',
        usuarioId: 'user-123',
        isVerified: false,
      };

      const mockOtpSession = {
        id: 'otp-123',
        code: '123456',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verifiedAt: null,
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.oTPSession.findFirst.mockResolvedValueOnce(mockOtpSession as any);
      prisma.oTPSession.update.mockResolvedValueOnce({
        ...mockOtpSession,
        verifiedAt: new Date(),
      } as any);
      prisma.phoneNumber.update.mockResolvedValueOnce({
        ...mockPhoneRecord,
        isVerified: true,
      } as any);

      const result = await service.verifyOTP(mockAuth, dto);

      expect(result.success).toBe(true);
      expect(result.phoneNumberId).toBe('phone-123');
      expect(prisma.phoneNumber.update).toHaveBeenCalledWith({
        where: { id: 'phone-123' },
        data: { isVerified: true },
      });
    });

    it('should reject wrong OTP code', async () => {
      const dto = {
        phoneNumber: '+541112345678',
        code: 'WRONG',
        purpose: 'LOGIN' as const,
      };

      const mockPhoneRecord = {
        id: 'phone-123',
        phoneNumber: '+541112345678',
      };

      const mockOtpSession = {
        id: 'otp-123',
        code: '123456',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verifiedAt: null,
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.oTPSession.findFirst.mockResolvedValueOnce(mockOtpSession as any);
      prisma.oTPSession.update.mockResolvedValueOnce({
        ...mockOtpSession,
        attempts: 1,
      } as any);

      await expect(service.verifyOTP(mockAuth, dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject expired OTP', async () => {
      const dto = {
        phoneNumber: '+541112345678',
        code: '123456',
        purpose: 'LOGIN' as const,
      };

      const mockPhoneRecord = {
        id: 'phone-123',
        phoneNumber: '+541112345678',
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.oTPSession.findFirst.mockResolvedValueOnce(null); // No active session

      await expect(service.verifyOTP(mockAuth, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Phone Number Management', () => {
    it('should add phone number', async () => {
      const dto = { phoneNumber: '+541112345678', isPrimary: true };

      prisma.phoneNumber.upsert.mockResolvedValueOnce({
        id: 'phone-123',
        phoneNumber: '+541112345678',
        isVerified: false,
        isPrimary: true,
      } as any);

      const result = await service.addPhoneNumber(mockAuth, dto);

      expect(result.id).toBe('phone-123');
      expect(result.isVerified).toBe(false);
    });

    it('should remove phone number', async () => {
      const phoneId = 'phone-123';

      const mockPhoneRecord = {
        id: phoneId,
        phoneNumber: '+541112345678',
        empresaId: 'empresa-123',
        usuarioId: 'user-123',
        clienteId: null,
        isPrimary: false,
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.phoneNumber.count.mockResolvedValueOnce(0); // No other primary numbers
      prisma.sMSLog.deleteMany.mockResolvedValueOnce({} as any);
      prisma.oTPSession.deleteMany.mockResolvedValueOnce({} as any);
      prisma.phoneNumber.delete.mockResolvedValueOnce({} as any);

      const result = await service.removePhoneNumber(mockAuth, phoneId);

      expect(result.success).toBe(true);
      expect(prisma.phoneNumber.delete).toHaveBeenCalledWith({
        where: { id: phoneId },
      });
    });

    it('should prevent deletion of only primary phone', async () => {
      const phoneId = 'phone-123';

      const mockPhoneRecord = {
        id: phoneId,
        phoneNumber: '+541112345678',
        empresaId: 'empresa-123',
        usuarioId: 'user-123',
        isPrimary: true,
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.phoneNumber.count.mockResolvedValueOnce(1); // This is the only primary

      await expect(service.removePhoneNumber(mockAuth, phoneId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should get user phone numbers', async () => {
      prisma.phoneNumber.findMany.mockResolvedValueOnce([
        {
          id: 'phone-1',
          phoneNumber: '+541234567890',
          isVerified: true,
          isPrimary: true,
          lastUsedAt: new Date(),
        },
      ] as any);

      const result = await service.getPhoneNumbers(mockAuth);

      expect(result).toHaveLength(1);
      expect(result[0].isPrimary).toBe(true);
    });
  });

  describe('SMS Alerts', () => {
    it('should create SMS alert', async () => {
      const dto = {
        trigger: 'order_confirmation',
        message: 'Tu pedido fue confirmado',
      };

      const mockPhoneRecord = {
        id: 'phone-123',
        phoneNumber: '+541112345678',
      };

      prisma.phoneNumber.findFirst.mockResolvedValueOnce(mockPhoneRecord as any);
      prisma.sMSAlert.create.mockResolvedValueOnce({
        id: 'alert-123',
        trigger: 'order_confirmation',
        isActive: true,
      } as any);

      const result = await service.createSMSAlert(mockAuth, dto);

      expect(result.id).toBe('alert-123');
      expect(result.trigger).toBe('order_confirmation');
    });

    it('should get user SMS alerts', async () => {
      prisma.sMSAlert.findMany.mockResolvedValueOnce([
        {
          id: 'alert-1',
          trigger: 'order_confirmation',
          message: 'Tu pedido fue confirmado',
          isActive: true,
        },
      ] as any);

      const result = await service.getSMSAlerts(mockAuth);

      expect(result).toHaveLength(1);
      expect(result[0].trigger).toBe('order_confirmation');
    });

    it('should remove SMS alert', async () => {
      const alertId = 'alert-123';

      const mockAlert = {
        id: alertId,
        empresaId: 'empresa-123',
        usuarioId: 'user-123',
        clienteId: null,
      };

      prisma.sMSAlert.findFirst.mockResolvedValueOnce(mockAlert as any);
      prisma.sMSAlert.delete.mockResolvedValueOnce({} as any);

      const result = await service.removeSMSAlert(mockAuth, alertId);

      expect(result.success).toBe(true);
      expect(prisma.sMSAlert.delete).toHaveBeenCalledWith({
        where: { id: alertId },
      });
    });
  });

  describe('Bulk SMS', () => {
    it('should send bulk SMS (admin only)', async () => {
      const dto = {
        phoneNumbers: ['+541234567890', '+549876543210'],
        message: 'Promotional message',
      };

      service['twilioClient'] = {
        messages: {
          create: jest.fn().mockResolvedValue({ sid: 'msg-123', status: 'sent' }),
        },
      } as any;
      service['twilioDid'] = '+1234567890';

      const result = await service.sendBulkSMS(mockAuth, dto);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should reject bulk SMS from non-admin', async () => {
      const nonAdminAuth = { ...mockAuth, rol: 'ASISTENTE_LOCAL' };
      const dto = {
        phoneNumbers: ['+541234567890'],
        message: 'Message',
      };

      // Initialize Twilio (auth check happens after Twilio check)
      service['twilioClient'] = {
        messages: {
          create: jest.fn(),
        },
      } as any;
      service['twilioDid'] = '+1234567890';

      await expect(service.sendBulkSMS(nonAdminAuth as any, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Customer vs Usuario', () => {
    it('should handle cliente (customer) phone numbers', async () => {
      const dto = { phoneNumber: '+541112345678' };

      prisma.phoneNumber.upsert.mockResolvedValueOnce({
        id: 'phone-123',
        phoneNumber: '+541112345678',
        clienteId: 'cliente-123',
        usuarioId: null,
      } as any);

      const result = await service.addPhoneNumber(mockCustomer, dto);

      expect(result.id).toBe('phone-123');
      expect(prisma.phoneNumber.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            clienteId: 'cliente-123',
          }),
        }),
      );
    });
  });
});
