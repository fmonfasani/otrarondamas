/**
 * Tienda Order Service Tests
 * Tests cover: order creation, validation, status updates, payment handling
 *
 * Run with: npm test -- tienda.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  TiendaError,
} from './tienda.server';
import { db } from '~/utils/db.server';

// Mock the database
vi.mock('~/utils/db.server', () => ({
  db: {
    tiendaOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
    tiendaPayment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tiendaWebhookLog: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('Tienda Order Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order with valid input', async () => {
      const mockUser = { id: 'user123', empresaId: 'empresa123' };
      const mockOrder = {
        id: 'order123',
        empresaId: 'empresa123',
        usuarioId: 'user123',
        status: 'pending',
        subtotal: 100,
        shippingCost: 10,
        taxAmount: 11,
        total: 121,
        shippingAddress: '123 Main St',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'item1',
            orderId: 'order123',
            productoId: 'prod1',
            productName: 'Widget',
            quantity: 1,
            price: 100,
            discount: 0,
            createdAt: new Date(),
          },
        ],
        payments: [],
      };

      vi.mocked(db.usuario.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(db.tiendaOrder.create).mockResolvedValue(mockOrder as any);

      const result = await createOrder({
        user_id: 'user123',
        empresa_id: 'empresa123',
        items: [
          {
            producto_id: 'prod1',
            product_name: 'Widget',
            quantity: 1,
            price: 100,
          },
        ],
        shipping_address: '123 Main St',
      });

      expect(result.id).toBe('order123');
      expect(result.status).toBe('pending');
      expect(result.items).toHaveLength(1);
    });

    it('should reject order without items', async () => {
      await expect(
        createOrder({
          user_id: 'user123',
          empresa_id: 'empresa123',
          items: [],
          shipping_address: '123 Main St',
        })
      ).rejects.toThrow('Order must have at least one item');
    });

    it('should reject order without shipping address', async () => {
      await expect(
        createOrder({
          user_id: 'user123',
          empresa_id: 'empresa123',
          items: [{ producto_id: 'p1', product_name: 'W', quantity: 1, price: 100 }],
          shipping_address: '',
        })
      ).rejects.toThrow('Shipping address is required');
    });

    it('should reject order if user does not belong to empresa', async () => {
      vi.mocked(db.usuario.findUnique).mockResolvedValue({
        id: 'user123',
        empresaId: 'other_empresa',
      } as any);

      await expect(
        createOrder({
          user_id: 'user123',
          empresa_id: 'empresa123',
          items: [{ producto_id: 'p1', product_name: 'W', quantity: 1, price: 100 }],
          shipping_address: '123 Main St',
        })
      ).rejects.toThrow('User not found or does not belong to this empresa');
    });
  });

  describe('getOrder', () => {
    it('should return order if it belongs to user', async () => {
      const mockOrder = {
        id: 'order123',
        empresaId: 'empresa123',
        usuarioId: 'user123',
        status: 'pending',
        items: [],
        payments: [],
      };

      vi.mocked(db.tiendaOrder.findFirst).mockResolvedValue(mockOrder as any);

      const result = await getOrder('order123', 'user123', 'empresa123');

      expect(result?.id).toBe('order123');
      expect(db.tiendaOrder.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'order123',
          usuarioId: 'user123',
          empresaId: 'empresa123',
        },
        include: {
          items: true,
          payments: true,
        },
      });
    });

    it('should return null if order not found', async () => {
      vi.mocked(db.tiendaOrder.findFirst).mockResolvedValue(null);

      const result = await getOrder('nonexistent', 'user123', 'empresa123');

      expect(result).toBeNull();
    });
  });

  describe('getOrders', () => {
    it('should return paginated list of user orders', async () => {
      const mockOrders = [
        {
          id: 'order1',
          status: 'pending',
          total: 100,
          items: [{ id: 'item1' }],
        },
        {
          id: 'order2',
          status: 'processing',
          total: 200,
          items: [{ id: 'item2' }],
        },
      ];

      vi.mocked(db.tiendaOrder.findMany).mockResolvedValue(mockOrders as any);
      vi.mocked(db.tiendaOrder.count).mockResolvedValue(2);

      const result = await getOrders('user123', 'empresa123', 20, 0);

      expect(result.orders).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(db.tiendaOrder.findMany).toHaveBeenCalled();
    });

    it('should support pagination', async () => {
      vi.mocked(db.tiendaOrder.findMany).mockResolvedValue([]);
      vi.mocked(db.tiendaOrder.count).mockResolvedValue(100);

      await getOrders('user123', 'empresa123', 10, 20);

      const callArgs = vi.mocked(db.tiendaOrder.findMany).mock.calls[0][0];
      expect(callArgs.take).toBe(10);
      expect(callArgs.skip).toBe(20);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: 'order123',
        status: 'processing',
        items: [],
        payments: [],
      };

      vi.mocked(db.tiendaOrder.update).mockResolvedValue(mockOrder as any);

      const result = await updateOrderStatus('order123', 'processing', 'empresa123');

      expect(result.status).toBe('processing');
      expect(db.tiendaOrder.update).toHaveBeenCalledWith({
        where: {
          id: 'order123',
          empresaId: 'empresa123',
        },
        data: {
          status: 'processing',
          updatedAt: expect.any(Date),
        },
        include: {
          items: true,
          payments: true,
        },
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel pending order', async () => {
      const mockOrder = {
        id: 'order123',
        status: 'pending',
        usuarioId: 'user123',
        empresaId: 'empresa123',
      };

      vi.mocked(db.tiendaOrder.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(db.tiendaOrder.update).mockResolvedValue({
        ...mockOrder,
        status: 'cancelled',
      } as any);

      const result = await cancelOrder('order123', 'user123', 'empresa123');

      expect(result).toBe(true);
    });

    it('should reject cancellation of shipped order', async () => {
      vi.mocked(db.tiendaOrder.findFirst).mockResolvedValue({
        id: 'order123',
        status: 'shipped',
        usuarioId: 'user123',
        empresaId: 'empresa123',
      } as any);

      await expect(
        cancelOrder('order123', 'user123', 'empresa123')
      ).rejects.toThrow('Cannot cancel order in status: shipped');
    });

    it('should reject cancellation of delivered order', async () => {
      vi.mocked(db.tiendaOrder.findFirst).mockResolvedValue({
        id: 'order123',
        status: 'delivered',
        usuarioId: 'user123',
        empresaId: 'empresa123',
      } as any);

      await expect(
        cancelOrder('order123', 'user123', 'empresa123')
      ).rejects.toThrow('Cannot cancel order in status: delivered');
    });
  });

  describe('Error handling', () => {
    it('should throw TiendaError for validation failures', () => {
      const error = new TiendaError('Test error', 400, 'TEST_ERROR');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error');
    });

    it('should provide proper error codes', () => {
      const validationError = new TiendaError('Invalid', 400, 'INVALID_INPUT');
      const authError = new TiendaError('Unauthorized', 401, 'UNAUTHORIZED');
      const notFoundError = new TiendaError('Not found', 404, 'NOT_FOUND');
      const conflictError = new TiendaError('Conflict', 409, 'INVALID_STATUS');

      expect(validationError.statusCode).toBe(400);
      expect(authError.statusCode).toBe(401);
      expect(notFoundError.statusCode).toBe(404);
      expect(conflictError.statusCode).toBe(409);
    });
  });
});
