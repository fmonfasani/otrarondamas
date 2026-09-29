import { createContext, useContext, type ReactNode } from 'react';
import { useCarrito } from './useCarrito';

type CarritoContextValue = ReturnType<typeof useCarrito>;

const CarritoContext = createContext<CarritoContextValue | null>(null);

// El carrito tiene que sobrevivir la navegación entre /catalogo y
// /checkout (dos páginas distintas) — por eso vive en un Context en vez
// de estado local de una sola página, mismo motivo por el que
// pos-admin usa AuthContext para la sesión.
export function CarritoProvider({ children }: { children: ReactNode }) {
  const carrito = useCarrito();
  return <CarritoContext.Provider value={carrito}>{children}</CarritoContext.Provider>;
}

export function useCarritoContext() {
  const ctx = useContext(CarritoContext);
  if (!ctx) {
    throw new Error('useCarritoContext debe usarse dentro de <CarritoProvider>');
  }
  return ctx;
}
