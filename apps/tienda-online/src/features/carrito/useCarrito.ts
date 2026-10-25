import { useState, useCallback, useEffect } from 'react';
import type { ProductoTienda } from '@otrarondamas/shared-types';

export interface ItemCarrito {
  producto: ProductoTienda;
  cantidad: number;
}

const CARRITO_STORAGE_KEY = 'otrarondamas_carrito';

/**
 * P6-3: Persistent cart with localStorage
 *
 * useCarrito with localStorage persistence:
 * - Serializes cart items to localStorage on every change
 * - Deserializes from localStorage on mount
 * - Handles storage errors gracefully (falls back to memory)
 *
 * El precio que se ve acá es informativo: el backend vuelve a tomar
 * precioMinorista del catálogo al crear el pedido (ver tienda.service.ts,
 * mismo criterio que ventas.service.ts — nunca confía en un precio que
 * mande el cliente).
 *
 * Sin reserva de stock (decisión confirmada del roadmap): agregar algo
 * al carrito no aparta nada, solo valida contra `disponible` en el
 * momento de mostrarlo.
 */
export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CARRITO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ItemCarrito[];
        setItems(parsed);
      }
    } catch (err) {
      console.warn('Failed to hydrate cart from localStorage:', err);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(CARRITO_STORAGE_KEY);
      } else {
        localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(items));
      }
    } catch (err) {
      console.warn('Failed to persist cart to localStorage:', err);
    }
  }, [items, isHydrated]);

  const agregar = useCallback((producto: ProductoTienda) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.productoId === producto.productoId);
      if (existente) {
        return prev.map((i) =>
          i.producto.productoId === producto.productoId ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }, []);

  const actualizarCantidad = useCallback((productoId: string, cantidad: number) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => i.producto.productoId !== productoId)
        : prev.map((i) => (i.producto.productoId === productoId ? { ...i, cantidad } : i)),
    );
  }, []);

  const quitar = useCallback((productoId: string) => {
    setItems((prev) => prev.filter((i) => i.producto.productoId !== productoId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const total = items.reduce((acc, item) => acc + Number(item.producto.precio) * item.cantidad, 0);

  return { items, agregar, actualizarCantidad, quitar, vaciar, total, isHydrated };
}
