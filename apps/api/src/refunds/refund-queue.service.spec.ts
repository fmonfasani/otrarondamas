import { Test, TestingModule } from '@nestjs/testing';
import { RefundQueueService } from './refund-queue.service';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { IPaymentProvider } from '../payments/payment-provider.interface';
import { AuditService } from '../audit/audit.service';
import { AlertService } from '../alerts/alert.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('RefundQueueService', () => {
  let service: RefundQueueService;
  let prismaFactory: jest.Mocked<CompanyScopedPrismaService>;
  let globalPrisma: jest.Mocked<PrismaService>;
  let paymentProvider: jest.Mocked<IPaymentProvider>;
  let auditService: jest.Mocked<AuditService>;
  let alertService: jest.Mocked<AlertService>;

  beforeEach(async () => {
    // Mock payment provider
    paymentProvider = {
      isConfigured: jest.fn().mockReturnValue(true),
      createRefund: jest.fn(),
    };

    // Mock audit service
    auditService = {
      logSystemAction: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock alert service
    alertService = {
      sendRefundFailureAlert: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock prisma factory
    const mockDb = {
      reembolso: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    prismaFactory = {
      forCompany: jest.fn().mockReturnValue(mockDb),
    } as any;

    // Mock global prisma
    globalPrisma = {
      reembolso: {
        findMany: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundQueueService,
        { provide: CompanyScopedPrismaService, useValue: prismaFactory },
        { provide: 'IPaymentProvider', useValue: paymentProvider },
        { provide: AuditService, useValue: auditService },
        { provide: AlertService, useValue: alertService },
        { provide: PrismaService, useValue: globalPrisma },
      ],
    }).compile();

    service = module.get<RefundQueueService>(RefundQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit & onModuleDestroy', () => {
    it('should register polling job on init', async () => {
      const originalSetInterval = setInterval;
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      await service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalled();
      const args = setIntervalSpy.mock.calls[0];
      expect(args[1]).toBe(30000); // Default interval

      setIntervalSpy.mockRestore();
    });

    it('should cleanup polling job on destroy', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should respect REFUND_POLLING_INTERVAL_MS env var', async () => {
      const originalEnv = process.env.REFUND_POLLING_INTERVAL_MS;
      process.env.REFUND_POLLING_INTERVAL_MS = '60000';

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      await service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        60000,
      );

      setIntervalSpy.mockRestore();
      process.env.REFUND_POLLING_INTERVAL_MS = originalEnv;
    });
  });

  describe('enqueueRefund', () => {
    it('should enqueue a new refund', async () => {
      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.upsert.mockResolvedValue({
        id: 'reemb_123',
        estado: 'PENDIENTE',
      });

      await service.enqueueRefund(
        'empresa-1',
        'devolucion-1',
        'venta-1',
        'cliente-1',
        new Decimal('100.00'),
        'credit_card',
      );

      expect(mockDb.reembolso.upsert).toHaveBeenCalledWith({
        where: { devolucionClienteId: 'devolucion-1' },
        update: expect.objectContaining({
          estado: 'PENDIENTE',
          intentos: 0,
        }),
        create: expect.objectContaining({
          empresaId: 'empresa-1',
          devolucionClienteId: 'devolucion-1',
          estado: 'PENDIENTE',
        }),
      });

      expect(auditService.logSystemAction).toHaveBeenCalledWith({
        empresaId: 'empresa-1',
        accion: 'REEMBOLSO_ENQUEUED',
        entidadAfectada: 'Reembolso',
        entidadId: 'devolucion-1',
        valoresPosteriores: expect.objectContaining({
          estado: 'PENDIENTE',
        }),
      });
    });
  });

  describe('processNextBatch', () => {
    it('should fetch due refunds and process each', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: true,
        provider_refund_id: 'mock-ref-123',
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      expect(globalPrisma.reembolso.findMany).toHaveBeenCalledWith({
        where: {
          estado: 'PENDIENTE',
          proximoIntento: { lte: expect.any(Date) },
        },
        include: {
          DevolucionCliente: true,
          Empresa: true,
        },
        take: 100,
      });

      expect(paymentProvider.createRefund).toHaveBeenCalled();
    });
  });

  describe('Happy path: refund succeeds on first attempt', () => {
    it('should mark refund as EXITO and store provider_refund_id', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: true,
        provider_refund_id: 'stripe_ref_abc123',
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          estado: 'EXITO',
          procesadoEn: expect.any(Date),
          referenceId: 'stripe_ref_abc123',
          updatedAt: expect.any(Date),
        },
      });

      expect(auditService.logSystemAction).toHaveBeenCalledWith({
        empresaId: 'empresa-1',
        accion: 'REEMBOLSO_COMPLETADO',
        entidadAfectada: 'Reembolso',
        entidadId: 'dev-1',
        valoresPosteriores: expect.objectContaining({
          estado: 'EXITO',
        }),
      });
    });
  });

  describe('Retry logic: transient failures with exponential backoff', () => {
    it('should retry on first failure with 5 min backoff', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Network timeout',
        retriable: true,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      const before = Date.now();
      await (service as any).processNextBatch();
      const after = Date.now();

      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          intentos: 1,
          proximoIntento: expect.any(Date),
          motivoFalla: 'Network timeout',
          updatedAt: expect.any(Date),
        },
      });

      // Verify exponential backoff: 300_000 * (2^0) = 5 minutes
      const updateCall = (mockDb.reembolso.update as jest.Mock).mock.calls[0][0];
      const nextRetryTime = updateCall.data.proximoIntento.getTime();
      const expectedMin = before + 300_000; // 5 min
      expect(nextRetryTime).toBeGreaterThanOrEqual(expectedMin);
      expect(nextRetryTime).toBeLessThanOrEqual(after + 305_000); // 5 min + buffer
    });

    it('should retry on second failure with 10 min backoff', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 1, // Already tried once
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Provider timeout',
        retriable: true,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      const before = Date.now();
      await (service as any).processNextBatch();
      const after = Date.now();

      const updateCall = (mockDb.reembolso.update as jest.Mock).mock.calls[0][0];
      const nextRetryTime = updateCall.data.proximoIntento.getTime();
      const expectedMin = before + 600_000; // 10 min (300_000 * 2^1)
      expect(nextRetryTime).toBeGreaterThanOrEqual(expectedMin);
      expect(nextRetryTime).toBeLessThanOrEqual(after + 605_000);
    });

    it('should retry on third failure with 20 min backoff', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 2, // Already tried twice
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Temporary outage',
        retriable: true,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      const before = Date.now();
      await (service as any).processNextBatch();
      const after = Date.now();

      const updateCall = (mockDb.reembolso.update as jest.Mock).mock.calls[0][0];
      const nextRetryTime = updateCall.data.proximoIntento.getTime();
      const expectedMin = before + 1_200_000; // 20 min (300_000 * 2^2)
      expect(nextRetryTime).toBeGreaterThanOrEqual(expectedMin);
      expect(nextRetryTime).toBeLessThanOrEqual(after + 1_205_000);
    });
  });

  describe('Max retries: mark FALLIDO and send alert', () => {
    it('should mark as FALLIDO and send alert after 3 failed attempts', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 3, // Already at max
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
        retriable: true,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      // Should mark as FALLIDO
      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          estado: 'FALLIDO',
          motivoFalla: 'Service unavailable',
          updatedAt: expect.any(Date),
        },
      });

      // Should send alert
      expect(alertService.sendRefundFailureAlert).toHaveBeenCalledWith({
        devolucionId: 'dev-1',
        monto: expect.any(Object),
        error: 'Service unavailable',
        clienteEmail: 'client@test.com',
        empresaNombre: 'Test Company',
      });

      // Should log FALLIDO event
      expect(auditService.logSystemAction).toHaveBeenCalledWith({
        empresaId: 'empresa-1',
        accion: 'REEMBOLSO_FALLIDO',
        entidadAfectada: 'Reembolso',
        entidadId: 'dev-1',
        valoresPosteriores: expect.objectContaining({
          estado: 'FALLIDO',
        }),
      });
    });

    it('should not retry if retriable=false (non-recoverable error)', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Account suspended',
        retriable: false,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      // Should immediately mark as FALLIDO (no retry)
      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          estado: 'FALLIDO',
          motivoFalla: 'Account suspended',
          updatedAt: expect.any(Date),
        },
      });

      // Should send alert
      expect(alertService.sendRefundFailureAlert).toHaveBeenCalled();
    });
  });

  describe('Provider configuration check', () => {
    it('should skip refund if provider not configured', async () => {
      paymentProvider.isConfigured.mockReturnValue(false);

      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      // Should not call provider
      expect(paymentProvider.createRefund).not.toHaveBeenCalled();

      // Should not update refund
      expect(mockDb.reembolso.update).not.toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    it('should log all state transitions (ENQUEUED, COMPLETADO, FALLIDO, RETRY)', async () => {
      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.upsert.mockResolvedValue({
        id: 'reemb-1',
        estado: 'PENDIENTE',
      });

      // Enqueue
      await service.enqueueRefund(
        'empresa-1',
        'dev-1',
        'venta-1',
        'cliente-1',
        new Decimal('100.00'),
        'credit_card',
      );

      expect(auditService.logSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REEMBOLSO_ENQUEUED',
        }),
      );

      auditService.logSystemAction.mockClear();

      // Process success
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: true,
        provider_refund_id: 'ref-123',
      });

      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      expect(auditService.logSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REEMBOLSO_COMPLETADO',
        }),
      );
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should process refunds from multiple companies independently', async () => {
      const mockRefund1 = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'c1@test.com' },
        },
        Empresa: { nombre: 'Company 1' },
      };

      const mockRefund2 = {
        id: 'reemb-2',
        empresaId: 'empresa-2',
        devolucionClienteId: 'dev-2',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('200.00'),
        metodoReembolso: 'debit_card',
        DevolucionCliente: {
          ventaId: 'venta-2',
          clienteId: 'cliente-2',
          Cliente: { email: 'c2@test.com' },
        },
        Empresa: { nombre: 'Company 2' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund1,
        mockRefund2,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: true,
        provider_refund_id: 'ref-123',
      });

      const mockDb1 = { reembolso: { update: jest.fn().mockResolvedValue({}) } };
      const mockDb2 = { reembolso: { update: jest.fn().mockResolvedValue({}) } };

      (prismaFactory.forCompany as jest.Mock)
        .mockReturnValueOnce(mockDb1)
        .mockReturnValueOnce(mockDb2);

      await (service as any).processNextBatch();

      // Should call forCompany for each company
      expect(prismaFactory.forCompany).toHaveBeenCalledWith('empresa-1');
      expect(prismaFactory.forCompany).toHaveBeenCalledWith('empresa-2');

      // Should update refunds in their respective databases
      expect(mockDb1.reembolso.update).toHaveBeenCalled();
      expect(mockDb2.reembolso.update).toHaveBeenCalled();
    });
  });

  describe('Environment configuration', () => {
    it('should respect REFUND_MAX_RETRIES env var', async () => {
      const originalEnv = process.env.REFUND_MAX_RETRIES;
      process.env.REFUND_MAX_RETRIES = '5';

      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 5, // At new max
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockResolvedValue({
        success: false,
        error: 'Persistent error',
        retriable: true,
      });

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      // Should mark as FALLIDO (max retries = 5)
      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          estado: 'FALLIDO',
          motivoFalla: 'Persistent error',
          updatedAt: expect.any(Date),
        },
      });

      process.env.REFUND_MAX_RETRIES = originalEnv;
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully (mark PENDIENTE_MANUAL)', async () => {
      const mockRefund = {
        id: 'reemb-1',
        empresaId: 'empresa-1',
        devolucionClienteId: 'dev-1',
        estado: 'PENDIENTE',
        intentos: 0,
        proximoIntento: new Date(),
        montoActual: new Decimal('100.00'),
        metodoReembolso: 'credit_card',
        DevolucionCliente: {
          ventaId: 'venta-1',
          clienteId: 'cliente-1',
          Cliente: { email: 'client@test.com' },
        },
        Empresa: { nombre: 'Test Company' },
      };

      (globalPrisma.reembolso.findMany as jest.Mock).mockResolvedValue([
        mockRefund,
      ]);

      paymentProvider.createRefund.mockRejectedValue(
        new Error('Database connection lost'),
      );

      const mockDb = prismaFactory.forCompany('empresa-1') as any;
      mockDb.reembolso.update.mockResolvedValue({});

      await (service as any).processNextBatch();

      // Should mark as PENDIENTE_MANUAL (requires manual intervention)
      expect(mockDb.reembolso.update).toHaveBeenCalledWith({
        where: { id: 'reemb-1' },
        data: {
          motivoFalla: 'Database connection lost',
          estado: 'PENDIENTE_MANUAL',
          updatedAt: expect.any(Date),
        },
      });

      // Should log error
      expect(auditService.logSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REEMBOLSO_ERROR',
        }),
      );
    });
  });
});
