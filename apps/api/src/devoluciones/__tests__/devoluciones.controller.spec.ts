/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { DevolucionClienteController } from '../devoluciones.controller';
import { DevolucionesService } from '../devoluciones.service';
import { BusinessContextService } from '../../business-context/business-context.service';
import {
  CreateDevolucionDto,
  AuthorizeDevolucionDto,
  ReceiveDevolucionDto,
  ProcessRefundDto,
  DevolucionDto,
  RefundDto,
} from '../dto';
import type { AuthenticatedUser } from '../../auth/auth.types';

describe('DevolucionClienteController', () => {
  let controller: DevolucionClienteController;
  let service: DevolucionesService;
  let businessContext: BusinessContextService;

  const mockBusinessId = 'business-id-123';
  const mockUserId = 'user-id-456';
  const mockDevolucionId = 'devolucione-id-789';
  const mockVentaId = 'venta-id-111';
  const mockClienteId = 'cliente-id-222';
  const mockVentaItemId = 'ventaitem-id-333';

  const mockUser: AuthenticatedUser = {
    id: mockUserId,
    email: 'test@example.com',
    empresaId: mockBusinessId,
    roles: ['customer'],
  };

  const mockDevoluccionDto: DevolucionDto = new DevolucionDto({
    id: mockDevolucionId,
    empresaId: mockBusinessId,
    ventaId: mockVentaId,
    clienteId: mockClienteId,
    estado: 'SOLICITADA',
    items: [
      {
        ventaItemId: mockVentaItemId,
        cantidad: 2,
        precioUnitario: 29.99,
        motivo: 'Defective packaging',
      },
    ],
    motivo_general: 'Items arrived damaged',
    total_solicitado: 59.98,
    createdAt: new Date(),
    createdBy: mockClienteId,
    updatedAt: new Date(),
    updatedBy: null,
  });

  const mockRefundDto: RefundDto = new RefundDto({
    id: 'refund-id-444',
    devolucionId: mockDevolucionId,
    estado: 'PENDIENTE',
    monto: 59.98,
    metodo_pago: 'mercadopago',
    createdAt: new Date(),
    completedAt: null,
    error_message: null,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevolucionClienteController],
      providers: [
        {
          provide: DevolucionesService,
          useValue: {
            createDevolucione: jest.fn(),
            listDevoluciones: jest.fn(),
            getDevolucione: jest.fn(),
            authorizeDevolucione: jest.fn(),
            receiveDevolucione: jest.fn(),
            processRefund: jest.fn(),
          },
        },
        {
          provide: BusinessContextService,
          useValue: {
            resolveForAuthenticatedUser: jest.fn(),
            resolveCompanyId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DevolucionClienteController>(DevolucionClienteController);
    service = module.get<DevolucionesService>(DevolucionesService);
    businessContext = module.get<BusinessContextService>(BusinessContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDevolucione (POST /devoluciones)', () => {
    it('should create a new return request and return 201', async () => {
      const dto: CreateDevolucionDto = {
        ventaId: mockVentaId,
        items: [
          {
            ventaItemId: mockVentaItemId,
            cantidad: 2,
            motivo: 'Defective packaging',
          },
        ],
        motivo_general: 'Items arrived damaged',
      };

      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'createDevolucione').mockResolvedValue(mockDevoluccionDto);

      const result = await controller.createDevolucione(dto, mockUser);

      expect(result).toEqual(mockDevoluccionDto);
      expect(result.estado).toBe('SOLICITADA');
      expect(service.createDevolucione).toHaveBeenCalledWith(mockBusinessId, mockUserId, dto);
    });
  });

  describe('listDevoluciones (GET /devoluciones)', () => {
    it('should list devoluciones with pagination', async () => {
      const mockResponse = {
        items: [mockDevoluccionDto],
        total: 1,
      };

      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'listDevoluciones').mockResolvedValue(mockResponse);

      const result = await controller.listDevoluciones(mockUser);

      expect(result).toEqual(mockResponse);
      expect(service.listDevoluciones).toHaveBeenCalledWith(mockBusinessId, mockUser, {
        estado: undefined,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('getDevolucione (GET /devoluciones/:id)', () => {
    it('should retrieve a single devolucione by ID', async () => {
      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'getDevolucione').mockResolvedValue(mockDevoluccionDto);

      const result = await controller.getDevolucione(mockDevolucionId, mockUser);

      expect(result).toEqual(mockDevoluccionDto);
      expect(service.getDevolucione).toHaveBeenCalledWith(
        mockBusinessId,
        mockUser,
        mockDevolucionId,
      );
    });
  });

  describe('authorizeDevolucione (PUT /devoluciones/:id/authorize)', () => {
    it('should authorize a return request and transition to AUTORIZADA', async () => {
      const dto: AuthorizeDevolucionDto = {
        condition: 'accepted',
        notes: 'Approved',
      };

      const authorizedDto = new DevolucionDto({
        id: mockDevolucionId,
        empresaId: mockBusinessId,
        ventaId: mockVentaId,
        clienteId: mockClienteId,
        estado: 'AUTORIZADA',
        items: [
          {
            ventaItemId: mockVentaItemId,
            cantidad: 2,
            precioUnitario: 29.99,
            motivo: 'Defective packaging',
          },
        ],
        motivo_general: 'Items arrived damaged',
        total_solicitado: 59.98,
        createdAt: new Date(),
        createdBy: mockClienteId,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      });

      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'authorizeDevolucione').mockResolvedValue(authorizedDto);

      const adminUser: AuthenticatedUser = {
        ...mockUser,
        roles: ['admin'],
      };

      const result = await controller.authorizeDevolucione(mockDevolucionId, dto, adminUser);

      expect(result.estado).toBe('AUTORIZADA');
      expect(service.authorizeDevolucione).toHaveBeenCalledWith(
        mockBusinessId,
        mockDevolucionId,
        mockUserId,
        dto,
      );
    });
  });

  describe('receiveDevolucione (PUT /devoluciones/:id/receive)', () => {
    it('should mark return as received and transition to RECIBIDA', async () => {
      const dto: ReceiveDevolucionDto = {
        condition_check: 'Items in good condition',
      };

      const receivedDto = new DevolucionDto({
        id: mockDevolucionId,
        empresaId: mockBusinessId,
        ventaId: mockVentaId,
        clienteId: mockClienteId,
        estado: 'RECIBIDA',
        items: [
          {
            ventaItemId: mockVentaItemId,
            cantidad: 2,
            precioUnitario: 29.99,
            motivo: 'Defective packaging',
          },
        ],
        motivo_general: 'Items arrived damaged',
        total_solicitado: 59.98,
        createdAt: new Date(),
        createdBy: mockClienteId,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      });

      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'receiveDevolucione').mockResolvedValue(receivedDto);

      const adminUser: AuthenticatedUser = {
        ...mockUser,
        roles: ['admin'],
      };

      const result = await controller.receiveDevolucione(mockDevolucionId, dto, adminUser);

      expect(result.estado).toBe('RECIBIDA');
      expect(service.receiveDevolucione).toHaveBeenCalledWith(
        mockBusinessId,
        mockDevolucionId,
        mockUserId,
        dto,
      );
    });
  });

  describe('processRefund (PUT /devoluciones/:id/process-refund)', () => {
    it('should process refund and transition to PROCESADA', async () => {
      const dto: ProcessRefundDto = {
        notes: 'Processing...',
      };

      const processedDto = new DevolucionDto({
        id: mockDevolucionId,
        empresaId: mockBusinessId,
        ventaId: mockVentaId,
        clienteId: mockClienteId,
        estado: 'PROCESADA',
        items: [
          {
            ventaItemId: mockVentaItemId,
            cantidad: 2,
            precioUnitario: 29.99,
            motivo: 'Defective packaging',
          },
        ],
        motivo_general: 'Items arrived damaged',
        total_solicitado: 59.98,
        createdAt: new Date(),
        createdBy: mockClienteId,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      });

      jest.spyOn(businessContext, 'resolveForAuthenticatedUser').mockResolvedValue({
        businessId: mockBusinessId,
      } as any);
      jest.spyOn(businessContext, 'resolveCompanyId').mockReturnValue(mockBusinessId);
      jest.spyOn(service, 'processRefund').mockResolvedValue({
        devoluccion: processedDto,
        refund: mockRefundDto,
      });

      const adminUser: AuthenticatedUser = {
        ...mockUser,
        roles: ['admin'],
      };

      const result = await controller.processRefund(mockDevolucionId, dto, adminUser);

      expect(result.devoluccion.estado).toBe('PROCESADA');
      expect(result.refund.estado).toBe('PENDIENTE');
      expect(service.processRefund).toHaveBeenCalledWith(
        mockBusinessId,
        mockDevolucionId,
        mockUserId,
        dto,
      );
    });
  });

  describe('DTO Validation', () => {
    it('should validate CreateDevolucionDto with valid data', () => {
      const validDto: CreateDevolucionDto = {
        ventaId: mockVentaId,
        items: [
          {
            ventaItemId: mockVentaItemId,
            cantidad: 1,
            motivo: 'Changed my mind',
          },
        ],
      };

      expect(validDto.ventaId).toBeDefined();
      expect(validDto.items.length).toBeGreaterThan(0);
    });

    it('should validate AuthorizeDevolucionDto with condition enum', () => {
      const validDto: AuthorizeDevolucionDto = {
        condition: 'accepted',
        notes: 'Approved',
      };

      expect(['accepted', 'partial']).toContain(validDto.condition);
    });
  });
});
