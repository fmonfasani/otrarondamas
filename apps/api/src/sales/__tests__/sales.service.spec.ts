/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { SalesService } from '../sales.service';
import { CompanyScopedPrismaService } from '../../prisma/company-scoped-prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { LoyaltyService } from '../../loyalty/loyalty.service';
import { CustomersService } from '../../customers/customers.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { QuoteSaleDto } from '../dto/quote-sale.dto';
import { CreateSalePaymentDto } from '../dto/create-sale-payment.dto';

/**
 * P5A: Sales Service Multi-Tenant Unit Tests
 *
 * Tests verify:
 * - All 8+ methods accept explicit businessId parameter
 * - CompanyScopedPrismaService.forCompany(businessId) is used for all queries
 * - SERIALIZABLE isolation on create() and createPayment()
 * - Venta.numero sequencing per business
 * - Multi-tenant isolation: queries scoped to businessId
 * - 20+ assertions covering success paths, edge cases, and error conditions
 */
describe('SalesService (P5A: Multi-Tenant)', () => {
  let service: SalesService;
  let prismaFactory: CompanyScopedPrismaService;
  let inventoryService: InventoryService;
  let loyaltyService: LoyaltyService;
  let customersService: CustomersService;

  const mockBusinessId1 = '00000000-0000-0000-0000-000000000001';
  const mockBusinessId2 = '00000000-0000-0000-0000-000000000002';
  const mockUserId = '00000000-0000-0000-0000-000000000099';
  const mockCustomerId = '00000000-0000-0000-0000-000000000100';
  const mockProductId = '00000000-0000-0000-0000-000000000101';
  const mockSaleId = '00000000-0000-0000-0000-000000000102';

  const createMockDb = (overrides = {}) => ({
    venta: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    pago: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    producto: {
      findMany: jest.fn(),
    },
    caja: {
      findUnique: jest.fn(),
    },
    aperturaCaja: {
      findFirst: jest.fn(),
    },
    movimientoCaja: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: CompanyScopedPrismaService,
          useValue: {
            forCompany: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            deductStock: jest.fn(),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            listActiveRules: jest.fn(),
            calculateApplicableDiscount: jest.fn(),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            get: jest.fn(),
            calculateLevel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prismaFactory = module.get<CompanyScopedPrismaService>(CompanyScopedPrismaService);
    inventoryService = module.get<InventoryService>(InventoryService);
    loyaltyService = module.get<LoyaltyService>(LoyaltyService);
    customersService = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create() — P5A: businessId explicit, SERIALIZABLE isolation', () => {
    it('should create a sale scoped to businessId with idempotency', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const transactionFn = jest.fn(async (callback: any) => {
        return callback(mockDb);
      });
      mockDb.$transaction = transactionFn.mockImplementation(
        async (callback: any, options?: any) => {
          expect(options).toEqual({ isolationLevel: 'Serializable' });
          return callback(mockDb);
        },
      );

      (customersService.get as jest.Mock).mockResolvedValue({ activo: true });
      (loyaltyService.listActiveRules as jest.Mock).mockResolvedValue([]);
      (customersService.calculateLevel as jest.Mock).mockResolvedValue(null);

      mockDb.produto = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: mockProductId,
            activo: true,
            precioMinorista: new any('100'),
            familiaId: 'fam1',
            subfamiliaId: 'subfam1',
            tipoId: 'tipo1',
            subtipoId: 'subtipo1',
            marca: 'marca1',
          },
        ]),
      };
      mockDb.venta = {
        ...mockDb.venta,
        findUnique: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { numero: 5 } }),
        create: jest.fn().mockResolvedValue({
          id: mockSaleId,
          empresaId: mockBusinessId1,
          numero: 6,
          total: new any('100'),
          VentaItem: [],
        }),
      };

      mockDb.auditLog = {
        create: jest.fn().mockResolvedValue({}),
      };

      (inventoryService.deductStock as jest.Mock).mockResolvedValue(false);

      const dto: CreateSaleDto = {
        items: [{ productoId: mockProductId, cantidad: 1 }],
        canal: 'mostrador',
        idempotencyKey: 'idempotent-key-123',
      };

      const result = await service.create(dto, mockBusinessId1, mockUserId);

      // Assertion 1: prismaFactory.forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 2: transaction uses SERIALIZABLE isolation
      expect(mockDb.$transaction).toHaveBeenCalled();

      // Assertion 3: venta created with correct businessId (not from request body)
      expect(mockDb.venta.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId: mockBusinessId1,
          }),
        }),
      );

      // Assertion 4: audit log created in same transaction
      expect(mockDb.auditLog.create).toHaveBeenCalled();

      // Assertion 5: sequential numero generated
      expect(mockDb.venta.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero: 6,
          }),
        }),
      );

      // Assertion 6: result includes saldo (balance)
      expect(result).toHaveProperty('saldo');
    });

    it('should return existing sale if idempotencyKey matches', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const existingSale = {
        id: mockSaleId,
        empresaId: mockBusinessId1,
        total: new any('100'),
        Pago: [],
      };

      mockDb.venta.findUnique = jest.fn().mockResolvedValue(existingSale);

      const dto: CreateSaleDto = {
        items: [{ productoId: mockProductId, cantidad: 1 }],
        canal: 'mostrador',
        idempotencyKey: 'existing-key',
      };

      const result = await service.create(dto, mockBusinessId1, mockUserId);

      // Assertion 7: returns existing sale when idempotencyKey matches
      expect(result.id).toEqual(mockSaleId);

      // Assertion 8: does not create new sale
      expect(mockDb.venta.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when customer inactive', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      (customersService.get as jest.Mock).mockResolvedValue({ activo: false });

      const dto: CreateSaleDto = {
        items: [{ productoId: mockProductId, cantidad: 1 }],
        canal: 'mostrador',
        clienteId: mockCustomerId,
      };

      await expect(service.create(dto, mockBusinessId1, mockUserId)).rejects.toThrow(
        NotFoundException,
      );

      // Assertion 9: customer check scoped to businessId
      expect(customersService.get).toHaveBeenCalledWith(mockBusinessId1, mockCustomerId);
    });
  });

  describe('quote() — P5A: businessId explicit', () => {
    it('should return quote scoped to businessId', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      (customersService.get as jest.Mock).mockResolvedValue({ activo: true });
      (customersService.calculateLevel as jest.Mock).mockResolvedValue(null);
      (loyaltyService.listActiveRules as jest.Mock).mockResolvedValue([]);

      mockDb.producto.findMany = jest.fn().mockResolvedValue([
        {
          id: mockProductId,
          activo: true,
          precioMinorista: new any('100'),
          familiaId: 'fam1',
          subfamiliaId: 'subfam1',
          tipoId: 'tipo1',
          subtipoId: 'subtipo1',
          marca: 'marca1',
        },
      ]);

      const dto: QuoteSaleDto = {
        items: [{ productoId: mockProductId, cantidad: 2 }],
        clienteId: mockCustomerId,
      };

      const result = await service.quote(dto, mockBusinessId1);

      // Assertion 10: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 11: customer check scoped to businessId
      expect(customersService.get).toHaveBeenCalledWith(mockBusinessId1, mockCustomerId);

      // Assertion 12: returns lineas and total
      expect(result).toHaveProperty('lineas');
      expect(result).toHaveProperty('total');
      expect(result.lineas).toHaveLength(1);
      expect(result.lineas[0].cantidad).toEqual('2');
    });
  });

  describe('createPayment() — P5A: businessId explicit, SERIALIZABLE isolation', () => {
    it('should create payment scoped to businessId with SERIALIZABLE isolation', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const transactionFn = jest.fn();
      mockDb.$transaction = transactionFn.mockImplementation(
        async (callback: any, options?: any) => {
          expect(options).toEqual({ isolationLevel: 'Serializable' });
          return callback(mockDb);
        },
      );

      mockDb.venta.findUnique = jest.fn().mockResolvedValue({
        id: mockSaleId,
        empresaId: mockBusinessId1,
        total: new any('100'),
        numero: 1,
        estado: 'CONFIRMADA',
        Pago: [],
      });

      mockDb.pago.create = jest.fn().mockResolvedValue({
        id: 'pago-id',
        monto: new any('100'),
        medio: 'efectivo',
        vuelto: new any('0'),
      });

      mockDb.caja.findUnique = jest.fn().mockResolvedValue({ id: 'caja-id' });
      mockDb.aperturaCaja.findFirst = jest.fn().mockResolvedValue({ id: 'apertura-id' });
      mockDb.movimientoCaja.create = jest.fn().mockResolvedValue({});
      mockDb.auditLog.create = jest.fn().mockResolvedValue({});

      const dto: CreateSalePaymentDto = {
        monto: '100',
        medio: 'efectivo',
        montoRecibido: '100',
      };

      const result = await service.createPayment(mockSaleId, dto, mockBusinessId1, mockUserId);

      // Assertion 13: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 14: payment created with correct businessId
      expect(mockDb.pago.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId: mockBusinessId1,
          }),
        }),
      );

      // Assertion 15: transaction uses SERIALIZABLE isolation
      expect(mockDb.$transaction).toHaveBeenCalled();

      // Assertion 16: returns pago and saldo
      expect(result).toHaveProperty('pago');
      expect(result).toHaveProperty('saldo');
    });

    it('should throw ConflictException when cash register closed', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      mockDb.venta.findUnique = jest.fn().mockResolvedValue({
        id: mockSaleId,
        total: new any('100'),
        estado: 'CONFIRMADA',
        Pago: [],
      });

      mockDb.caja.findUnique = jest.fn().mockResolvedValue(null);

      const dto: CreateSalePaymentDto = {
        monto: '50',
        medio: 'efectivo',
        montoRecibido: '50',
      };

      await expect(
        service.createPayment(mockSaleId, dto, mockBusinessId1, mockUserId),
      ).rejects.toThrow(ConflictException);

      // Assertion 17: cash register check scoped to businessId
      expect(mockDb.caja.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId: mockBusinessId1 },
        }),
      );
    });
  });

  describe('findPaymentsBySale() — P5A: businessId explicit', () => {
    it('should find payments scoped to businessId', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      mockDb.venta.findUnique = jest.fn().mockResolvedValue({
        id: mockSaleId,
        empresaId: mockBusinessId1,
      });

      const mockPayments = [
        {
          id: 'pago-1',
          ventaId: mockSaleId,
          monto: new any('50'),
          estado: 'APROBADO',
        },
      ];

      mockDb.pago.findMany = jest.fn().mockResolvedValue(mockPayments);

      const result = await service.findPaymentsBySale(mockSaleId, mockBusinessId1);

      // Assertion 18: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 19: returns payments for sale
      expect(result).toEqual(mockPayments);
    });

    it('should throw NotFoundException when sale not found', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      mockDb.venta.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findPaymentsBySale(mockSaleId, mockBusinessId1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll() — P5A: businessId explicit, no empresaId in where', () => {
    it('should list sales scoped to businessId without explicit empresaId in where', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const mockSales = [
        {
          id: 'sale-1',
          empresaId: mockBusinessId1,
          numero: 1,
          total: new any('100'),
          Usuario: { id: mockUserId, nombre: 'User1' },
          Cliente: null,
          Pago: [],
          _count: { Pago: 0 },
          createdAt: new Date(),
        },
      ];

      mockDb.venta.findMany = jest.fn().mockResolvedValue(mockSales);
      mockDb.venta.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(mockBusinessId1, {});

      // Assertion 20: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 21: findMany called without empresaId in where (scope auto-applied)
      const findManyCall = mockDb.venta.findMany.mock.calls[0][0];
      expect(findManyCall.where).not.toHaveProperty('empresaId');

      // Assertion 22: returns paginated data
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne() — P5A: businessId explicit', () => {
    it('should find sale scoped to businessId', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const mockSale = {
        id: mockSaleId,
        empresaId: mockBusinessId1,
        numero: 1,
        total: new any('100'),
        Usuario: { id: mockUserId, nombre: 'User1' },
        Cliente: null,
        VentaItem: [],
        Pago: [],
        createdAt: new Date(),
      };

      mockDb.venta.findFirst = jest.fn().mockResolvedValue(mockSale);

      const result = await service.findOne(mockSaleId, mockBusinessId1);

      // Assertion 23: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 24: returns sale with derived fields
      expect(result).toHaveProperty('saldo');
      expect(result).toHaveProperty('estadoCobro');
      expect(result).toHaveProperty('numeroFormateado');
    });
  });

  describe('getReceipt() — P5A: businessId explicit', () => {
    it('should return receipt delegating to findOne with businessId', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const mockSale = {
        id: mockSaleId,
        empresaId: mockBusinessId1,
        numero: 1,
        total: new any('100'),
        Usuario: { id: mockUserId, nombre: 'User1' },
        Cliente: null,
        VentaItem: [],
        Pago: [],
        createdAt: new Date(),
      };

      mockDb.venta.findFirst = jest.fn().mockResolvedValue(mockSale);

      const result = await service.getReceipt(mockSaleId, mockBusinessId1);

      // Assertion 25: delegates to findOne with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);
      expect(result).toHaveProperty('id', mockSaleId);
    });
  });

  describe('searchProducts() — P5A: businessId explicit', () => {
    it('should search products scoped to businessId', async () => {
      const mockDb = createMockDb();
      (prismaFactory.forCompany as jest.Mock).mockReturnValue(mockDb);

      const mockProducts = [
        {
          id: mockProductId,
          empresaId: mockBusinessId1,
          nombre: 'Product 1',
          codigoInterno: 'P001',
          codigoBarras: 'BAR001',
          marca: 'Marca1',
          precioMinorista: new any('100'),
          unidadBase: 'unidad',
          activo: true,
          stockMinimo: new any('5'),
          Familia: { id: 'fam1', nombre: 'Familia 1' },
          Subfamilia: { id: 'subfam1', nombre: 'Subfamilia 1' },
          Lote: [{ cantidad: new any('10') }],
        },
      ];

      mockDb.producto.findMany = jest.fn().mockResolvedValue(mockProducts);

      const result = await service.searchProducts(mockBusinessId1, 'Product');

      // Assertion 26: forCompany called with businessId
      expect(prismaFactory.forCompany).toHaveBeenCalledWith(mockBusinessId1);

      // Assertion 27: product search returns formatted results
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockProductId);
      expect(result[0]).toHaveProperty('nombre');
      expect(result[0]).toHaveProperty('stockDisponible');
    });

    it('should throw BadRequestException for search term too short', async () => {
      await expect(service.searchProducts(mockBusinessId1, 'A')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Multi-tenant isolation: two businesses never share sales', () => {
    it('should not allow business2 to read sales from business1', async () => {
      const mockDb1 = createMockDb();
      const mockDb2 = createMockDb();

      (prismaFactory.forCompany as jest.Mock).mockImplementation((bid: string) => {
        return bid === mockBusinessId1 ? mockDb1 : mockDb2;
      });

      mockDb1.venta.findFirst = jest.fn().mockResolvedValue({
        id: mockSaleId,
        empresaId: mockBusinessId1,
        numero: 1,
        total: new any('100'),
        Usuario: { id: mockUserId, nombre: 'User1' },
        Cliente: null,
        VentaItem: [],
        Pago: [],
      });

      mockDb2.venta.findFirst = jest.fn().mockResolvedValue(null);

      // Business1 reads own sale
      const result1 = await service.findOne(mockSaleId, mockBusinessId1);
      expect(result1).toBeDefined();

      // Business2 cannot read sale from business1
      const result2 = await service.findOne(mockSaleId, mockBusinessId2);
      expect(result2).toBeUndefined();

      // Assertion 28: businesses are isolated at the service layer
      expect(mockDb1.venta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockSaleId } }),
      );
      expect(mockDb2.venta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockSaleId } }),
      );
    });
  });
});
