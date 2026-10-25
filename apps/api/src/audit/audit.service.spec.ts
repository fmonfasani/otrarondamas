import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockEmpresaId = '00000000-0000-0000-0000-000000000001';
  const mockUsuarioId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              deleteMany: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry with correct data', async () => {
      const dto: CreateAuditLogDto = {
        empresaId: mockEmpresaId,
        usuarioId: mockUsuarioId,
        accion: 'CREAR_VENTA' as any,
        entidadAfectada: 'Venta',
        entidadId: '123456',
        valoresPosteriores: { id: '123456', total: 100 },
      };

      const mockResult = {
        id: 'audit-id',
        ...dto,
        accionEnum: 'CREAR_VENTA' as any,
        fechaHora: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        accion: 'CREAR_VENTA',
        motivo: null,
        autorizacionId: null,
        ventaId: null,
        valoresAnteriores: null,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue(mockResult as any);

      const result = await service.log(dto);

      expect(result).toEqual(mockResult);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should handle optional fields correctly', async () => {
      const dto: CreateAuditLogDto = {
        empresaId: mockEmpresaId,
        accion: 'LOGIN' as any,
        entidadAfectada: 'Usuario',
      };

      const mockResult = {
        id: 'audit-id',
        empresaId: dto.empresaId,
        usuarioId: null,
        accionEnum: 'LOGIN' as any,
        accion: 'LOGIN',
        entidadAfectada: 'Usuario',
        entidadId: null,
        fechaHora: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        valoresAnteriores: null,
        valoresPosteriores: null,
        motivo: null,
        autorizacionId: null,
        ventaId: null,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue(mockResult as any);

      const result = await service.log(dto);

      expect(result.usuarioId).toBeNull();
      expect(result.entidadId).toBeNull();
    });
  });

  describe('logAsync', () => {
    it('should call log without awaiting result', async () => {
      const dto: CreateAuditLogDto = {
        empresaId: mockEmpresaId,
        accion: 'LOGOUT' as any,
        entidadAfectada: 'Usuario',
      };

      const mockResult = {
        id: 'audit-id',
        ...dto,
        accionEnum: 'LOGOUT' as any,
        accion: 'LOGOUT',
        fechaHora: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        motivo: null,
        autorizacionId: null,
        ventaId: null,
        usuarioId: null,
        entidadId: null,
        valoresAnteriores: null,
        valoresPosteriores: null,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue(mockResult as any);
      jest.spyOn(console, 'error').mockImplementation();

      await service.logAsync(dto);

      // Give async operation time to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const dto: CreateAuditLogDto = {
        empresaId: mockEmpresaId,
        accion: 'ERROR_CRITICO' as any,
        entidadAfectada: 'System',
      };

      jest
        .spyOn(prisma.auditLog, 'create')
        .mockRejectedValue(new Error('DB Error'));
      jest.spyOn(console, 'error').mockImplementation();

      await service.logAsync(dto);

      // Give async operation time to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('logBatch', () => {
    it('should create multiple audit logs', async () => {
      const dtos: CreateAuditLogDto[] = [
        {
          empresaId: mockEmpresaId,
          accion: 'CREAR_VENTA' as any,
          entidadAfectada: 'Venta',
          entidadId: '1',
        },
        {
          empresaId: mockEmpresaId,
          accion: 'ACTUALIZAR_VENTA' as any,
          entidadAfectada: 'Venta',
          entidadId: '2',
        },
      ];

      jest
        .spyOn(prisma.auditLog, 'createMany')
        .mockResolvedValue({ count: 2 });

      const count = await service.logBatch(dtos);

      expect(count).toBe(2);
      expect(prisma.auditLog.createMany).toHaveBeenCalled();
    });

    it('should return 0 for empty batch', async () => {
      const count = await service.logBatch([]);
      expect(count).toBe(0);
      expect(prisma.auditLog.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('should query logs with multi-tenant isolation', async () => {
      const mockLogs = [
        {
          id: '1',
          empresaId: mockEmpresaId,
          usuarioId: mockUsuarioId,
          accionEnum: 'CREAR_VENTA' as any,
          accion: 'CREAR_VENTA',
          entidadAfectada: 'Venta',
          entidadId: '123',
          fechaHora: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          valoresAnteriores: null,
          valoresPosteriores: null,
          motivo: null,
          autorizacionId: null,
          ventaId: null,
        },
      ];

      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue(mockLogs as any);

      const result = await service.getLogs({
        empresaId: mockEmpresaId,
        limit: 100,
      });

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalled();
    });

    it('should filter by action type', async () => {
      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);

      await service.getLogs({
        empresaId: mockEmpresaId,
        accion: 'CREAR_VENTA' as any,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accionEnum: 'CREAR_VENTA',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2026-10-01');
      const endDate = new Date('2026-10-31');

      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);

      await service.getLogs({
        empresaId: mockEmpresaId,
        startDate,
        endDate,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fechaHora: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should limit result set to 1000 max', async () => {
      jest.spyOn(prisma.auditLog, 'findMany').mockResolvedValue([]);

      await service.getLogs({
        empresaId: mockEmpresaId,
        limit: 5000, // Request 5000, should be capped at 1000
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        }),
      );
    });
  });

  describe('countLogs', () => {
    it('should count logs with filters', async () => {
      jest.spyOn(prisma.auditLog, 'count').mockResolvedValue(42);

      const count = await service.countLogs({
        empresaId: mockEmpresaId,
        accion: 'CREAR_VENTA' as any,
      });

      expect(count).toBe(42);
      expect(prisma.auditLog.count).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than 1 year', async () => {
      jest.spyOn(prisma.auditLog, 'deleteMany').mockResolvedValue({ count: 100 });
      jest.spyOn(console, 'log').mockImplementation();

      await service.cleanupOldLogs();

      expect(prisma.auditLog.deleteMany).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle zero deleted records', async () => {
      jest.spyOn(prisma.auditLog, 'deleteMany').mockResolvedValue({ count: 0 });
      jest.spyOn(console, 'log').mockImplementation();

      await service.cleanupOldLogs();

      // Should not log when no records deleted
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('getUserActivitySummary', () => {
    it('should aggregate user activity by action type', async () => {
      const mockGroups = [
        { accionEnum: 'CREAR_VENTA' as any, _count: { id: 5 } },
        { accionEnum: 'ACTUALIZAR_VENTA' as any, _count: { id: 3 } },
        { accionEnum: null, _count: { id: 0 } }, // Null accionEnum (legacy)
      ];

      jest.spyOn(prisma.auditLog, 'groupBy').mockResolvedValue(mockGroups as any);

      const summary = await service.getUserActivitySummary(
        mockEmpresaId,
        mockUsuarioId,
      );

      expect(summary).toEqual({
        'CREAR_VENTA': 5,
        'ACTUALIZAR_VENTA': 3,
      });
    });
  });

  describe('getActionDistribution', () => {
    it('should aggregate action distribution across all users', async () => {
      const mockGroups = [
        { accionEnum: 'LOGIN' as any, _count: { id: 150 } },
        { accionEnum: 'LOGOUT' as any, _count: { id: 145 } },
      ];

      jest.spyOn(prisma.auditLog, 'groupBy').mockResolvedValue(mockGroups as any);

      const distribution = await service.getActionDistribution(mockEmpresaId);

      expect(distribution).toEqual({
        'LOGIN': 150,
        'LOGOUT': 145,
      });
    });
  });
});
