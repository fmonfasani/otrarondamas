import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  GoneException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DemoService } from './demo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DemoService', () => {
  let service: DemoService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            property: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DemoService>(DemoService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock fetch for email sending
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveContact', () => {
    it('should save a valid contact', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Interested in viewing',
        propertyId: null,
        verifiedAt: null,
        verificationToken: 'token-hash',
        tokenExpiresAt: new Date(),
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (prisma.lead.create as jest.Mock) = mockCreate;

      const result = await service.saveContact({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Interested in viewing',
        ipAddress: '192.168.1.1',
      });

      expect(result.lead_id).toBe('lead-1');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing name', async () => {
      await expect(
        service.saveContact({
          name: '',
          email: 'john@example.com',
          phone: '+54 9 11 2345-6789',
          message: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing email', async () => {
      await expect(
        service.saveContact({
          name: 'John Doe',
          email: '',
          phone: '+54 9 11 2345-6789',
          message: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      await expect(
        service.saveContact({
          name: 'John Doe',
          email: 'not-an-email',
          phone: '+54 9 11 2345-6789',
          message: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing phone', async () => {
      await expect(
        service.saveContact({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
          message: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid phone format', async () => {
      await expect(
        service.saveContact({
          name: 'John Doe',
          email: 'john@example.com',
          phone: 'not-a-phone',
          message: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing message', async () => {
      await expect(
        service.saveContact({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+54 9 11 2345-6789',
          message: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for nonexistent property', async () => {
      const mockPropertyFind = jest.fn().mockResolvedValue(null);
      (prisma.property.findUnique as jest.Mock) = mockPropertyFind;

      await expect(
        service.saveContact({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+54 9 11 2345-6789',
          message: 'Test',
          propertyId: 'nonexistent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trim whitespace from fields', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+54 9 11 2345-6789',
        message: 'Interested',
        propertyId: null,
        verifiedAt: null,
        verificationToken: 'token-hash',
        tokenExpiresAt: new Date(),
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (prisma.lead.create as jest.Mock) = mockCreate;

      await service.saveContact({
        name: '  John Doe  ',
        email: '  john@example.com  ',
        phone: '  +54 9 11 2345-6789  ',
        message: '  Interested  ',
        ipAddress: '192.168.1.1',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+54 9 11 2345-6789',
            message: 'Interested',
          }),
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify a valid token', async () => {
      const token = await service.getVerificationToken('test@example.com');

      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'test@example.com',
        verifiedAt: null,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'test@example.com',
        verifiedAt: new Date(),
      });

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;
      (prisma.lead.update as jest.Mock) = mockUpdate;

      const result = await service.verifyEmail(token);

      expect(result.verified).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should be idempotent: already verified token returns success', async () => {
      const token = await service.getVerificationToken('test@example.com');

      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'test@example.com',
        verifiedAt: new Date(), // Already verified
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;

      const result = await service.verifyEmail(token);

      expect(result.verified).toBe(true);
      expect(result.message).toContain('already verified');
    });

    it('should throw BadRequestException for empty token', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw GoneException for expired token', async () => {
      const token = await service.getVerificationToken('test@example.com');

      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 'lead-1',
        email: 'test@example.com',
        verifiedAt: null,
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
      });

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;

      await expect(service.verifyEmail(token)).rejects.toThrow(GoneException);
    });

    it('should throw BadRequestException when lead not found', async () => {
      const token = await service.getVerificationToken('test@example.com');

      const mockFindFirst = jest.fn().mockResolvedValue(null);

      (prisma.lead.findFirst as jest.Mock) = mockFindFirst;

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVerificationToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await service.getVerificationToken('test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });
  });
});
