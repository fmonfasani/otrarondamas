# Estado: integrado

El contenido de esta carpeta (design system Tailwind + componentes UI +
POSPage) ya fue fusionado a `apps/pos-admin` el 2026-09-20.

**No se copió tal cual** — `App.tsx` y `Sidebar.tsx` originales de acá
eliminaban el sistema de auth (`AuthProvider`/`ProtectedRoute`/`LoginPage`)
y la ruta `/ventas/nueva` (ya integrada con la API real vía `NuevaVentaPage`,
`useCarrito`, `BuscadorProductos`). Esos dos archivos se reescribieron a mano
conservando auth y ventas, y usando el nuevo `MainLayout`/`Sidebar` solo como
capa visual alrededor de las rutas reales.

`POSPage.tsx` (maqueta con productos mock, sin conexión a la API) se copió
a `src/features/pos/POSPage.tsx` pero **no está montada en ninguna ruta**:
`NuevaVentaPage` es la versión real de venta. Se puede borrar `POSPage.tsx`
o usarla como referencia de diseño para terminar de integrar el carrito real
con este look.

Esta carpeta (`docs/pos-admin-files/`) puede borrarse cuando se confirme
que no hace falta más como referencia.
