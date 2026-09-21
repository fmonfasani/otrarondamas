import { useState, useCallback } from 'react';
import type { Producto } from '@otrarondamas/shared-types';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

/**
 * Estado del carrito de venta, en memoria del cliente (no persiste en
 * localStorage ni en el servidor hasta que se confirma la venta con
 * POST /ventas). El precio que se ve acá es solo informativo — el
 * backend vuelve a tomar precioMinorista del catálogo al confirmar, no
 * confía en lo que mande el cliente (ver apps/api/src/ventas/ventas.service.ts).
 */
export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregar = useCallback((producto: Producto) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }, []);

  const actualizarCantidad = useCallback((productoId: string, cantidad: number) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((i) => i.producto.id !== productoId)
        : prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i)),
    );
  }, []);

  const quitar = useCallback((productoId: string) => {
    setItems((prev) => prev.filter((i) => i.producto.id !== productoId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (acc, item) => acc + Number(item.producto.precioMinorista) * item.cantidad,
    0,
  );

  return { items, agregar, actualizarCantidad, quitar, vaciar, total };
}
