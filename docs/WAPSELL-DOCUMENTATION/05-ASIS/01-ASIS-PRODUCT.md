# AS-IS — Product
**Evidencia:** VERIFIED BY CODE (esta sesión) + VERIFIED BY EXECUTION (SRC-004) + DOCUMENTED (SRC-011)

## Qué es, hoy, el producto

Un sistema de gestión comercial (ERP/POS ligero) **multiempresa a nivel de datos, monoempresa en
operación real** para un negocio tipo almacén/kiosco/distribuidora de bebidas ("Otra Ronda Más" /
"Otra Roonda Más" — ver inconsistencia de nombre en `12-ASIS-EVIDENCE.md`), con tres superficies:

1. **API backend** (NestJS) — núcleo de negocio, 17 módulos de dominio + infraestructura.
2. **pos-admin** (panel interno, React/Vite) — dueño/empleados: ventas presenciales, caja,
   inventario, compras, clientes, fidelización, pedidos online, precios, perfil.
3. **tienda-online** (React/Vite) — catálogo público sin login obligatorio para navegar, con
   login/registro real de clientes (RF-17) para checkout y seguimiento de pedido.

## Funcionalidad real en ejecución (VERIFIED BY CODE + VERIFIED BY EXECUTION)

- Catálogo de **4.342 productos reales** (no de prueba) importados de un Excel del negocio, con
  jerarquía fija de 4 niveles (Familia → Subfamilia → Tipo → Subtipo).
- Venta presencial: cotización previa, descuento de stock FIFO por lote con control de atomicidad,
  pagos mixtos (efectivo/transferencia/QR) con vuelto y saldo derivado, número correlativo por
  empresa, comprobante imprimible, idempotencia por clave.
- Caja: apertura, movimientos, arqueo con **doble confirmación** (usuario saliente + entrante),
  autorización por excepción si la diferencia supera el umbral, cierre.
- Compras: alta de proveedor, orden (BORRADOR→EMITIDA), recepción parcial o total (genera Lote +
  movimiento de stock), pagos y devoluciones a proveedor.
- Inventario: ajustes manuales atómicos, alertas de bajo stock y de vencimiento configurables.
- Tienda online: catálogo público filtrable, carrito, checkout, seguimiento de pedido por el
  cliente; bandeja de gestión de pedidos en el panel (confirmar/cancelar).
- Fidelización: nivel de cliente (NUEVO/FRECUENTE/VIP) **calculado dinámicamente** al momento de la
  venta a partir del historial (nunca persistido), con reglas de descuento configurables por
  jerarquía de catálogo, marca o cantidad mínima — combinable con el descuento de producto de
  tienda online (no se reemplazan entre sí).
- Identidad y acceso: login por password y por Google OAuth, separado para "Usuario" (panel) y
  "Cliente" (tienda); sistema de invitación → activación → legajo → aprobación manual del dueño
  para los roles de negocio (Owner, Asistente de local, Proveedor, Repartidor, Cliente mayorista).

## Explícitamente NO implementado (declarado en el propio código/notas, no inferido)

- **Mercado Pago** — ni un stub que intente una llamada saliente; el DTO de pagos rechaza
  explícitamente el string "Mercado Pago" con 400 (D-03 sin definir).
- **Cuenta corriente / cobro de deudas** (RF-10) — los modelos (`CuentaCorriente`, `Deuda`,
  `AplicacionPago`) existen en el schema, sin ningún service que los use.
- **Entregas** (RF-13) — el modelo `Entrega` existe (1:1 con Pedido, campos `preparadorId`/
  `repartidorId`), pero no existe carpeta `entregas/` en `apps/api/src`: es solo modelo de datos,
  sin controller ni service.
- **Reportes** — pantalla `/reports` en pos-admin es literalmente `<div>Reportes - En desarrollo</div>`.
- **Configuración** — pantalla `/settings` es el mismo tipo de placeholder.
- **Reglas de precio mayorista reales** (D-01) — `Producto.precioMayorista` existe pero es nullable
  y sin lógica de asignación automática.
- **Notificaciones multicanal** (D-13, WhatsApp/email transaccional general) — el modelo
  `Notificacion` existe en el schema; no se encontró carpeta `notificaciones/` en `apps/api/src`,
  por lo que aparenta no tener service activo (no verificado exhaustivamente archivo por archivo).
- **Anulación de venta** — `EstadoVenta.ANULADA` existe como valor del enum, sin ningún endpoint ni
  lógica que lo produzca.
- **Messaging, conversaciones, asistentes de IA** — ausencia total confirmada por grep exhaustivo
  (ver `04-ASIS-IDENTITY.md`). Esto es el contraste directo con DEC-001.

## Nota de procedencia

Esta funcionalidad "real en ejecución" está verificada dos veces: por lectura directa del código
backend (controllers, guards, schema) en esta sesión, y por los registros de ejecución real
(comandos, respuestas HTTP observadas, verificación en Postgres) documentados progresivamente en
SRC-004 (`scaffolding-notas.md`, secciones 1–37, ahora leído en su totalidad). Donde ambas
coinciden, la clasificación es VERIFIED BY CODE + VERIFIED BY EXECUTION. Ningún punto de esta lista
depende únicamente de lo que las specs (SRC-001, 005, 006, 007) dicen que *debería* existir.
