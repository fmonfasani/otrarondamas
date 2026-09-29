# AS-IS — Data
**Evidencia:** VERIFIED BY CODE (lectura completa de `apps/api/prisma/schema.prisma`, esta sesión)

Provider PostgreSQL. **42 modelos, 8 enums** confirmados por lectura directa (SRC-011 reportaba 10
enums — diferencia menor no reconciliada, ver nota al final).

## Enums

`EstadoPedido` (10 estados) · `EstadoPago` (7) · `EstadoCompra` (4) · `EstadoCaja` (3) ·
`EstadoVenta` (CONFIRMADA/ANULADA — ANULADA existe en el enum sin ningún flujo que la produzca) ·
`UnidadBase` (6) · `NivelFidelidad` (NUEVO/FRECUENTE/VIP — **calculado al vuelo, nunca persistido en
`Cliente`**) · `RolUsuario` (OWNER/ASISTENTE_LOCAL/PROVEEDOR/REPARTIDOR — no autoriza nada por sí
solo, solo determina qué legajo pedir) · `EstadoLegajo` (PENDIENTE/APROBADO) ·
`TipoDocumentoLegajo` (ANTECEDENTES_PENALES/CONSTANCIA_CUIL).

## Modelos, agrupados por dominio

**Identidad y tenancy:** `Empresa` (raíz de aislamiento, `nombre @unique`, relaciona con ~20
entidades), `Usuario` (`email @unique` **global**, no por empresa), `Permiso`/`UsuarioPermiso`
(`@@unique([usuarioId, permisoId])`), `Invitacion` (`token @unique`), `Legajo` (polimórfico —
exactamente uno de `usuarioId`/`clienteId`, cada uno `@unique`; el XOR se valida en service, **no**
en schema), `DocumentoLegajo` (con `vencimiento` obligatorio).

**Catálogo:** `Familia → Subfamilia → Tipo → Subtipo` (jerarquía fija de 4 niveles, cada uno con
`prefijo String @db.Char(3)` para el SKU; unicidad de nombre/prefijo **dentro del padre**, no
global), `Producto` (**`@@unique([empresaId, codigoInterno])`** — confirmado corregido respecto al
bug de unicidad global que señalaba SRC-011; `precioMayorista` nullable por D-01 sin definir;
`descuentoPorcentaje` nullable; `stockMinimo` default 0), `Presentacion`, `Lote`
(`@@unique([productoId, numeroLote, empresaId])`), `ProductoProveedor` (N:N con Proveedor).

**Clientes y fidelización:** `Cliente` (`@@unique([empresaId, email])`, soporta minorista y
mayorista vía `esMayorista`; mismo patrón `passwordHash`/`googleId` nullable que `Usuario`),
`ReglaFidelizacion` (nivel mínimo + % descuento + alcance opcional independiente entre sí; FKs a
`VentaItem`/`PedidoItem` con `onDelete: Restrict` explícito para proteger trazabilidad).

**Ventas y pedidos:** `Venta` (`estado` tipado enum — corregido desde string libre; `idempotencyKey
@unique`; `numero Int?` correlativo por empresa; `total`/`descuento` `@db.Decimal(14,2)`),
`VentaItem` (`precioUnitario` siempre congelado del catálogo, nunca del cliente HTTP; dos campos de
descuento separados —manual y de fidelización— que nunca se mezclan), `Pedido`/`PedidoItem`
(`clienteId` obligatorio, `usuarioId` opcional hasta que un vendedor lo gestiona).

**Pagos y cuenta corriente:** `Pago` (`montoRecibido`/`vuelto` solo efectivo, `referencia` para
transferencia/QR, `comision` default 0 sin cálculo real), `CuentaCorriente`/`Deuda`/
`AplicacionPago` — **modelos completos, sin ningún service que los use** (RF-10 sin implementar).

**Caja:** `Caja` (`@@unique([empresaId])`), `AperturaCaja`, `MovimientoCaja`, `ArqueoCaja`
(`usuarioId` saliente + `usuarioEntranteId` obligatorio y distinto — doble confirmación real),
`CierreCaja`.

**Compras:** `Proveedor` (`@@unique([empresaId, nombre])`), `Compra` (`totalPagado`/`saldo`
recalculados en service, nunca editados a mano), `CompraItem`, `RecepcionCompra`, `PagoProveedor`,
`DevolucionProveedor`, `DevolucionProveedorItem`.

**Inventario y trazabilidad:** `MovimientoStock` (mecanismo único de trazabilidad de stock,
reusado por Ventas/Compras/Ajustes/Pedidos confirmados; `loteVencidoAlMomento Boolean` calculado una
sola vez al generarse, no derivado después), `Entrega` (1:1 con `Pedido`, campos
`preparadorId`/`repartidorId` — modelo existe, sin módulo funcional: no hay carpeta `entregas/` en
`apps/api/src`), `Notificacion` (modelo existe; no se confirmó service activo — no hay carpeta
`notificaciones/`), `AuditLog` (bitácora genérica con valores anteriores/posteriores en JSON),
`Autorizacion` (mecanismo D-06 — login del autorizador, nunca auto-autorización).

## Constraints multiempresa

Prácticamente todo modelo de negocio lleva `empresaId` + relación a `Empresa`, reforzado en runtime
por `empresaScopeExtension` (ver `05-ASIS-AUTHORIZATION.md`). Esto es aislamiento **de datos**, no
multi-tenancy de producto: sigue sin existir `Business`, `Tenant` ni `Membership` (ver
`04-ASIS-IDENTITY.md`).

## Aislamiento de inventario por Business (D-014) — estado real verificado

**Evidencia:** `VERIFIED BY CODE` — `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`
(2026-09-28, HEAD `066bb91`, lectura estática del repositorio).

D-014 es un **requisito aprobado** (`04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1): el
inventario pertenece exclusivamente a cada Business, no existe stock global compartido, y
**no se permite transferencia de stock entre Business** salvo que una operación
inter-Business sea definida y autorizada explícitamente en una especificación posterior.

**Estado verificado: `VERIFIED BY CODE`.** La implementación actual es compatible con el
aislamiento requerido. La parte de la prohibición se cumple **por ausencia del feature**,
no por un control que lo haga cumplir — matiz registrado abajo.

### Controles de aislamiento — `VERIFIED BY CODE`

| ID | Control verificado | Ubicación |
|---|---|---|
| `AUD-D014-C01` | El aislamiento no es un middleware que confía en cada service: es una Prisma Client Extension creada **por request** con el `empresaId` de la sesión. El propio código documenta por qué se eligió extensión y no Row-Level Security (RLS con pool de conexiones no garantiza `SET app.current_empresa_id` por query) | `empresa-scope.extension.ts:102-171` |
| `AUD-D014-C02` | `create` y `createMany` sobrescriben cualquier `empresaId` entrante con el de la sesión: un cliente no puede declarar en qué Business escribe | `empresa-scope.extension.ts:118-129` |
| `AUD-D014-C03` | Filtro inyectado en `where` para `findFirst`, `findFirstOrThrow`, `findMany`, `update`, `updateMany`, `delete`, `deleteMany`, `count` y `aggregate` | `empresa-scope.extension.ts:82-92, 131-134` |
| `AUD-D014-C04` | `findUnique` no admite `empresaId` sin compound unique, así que la extensión ejecuta la query y **verifica después**: si la fila es de otra empresa devuelve `null`, o lanza `P2025` en `findUniqueOrThrow`. El dato de otra empresa nunca se devuelve | `empresa-scope.extension.ts:136-159` |
| `AUD-D014-C05` | **Fail-closed**: `upsert` y toda operación no contemplada explícitamente lanza excepción en vez de pasar sin scope. Un descuido futuro produce un error ruidoso, no una fuga silenciosa | `empresa-scope.extension.ts:161-166` |
| `AUD-D014-C06` | `Producto`, `Lote` y `MovimientoStock` están los tres en `MODELOS_CON_EMPRESA_ID`. El dominio Inventario tiene cobertura directa y completa: no depende de herencia por relación | `empresa-scope.extension.ts:38, 45, 56` |
| `AUD-D014-C07` | El `empresaId` proviene siempre de `request.user` vía `@CurrentUser()`, nunca de body, query ni params. `JwtAuthGuard` y `PermissionsGuard` están registrados como `APP_GUARD` global | `current-user.decorator.ts`, `inventario.controller.ts:43-54` |
| `AUD-D014-C08` | La única ocurrencia de SQL crudo en `apps/api/src` (`inventario.service.ts:266-270`) incluye `"empresaId" = $3` en su `WHERE`, y el comentario del código reconoce que el SQL crudo no atraviesa la extensión | búsqueda `$queryRaw` / `$executeRaw`: 1 ocurrencia |
| `AUD-D014-C09` | SKU y lote únicos por Business: `Producto` con `@@unique([empresaId, codigoInterno])` y `Lote` con `@@unique([productoId, numeroLote, empresaId])`. El identificador de producto no colisiona entre Business | `schema.prisma:431, 464` |
| `AUD-D014-C10` | La superficie HTTP de inventario no permite elegir el Business: los cinco endpoints (`stock`, `productos/:id/lotes`, `productos/:id/movimientos`, `ajustes`, `alertas`) toman el Business del usuario autenticado | `inventario.controller.ts:43, 58, 74, 95, 105` |

### Ausencia de transferencias inter-Business — `VERIFIED BY CODE`

| ID | Verificación | Resultado |
|---|---|---|
| `AUD-D014-N01` | Búsqueda de `transfer` / `transferencia` en `apps/api/src` | **8 ocurrencias, todas `medioPago`** (efectivo/transferencia/QR como medio de pago). Ninguna es transferencia de mercadería. Además: no existe entidad, modelo ni enum de transferencia de stock; no existe endpoint, service, command, job ni cron que mueva stock entre Business; no hay ningún segundo `empresaId` en Inventario por el que un stock pudiera cambiar de propietario |
| `AUD-D014-N02` | Calificación honesta de N01 | La prohibición se cumple porque **el feature no existe**, no porque exista un control que lo haga cumplir. Si mañana se implementara una transferencia, nada en el código actual la impediría salvo que se respete el scope por `empresaId` ya existente |
| `AUD-D014-N03` | Modelos que heredan scope por relación, fuera de la extensión | `VentaItem`→`Venta`, `AplicacionPago`→`Pago`, `AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja`→`Caja`, `CompraItem`→`Compra`, `Legajo`/`DocumentoLegajo`. **No afecta a Inventario**: `Lote` y `MovimientoStock` tienen `empresaId` directo y están cubiertos |

**Resultado: la prohibición aprobada por D-014 no es contradicha por ningún código
auditado.** Se cumple por ausencia del feature (`AUD-D014-N02`), que es un cumplimiento
real pero frágil: no queda todavía un invariante verificable que lo proteja el día en que
el feature se implemente. Registrar ese invariante aparece en la auditoría como observación
`PROPOSED / OPEN`, **no** como requisito aprobado.

### Limitaciones y riesgos observados — `VERIFIED BY CODE`

| ID | Hallazgo | Detalle |
|---|---|---|
| `AUD-D014-G01` | `empresaId` desnormalizado sin consistencia garantizada a nivel DB | `Lote` lleva **dos** claves redundantes (`empresaId`, `productoId`) y nada —ni FK, ni `CHECK`, ni trigger— exige `Lote.empresaId == Producto.empresaId`. `MovimientoStock` lleva **tres** (`empresaId`, `productoId`, `loteId`) sin verificación cruzada. Por API la extensión fuerza la coincidencia y los callers pasan `empresaId` explícito, así que **no se explotó ninguna vía en el código auditado**; el riesgo es latente: SQL directo, scripts, seeds o un service futuro podrían crear un `Lote` apuntando a un `Producto` de otro Business y nada en la base de datos lo impediría. `schema.prisma:449-465, 975-1000` |
| `AUD-D014-G02` | Frontera sin scope no forzada por tooling | `PrismaService` (sin scope) se inyecta directamente en `auth/*`, `invitaciones/*` y `legajo/*`. Se verificó que **ninguno** toca `Lote`, `MovimientoStock` ni `Producto` hoy. La frontera depende de la disciplina de cada módulo, no del tooling |

**No existe ninguna corrección aprobada para estas limitaciones.** La auditoría registra
observaciones con estado `PROPOSED / OPEN` que no forman parte de este AS-IS.

## Corrección respecto a SRC-011

SRC-011 (auditoría del 2026-09-24) señalaba como gap crítico que `Producto.codigoInterno` tenía
`@unique` **global** en vez de compuesto por empresa. La lectura de código de esta sesión
(2026-09-25) confirma que ese constraint **ya está corregido** a `@@unique([empresaId,
codigoInterno])`. Esto es evidencia de que el código sigue evolucionando después de la fecha de esa
auditoría — cualquier hallazgo de SRC-011 debe tratarse como válido a su fecha, no como estado
permanente. Ver `12-ASIS-EVIDENCE.md` para más casos de esta naturaleza.

## Discrepancia sin reconciliar

SRC-011 reporta "42 modelos, **10 enums**"; el conteo directo de esta sesión sobre el schema
completo da 8 enums. No se investigó a qué se debe la diferencia (podría ser un cambio entre la
fecha de la auditoría y ahora, o un criterio de conteo distinto — p. ej. si SRC-011 contaba tipos
que luego se fusionaron). Se deja registrado como discrepancia menor, no resuelta, siguiendo el
principio de no reconciliar silenciosamente.
