# AS-IS — UI
**Evidencia:** VERIFIED BY CODE (lectura de `App.tsx` y árbol de `features/` de ambos frontends, esta sesión)

## pos-admin (`apps/pos-admin/src/`)

Rutas reales y funcionales con datos de la API: `/login`, `/auth/google/callback`, `/` (Dashboard),
`/ventas` (historial paginado), `/ventas/nueva` (POS completo), `/ventas/:id` (detalle),
`/ventas/:id/comprobante` (ticket imprimible, sin sidebar), `/orders` (bandeja de pedidos),
`/inventory`, `/compras`, `/precios`, `/customers` (clientes), `/fidelizacion`, `/cash` (caja),
`/profile`.

**Placeholders explícitos, sin funcionalidad real:**
- `/reports` — literalmente `<div>Reportes - En desarrollo</div>`
- `/settings` — literalmente `<div>Configuración - En desarrollo</div>`

Componentes de soporte: `Sidebar` (colapsable), `MainLayout`, `Header`, `Button`/`Card`/`Input`
genéricos.

## tienda-online (`apps/tienda-online/src/`)

Rutas reales, todas con componentes conectados a la API (`lib/api.ts`), **sin placeholders
detectados** en el árbol de rutas (grep de "En desarrollo"/"TODO"/"placeholder" en `.tsx` solo
encontró comentarios de código, no UI placeholder visible): `/` (catálogo público con filtros por
Familia/Subfamilia), `/checkout`, `/pedido/:id` (seguimiento), `/login`, `/registro`,
`/activar-invitacion-mayorista`, `/mi-cuenta`, `/mi-cuenta/legajo`.

## Limitación del método de verificación

No se pudo verificar el renderizado visual real en un navegador (reconocido explícitamente en
SRC-004 §6 y §13.4-13.5) — toda verificación de UI se hizo reproduciendo las llamadas HTTP exactas
que la interfaz emite, no por interacción real de mouse/teclado ni inspección visual. Esto significa
que "funcional con datos reales de la API" está verificado a nivel de red, no a nivel de experiencia
de usuario visible en pantalla.

## Relación con SRC-007/009 (SPEC de Ventas)

`spec-modulos_ventas.md` describe un rediseño completo de 7 pantallas de Ventas, con un design
system propio (paleta, tipografía, microcopy) que corrige varios defectos del rediseño original (ej.
línea de IVA inexistente en el backend, cobro en un solo paso vs. asistente de 3 pasos). Ese rediseño
**no está reflejado en el código real** verificado en esta sesión — las rutas de Ventas existen y
funcionan (ver arriba), pero no se confirmó que su UI actual ya implemente las correcciones
específicas que esa SPEC propone (ID PNT-VTA-01 a 06). Queda como brecha a evaluar en una fase de
Transformation, no resuelta aquí.
