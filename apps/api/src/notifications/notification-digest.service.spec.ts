import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
// import { DigestPeriod } from '@prisma/client'; // TODO: types
import { NotificationDigestService } from './notification-digest.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('NotificationDigestService', () => {
  let service: NotificationDigestService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockDigest = {
    id: 'digest-1',
    usuarioId: 'user-1',
    empresaId: 'biz-1',
    period: DigestPeriod.DAILY,
    startDate: new Date('2026-10-25'),
    endDate: new Date('2026-10-26'),
    summary: { orders: 5, messages: 12, inventory: 3 },
    content: '<html>...</html>',
    sentAt: null,
    openedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDigestService,
        {
          provide: PrismaService,
          useValue: {
            notificationDigest: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            usuario: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationDigestService>(NotificationDigestService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateDigest', () => {
    it('should return existing unsent digest', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);

      const result = await service.getOrCreateDigest('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result.id).toBe('digest-1');
    });

    it('should create new digest if none exists', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(null);
      jest.spyOn(prisma.notificationDigest, 'create').mockResolvedValueOnce(mockDigest as any);

      const result = await service.getOrCreateDigest('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result.id).toBe('digest-1');
      expect(prisma.notificationDigest.create).toHaveBeenCalled();
    });
  });

  describe('batchNotifications', () => {
    it('should batch notifications by type', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce(mockDigest as any);

      const result = await service.batchNotifications('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result.id).toBe('digest-1');
    });
  });

  describe('generateDigest', () => {
    it('should generate HTML digest content', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce({
        ...mockDigest,
        content: expect.stringContaining('<!DOCTYPE html>'),
      } as any);

      const result = await service.generateDigest('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Notificaciones Resumidas');
    });

    it('should include order count in digest', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce(mockDigest as any);

      const result = await service.generateDigest('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result).toContain('5'); // orders count
    });
  });

  describe('sendDigestEmail', () => {
    it('should send digest email successfully', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
      } as any);
      jest.spyOn(emailService, 'send').mockResolvedValueOnce(undefined as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce({
        ...mockDigest,
        sentAt: new Date(),
      } as any);

      const result = await service.sendDigestEmail('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(emailService.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: expect.stringContaining('Resumen de Notificaciones'),
        html: expect.any(String),
      });
      expect(result.sentAt).toBeTruthy();
    });

    it('should throw BadRequestException if usuario email not found', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.sendDigestEmail('user-1', 'biz-1', DigestPeriod.DAILY)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDigestPreview', () => {
    it('should return HTML preview without sending email', async () => {
      jest.spyOn(prisma.notificationDigest, 'findFirst').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce(mockDigest as any);

      const result = await service.getDigestPreview('user-1', 'biz-1', DigestPeriod.DAILY);

      expect(result).toContain('<!DOCTYPE html>');
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('markDigestAsOpened', () => {
    it('should mark digest as opened', async () => {
      jest.spyOn(prisma.notificationDigest, 'findUnique').mockResolvedValueOnce(mockDigest as any);
      jest.spyOn(prisma.notificationDigest, 'update').mockResolvedValueOnce({
        ...mockDigest,
        openedAt: new Date(),
      } as any);

      const result = await service.markDigestAsOpened('digest-1');

      expect(result.openedAt).toBeTruthy();
    });

    it('should throw NotFoundException if digest does not exist', async () => {
      jest.spyOn(prisma.notificationDigest, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.markDigestAsOpened('digest-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserDigests', () => {
    it('should return user digests', async () => {
      jest.spyOn(prisma.notificationDigest, 'findMany').mockResolvedValueOnce([mockDigest] as any);

      const result = await service.getUserDigests('user-1', 'biz-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('digest-1');
    });

    it('should filter by date range if provided', async () => {
      jest.spyOn(prisma.notificationDigest, 'findMany').mockResolvedValueOnce([mockDigest] as any);

      const startDate = new Date('2026-10-01');
      const endDate = new Date('2026-10-31');

      const result = await service.getUserDigests('user-1', 'biz-1', startDate, endDate);

      expect(result).toHaveLength(1);
      expect(prisma.notificationDigest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('getPeriodBoundaries', () => {
    it('should calculate daily boundaries', () => {
      const date = new Date('2026-10-25T12:00:00Z');
      const boundaries = (service as any).getPeriodBoundaries(date, DigestPeriod.DAILY);

      expect(boundaries.startDate.getHours()).toBe(0);
      expect(boundaries.startDate.getMinutes()).toBe(0);
    });

    it('should calculate weekly boundaries', () => {
      const date = new Date('2026-10-25T12:00:00Z'); // Saturday
      const boundaries = (service as any).getPeriodBoundaries(date, DigestPeriod.WEEKLY);

      expect(boundaries.endDate.getTime()).toBeGreaterThan(boundaries.startDate.getTime());
    });

    it('should calculate monthly boundaries', () => {
      const date = new Date('2026-10-25T12:00:00Z');
      const boundaries = (service as any).getPeriodBoundaries(date, DigestPeriod.MONTHLY);

      expect(boundaries.startDate.getDate()).toBe(1);
    });
  });
});
