import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCarrito } from './useCarrito';
import type { ProductoTienda } from '@otrarondamas/shared-types';

describe('useCarrito with localStorage persistence', () => {
  const mockProducto: ProductoTienda = {
    productoId: '1',
    nombre: 'Test Product',
    precio: 100,
    disponible: 10,
  } as any;

  const mockProducto2: ProductoTienda = {
    productoId: '2',
    nombre: 'Test Product 2',
    precio: 50,
    disponible: 5,
  } as any;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCarrito());
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      producto: mockProducto,
      cantidad: 1,
    });
  });

  it('increments quantity if same product added twice', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
      result.current.agregar(mockProducto);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(2);
  });

  it('calculates total correctly', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto); // 100
      result.current.agregar(mockProducto); // 100
      result.current.agregar(mockProducto2); // 50
    });

    // Total: 100*2 + 50*1 = 250
    expect(result.current.total).toBe(250);
  });

  it('updates quantity of item', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
    });

    act(() => {
      result.current.actualizarCantidad('1', 5);
    });

    expect(result.current.items[0].cantidad).toBe(5);
  });

  it('removes item when quantity set to 0', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
    });

    act(() => {
      result.current.actualizarCantidad('1', 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('removes item with quitar method', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
      result.current.agregar(mockProducto2);
    });

    act(() => {
      result.current.quitar('1');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].producto.productoId).toBe('2');
  });

  it('empties cart with vaciar method', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
      result.current.agregar(mockProducto2);
    });

    act(() => {
      result.current.vaciar();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('persists cart to localStorage on change', async () => {
    const { result } = renderHook(() => useCarrito());

    // Wait for hydration
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      result.current.agregar(mockProducto);
    });

    // Wait for localStorage write
    await new Promise((resolve) => setTimeout(resolve, 50));

    const stored = localStorage.getItem('otrarondamas_carrito');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].producto.productoId).toBe('1');
  });

  it('loads cart from localStorage on mount', async () => {
    // Pre-populate localStorage
    const cartData = [
      {
        producto: mockProducto,
        cantidad: 3,
      },
    ];
    localStorage.setItem('otrarondamas_carrito', JSON.stringify(cartData));

    const { result } = renderHook(() => useCarrito());

    // Wait for hydration
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(3);
    expect(result.current.total).toBe(300); // 100 * 3
  });

  it('clears localStorage when cart is emptied', async () => {
    const { result } = renderHook(() => useCarrito());

    // Wait for hydration
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      result.current.agregar(mockProducto);
    });

    // Wait for localStorage write
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(localStorage.getItem('otrarondamas_carrito')).toBeTruthy();

    act(() => {
      result.current.vaciar();
    });

    // Wait for localStorage write
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(localStorage.getItem('otrarondamas_carrito')).toBeNull();
  });

  it('handles localStorage errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto);
    });

    // Should not crash, just fall back to memory
    expect(result.current.items).toHaveLength(1);

    spy.mockRestore();
  });

  it('marks as hydrated after mount', async () => {
    const { result } = renderHook(() => useCarrito());

    expect(result.current.isHydrated).toBe(false);

    // Wait for hydration effect
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.isHydrated).toBe(true);
  });

  it('handles multiple products in cart', () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(mockProducto); // 100
      result.current.agregar(mockProducto2); // 50
      result.current.actualizarCantidad('1', 2);
      result.current.actualizarCantidad('2', 3);
    });

    // 100*2 + 50*3 = 350
    expect(result.current.total).toBe(350);
    expect(result.current.items).toHaveLength(2);
  });
});
