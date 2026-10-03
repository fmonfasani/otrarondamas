# AS-IS — Flows
**Evidencia:** VERIFIED BY CODE + VERIFIED BY EXECUTION (SRC-004, comandos y respuestas HTTP reales observadas)

Flujos end-to-end que el código real soporta hoy, con su fuente de verificación:

## 1. Login panel
`POST /auth/login` (password) o flujo Google OAuth → JWT con permisos embebidos → `GET /auth/me`
para perfil fresco desde DB. **VERIFIED BY EXECUTION** (SRC-004 §6/15/16, respuestas HTTP reales
documentadas — sin navegador real, simulado con requests HTTP directos incluyendo preflight CORS).

## 2. Venta presencial completa
Buscar producto (`GET /ventas/productos?search=`) → cotizar opcional (`POST /ventas/cotizacion`) →
crear venta (`POST /ventas`, precio y total resueltos server-side, descuento de stock FIFO
transaccional) → cobrar (`POST /ventas/:id/pagos`, pagos mixtos con vuelto) → ver comprobante
(`GET /ventas/:id/comprobante`). **VERIFIED BY EXECUTION** extensa (SRC-004 §11-13): total exacto
verificado a mano, stock descontado exactamente lo vendido, atomicidad confirmada (un ítem inválido
no descuenta stock de otro ítem del mismo pedido), aislamiento entre empresas confirmado con 404,
`DELETE /ventas/:id` confirmado inexistente.

## 3. Apertura → venta → arqueo → cierre de caja
`POST /caja/apertura` → ventas en efectivo generan `MovimientoCaja` automático → `POST /caja/arqueo`
(doble confirmación saliente/entrante) → si excede el umbral, requiere autorización
(`POST /autorizaciones`) antes de `POST /caja/cierre`. **VERIFIED BY EXECUTION** (SRC-004 §14, 21,
22, tabla completa de 13 casos HTTP con resultado observado).

## 4. Compra a proveedor
Alta proveedor → `POST /compras` (BORRADOR) → `POST /compras/:id/emitir` (EMITIDA) →
`POST /compras/:id/recepciones` (parcial o total, genera `Lote` + `MovimientoStock`).
**VERIFIED BY EXECUTION** (SRC-004 §19) — recepción parcial validada contra pendiente real, no
acumulado erróneo.

## 5. Pedido de tienda online → gestión en panel
Cliente anónimo navega catálogo público (`GET /tienda/productos`) → `POST /tienda/pedidos` (crea o
reusa `Cliente`, congela precios) → vendedor ve bandeja (`GET /pedidos`) → confirma o cancela
(`PATCH /pedidos/:id/estado`, descuenta stock **solo** al confirmar). **VERIFIED BY EXECUTION**
(SRC-004 §24-25).

## 6. Login/registro de cliente + legajo mayorista
`POST /auth/cliente/registro` (minorista) o invitación mayorista
(`POST /invitaciones/mayorista` → activación pública → legajo → aprobación por el dueño).
**VERIFIED BY EXECUTION parcial** (SRC-004 §37 — verificación de 401 correcto y bundle servido, algo
menos exhaustiva que ventas/caja).

## 7. Fidelización automática
Nivel calculado al vuelo por historial de compras (ventas + pedidos confirmados cuentan al mismo
historial) → reglas aplicables resueltas antes de la transacción → descuento aplicado por ítem,
combinado (no reemplazado) con el descuento de producto de tienda online.
**VERIFIED BY EXECUTION** (SRC-004 §33, cálculo numérico exacto verificado, ej. subir un cliente
real a VIP con 10 compras mezclando venta presencial + pedido online).

## Flujos explícitamente NO soportados hoy

- **Anulación de venta** — el estado `ANULADA` existe en el enum, sin ningún endpoint que lo
  produzca (confirma `01-ASIS-PRODUCT.md`).
- **Cobro de deuda / cuenta corriente** — modelos existen, sin flujo real (RF-10).
- **Entrega de pedido con repartidor** — modelo `Entrega` existe, sin módulo funcional (RF-13).
- **Cualquier flujo conversacional** (consulta por chat, pedido iniciado por mensaje, asistente de
  IA respondiendo) — no existe ningún punto de entrada de este tipo en el código.

## Nota sobre el método de verificación

Ninguno de estos flujos fue verificado con un navegador real interactuando por mouse/teclado — la
limitación se reconoce explícitamente en SRC-004 (§6, §13.4-13.5): la verificación reprodujo las
llamadas HTTP exactas que un navegador real emitiría (incluido el preflight CORS), pero eso sigue
siendo una aproximación por línea de comandos, no una prueba de UI. Esto se aplica igual a esta
reconstrucción del AS-IS.
