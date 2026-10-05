# TRANSACTIONAL & RAW SQL SURFACE INVENTORY
## AUDITORÍA TÉCNICA DE SOLO LECTURA

**Estado:** INVENTARIO READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repositorio:** `fmonfasani/otrarondamas`
**Branch:** `chore/build-in-ci` — **verificado** `[C]` (`git branch --show-current`)
**HEAD:** `d0ba8d7` — *"fix(b3): enforce Producto Familia relation isolation"* `[C]`
**Árbol de trabajo:** limpio al inicio de la auditoría `[C]` (`git status --short` sin salida)
**Rol:** auditor técnico de solo lectura

**Acción:** solo BUSCAR → ANALIZAR → CLASIFICAR → DOCUMENTAR. Sin modificar código, tests, documentación ni schema. Sin commits, push ni merge. Sin ejecutar migraciones. Sin modificar datos. Sin crear fixtures. Sin corregir nada. **Ningún Gate declarado VERIFIED.**

**Clases de evidencia:** `[C]` verificado por código · `[T]` verificado por test · `[E]` verificado por ejecución · `[D]` documentado · `[ND]` no determinable.

> **No se emite ninguna evidencia `[T]` ni `[E]`.** No se ejecutó ningún test ni la API. La existencia de un archivo de test se clasifica `[C]` (el archivo existe y su contenido se leyó); que ese test pase es `[ND]`.

---

# 1. EXECUTIVE SUMMARY

## 1.1 Cifras del inventario

| Superficie | Cantidad | Clase |
|---|---|---|
| Líneas que mencionan `$transaction` en `apps/api/src` | **19** | `[C]` |
| **Call sites reales** de `$transaction` en `src` | **14** | `[C]` |
| — interactivas (callback) | **12** | `[C]` |
| — batch (array) | **2** | `[C]` |
| Call sites de `$transaction` en `apps/api/test` | **15** | `[C]` |
| Declaraciones de tipo / comentarios (no call sites) | **5** | `[C]` |
| Raw SQL en `apps/api/src` (ejecutables) | **2** | `[C]` |
| Raw SQL en `apps/api/prisma` (scripts offline) | **2** | `[C]` |
| Raw SQL mockeado en specs | **2** | `[C]` |
| Transacciones que contienen raw SQL | **1** | `[C]` |
| `$executeRawUnsafe` en todo el repo | **0** | `[C]` ausencia |
| `$queryRawUnsafe` en `src` | **0** | `[C]` ausencia |
| `Prisma.raw` en todo el repo | **0** | `[C]` ausencia |
| Transacciones anidadas | **0** | `[C]` ausencia |

## 1.2 Hallazgos principales

**H-1 — Las 12 transacciones interactivas de producción usan cliente scoped, sin excepción.** Todas se abren sobre `db` obtenido de `this.prismaFactory.forEmpresa(empresaId)`, con un único `empresaId` capturado en el closure del método. **Ninguna mezcla dos tenants** `[C]`.

**H-2 — Las 2 transacciones batch usan el cliente SIN scope.** `invitaciones.service.ts:118` y `:227` ejecutan `this.prisma.$transaction([...])` sobre `PrismaService` crudo. El `empresaId` persistido proviene de `invitacion.empresaId` —un registro ya identificado por un token secreto— por lo que **el valor es correcto por construcción, pero no es forzado por el mecanismo** `[C]`.

**H-3 — El raw SQL está estructuralmente fuera del mecanismo de aislamiento, y esto es verificable, no inferido.** `empresa-scope.extension.ts` engancha únicamente `$allModels.$allOperations` (líneas 150-151) `[C]`. `$executeRaw` y `$queryRaw` no son operaciones de modelo, por lo que **no pueden ser interceptadas por ese hook**. El propio código lo documenta en `inventario.service.ts:261-265`.

**H-4 — La única superficie raw SQL de producción con datos de negocio incluye `empresaId` en el `WHERE` y está parametrizada.** `inventario.service.ts:266` ejecuta un `UPDATE "Lote"` con `Prisma.sql` y cuatro placeholders. **Sin riesgo de inyección** y con filtro de tenant explícito `[C]`. Su corrección depende enteramente de esa query, no del mecanismo.

**H-5 — TE-B3-006 existe, está implementado, y NO cubre la superficie raw SQL.** El test (`b3-tenant-isolation.integration-spec.ts:302`) verifica que dentro de una transacción interactiva el `create` fuerza `empresaId` del contexto y el `findUnique` cross-tenant devuelve `null` `[C]`. **No ejecuta ningún raw SQL.** La matriz canónica de tests exige explícitamente ambas mitades —"(i) una transacción interactiva … **(ii) la sentencia raw de `inventario.service.ts:266`**"— y solo (i) está implementada `[D]`+`[C]`.

**H-6 — El propio repositorio ya registra esta brecha.** `09-TRANSFORMATION/18-RELATION-ISOLATION-GATE-8-EVIDENCE-CLOSURE` consigna: *"Raw SQL full surface | TE-B3-006 | [ND] | NOT VERIFIED"* `[D]`. Este inventario **confirma y cuantifica** ese registro: la superficie no cubierta es 1 de 2 sitios raw de producción, y es la única que toca datos de negocio.

**H-7 — Discrepancia numérica real entre documentación y código.** Tres cifras distintas circulan para la misma pregunta: **11** (audits de B3/B4), **18** (reconciliación de tests, D-TE-06) y **19** líneas / **14** call sites / **12** interactivas (esta auditoría) `[C]`. §13 descompone el origen de cada una. **No se reconcilia silenciosamente.**

**H-8 — Las 2 transacciones batch no tienen ningún test.** Las 15 transacciones del directorio de tests son todas interactivas sobre cliente scoped `[C]`. La forma batch sobre cliente crudo —que es precisamente la que no fuerza `empresaId`— **carece de cobertura** `[C]` ausencia.

**H-9 — El mecanismo nuevo de relation-ownership no alcanza al raw SQL ni al boundary transaccional.** `relation-ownership.ts` recorre el payload de operaciones de modelo para extraer referencias relacionales (5 modelos registrados) `[C]`. Es cobertura de ISO-001/002 (FK en nested writes), **no de ISO-006**.

## 1.3 Lectura global

El perímetro transaccional de producción es **homogéneo y correcto por construcción** en su parte interactiva: 12 de 12 scoped, un tenant por transacción, cero anidamiento, cero raw inseguro. Los dos puntos donde el aislamiento **no está garantizado por mecanismo** sino por la corrección del código llamador son: las 2 transacciones batch sobre cliente crudo, y la sentencia raw dentro de la transacción de ajuste de inventario. Ambos están hoy escritos correctamente `[C]`; ninguno está verificado por ejecución `[ND]`.

---

# 2. COMPLETE TRANSACTION INVENTORY

## 2.1 Call sites en `apps/api/src` — los 14

| # | Archivo | Línea | Símbolo (clase.método) | Tipo | Client | Scoped | `empresaId` |
|---|---|---|---|---|---|---|---|
| TX-01 | `caja/caja.service.ts` | **69** | `CajaService.abrir` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro del método |
| TX-02 | `caja/caja.service.ts` | **172** | `CajaService.arquear` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-03 | `caja/caja.service.ts` | **268** | `CajaService.cerrar` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-04 | `compras/compras.service.ts` | **207** | `ComprasService.recibirCompra` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-05 | `compras/compras.service.ts` | **297** | `ComprasService.crearPago` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-06 | `compras/compras.service.ts` | **352** | `ComprasService.crearDevolucion` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-07 | `inventario/inventario.service.ts` | **225** | `InventarioService.registrarAjuste` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-08 | **`invitaciones/invitaciones.service.ts`** | **118** | `InvitacionesService.activar` | **batch** | **`this.prisma`** | **NO** | de `invitacion.empresaId` |
| TX-09 | **`invitaciones/invitaciones.service.ts`** | **227** | `InvitacionesService.activarMayorista` | **batch** | **`this.prisma`** | **NO** | de `invitacion.empresaId` |
| TX-10 | `pagos/pagos.service.ts` | **32** | `PagosService.create` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-11 | `pedidos/pedidos.service.ts` | **88** | `PedidosService.actualizarEstado` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-12 | `tienda/tienda.service.ts` | **221** | `TiendaService.crearPedido` | interactive | `db` ← `forEmpresa` | **SÍ** | **env var** `TIENDA_EMPRESA_ID` |
| TX-13 | `ventas/ventas.service.ts` | **153** | `VentasService.create` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |
| TX-14 | `ventas/ventas.service.ts` | **309** | `VentasService.crearPago` | interactive | `db` ← `forEmpresa` | **SÍ** | parámetro |

**Todas `[C]`**, verificadas por lectura del archivo y del método contenedor.

## 2.2 Líneas que NO son call sites — las 5

| Archivo | Línea | Naturaleza |
|---|---|---|
| `compras/compras.service.ts` | 16 | declaración de tipo `EmpresaScopedTx` |
| `compras/compras.service.ts` | 175 | comentario en docstring |
| `inventario/inventario.service.ts` | 9 | comentario |
| `inventario/inventario.service.ts` | 12 | declaración de tipo |
| `tienda/tienda.service.ts` | 13 | declaración de tipo |

**Origen de la discrepancia 19 vs 14** `[C]`. Ver §13.

## 2.3 Call sites en `apps/api/test` — los 15

| Archivo | Líneas | Tipo | Client |
|---|---|---|---|
| `b3-tenant-isolation.integration-spec.ts` | 306, 546, 552, 622, 626, 678, 680, 762, 770, 921, 930 (11) | interactive | `scopedPrisma.forEmpresa(...)` |
| `b3-devolucion-proveedor-item.integration-spec.ts` | 332, 344 (2) | interactive | scoped |
| `b3-producto-familia.integration-spec.ts` | 92, 97 (2) | interactive | scoped |

**Las 15 son interactivas sobre cliente scoped** `[C]`. **Cero** tests de la forma batch.

## 2.4 Transacciones anidadas

**No existen.** Búsqueda de `tx.$transaction` y de `$transaction` dentro de un callback de `$transaction`: cero coincidencias `[C]` ausencia.

## 2.5 Detalle por call site

### TX-01 — `CajaService.abrir` (`caja.service.ts:69`)
Modelos: `AperturaCaja`, `Caja`. Nested writes: no. Raw SQL: no. `AperturaCaja` **no tiene `empresaId`** (ownership DERIVED vía `Caja`); su aislamiento depende de que `cajaId` provenga de `getCajaDeEmpresa(empresaId)`, que sí es scoped `[C]`. Rollback: por defecto de Prisma `[ND]` sin ejecución. Test: ninguno `[C]`. Riesgo: **MEDIO** (ownership derivado sin mecanismo). Prioridad: 3.

### TX-02 — `CajaService.arquear` (`:172`)
Modelos: `ArqueoCaja`, `Caja`. `ArqueoCaja` es DERIVED; recibe `cajaId`, `aperturaCajaId`, `usuarioId`, `usuarioEntranteId`. `usuarioEntranteId` **sí** se valida con lectura scoped previa (`db.usuario.findUnique`, `:132`) `[C]`. Raw SQL: no. Test: ninguno. Riesgo: **MEDIO**. Prioridad: 3.

### TX-03 — `CajaService.cerrar` (`:268`)
Modelos: `CierreCaja`, `AperturaCaja`. Ambos DERIVED. Test: ninguno. Riesgo: **MEDIO**. Prioridad: 3.

### TX-04 — `ComprasService.recibirCompra` (`compras.service.ts:207`)
Modelos: `RecepcionCompra` (DIRECT), `CompraItem` (DERIVED), `Lote`, `MovimientoStock`, `Compra`. Invoca `calcularEstadoTrasRecepcion(tx, compraId)` que recibe el `tx` tipado `EmpresaScopedTx` `[C]`. Raw SQL: no. Test: ninguno. Riesgo: **MEDIO-ALTO** (5 modelos, 2 sin `empresaId`). Prioridad: 2.

### TX-05 — `ComprasService.crearPago` (`:297`)
Modelos: **`PagoProveedor`** (tiene `empresaId` y **NO está en la allow-list** de la extensión), `Compra`. Usa cast `as Prisma.PagoProveedorUncheckedCreateInput` y pasa `empresaId` a mano `[C]`. Precedido por `getCompra(empresaId, compraId)`. Riesgo: **ALTO estructural / mitigado por orden de llamadas**. Prioridad: **1**.

### TX-06 — `ComprasService.crearDevolucion` (`:352`)
Modelos: **`DevolucionProveedor`** (fuera de la allow-list), `DevolucionProveedorItem` (DERIVED, nested create), `MovimientoStock`, `Lote`. **Nested write presente** `[C]`. FKs `productoId`/`loteId` del DTO. **Cubierto por el nuevo `relation-ownership.ts`**, que registra `DevolucionProveedorItem: ['producto','lote']` `[C]`. Test: `b3-devolucion-proveedor-item.integration-spec.ts` (2 tx) `[C]`. Riesgo: **MEDIO** (era ALTO; mitigado por el mecanismo nuevo). Prioridad: 2.

### TX-07 — `InventarioService.registrarAjuste` (`inventario.service.ts:225`)
Modelos: `Lote`, `MovimientoStock`. **CONTIENE RAW SQL** vía `aplicarAjusteAtomico(tx, …)` `[C]`. Ver §6. Patrón TOCTOU explícito y **deliberadamente mitigado**: el `findUnique` previo (`:220`) es informativo y la condición real (`cantidad + δ >= 0`) se evalúa atómicamente dentro del `UPDATE`; si `count === 0` se lanza `BadRequestException` y la transacción revierte `[C]`. Test: ninguno que ejercite el raw. Riesgo: **ALTO** (única combinación tx+raw). Prioridad: **1**.

### TX-08 — `InvitacionesService.activar` (`invitaciones.service.ts:118`)
**BATCH, cliente SIN scope.** Modelos: `Usuario` (DIRECT, **cubierto** por la extensión pero no invocado a través de ella), `Invitacion` (DIRECT). `empresaId: invitacion.empresaId`, de un registro localizado por token secreto de 32 bytes `[C]`. **El `create` NO pasa por el forzado de `empresaId`** — el valor correcto se escribe explícitamente. Raw SQL: no. Test: **ninguno** `[C]`. Riesgo: **MEDIO** (correcto por construcción, no por mecanismo). Prioridad: 2.

### TX-09 — `InvitacionesService.activarMayorista` (`:227`)
Idéntico a TX-08 con `Cliente` en lugar de `Usuario` `[C]`. Mismo análisis, misma prioridad.

### TX-10 — `PagosService.create` (`pagos.service.ts:32`)
Modelos: `Venta`, `Pago`, `Caja`, `AperturaCaja`, `MovimientoCaja`. Los tres últimos vía lecturas scoped dentro del `tx` (`:71`, `:76`, `:84`) `[C]`. `MovimientoCaja` y `AperturaCaja` son DERIVED. Raw SQL: no. Test: ninguno. Riesgo: **MEDIO-ALTO** (5 modelos, 3 DERIVED). Prioridad: 2.

### TX-11 — `PedidosService.actualizarEstado` (`pedidos.service.ts:88`)
Modelos: `Pedido`, `PedidoItem` (DERIVED), más efectos de stock. Raw SQL: indirecto si invoca `descontarStock` (que recibe `tx`). Test: ninguno directo. Riesgo: **MEDIO**. Prioridad: 3.

### TX-12 — `TiendaService.crearPedido` (`tienda.service.ts:221`)
**Único con `tx` explícitamente tipado** `EmpresaScopedTx` `[C]`. Modelos: `Cliente`, `Pedido`, `PedidoItem` (nested create). **Contexto desde env var `TIENDA_EMPRESA_ID`, no desde sesión** — superficie pública `[C]`. `PedidoItem` está registrado en `relation-ownership.ts` `[C]`. Documenta haber evitado `upsert` por el fail-closed (`:230`) — evidencia de que la extensión opera dentro del `tx` `[C]`/`[D]`. Riesgo: **MEDIO**. Prioridad: 2.

### TX-13 — `VentasService.create` (`ventas.service.ts:153`)
Modelos: `Venta`, `VentaItem` (nested create, registrado en `relation-ownership.ts`), `AuditLog`, `MovimientoStock`, `Lote`. **El `tx` se pasa a `descontarStock`** `[C]`. Usa `aggregate` para el número correlativo dentro del `tx` (`:157`). Test: cubierto parcialmente por los tests de `VentaItem` `[C]`. Riesgo: **MEDIO-ALTO**. Prioridad: 2.

### TX-14 — `VentasService.crearPago` (`:309`)
Modelos: `Venta`, `Pago`, efectos de caja. Test: ninguno. Riesgo: **MEDIO**. Prioridad: 3.

---

# 3. INTERACTIVE TRANSACTIONS

**12 en producción.** Todas con la firma `db.$transaction(async (tx) => { … })`, donde `db = this.prismaFactory.forEmpresa(empresaId)`.

| Propiedad | Estado | Evidencia |
|---|---|---|
| Cliente scoped en todas | **12/12** | `[C]` |
| Un solo `empresaId` por transacción | **12/12** | `[C]` |
| `empresaId` capturado en closure, no reasignado | **12/12** | `[C]` |
| `forEmpresa` invocado **fuera** del callback | **12/12** | `[C]` |
| `tx` tipado explícitamente | **1/12** (TX-12) | `[C]` |
| `tx` propagado a métodos privados | **3** (TX-04, TX-07, TX-13) | `[C]` |
| Contienen raw SQL | **1** (TX-07) | `[C]` |
| Contienen nested writes | **4** (TX-06, TX-12, TX-13, TX-04) | `[C]` |
| Mezclan dos tenants | **0** | `[C]` |
| Anidadas | **0** | `[C]` |

**Que la extensión siga activa sobre el `tx`:** evidencia convergente pero **no de ejecución**.
- de tipos: tres services derivan `EmpresaScopedTx` del `$transaction` del cliente **extendido**, no del base, y compilan `[C]`;
- documental: `tienda.service.ts:230` explica haber evitado `upsert` **dentro del `tx`** porque la extensión falla cerrada `[C]`/`[D]`;
- de test: `TE-B3-006` afirma verificarlo y el archivo existe `[C]`; **que pase es `[ND]`**.

---

# 4. BATCH TRANSACTIONS

**2 en producción, ambas en `invitaciones.service.ts`.**

| # | Línea | Método | Cliente | Operaciones |
|---|---|---|---|---|
| TX-08 | 118 | `activar` | **`this.prisma`** (sin scope) | `usuario.create` + `invitacion.update` |
| TX-09 | 227 | `activarMayorista` | **`this.prisma`** (sin scope) | `cliente.create` + `invitacion.update` |

## 4.1 Análisis de Business Context

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿De dónde proviene `empresaId`? | De `invitacion.empresaId`, leído con `invitacion.findUnique({ where: { token } })` | `[C]` `:212` |
| ¿Puede venir del cliente? | El cliente envía el **token**, no el `empresaId`. El token es un secreto de 32 bytes emitido por el servidor | `[C]` |
| ¿Es server-established? | **Indirectamente**: el servidor emitió el token y de él deriva el tenant. El cliente **selecciona** el registro presentando el secreto, pero no puede elegir el tenant | `[C]` |
| ¿Está forzado por el mecanismo? | **NO.** Al usar el cliente crudo, el `empresaId` se escribe explícitamente en el `data` y **no hay forzado** | `[C]` |
| ¿Hay validación previa? | Sí: existencia de la invitación, no usada, no vencida | `[C]` `:213-222` |
| ¿Contexto de autenticación? | **Pre-contexto.** Los endpoints son `@Public()`; la sesión se emite **después** | `[C]` |
| Rollback | Atómico por la forma batch `[ND]` sin ejecución |

## 4.2 Clasificación

**Acceso pre-contexto legítimo**, no bypass del aislamiento: la operación **establece** la pertenencia, no la consume. Usar el cliente scoped aquí es imposible por definición: no hay contexto antes de que la invitación se resuelva.

**Pero la propiedad que no se cumple es distinta:** la creación de `Usuario`/`Cliente` —ambos modelos **cubiertos** por la extensión— ocurre **fuera** de la garantía de forzado de `empresaId`. Si una refactorización introdujera un `empresaId` erróneo, nada lo detectaría. **Riesgo MEDIO, cero cobertura de test** `[C]` ausencia.

---

# 5. COMPLETE RAW SQL INVENTORY

## 5.1 Los 6 sitios

| # | Archivo | Línea | Método | Variante | Clase |
|---|---|---|---|---|---|
| **RAW-01** | `inventario/inventario.service.ts` | **266** | `InventarioService.aplicarAjusteAtomico` | `tx.$executeRaw` + `Prisma.sql` | **producción, datos de negocio** |
| **RAW-02** | `health/health.controller.ts` | **15** | `HealthController` | `this.prisma.$queryRaw` | **producción, sin datos** |
| RAW-03 | `prisma/migrate-categoria-a-jerarquia.ts` | 178 | script de migración | `prisma.$queryRawUnsafe` | **offline** |
| RAW-04 | `prisma/migrate-categoria-a-jerarquia.ts` | 282 | script de migración | `prisma.$queryRawUnsafe` | **offline** |
| RAW-05 | `health/health.controller.spec.ts` | 13 | mock de test | `jest.fn()` | **mock** |
| RAW-06 | `health/health.controller.spec.ts` | 36 | mock de test | `jest.fn()` | **mock** |

**Ausencias verificadas** `[C]`: cero `$executeRawUnsafe` en todo el repo; cero `$queryRawUnsafe` en `src`; cero `Prisma.raw`; cero `Prisma.join`.

## 5.2 RAW-01 — la superficie crítica

```
UPDATE "Lote"
SET "cantidad" = "cantidad" + ${cantidad}, "updatedAt" = now()
WHERE "id" = ${loteId} AND "empresaId" = ${empresaId} AND "cantidad" + ${cantidad} >= 0
```

| Atributo | Valor | Evidencia |
|---|---|---|
| Tabla/modelo | `Lote` (DIRECT, **sí** en la allow-list) | `[C]` |
| Operación | `UPDATE` condicional atómico | `[C]` |
| `empresaId` presente en `WHERE` | **SÍ**, explícito | `[C]` |
| Origen de `empresaId` | Parámetro de `registrarAjuste(empresaId, …)`, que viene de `@CurrentUser()` en el controller | `[C]` |
| ¿Puede venir del cliente? | **NO.** Ningún DTO declara `empresaId`; `whitelist:true` activo; ninguna ruta lo declara como param | `[C]` |
| Server-established | **SÍ** — claim JWT firmado | `[C]` |
| Parametrización | `Prisma.sql` con 4 placeholders; **cero interpolación de string** | `[C]` |
| Riesgo de inyección | **NINGUNO** | `[C]` |
| Cliente | `tx` (scoped **por tipo**, irrelevante para el raw) | `[C]` |
| Contexto transaccional | **SÍ** — dentro de TX-07 | `[C]` |
| ¿Pasa por la extensión? | **NO — estructuralmente imposible.** El hook es `$allModels.$allOperations`; el raw no es operación de modelo | `[C]` `empresa-scope.extension.ts:150-151` |
| Validación previa | `db.lote.findUnique` scoped (`:220`) — informativa, no autoritativa | `[C]` |
| TOCTOU | **Presente y mitigado por diseño**: la condición real se evalúa en el `UPDATE`; `count === 0` → excepción → rollback | `[C]` |
| Riesgo cross-Business | **BAJO** — depende de esta query, no del mecanismo | `[C]` |
| Test existente | **NINGUNO** | `[C]` ausencia |
| Clasificación | **CORRECTA POR CÓDIGO, NO VERIFICADA POR EJECUCIÓN** |

## 5.3 RAW-02 — `health`

`SELECT 1`. Sin tabla, sin datos, sin `empresaId`, sin parámetros. Pre-contexto. **Fuera del alcance del aislamiento** y así lo clasifica la matriz canónica de tests `[D]`. Riesgo: **NINGUNO** `[C]`.

## 5.4 RAW-03 / RAW-04 — script de migración offline

| # | SQL | `empresaId` en `WHERE` | Parametrizado | Riesgo inyección |
|---|---|---|---|---|
| RAW-03 | `SELECT … FROM "Producto" p JOIN "Categoria" c … WHERE p."empresaId" = $1 AND p."familiaId" IS NULL` | **SÍ**, como `$1` | **SÍ** (`$1` + arg `empresa.id`) | **NINGUNO** `[C]` |
| RAW-04 | `SELECT count(*) … FROM "Producto" WHERE "familiaId" IS NULL` | **NO** — **deliberadamente global** | N/A (string estático, sin interpolación) | **NINGUNO** `[C]` |

**RAW-04 es intencionalmente cross-Business** y es correcto: es la verificación final de la migración, que debe contar productos sin migrar **en todas las empresas**. El comentario del código lo justifica (`:278-281`) `[C]`. Un script offline de migración **no opera bajo Business Context** y su clasificación es **fuera del alcance de ISO-006**.

**Nota:** aunque la variante es `Unsafe`, ninguno de los dos interpola valores en el string — RAW-03 usa placeholder posicional y RAW-04 no tiene valores. La elección de `Unsafe` está justificada en el código por limitaciones de tipado del client generado durante la migración de 2 pasos `[C]`.

## 5.5 RAW-05 / RAW-06 — mocks

`jest.fn()` sobre `$queryRaw` en el spec de health. No ejecutan SQL. **Fuera de alcance.**

---

# 6. TRANSACTION + RAW SQL COMBINED SURFACES

**Exactamente una** `[C]`.

```
InventarioController (RequierePermiso 'inventario.ajustes')
   └─ InventarioService.registrarAjuste(empresaId ← @CurrentUser(), dto, usuarioId)
        ├─ db = prismaFactory.forEmpresa(empresaId)        ← contexto establecido
        ├─ db.lote.findUnique({ id: dto.loteId })          ← SCOPED (extensión aplica)
        └─ db.$transaction(async (tx) => {                 ← TX-07
             ├─ aplicarAjusteAtomico(tx, empresaId, …)
             │     └─ tx.$executeRaw(Prisma.sql`UPDATE "Lote" … WHERE empresaId = $`)
             │                                              ← RAW-01: FUERA de la extensión
             ├─ if (count === 0) throw BadRequestException  ← rollback
             └─ tx.movimientoStock.create({ empresaId, … }) ← SCOPED
           })
```

| Propiedad | Estado | Evidencia |
|---|---|---|
| Contexto de origen | `@CurrentUser().empresaId` (claim JWT) | `[C]` |
| Autorización | `@RequierePermiso('inventario.ajustes')` | `[C]` |
| `empresaId` manipulable por el cliente | **NO** | `[C]` |
| Mezcla scoped + raw en la misma transacción | **SÍ** | `[C]` |
| El raw lleva `empresaId` en `WHERE` | **SÍ** | `[C]` |
| Atomicidad del par raw+create | **SÍ** por la transacción | `[C]` |
| Rollback ante `count === 0` | Excepción dentro del callback → rollback | `[C]` / `[ND]` sin ejecución |
| Test que ejercite el raw | **NINGUNO** | `[C]` ausencia |

**Este es el objeto exacto que la mitad (ii) de TE-B3-006 exige y que no está implementada.**

---

# 7. BUSINESS CONTEXT ANALYSIS

## 7.1 Cómo llega `empresaId` a cada superficie

| Superficie | Origen | Server-established | Manipulable por cliente | Forzado por mecanismo |
|---|---|---|---|---|
| TX-01..07, TX-10, TX-11, TX-13, TX-14 (11) | parámetro `empresaId` ← `@CurrentUser()` (claim JWT) | **SÍ** | **NO** `[C]` | **SÍ** (en modelos de la allow-list) |
| TX-12 (tienda) | env var `TIENDA_EMPRESA_ID` | **SÍ** (config de servidor) | **NO** | **SÍ** |
| TX-08, TX-09 (batch) | `invitacion.empresaId` vía token secreto | **SÍ** (indirecto) | **NO** (el cliente envía token, no tenant) | **NO** |
| RAW-01 | parámetro `empresaId` ← `@CurrentUser()` | **SÍ** | **NO** | **NO** (explícito en `WHERE`) |
| RAW-02 | n/a | n/a | n/a | n/a |
| RAW-03, RAW-04 | iteración del script sobre empresas / global | n/a (offline) | n/a | **NO** |

## 7.2 Verificación de que el cliente no puede influir

Realizada por código, no asumida `[C]`:

| Vector | Resultado |
|---|---|
| `empresaId` en algún `*.dto.ts` | **0 coincidencias** |
| `@Param(':empresaId')` | **0 coincidencias** |
| `@Query('empresaId')` | **0 coincidencias** |
| `@Headers` | **0 usos del decorador** |
| `whitelist: true` en `ValidationPipe` | activo |
| Claim JWT | firmado; alterarlo invalida la firma |

**Conclusión:** en ninguna de las 20 superficies inventariadas el `empresaId` efectivo puede ser elegido por el cliente `[C]`.

## 7.3 La frontera estructural

```
                      ┌─ operaciones de modelo ──→ empresaScopeExtension
                      │                             ($allModels.$allOperations)
cliente Prisma ───────┤
                      └─ $executeRaw / $queryRaw ─→ NINGÚN HOOK
                                                     (responsabilidad del llamador)
```

Verificado en `empresa-scope.extension.ts:150-151` `[C]`. **No es un defecto del mecanismo: es su límite de diseño, documentado en el propio código** (`inventario.service.ts:261-265`).

---

# 8. ISO-006 COVERAGE

## 8.1 El enunciado

`ISO-006` (`07-DESIGN/INVARIANTS/DERIVED/06-BLOCK-3-TENANT-ISOLATION-INVARIANTS-v0.1.md:226`) `[D]`:

> Una transacción opera bajo exactamente un Business Context, y toda operación ejecutada dentro de ella **— incluido el SQL crudo —** queda sujeta a las mismas obligaciones de aislamiento que fuera de ella.

Clasificación propia del invariant: **STABLE para derivación · estado AS-IS NOT VERIFIED (`[ND]` por ejecución)** `[D]`.

## 8.2 Lo que TE-B3-006 cubre hoy

Leído en `b3-tenant-isolation.integration-spec.ts:302-333` `[C]`:

| Verificación | Cubre |
|---|---|
| `tx.usuario.create` con `empresaId: empresaB.id` → persiste con `empresaA.id` | forzado de `create` dentro del `tx` |
| `tx.usuario.findUnique({ id: usuarioB.id })` → `null` | validación post-query dentro del `tx` |
| Lectura posterior fuera del `tx` confirma `empresaA.id` | estado persistido |

**Cubre la primera cláusula de ISO-006** (la transacción opera bajo un contexto) **en su dimensión de cliente Prisma**.

## 8.3 Lo que NO cubre

| Elemento del enunciado | Cubierto | Evidencia |
|---|---|---|
| "una transacción opera bajo exactamente un Business Context" | **PARCIAL** — verificado con cliente scoped interactivo | `[C]` |
| **"incluido el SQL crudo"** | **NO CUBIERTO** | `[C]` ausencia — el test no ejecuta ningún raw |
| "toda operación ejecutada dentro de ella" | **PARCIAL** — 2 operaciones de 1 modelo (`Usuario`) | `[C]` |
| Transacciones batch (TX-08, TX-09) | **NO CUBIERTO** | `[C]` ausencia |
| Multi-operación dentro de una transacción | **NO CUBIERTO** — el test hace 1 create + 1 read | `[C]` |
| Comportamiento en rollback | **NO CUBIERTO** | `[C]` ausencia |

## 8.4 Matriz de cobertura por superficie

| Superficie | Cobertura ISO-006 | Clasificación |
|---|---|---|
| TX-07 + RAW-01 (tx con raw) | **NO CUBIERTA** | **candidato prioritario** |
| TX-08, TX-09 (batch, cliente crudo) | **NO CUBIERTA** | **candidato — requiere test independiente** |
| TX-01, TX-02, TX-03 (caja) | **NO CUBIERTA** directamente | candidato |
| TX-04, TX-05, TX-10, TX-14 | **NO CUBIERTA** directamente | candidato |
| TX-06 (devolución) | **PARCIAL** — hay suite propia, orientada a FK (ISO-001/002) | parcialmente cubierta |
| TX-11 (pedidos) | **NO CUBIERTA** directamente | candidato |
| TX-12 (tienda) | **PARCIAL** — `b3-producto-familia` toca nested write | parcialmente cubierta |
| TX-13 (ventas) | **PARCIAL** — tests de `VentaItem` | parcialmente cubierta |
| Patrón interactivo genérico | **CUBIERTA** por TE-B3-006 | cubierta (1 modelo) |
| RAW-02 (health) | fuera de alcance por diseño | n/a |
| RAW-03, RAW-04 (offline) | fuera de alcance por diseño | n/a |

**Recuento:** 1 cubierta (patrón genérico, alcance mínimo) · 3 parciales · **8 no cubiertas** · 3 fuera de alcance.

## 8.5 Candidatos adicionales para ISO-006

| ID propuesto | Superficie | Por qué |
|---|---|---|
| **CAND-01** | RAW-01 dentro de TX-07 | Es la mitad (ii) que la matriz canónica exige y falta. **Única superficie tx+raw del repo** |
| **CAND-02** | TX-08/TX-09 batch sin scope | Forma transaccional sin ningún test; la única que no fuerza `empresaId` |
| **CAND-03** | Multi-operación en una transacción | El enunciado dice "toda operación"; el test hace 2 |
| **CAND-04** | Comportamiento en rollback | Verificar que las filas de B quedan intactas en **commit, rollback y fallo**, como pide la matriz canónica `[D]` |
| **CAND-05** | TX-07 completa (raw + `movimientoStock.create`) | Atomicidad del par mixto scoped+raw |

## 8.6 Superficies que requieren test independiente de ISO-006

| Superficie | Invariant más apropiado |
|---|---|
| TX-08/TX-09 (pre-contexto, cliente crudo) | **ISO-008** (independencia de la vía), no ISO-006 — su problema no es el boundary transaccional sino la vía de ejecución |
| `PagoProveedor`/`DevolucionProveedor` fuera de la allow-list (TX-05, TX-06) | **ISO-003 / cobertura de modelo**, no ISO-006 |
| Ownership derivado en TX-01..03, TX-10 | **ISO-003** |
| RAW-04 (global deliberado, offline) | **ninguno** — fuera del alcance de las obligaciones Business-scoped |

**ISO-006 no debe absorber estas superficies.** Mezclarlas haría el invariant inverificable como unidad.

---

# 9. UNCOVERED TRANSACTIONAL SURFACES

| # | Superficie | Tipo de brecha | Severidad |
|---|---|---|---|
| U-01 | **RAW-01 dentro de TX-07** | Ningún test ejercita la única superficie raw de negocio | **ALTA** |
| U-02 | **TX-08, TX-09 batch** | Cero tests de la forma batch; cero tests sobre cliente crudo | **ALTA** |
| U-03 | Rollback de cualquier transacción | Ningún test verifica estado tras rollback | **ALTA** |
| U-04 | TX-01, TX-02, TX-03 (caja) | 3 transacciones, 4 modelos DERIVED, sin test | MEDIA |
| U-05 | TX-10 (pagos) | 5 modelos, 3 DERIVED, sin test | MEDIA |
| U-06 | TX-04 (recepción de compra) | 5 modelos, `tx` propagado a método privado, sin test | MEDIA |
| U-07 | TX-05 (`PagoProveedor`) | Modelo con `empresaId` **fuera de la allow-list**, sin test | **ALTA** |
| U-08 | TX-11, TX-14 | Sin test | MEDIA |
| U-09 | Multi-operación dentro de una transacción | El caso real (5 modelos) no se prueba | MEDIA |
| U-10 | `descontarStock(tx, …)` invocado desde TX-13/TX-11 | Método que recibe `tx` y opera sobre `Lote`/`MovimientoStock`, sin test propio | MEDIA |

**Todas `[C]` por ausencia** — verificadas leyendo las 4 suites de test existentes.

---

# 10. POTENTIAL ISOLATION RISKS

| ID | Riesgo | Superficie | Severidad | Estado |
|---|---|---|---|---|
| **IR-01** | El raw SQL no recibe ninguna garantía del mecanismo; su corrección depende de que cada autor futuro recuerde incluir `empresaId` en el `WHERE` | RAW-01 | **ALTA** (estructural) / BAJA (hoy) | correcto por código `[C]`, no verificado `[ND]` |
| **IR-02** | El `create` de modelos cubiertos ocurre fuera del forzado de `empresaId` en la forma batch | TX-08, TX-09 | **MEDIA** | correcto por construcción `[C]` |
| **IR-03** | `PagoProveedor` y `DevolucionProveedor` tienen `empresaId` y **no están** en la allow-list; el cast `as …UncheckedCreateInput` suprime el error de tipos que lo delataría | TX-05, TX-06 | **ALTA** (estructural) | mitigado por `getCompra` previo `[C]` |
| **IR-04** | Modelos DERIVED sin `empresaId` (`AperturaCaja`, `MovimientoCaja`, `ArqueoCaja`, `CierreCaja`, `CompraItem`, `PedidoItem`, `VentaItem`, `DevolucionProveedorItem`) operados dentro de transacciones sin filtro automático | TX-01..06, TX-10..14 | **MEDIA** | aislamiento por disciplina del call site `[C]` |
| **IR-05** | TOCTOU entre el `findUnique` informativo y el `UPDATE` atómico | TX-07 | **BAJA** | mitigado por diseño: la condición se evalúa en el `UPDATE` `[C]` |
| **IR-06** | El contexto de la tienda proviene de una env var; un valor erróneo redirige toda la tienda pública a otro tenant | TX-12 | **MEDIA** | falla explícito si falta la var `[C]`; un valor **incorrecto** no se detecta `[ND]` |
| **IR-07** | Si una refactorización mueve una operación de un modelo cubierto a la forma batch o a raw, el aislamiento se pierde sin señal | todas | **MEDIA** | ningún mecanismo lo detecta `[C]` |

---

# 11. POTENTIAL SQL RISKS

| ID | Riesgo | Superficie | Veredicto |
|---|---|---|---|
| **SR-01** | Inyección SQL | RAW-01 | **NINGUNO.** `Prisma.sql` con 4 placeholders; cero interpolación `[C]` |
| **SR-02** | Inyección SQL | RAW-02 | **NINGUNO.** `SELECT 1` literal `[C]` |
| **SR-03** | Inyección SQL | RAW-03 | **NINGUNO.** `$1` posicional con argumento separado `[C]` |
| **SR-04** | Inyección SQL | RAW-04 | **NINGUNO.** String estático sin valores `[C]` |
| **SR-05** | Uso de la variante `Unsafe` | RAW-03, RAW-04 | **ACEPTABLE.** La variante es `Unsafe` pero **ningún valor se interpola**; el código justifica la elección por limitaciones de tipado durante la migración de 2 pasos `[C]`. Riesgo real: que un autor futuro añada interpolación |
| **SR-06** | Falta de `empresaId` en el `WHERE` | RAW-04 | **INTENCIONAL Y CORRECTO.** Verificación global de migración, fuera del plano de request `[C]` |
| **SR-07** | `now()` del servidor de base vs reloj de aplicación | RAW-01 | **BAJO** — inconsistencia potencial de `updatedAt` entre el raw y las escrituras por Prisma `[C]`; sin impacto en aislamiento |
| **SR-08** | Aritmética sobre `Decimal` en SQL (`"cantidad" + ${cantidad}`) con `cantidad` numérico de JS | RAW-01 | **BAJO / `[ND]`** — el schema define `cantidad` como `Decimal`; el comportamiento de precisión al sumar un número de JS no se verificó por ejecución |

**Ningún riesgo de inyección en ninguna de las 4 superficies raw reales** `[C]`.

---

# 12. TEST CANDIDATES

**Candidatos de verificación. Ninguno escrito; ninguno ejecutado. No se crean fixtures.**

| ID | Candidato | Superficie | Invariant | Evidencia requerida |
|---|---|---|---|---|
| **TC-01** | El `UPDATE` raw bajo contexto A no afecta un `Lote` de B, aun pasando el `loteId` de B | RAW-01 / TX-07 | **ISO-006 (ii)** | **`[E]`** contra PostgreSQL real |
| **TC-02** | Tras un rollback de TX-07, las filas de A y B quedan en su estado previo | TX-07 | ISO-006 | `[E]` |
| **TC-03** | Una transacción con ≥3 operaciones sobre ≥2 modelos no alcanza filas de B en ninguna | TX-04, TX-10, TX-13 | ISO-006 | `[E]` |
| **TC-04** | La transacción batch de activación de invitación persiste el `empresaId` de la invitación y ningún otro | TX-08, TX-09 | **ISO-008** | `[T]` + `[E]` |
| **TC-05** | `PagoProveedor` creado bajo contexto A no es legible ni modificable bajo B | TX-05 | ISO-003 | `[T]` |
| **TC-06** | `DevolucionProveedor` idem | TX-06 | ISO-003 | `[T]` |
| **TC-07** | `AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja` de A no alcanzables desde B | TX-01..03, TX-10 | ISO-003 | `[T]` |
| **TC-08** | `descontarStock(tx, …)` bajo A no consume lotes de B | TX-13, TX-11 | ISO-006 | `[E]` |
| **TC-09** | El par raw+`create` de TX-07 es atómico: si el `create` falla, el `UPDATE` revierte | TX-07 | ISO-006 | `[E]` |
| **TC-10** | La extensión permanece activa sobre el `tx` para **todas** las operaciones soportadas, no solo `create`/`findUnique` | todas las interactivas | ISO-006 | `[E]` |
| **TC-11** | Un `$queryRaw` sin `empresaId` en el `WHERE` sobre un modelo scoped **devuelve** filas de otro tenant (test de caracterización del límite documentado) | n/a — caracterización | ISO-006 / documental | `[E]` |

**TC-11 es un test de caracterización**, no de conformidad: documenta el límite real del mecanismo. Se propone como candidato porque hace explícito en la suite lo que hoy solo está en un comentario.

**Prioridad:** TC-01 y TC-02 primero — cierran la mitad (ii) de TE-B3-006, que es la única brecha que el propio repositorio ya reconoce `[D]`.

---

# 13. DISCREPANCIES

**No reconciliadas silenciosamente. Se reportan las diferencias.**

## 13.1 Cantidad de `$transaction`

| Fuente | Cifra | Método declarado o inferido |
|---|---|---|
| `13-AUDIT/23-BLOCK-3-...-ASIS-AUDIT` | **11** | "9 interactivas + 2 por array" `[D]` |
| `13-AUDIT/25-...-INDEPENDENT-AUDIT` | **11** | heredada `[D]` |
| `07-DESIGN/INVARIANTS/.../06-BLOCK-3-...` | **11** (implícito) | heredada `[D]` |
| `07-DESIGN/TESTS-EVALS/.../06-BLOCK-3-TESTS-EVALS-RECONCILIATION` D-TE-06 | **18** | "conteo de líneas de `$transaction` en `apps/api/src`" `[D]` |
| **Esta auditoría** | **19 líneas / 14 call sites / 12 interactivas + 2 batch** | `grep -n` y clasificación línea por línea `[C]` |

### Descomposición de cada cifra

| Cifra | Composición | ¿Correcta? |
|---|---|---|
| **19** | 14 call sites + 3 declaraciones de tipo + 2 comentarios | **correcta** como conteo de líneas `[C]` |
| **18** | probablemente 19 menos 1 línea, o un conteo previo a `d0ba8d7` | **no reproducible hoy** `[ND]` |
| **14** | call sites reales en `src` | **correcta** `[C]` |
| **11** | **9 interactivas + 2 batch** — subcuenta las interactivas | **incorrecta hoy**: hay **12** interactivas `[C]` |
| **12 + 2** | interactivas + batch, verificadas una por una (§2.1) | **esta auditoría** `[C]` |

**D-01 — La cifra "11" subcuenta en 1 las transacciones interactivas.** Enumeradas: caja 3, compras 3, inventario 1, pagos 1, pedidos 1, tienda 1, ventas 2 = **12**. La cifra 11 aparece en tres documentos `[D]`. **No reconciliada**: no determino si el audit original omitió una o si el código cambió después `[ND]`.

**D-02 — La cifra "18" de D-TE-06 no es reproducible en `d0ba8d7`** (hoy son 19 líneas) `[C]`. El propio D-TE-06 se declara **NOT RECONCILED** `[D]`; esta auditoría aporta la enumeración que pedía, pero la diferencia 18→19 queda `[ND]`.

## 13.2 Cantidad testeada

| Métrica | Valor | Clase |
|---|---|---|
| Transacciones de producción con test que las ejercite directamente | **0 de 14** | `[C]` |
| Transacciones del directorio de test | 15 | `[C]` |
| Tests que ejercitan el **patrón** transaccional | **1** (TE-B3-006) | `[C]` |
| Tests que ejercitan raw SQL | **0** | `[C]` ausencia |
| Tests que ejercitan la forma batch | **0** | `[C]` ausencia |

**D-03 — Las 15 transacciones de los tests no ejercitan ninguna de las 14 de producción.** Los tests construyen sus propias transacciones sobre `scopedPrisma.forEmpresa(...)` y verifican el **mecanismo**, no los métodos de servicio `[C]`. Es una decisión de diseño legítima (`B3-TEST-005`: verificar la propiedad observable) `[D]`, pero significa que **ningún método de servicio transaccional está cubierto**.

## 13.3 Cantidad realmente ejecutada

**`[ND]` para todo.** No se ejecutó nada en esta auditoría. Que las 4 suites pasen, cuánto tardan, o si requieren base levantada: **no determinable** `[ND]`.

**D-04 — Existe documentación que reclama `[T][E]`.** `09-TRANSFORMATION/12-RELATION-ISOLATION-GATE-4-...` afirma: *"TE-ID-006, TE-ID-008, TE-ID-009, TE-B3-006, TE-B3-007 y la suite `tenant-isolation.integration-spec.ts` pasan tal cual. `[T][E]`"* `[D]`. **Esta auditoría no confirma ni niega esa afirmación** — no ejecutó nada. Se reporta la existencia del reclamo, no su validez.

## 13.4 Documentación vs código en el mecanismo

**D-05 — `empresa-scope.extension.ts` cambió respecto de lo que describen los audits previos.** Los audits sitúan `$allModels/$allOperations` en las líneas 107-108; hoy están en **150-151** `[C]`, y existe un módulo nuevo `relation-ownership.ts` con su spec. **El mecanismo evolucionó**; las descripciones de línea de los audits previos están desactualizadas.

## 13.5 Infraestructura de test vs documentación previa

**D-06 — `apps/api/test/` ahora existe.** Documentos previos lo registran como ausente y `test:e2e` como roto `[D]`. Hoy: el directorio existe, contiene `jest-e2e.json` (`rootDir: ".."`, `testRegex: "test/.*\\.(e2e|integration)-spec\\.ts$"`), hay 4 suites de integración, y se añadió el script `test:integration` `[C]`. **La brecha de infraestructura descrita en los documentos de readiness está cerrada en esta branch.**

---

# 14. ND / UNKNOWN

| ID | Ítem | Por qué `[ND]` |
|---|---|---|
| ND-01 | Si las 4 suites de integración pasan | No se ejecutó nada |
| ND-02 | Si la extensión permanece activa sobre el `tx` **en ejecución** | Evidencia de tipos `[C]` y documental `[D]`; **sin ejecución**. TE-B3-006 lo afirma, pero que el test pase es `[ND]` |
| ND-03 | Comportamiento real de rollback en cualquier transacción | Ningún test lo verifica; nada se ejecutó |
| ND-04 | Si el `UPDATE` raw afectaría una fila de otro tenant al pasar su `loteId` | El `WHERE` lo impide por lectura `[C]`; **no verificado por ejecución** |
| ND-05 | Origen de la discrepancia 11 vs 12 interactivas | No determino si fue error de conteo o cambio de código |
| ND-06 | Origen de la cifra 18 de D-TE-06 | No reproducible en `d0ba8d7` |
| ND-07 | Validez del reclamo `[T][E]` del Gate 4 | No se ejecutó nada |
| ND-08 | Precisión de `"cantidad" + ${cantidad}` entre `Decimal` de PostgreSQL y número de JS | Requiere ejecución |
| ND-09 | Si existe base de datos de test separada de la de desarrollo | No se inspeccionó el contenido de `.env` |
| ND-10 | Si `TIENDA_EMPRESA_ID` apunta a una Empresa existente en algún entorno | Requiere datos de entorno |
| ND-11 | Nivel de aislamiento transaccional efectivo (Read Committed por defecto de PostgreSQL vs lo que el código asume) | Ningún `isolationLevel` explícito en los 14 call sites `[C]`; el efecto real requiere ejecución |
| ND-12 | Comportamiento de las 2 transacciones batch ante fallo parcial | Requiere ejecución |

**ND-11 merece nota:** ninguna de las 14 transacciones especifica `isolationLevel` `[C]`. `ventas.service.ts:155-157` comenta que el número correlativo se obtiene *"con bloqueo implícito de la fila en la transacción serializable de Postgres"*, pero **no se configura `Serializable` en ninguna parte** — el default de PostgreSQL es Read Committed. **Posible divergencia entre el comentario y el comportamiento real**; no determinable sin ejecución.

---

# 15. RECOMMENDED VERIFICATION ORDER

Orden de **verificación**, no de corrección. Nada de lo siguiente se ejecuta en esta auditoría.

| # | Verificación | Cierra | Por qué en esta posición |
|---|---|---|---|
| **1** | **TC-01** — raw SQL bajo contexto A contra `loteId` de B | **ISO-006 (ii)**, U-01, ND-04 | Única brecha que el propio repositorio ya reconoce como `[ND] NOT VERIFIED` `[D]`. Única superficie tx+raw. Máximo valor por unidad de esfuerzo |
| **2** | **TC-02 / TC-09** — rollback y atomicidad de TX-07 | U-03, ND-03, ND-12 | Reutiliza el montaje de (1). La matriz canónica exige evidencia en commit, rollback **y** fallo `[D]` |
| **3** | **TC-10** — la extensión cubre todas las operaciones soportadas dentro del `tx`, no solo 2 | ND-02 | Cierra el `[ND]` de mecanismo que ISO-006 arrastra desde su derivación |
| **4** | **TC-04** — forma batch de `invitaciones` | U-02, ISO-008 | Única forma transaccional sin ningún test; la única que no fuerza `empresaId` |
| **5** | **TC-05 / TC-06** — `PagoProveedor`, `DevolucionProveedor` | U-07, IR-03 | Modelos con `empresaId` fuera de la allow-list; el cast suprime la señal de tipos |
| **6** | **TC-03** — transacción multi-operación real | U-09 | El enunciado de ISO-006 dice "toda operación" |
| **7** | **TC-07** — modelos DERIVED de caja | U-04, U-05, IR-04 | 4 modelos sin `empresaId` en 4 transacciones |
| **8** | **TC-08** — `descontarStock(tx, …)` | U-10 | Método que recibe `tx` y opera sobre 2 modelos |
| **9** | **Enumeración de la discrepancia** 11/18/19 | D-01, D-02, ND-05, ND-06 | Documental; §2.1 ya aporta la enumeración |
| **10** | **TC-11** — caracterización del límite del raw | documental | Hace explícito en la suite lo que hoy vive en un comentario |
| **11** | **Verificación de ND-11** — nivel de aislamiento real vs el comentario de `ventas.service.ts:155` | ND-11 | Posible divergencia comentario↔comportamiento |

---

# 16. DECLARACIÓN DE CUMPLIMIENTO

| Regla | Cumplimiento |
|---|---|
| NO modificar código | **Cumplido** — `git diff` vacío |
| NO modificar tests | **Cumplido** |
| NO modificar documentación | **Cumplido** — ningún archivo existente alterado |
| NO modificar schema | **Cumplido** |
| NO crear commits | **Cumplido** |
| NO hacer push | **Cumplido** |
| NO hacer merge | **Cumplido** |
| NO ejecutar migraciones | **Cumplido** |
| NO modificar datos | **Cumplido** |
| NO crear fixtures permanentes | **Cumplido** |
| NO corregir problemas | **Cumplido** — §15 recomienda verificaciones, no correcciones |
| **NO declarar ningún Gate VERIFIED** | **Cumplido** — cero `[T]`, cero `[E]` emitidos |
| **NO cerrar ISO-006** | **Cumplido** — §8 lo reporta como parcialmente cubierto |
| **NO declarar B3 VERIFIED** | **Cumplido** |

**Alcance inspeccionado:** `apps/api/src/**`, `apps/api/test/**`, `apps/api/prisma/**`, `docs/WAPSELL-DOCUMENTATION/**`.

**Términos buscados:** `$transaction`, `$executeRaw`, `$queryRaw`, `$executeRawUnsafe`, `$queryRawUnsafe`, `Prisma.sql`, `Prisma.raw`, `Prisma.join`, `Prisma.empty`, `TransactionClient`, `ITXClient`, `EmpresaScopedTx`, `prisma.$transaction`, `db.$transaction`, `tx.$transaction`, `client.$transaction`, `tx.`, `$allOperations`, `$allModels`.

---

**INVENTARIO COMPLETO — NO CANÓNICO — NO APROBADO.**

Este documento termina en el inventario y las recomendaciones de verificación. No arregla nada, no registra nada en la capa canónica, no cierra ISO-006 y no declara B3 verificado.
