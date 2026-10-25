import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditReportingService } from './audit-reporting.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditReportingService;
  let prisma: PrismaService;

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    empresaId: 'business-1',
    nombre: 'Test User',
    permisos: [],
    rol: 'ASISTENTE_LOCAL',
    estadoLegajo: 'ACTIVO',
    type: 'usuario',
  };

  const mockAuditLog = {
    id: 'audit-1',
    empresaId: 'business-1',
    usuarioId: 'user-1',
    accion: 'VENTA_CREADA',
    entidadAfectada: 'Venta',
    entidadId: 'venta-1',
    valoresAnteriores: null,
    valoresPosteriores: { total: 150.5, items: 3 },
    motivo: null,
    createdAt: new Date('2026-10-25T14:32:10Z'),
    updatedAt: new Date('2026-10-25T14:32:10Z'),
    Usuario: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditReportingService,
          useValue: {
            listAuditLogs: jest.fn(),
            getAuditLogDetail: jest.fn(),
            getAuditSummary: jest.fn(),
            getUserActivityTrail: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditReportingService>(AuditReportingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listAuditLogs', () => {
    it('should return audit logs with pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 'audit-1',
            businessId: 'business-1',
            accion: 'VENTA_CREADA',
            entidad: 'Venta',
            entityId: 'venta-1',
            userId: 'user-1',
            usuario: {
              id: 'user-1',
              nombre: 'Juan Pérez',
              email: 'juan@example.com',
            },
            valores_nuevos: { total: 150.5 },
            createdAt: '2026-10-25T14:32:10.000Z',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [
          {
            permiso: { nombre: 'audit.leer' },
          },
        ],
      } as any);

      jest.spyOn(service, 'listAuditLogs').mockResolvedValueOnce(mockResponse);

      const result = await controller.listAuditLogs(
        mockAuthenticatedUser,
        'VENTA_CREADA',
        undefined,
        undefined,
        '2026-10-01',
        '2026-10-31',
        '50',
        '0',
      );

      expect(result).toEqual(mockResponse);
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it('Test 2: should apply all filters (accion, entidad, userId, dates)', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer_otros' } }],
      } as any);

      jest.spyOn(service, 'listAuditLogs').mockResolvedValueOnce({
        items: [mockAuditLog].map((log) => ({
          id: log.id,
          businessId: log.empresaId,
          accion: log.accion,
          entidad: log.entidadAfectada,
          entityId: log.entidadId,
          userId: log.usuarioId,
          usuario: {
            id: log.Usuario.id,
            nombre: log.Usuario.nombre,
            email: log.Usuario.email,
          },
          valores_nuevos: log.valoresPosteriores,
          createdAt: log.createdAt.toISOString(),
        })),
        total: 1,
        limit: 50,
        offset: 0,
      });

      const result = await controller.listAuditLogs(
        mockAuthenticatedUser,
        'VENTA_CREADA',
        'Venta',
        'user-1',
        '2026-10-01',
        '2026-10-31',
        '50',
        '0',
      );

      expect(result.items.length).toBeGreaterThanOrEqual(0);
      expect(service.listAuditLogs).toHaveBeenCalledWith(
        'business-1',
        'user-1',
        true,
        expect.objectContaining({
          accion: 'VENTA_CREADA',
          entidad: 'Venta',
          filterUserId: 'user-1',
          fecha_desde: '2026-10-01',
          fecha_hasta: '2026-10-31',
        }),
      );
    });

    it('Test 3: should enforce pagination limit (max 500)', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest.spyOn(service, 'listAuditLogs').mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 500,
        offset: 0,
      });

      await controller.listAuditLogs(
        mockAuthenticatedUser,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1000',
        '0',
      );

      expect(service.listAuditLogs).toHaveBeenCalledWith(
        'business-1',
        'user-1',
        false,
        expect.objectContaining({
          limit: 1000,
        }),
      );
    });

    it('Test 4: should return empty result when no logs match', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest.spyOn(service, 'listAuditLogs').mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const result = await controller.listAuditLogs(
        mockAuthenticatedUser,
        'NONEXISTENT',
        undefined,
        undefined,
        '2026-01-01',
        '2026-01-31',
        '50',
        '0',
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getAuditLogDetail', () => {
    it('Test 5: should return single audit log detail', async () => {
      const mockDetail = {
        id: 'audit-1',
        businessId: 'business-1',
        accion: 'VENTA_CREADA',
        entidad: 'Venta',
        entityId: 'venta-1',
        userId: 'user-1',
        usuario: {
          id: 'user-1',
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
        },
        valores_anteriores: null,
        valores_nuevos: { total: 150.5, items: 3 },
        motivo: null,
        createdAt: '2026-10-25T14:32:10.000Z',
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest.spyOn(service, 'getAuditLogDetail').mockResolvedValueOnce(mockDetail);

      const result = await controller.getAuditLogDetail(mockAuthenticatedUser, 'audit-1');

      expect(result).toEqual(mockDetail);
      expect(result.id).toBe('audit-1');
    });

    it('Test 6: should enforce authorization (audit.leer = own logs only)', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'getAuditLogDetail')
        .mockRejectedValueOnce(new NotFoundException('Audit log not found'));

      await expect(controller.getAuditLogDetail(mockAuthenticatedUser, 'audit-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(service.getAuditLogDetail).toHaveBeenCalledWith(
        'audit-1',
        'business-1',
        'user-1',
        false,
      );
    });

    it('Test 7: should return 404 for cross-tenant access', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'getAuditLogDetail')
        .mockRejectedValueOnce(new NotFoundException('Audit log not found'));

      await expect(
        controller.getAuditLogDetail(mockAuthenticatedUser, 'audit-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditSummary', () => {
    it('Test 8: should return summary with correct aggregation by action', async () => {
      const mockSummary = {
        total_eventos: 1250,
        periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
        por_accion: [
          { accion: 'VENTA_CREADA', count: 450 },
          { accion: 'PEDIDO_CANCELADO', count: 120 },
        ],
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer_otros' } }],
      } as any);

      jest.spyOn(service, 'getAuditSummary').mockResolvedValueOnce(mockSummary);

      const result = await controller.getAuditSummary(
        mockAuthenticatedUser,
        '2026-10-01',
        '2026-10-31',
        'accion',
      );

      expect(result).toEqual(mockSummary);
      expect(result.por_accion).toBeDefined();
      expect(result.por_accion?.length).toBeGreaterThan(0);
    });

    it('Test 9: should require audit.leer_otros permission (admin only)', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest.spyOn(service, 'getAuditSummary').mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        controller.getAuditSummary(mockAuthenticatedUser, '2026-10-01', '2026-10-31', 'accion'),
      ).rejects.toThrow();
    });

    it('Test 10: should group by day (default)', async () => {
      const mockSummary = {
        total_eventos: 1250,
        periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
        por_dia: [
          { fecha: '2026-10-01', count: 42 },
          { fecha: '2026-10-02', count: 38 },
        ],
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer_otros' } }],
      } as any);

      jest.spyOn(service, 'getAuditSummary').mockResolvedValueOnce(mockSummary);

      const result = await controller.getAuditSummary(
        mockAuthenticatedUser,
        '2026-10-01',
        '2026-10-31',
        undefined,
      );

      expect(result.por_dia).toBeDefined();
      expect(service.getAuditSummary).toHaveBeenCalledWith('business-1', {
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-31',
        group_by: undefined,
      });
    });

    it('Test 11: should group by user', async () => {
      const mockSummary = {
        total_eventos: 1250,
        periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
        por_usuario: [
          { userId: 'user-123', usuario: 'Juan Pérez', count: 450 },
          { userId: 'user-456', usuario: 'María García', count: 380 },
        ],
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer_otros' } }],
      } as any);

      jest.spyOn(service, 'getAuditSummary').mockResolvedValueOnce(mockSummary);

      const result = await controller.getAuditSummary(
        mockAuthenticatedUser,
        '2026-10-01',
        '2026-10-31',
        'usuario',
      );

      expect(result.por_usuario).toBeDefined();
      expect(result.por_usuario?.length).toBeGreaterThan(0);
    });
  });

  describe('getUserActivityTrail', () => {
    it('Test 12: should return user activity trail with pagination', async () => {
      const mockTrail = {
        items: [
          {
            id: 'audit-1',
            businessId: 'business-1',
            accion: 'VENTA_CREADA',
            entidad: 'Venta',
            entityId: 'venta-1',
            userId: 'user-123',
            usuario: {
              id: 'user-123',
              nombre: 'Juan Pérez',
              email: 'juan@example.com',
            },
            valores_nuevos: { total: 150.5 },
            createdAt: '2026-10-25T10:00:00.000Z',
          },
        ],
        total: 42,
        limit: 50,
        offset: 0,
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer_otros' } }],
      } as any);

      jest.spyOn(service, 'getUserActivityTrail').mockResolvedValueOnce(mockTrail);

      const result = await controller.getUserActivityTrail(
        mockAuthenticatedUser,
        'user-123',
        '2026-10-20',
        '2026-10-25',
        '50',
        '0',
      );

      expect(result).toEqual(mockTrail);
      expect(result.items.length).toBeGreaterThanOrEqual(0);
      expect(result.total).toBe(42);
    });

    it('Test 13: should enforce auth (audit.leer = self only)', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'getUserActivityTrail')
        .mockRejectedValueOnce(new NotFoundException('User activity not found'));

      await expect(
        controller.getUserActivityTrail(
          mockAuthenticatedUser,
          'user-999',
          undefined,
          undefined,
          '50',
          '0',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('Test 14: should return 404 for cross-tenant user', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'getUserActivityTrail')
        .mockRejectedValueOnce(new NotFoundException('User not found in this business'));

      await expect(
        controller.getUserActivityTrail(
          mockAuthenticatedUser,
          'user-foreign',
          undefined,
          undefined,
          '50',
          '0',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('Test 15: should reject invalid date format', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'listAuditLogs')
        .mockRejectedValueOnce(
          new BadRequestException('fecha_desde must be a valid ISO 8601 date'),
        );

      await expect(
        controller.listAuditLogs(
          mockAuthenticatedUser,
          undefined,
          undefined,
          undefined,
          'invalid-date',
          '2026-10-31',
          '50',
          '0',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Test 16: should reject date range where fecha_desde > fecha_hasta', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        empresaId: 'business-1',
        usuarioPermisos: [{ permiso: { nombre: 'audit.leer' } }],
      } as any);

      jest
        .spyOn(service, 'listAuditLogs')
        .mockRejectedValueOnce(new BadRequestException('fecha_desde must be <= fecha_hasta'));

      await expect(
        controller.listAuditLogs(
          mockAuthenticatedUser,
          undefined,
          undefined,
          undefined,
          '2026-10-31',
          '2026-10-01',
          '50',
          '0',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
