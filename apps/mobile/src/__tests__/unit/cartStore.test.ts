import { useCartStore } from '@/stores/cartStore';
import { Product } from '@/types';

describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 999.99,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 2);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productoId).toBe('prod-1');
      expect(state.items[0].cantidad).toBe(2);
      expect(state.items[0].precioUnitario).toBe(999.99);
    });

    it('should increase quantity for existing item', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 999.99,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 1);
      useCartStore.getState().addItem(product, 1);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].cantidad).toBe(2);
    });

    it('should calculate total items correctly', () => {
      const product1: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 999.99,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      const product2: Product = {
        id: 'prod-2',
        nombre: 'Mouse',
        precio: 29.99,
        stock: 20,
        stockMinimo: 5,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product1, 2);
      useCartStore.getState().addItem(product2, 3);

      const state = useCartStore.getState();
      expect(state.totalItems).toBe(5);
    });

    it('should calculate total price correctly', () => {
      const product1: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      const product2: Product = {
        id: 'prod-2',
        nombre: 'Mouse',
        precio: 50,
        stock: 20,
        stockMinimo: 5,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product1, 2); // 200
      useCartStore.getState().addItem(product2, 1); // 50

      const state = useCartStore.getState();
      expect(state.totalPrice).toBe(250);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from cart', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 999.99,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 2);
      useCartStore.getState().removeItem('prod-1');

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });

    it('should recalculate totals after removal', () => {
      const product1: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      const product2: Product = {
        id: 'prod-2',
        nombre: 'Mouse',
        precio: 50,
        stock: 20,
        stockMinimo: 5,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product1, 2);
      useCartStore.getState().addItem(product2, 1);
      useCartStore.getState().removeItem('prod-1');

      const state = useCartStore.getState();
      expect(state.totalItems).toBe(1);
      expect(state.totalPrice).toBe(50);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 1);
      useCartStore.getState().updateQuantity('prod-1', 5);

      const state = useCartStore.getState();
      expect(state.items[0].cantidad).toBe(5);
      expect(state.totalPrice).toBe(500);
    });

    it('should remove item when quantity is 0', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 1);
      useCartStore.getState().updateQuantity('prod-1', 0);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });

    it('should remove item when quantity is negative', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 1);
      useCartStore.getState().updateQuantity('prod-1', -5);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 2);
      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.totalItems).toBe(0);
      expect(state.totalPrice).toBe(0);
    });
  });

  describe('getters', () => {
    it('should get total items', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 5);

      expect(useCartStore.getState().getTotalItems()).toBe(5);
    });

    it('should get total price', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 3);

      expect(useCartStore.getState().getTotalPrice()).toBe(300);
    });

    it('should get specific item', () => {
      const product: Product = {
        id: 'prod-1',
        nombre: 'Laptop',
        precio: 100,
        stock: 10,
        stockMinimo: 2,
        familiaId: 'fam-1',
        empresaId: 'emp-1',
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      useCartStore.getState().addItem(product, 2);

      const item = useCartStore.getState().getItem('prod-1');
      expect(item).toBeDefined();
      expect(item?.cantidad).toBe(2);
    });

    it('should return undefined for non-existent item', () => {
      const item = useCartStore.getState().getItem('non-existent');
      expect(item).toBeUndefined();
    });
  });
});
