import { useState, useCallback } from 'react';
import type { ProductoTienda } from '@otrarondamas/shared-types';

export interface ItemCarrito {
  producto: ProductoTienda;
  cantidad: number;
}

/**
 * Mismo patrón que pos-admin/src/features/ventas/useCarrito.ts — estado
 * en memoria, no persiste hasta confirmar el pedido (POST /tienda/pedidos).
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

  return { items, agregar, actualizarCantidad, quitar, vaciar, total };
}
