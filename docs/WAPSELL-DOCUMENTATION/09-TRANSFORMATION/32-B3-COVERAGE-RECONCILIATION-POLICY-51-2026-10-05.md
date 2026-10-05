# B3 — COVERAGE RECONCILIATION AGAINST POLICY 51
## AUDITORÍA DE COBERTURA — READ-ONLY

**Estado:** RECONCILIACIÓN DE COBERTURA — READ-ONLY — NO CANÓNICO
**Fecha:** 2026-10-05
**Repo:** `fmonfasani/otrarondamas` · **Branch:** `chore/build-in-ci` · **Commit:** `9f7abb8` (`docs(b3): close Producto.tipo relation isolation slice`)
**Política canónica:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`

**Acción:** sin implementar código, sin cambiar registry, tests, política 51, architecture/contracts/invariants. **Sin crear ningún implementation slice.** Sin commits ni push.

**Evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable.

> **Reinspección completa.** No reutilicé conteos anteriores: re-derivé el universo del schema y releí el registry en HEAD. Donde un conteo previo quedó desactualizado, lo digo (§8).
>
> **No ejecuté tests ni verifiqué runs en esta auditoría.** Todo `[E]` es **citado** con su fuente.

---

# A. GLOBAL COVERAGE VERDICT

## A.1 Veredicto

**B3 GLOBAL: NOT VERIFIED.**

No cambia respecto del estado declarado. Fundamento según §51.9: la cobertura relacional se considera completa solo cuando *cada* relación del universo está en uno de dos estados documentados — registrada con `[T]`+`[E]`, o no registrada con **análisis específico por relación**. Hoy:

| Condición §51.9 | Estado |
|---|---|
| (a) registradas con `[T]`+`[E]` | **13** de 75 |
| (b) no registradas con análisis **individual** documentado | **5** de 62 |
| ninguna en "sin análisis" | **NO CUMPLIDO — 57 relaciones** |

**Cobertura del registry: 13 de 75 (17,3%).** Relaciones con análisis individual suficiente (registradas o excluidas): **18 de 75 (24%)**.

## A.2 Estado re-verificado del registry `[C]`

`apps/api/src/prisma/relation-ownership.ts:21-29` en HEAD `9f7abb8`:

```
VentaItem:               ['producto', 'reglaFidelizacion']
PedidoItem:              ['producto', 'reglaFidelizacion']
CompraItem:              ['producto']
DevolucionProveedorItem: ['producto', 'lote']
Producto:                ['familia', 'subfamilia', 'tipo']     ← 3 de 4 ramas
ProductoProveedor:       ['producto', 'proveedor']
Lote:                    ['producto']
```

**8 modelos → corrección: 7 modelos, 13 relaciones.** El universo sigue siendo **75**, re-derivado del schema: 108 relaciones con FK en el origen = 28 → `Empresa` + **75** → modelo con `empresaId` + 5 → modelo sin `empresaId`. Cero FK compuestas `[C]`.

## A.3 El hallazgo que condiciona el próximo slice

**El árbol de catálogo está protegido en 3 de 4 ramas.** `Producto.subtipo` es la única rama sin registrar, y el gap **no es teórico**: está **probado por ejecución** `[E]` citado.

---

# B. MATRIZ — LAS 75 RELACIONES

E-1, E-3 y E-4 computados del schema y del código. **E-2 no es computable** (§51.6.3 exige análisis por relación); se marca `sí` cuando el análisis individual demostró que **no** hay garantía equivalente, `no` cuando se demostró que sí, y **`[ND]`** cuando falta el análisis.

## B.1 REGISTRY_REQUIRED — registradas (13)

| Relación (fk) | E-1 | E-2 | E-3 | E-4 | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| VentaItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 12 (17/17) | **VERIFIED WITH LIMITATIONS** |
| VentaItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 18 Gate 6.3 | **VERIFIED WITH LIMITATIONS** |
| PedidoItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 14 run `37217710481` | **VERIFIED WITH LIMITATIONS** |
| PedidoItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 16 Gate 6.2 | **VERIFIED WITH LIMITATIONS** |
| CompraItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0 (doc 27) | **VERIFIED WITH LIMITATIONS** |
| DevolucionProveedorItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0 | **VERIFIED WITH LIMITATIONS** |
| DevolucionProveedorItem.lote → Lote | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0 | **VERIFIED WITH LIMITATIONS** |
| **Producto.familia → Familia** | sí | sí | sí | sí | REGISTRY_REQUIRED | **`[E]` run #21 `37249813759`, 113/0** | **VERIFIED WITH LIMITATIONS** |
| **Producto.subfamilia → Subfamilia** | sí | **sí** | sí | sí | REGISTRY_REQUIRED | **`[E]` run #21, 113/0; baseline 6 fallos/2 pass** | **VERIFIED WITH LIMITATIONS** |
| **Producto.tipo → Tipo** | sí | **sí** | sí | sí | REGISTRY_REQUIRED | **`[E]` run #21, job `111574995363`, 113/0** | **VERIFIED WITH LIMITATIONS** |
| ProductoProveedor.producto → Producto | **no** | sí | sí | **no** | REGISTRY_REQUIRED (reserva) | `[E]` doc 30, 89/0 | **CLOSED con reserva** — sin write path `[C]` |
| ProductoProveedor.proveedor → Proveedor | **no** | sí | sí | **no** | REGISTRY_REQUIRED (reserva) | `[E]` doc 30 | **CLOSED con reserva** |
| Lote.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` LP-01..08, 97/0 | **VERIFIED WITH LIMITATIONS** |

## B.2 REGISTRY_REQUIRED — pendientes (2)

| Relación (fk) | E-1 | E-2 | E-3 | E-4 | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| **Producto.subtipo → Subtipo** (`subtipoId`) | **sí** | **sí** | **sí** | **sí** | **REGISTRY_REQUIRED** | **`[E]` GAP CONFIRMED** (docs 31, 32) | **ABIERTO — candidato #1** |
| **MovimientoStock.producto → Producto** (`productoId`) | **sí** | **sí** | **sí** | **sí** | **REGISTRY_REQUIRED** | ninguna | **ABIERTO — candidato #2** |

## B.3 TRANSACTION_MECHANISM_REQUIRED — E-4 falla (4)

| Relación (fk) | E-1 | E-2 | E-3 | **E-4** | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| **MovimientoStock.lote → Lote** (`loteId`) | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]` + `[E]` CE-1 | **BLOCKED** |
| MovimientoStock.recepcionCompra → RecepcionCompra | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]` | **BLOCKED** |
| AuditLog.venta → Venta | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]` | **BLOCKED** |
| AplicacionPago.pago → Pago | no | `[ND]` | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[ND]` | **BLOCKED** |

## B.4 DOMAIN_CONTROL_REQUIRED — E-2 `[ND]` (16)

Cumplen E-1, E-3, E-4. **Ninguna tiene análisis individual que demuestre E-2.** La validación citada es candidata, no demostrada equivalente (§51.6.3).

| Relación | Validación candidata | Ev. | E-2 | Estado |
|---|---|---|---|---|
| ReglaFidelizacion.familia → Familia | `verificarNivelesCatalogo` | `[C]` ver §D.3 | **`[ND]`** | sin análisis individual |
| ReglaFidelizacion.subfamilia → Subfamilia | ídem | `[C]` | `[ND]` | ídem |
| ReglaFidelizacion.tipo → Tipo | ídem | `[C]` | `[ND]` | ídem |
| ReglaFidelizacion.subtipo → Subtipo | ídem | `[C]` | `[ND]` | ídem |
| Compra.proveedor → Proveedor | `db.proveedor.findUnique` scoped (`:102`) | `[C]` | `[ND]` | ídem |
| Venta.cliente → Cliente | `clientesService.obtener(empresaId)` | `[D]` | `[ND]` | ídem |
| Pedido.cliente → Cliente | origen del `clienteId` | `[ND]` | `[ND]` | ídem |
| DevolucionProveedor.compra → Compra | `getCompra(empresaId)` | `[C]` | `[ND]` | ídem |
| DevolucionProveedor.proveedor → Proveedor | `compra.proveedorId` | `[C]` | `[ND]` | ídem |
| PagoProveedor.compra → Compra | `getCompra(empresaId)` | `[C]` | `[ND]` | ídem |
| PagoProveedor.proveedor → Proveedor | `compra.proveedorId` | `[C]` | `[ND]` | ídem |
| RecepcionCompra.compra → Compra | `getCompra(empresaId)` | `[C]` | `[ND]` | ídem |
| AperturaCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | `[ND]` | ídem |
| ArqueoCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | `[ND]` | ídem |
| MovimientoCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | `[ND]` | ídem |
| ArqueoCaja.usuarioEntrante → Usuario | lectura scoped (`caja.service.ts:132`) | `[C]` | `[ND]` | ídem |

## B.5 DERIVED_OWNERSHIP (22)

| Subgrupo | Cant. | E-1 | Clasificación | Estado |
|---|---|---|---|---|
| → `Usuario`/`Autorizacion` desde contexto autenticado | 15 | sí, sin vector del cliente | DERIVED_OWNERSHIP | sin análisis individual |
| → registro resuelto por lectura previa (`Pago.venta`, `Pago.pedido`, `AuditLog.autorizacion`) | 3 | sí, sin vector | DERIVED_OWNERSHIP | sin análisis individual |
| **FK del padre en nested create** (`VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra`, `DevolucionProveedorItem.devolucion`) | **4** | **NO** | DERIVED_OWNERSHIP | **analizado** `[E]` CE-2: registrarlas sería **cobertura ilusoria** |

## B.6 AMBIGUOUS (3)

| Relación | Motivo | Estado |
|---|---|---|
| Legajo.usuario → Usuario | `Legajo` sin `empresaId`; dos FK opcionales y únicas | **BLOCKED** — `03-DECISIONS/49` |
| Legajo.cliente → Cliente | ídem | **BLOCKED** |
| Pago.deuda → CuentaCorriente | campo `deuda`, destino `CuentaCorriente` (`schema.prisma:783-784`) | **BLOCKED** — semántica `[ND]` |

## B.7 NO_CURRENT_WRITE_SURFACE — E-1 falso hoy (15)

`AplicacionPago.deuda` · `CuentaCorriente.cliente` · `Deuda.cliente` · `Deuda.cuentaCorriente` · `Deuda.venta` · `Entrega.pedido` · `Entrega.preparador` · `Entrega.repartidor` · `Notificacion.pedido` · `Presentacion.producto` · **`Subfamilia.familia`** · **`Tipo.subfamilia`** · **`Subtipo.tipo`** · `UsuarioPermiso.usuario` · `Invitacion.invitadoPor`

**Estado: MONITOR.** Las tres de la jerarquía se analizan en §D.4.

## B.8 Resumen de la matriz

| Clasificación | Cant. | Registradas | Con análisis individual | Sin análisis |
|---|---|---|---|---|
| REGISTRY_REQUIRED | 15 | 13 | 15 | 0 |
| TRANSACTION_MECHANISM_REQUIRED | 4 | 0 | 3 | 1 |
| DOMAIN_CONTROL_REQUIRED | 16 | 0 | 0 | **16** |
| DERIVED_OWNERSHIP | 22 | 0 | 4 | **18** |
| AMBIGUOUS | 3 | 0 | 3 | 0 |
| NO_CURRENT_WRITE_SURFACE | 15 | 0 | 3 (§D.4) | **12** |
| **Total** | **75** | **13** | **28** | **47** |

*Nota: el conteo de §A.1 (18 con análisis suficiente) usa un estándar más estricto — análisis que satisfaga §51.9.b con evidencia, no solo clasificación razonada. Los 28 de esta tabla incluyen análisis parciales.*

---

# C. ESTADO ESPECÍFICO: FAMILIA, SUBFAMILIA, TIPO

Las tres están registradas y verificadas con limitaciones `[E]`.

| | Producto.familia | Producto.subfamilia | Producto.tipo |
|---|---|---|---|
| Registry | **sí** | **sí** | **sí** |
| E-1 | sí — `create` (:125) y `update` (:153) con FK del DTO | sí | sí |
| E-2 | **sí** — `verificarJerarquia` protege la ruta, no la capacidad | **sí** `[E]` | **sí** `[E]` |
| E-3 | sí — FK simple, `Familia` con `empresaId` | sí | sí |
| E-4 | sí — destino preexistente, no creado en la misma tx | sí | sí |
| Evidencia | `[E]` run #21 `37249813759` | **`[E]` run #21, baseline 6 fallos/2 pass** | **`[E]` run #21, job `111574995363`** |
| Tests | 113, 0 fallos; build incluido y successful | ídem | ídem |
| Estado | **VERIFIED WITH LIMITATIONS** | **VERIFIED WITH LIMITATIONS** | **VERIFIED WITH LIMITATIONS** |

**Limitaciones comunes, citadas de los cierres `[D]`:**

1. La integridad `Subtipo→Tipo→Subfamilia→Familia` depende de relaciones **no registradas** (`Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia`); no evaluadas (doc 31 §67).
2. **`Producto.subtipo` queda sin registrar y su gap es explotable** (doc 31 §70, doc 32 L-01).
3. TOCTOU del preflight: `[ND]`, común a todo el registry.
4. No cubierto `[E]`: forma anidada, `connect`, `upsert`, `updateMany`, raw SQL.

**Por qué "WITH LIMITATIONS" y no VERIFIED pleno:** cada slice verificó su propia rama; el árbol como estructura no está verificado, y una de sus cuatro ramas tiene gap probado.

---

# D. PRODUCTO → SUBTIPO — ANÁLISIS INDIVIDUAL

**No asumo que sea el siguiente slice por similitud.** Lo analizo desde el schema y el código.

## D.1 Write paths encontrados `[C]`

Barrido exhaustivo de `subtipoId` en `src/` (excluyendo specs) y de operaciones de escritura sobre `Producto`:

| # | Sitio | Operación | Origen del `subtipoId` | Cliente |
|---|---|---|---|---|
| 1 | `catalogo.controller.ts:116` → `:125` | `db.producto.create({ data })` | **`dto.subtipoId`** — DTO, obligatorio (`create-producto.dto.ts:49`) | scoped |
| 2 | `catalogo.controller.ts:149` → `:153` | `db.producto.update({ where:{id}, data })` | **`dto.subtipoId ?? existente.subtipoId`** — DTO, opcional | scoped |

**Son los únicos dos.** No hay `createMany`, `updateMany`, `upsert`, nested write ni raw SQL que escriba `Producto.subtipoId` `[C]`. Los otros usos de `subtipoId` son **lecturas** o copias desde un `producto` ya leído (`inventario.service.ts:113`, `tienda.service.ts:114, 200`, `ventas.service.ts:86`, `fidelizacion.service.ts:175`) — no escriben `Producto`.

**Ninguno está dentro de `$transaction`** `[C]`. El destino `Subtipo` **siempre es preexistente**: no existe ningún `subtipo.create` en la aplicación (§D.4).

## D.2 Control de dominio existente: qué cubre y qué no

`verificarJerarquia` (`catalogo.controller.ts:163-183`) `[C]`:

```
db.subtipo.findUnique({ where: {id: ids.subtipoId},
                        include: {tipo: {include: {subfamilia: true}}} })
  → si no existe            → 404
  → si subtipo.tipoId        ≠ ids.tipoId        → 404
  → si tipo.subfamiliaId     ≠ ids.subfamiliaId  → 404
  → si subfamilia.familiaId  ≠ ids.familiaId     → 404
```

**Qué cubre:**
- **Coherencia jerárquica**: que los 4 niveles encadenen entre sí. Esto **no es ownership de tenant** — es integridad de dominio.
- **Tenant del `subtipoId`, indirectamente**: `db.subtipo.findUnique` usa el cliente **scoped**, y `Subtipo` **está** en `MODELOS_CON_EMPRESA_ID` `[C]`, así que el post-check de la extensión (`:186-207`) devuelve `null` si el `Subtipo` es de otra empresa → el método lanza 404. **En la ruta del controller, un `subtipoId` ajeno ya es rechazado.**
- Se invoca en **ambos** write paths: antes del `create` (`:95-100`) y antes del `update` cuando el body trae algún nivel (`:144-150`).

**Qué NO cubre:**
- **La capacidad, solo la ruta.** Vive en un controller. Cualquier escritura sobre `Producto` desde otro servicio, o una invocación directa del cliente scoped, la evita por completo.
- **El `update` parcial sin niveles**: si el body **no** trae ninguno de los 4 (`if (dto.familiaId || dto.subfamiliaId || dto.tipoId || dto.subtipoId)`, `:144`), `verificarJerarquia` **no se ejecuta**. No es un gap de `subtipoId` (si no viene, no se cambia), pero confirma que la validación es condicional.
- **Las formas no interceptadas**: `connect`, `upsert`, nested, `createMany`.

## D.3 Gap: confirmado por ejecución

**No es inferencia.** Los informes de red team 31 y 32 lo probaron `[E]` citado:

> `ACCEPTED -> producto(A) with subfamilia/tipo/subtipo of B  *** GAP CONFIRMED ***`
> *"invocando el cliente scoped directamente, un `producto.create` con `subfamiliaId`/`tipoId`/`subtipoId` de B **es aceptado**"* `[E]` (doc 31 §137)

Tras los slices de `subfamilia` y `tipo`, el doc 32 L-01 actualiza el estado `[C]`+`[E]`:

> *"`Producto.tipo` y `Producto.subtipo` **no están registradas**; el GAP cross-Business sobre ellas sigue siendo explotable por el cliente scoped. La protección es ahora 2 de 4 ramas."*

Con `tipo` ya registrado en `bcaeadc`, **`subtipo` es la única rama con gap probado y abierto**.

**Conclusión de E-2:** la validación de dominio **no es garantía equivalente** bajo §51.6.3 — no cubre los write paths de la capa de persistencia accesibles desde el cliente scoped. **E-2 se cumple** (no existe garantía equivalente ya establecida).

## D.4 Las tres relaciones inter-nivel de la jerarquía

`Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia` — reconciliadas aquí porque el encargo las pide y porque son la limitación #1 de los slices cerrados.

**Hallazgo `[C]`:** `jerarquia-catalogo.controller.ts` es **solo lectura** — cuatro `findMany` (`:32-35`) y ninguna operación de escritura. Búsqueda exhaustiva de `(db|tx).(subtipo|tipo|subfamilia).(create|update|createMany|updateMany|upsert)(` en todo `src/` → **cero coincidencias**.

| Relación | E-1 | Clasificación | Motivo |
|---|---|---|---|
| Subtipo.tipo → Tipo | **no** | **NO_CURRENT_WRITE_SURFACE** | sin write path de aplicación; los 4 niveles se crean por `seed.ts` y por el script de migración, con `PrismaClient` propio fuera del plano de request |
| Tipo.subfamilia → Subfamilia | **no** | **NO_CURRENT_WRITE_SURFACE** | ídem |
| Subfamilia.familia → Familia | **no** | **NO_CURRENT_WRITE_SURFACE** | ídem |

**E-1 no se cumple: no hay superficie de escritura de aplicación desde la que introducir una referencia cross-Business.** No son candidatas al registry hoy (§51.4). La limitación #1 de los slices cerrados es **real como integridad estructural**, pero **no es un gap de persistencia alcanzable**: la coherencia la garantiza `verificarJerarquia` en la ruta del controller, y los árboles los crea el seed por empresa.

**Estado: MONITOR con análisis individual completo** — cumplen §51.9.b. **Next action: ninguna** hasta que aparezca un CRUD de jerarquía.

## D.5 Clasificación recomendada y veredicto de slice

| Campo | Valor |
|---|---|
| **Clasificación** | **REGISTRY_REQUIRED** |
| E-1 | **sí** — 2 write paths con FK del DTO (`create` y `update`), ambos interceptables |
| E-2 | **sí** — `verificarJerarquia` protege la ruta, no la capacidad; gap **probado** `[E]` |
| E-3 | **sí** — FK simple `subtipoId`; `Subtipo` con `empresaId` y en la allow-list |
| E-4 | **sí** — destino **siempre preexistente** (no hay `subtipo.create` en la app); ningún write path en `$transaction`; cero `connect`/`upsert`/nested sobre esta relación |
| **¿Requiere candidate slice?** | **SÍ** |

**Las cuatro condiciones de §51.4 se cumplen con evidencia.** No por similitud con las otras tres ramas, sino por análisis propio: dos write paths identificados con ubicación exacta, gap probado por ejecución, y compatibilidad E-4 verificada en los dos paths conocidos.

---

# E. MOVIMIENTOSTOCK

## E.1 MovimientoStock.producto → Producto

**Write paths `[C]`** — cuatro, todos `create`, todos dentro de `$transaction`:

| # | Sitio | Origen del `productoId` |
|---|---|---|
| 1 | `compras.service.ts:228-236` (`recibirCompra`) | `item.productoId` de `compra.items` vía `getCompra(empresaId,…)` |
| 2 | `compras.service.ts:374-384` (`crearDevolucion`) | **`item.productoId` del DTO, sin validar** |
| 3 | `inventario.service.ts:238-246` (`aplicarAjuste`) | `lote.productoId` de lectura scoped |
| 4 | `inventario.service.ts:337-345` (`descontarStock`) | `productoId` parámetro |

| Criterio | Valor | Fundamento |
|---|---|---|
| E-1 | **sí** | el sitio 2 persiste un `productoId` del DTO sin verificación `[C]` |
| E-2 | **sí** | no hay validación compensatoria en el sitio 2; los otros tres derivan de lecturas scoped pero eso no cubre el sitio 2 |
| E-3 | **sí** | FK simple; `Producto` con `empresaId` |
| E-4 | **sí** | **el `Producto` es preexistente en los cuatro sitios** — ninguno lo crea en la misma tx `[C]` |
| **Clasificación** | **REGISTRY_REQUIRED** | cumple E-1..E-4 |
| Estado | **ABIERTO — candidato #2** | |

**Advertencia de alcance:** afecta tres flujos (recepción de compra, ajuste de inventario, devolución a proveedor). §51.8.4 exige demostrar que los tres write paths legítimos no se rompen.

## E.2 MovimientoStock.lote → Lote

| Criterio | Valor | Fundamento |
|---|---|---|
| E-1 | sí | `loteId` del DTO en `crearDevolucion` (`:374-384`) |
| E-2 | sí | sin validación compensatoria |
| E-3 | sí | FK simple; `Lote` con `empresaId` |
| **E-4** | **NO** | **el `Lote` se crea dentro de la misma transacción** |
| **Clasificación** | **TRANSACTION_MECHANISM_REQUIRED** | |
| Estado | **BLOCKED** | |

**Motivo, re-verificado por mí `[C]`:**

- `recibirCompra` crea el `Lote` en la transacción: `const lote = await tx.lote.create({ data: dataLote })` (`compras.service.ts:226`);
- y acto seguido lo referencia: `loteId: lote.id` (`:228-232`);
- el preflight usa el **cliente base**, no `tx`: `verificarOwnershipRelacional(client, empresaId, referencias)` (`empresa-scope.extension.ts:156`).

El red team lo probó por ejecución `[E]` citado (CE-1): *"outer-client findUnique → NOT VISIBLE"*. Registrarla haría que el preflight no encuentre un `Lote` recién creado y **rechace una operación válida con P2025**, rompiendo `recibirCompra`.

**§51.6.1 es taxativo:** *"El hecho de que otro write path de la misma relación apunte a destinos ya confirmados no basta: E-4 exige compatibilidad con todos los write paths conocidos."*

**No debe registrarse** hasta resolver el mecanismo (preflight con `tx`, verificación posterior, o por construcción). **No queda excluida para siempre** (§51.5).

**Asimetría a conservar presente:** `DevolucionProveedorItem.lote` **sí** está registrada y funciona, porque allí el `Lote` llega del DTO y es preexistente. Mismo destino, resultado opuesto **según la ruta**. El registry es por relación, no por ruta — limitación estructural del mecanismo `[C]`.

---

# F. RELACIONES SIN ANÁLISIS INDIVIDUAL SUFICIENTE (47)

Según §51.9.b, cada una necesita análisis documentado que indique su clase y por qué E-1/E-2 no se cumplen. Tienen clasificación de familia, **no** análisis individual.

## F.1 DOMAIN_CONTROL_REQUIRED (16) — prioridad alta

Cumplen E-1/E-3/E-4; su E-2 es `[ND]`. Son las que podrían resultar REGISTRY_REQUIRED tras el análisis, como pasó con las tres ramas del catálogo.

**Catálogo/fidelización (4):** `ReglaFidelizacion.{familia, subfamilia, tipo, subtipo}` — `verificarNivelesCatalogo` (`fidelizacion.service.ts:102-120`) usa `db.subtipo.findUnique` scoped, mismo patrón que `verificarJerarquia`; **probablemente el mismo gap de capacidad** `[C]` por analogía estructural, **no verificado** `[ND]`.

**Compras (5):** `Compra.proveedor` · `DevolucionProveedor.{compra, proveedor}` · `PagoProveedor.{compra, proveedor}` · `RecepcionCompra.compra`

**Comercio (2):** `Venta.cliente` · `Pedido.cliente` (origen del `clienteId` `[ND]`)

**Caja (4):** `AperturaCaja.caja` · `ArqueoCaja.caja` · `MovimientoCaja.caja` · `ArqueoCaja.usuarioEntrante`

## F.2 DERIVED_OWNERSHIP (18) — prioridad media

§51.6.2 advierte que ser derivado por servidor **reduce** el riesgo pero **no lo demuestra nulo**. Falta el análisis de (a) de dónde sale el valor, (b) si esa fuente está verificada, (c) si puede existir otro write path.

15 relaciones → `Usuario`/`Autorizacion` desde contexto · 3 → registro resuelto por lectura previa (`Pago.venta`, `Pago.pedido`, `AuditLog.autorizacion`).

*(Las 4 de FK de padre nested **sí** tienen análisis: `[E]` CE-2, cobertura ilusoria.)*

## F.3 NO_CURRENT_WRITE_SURFACE (12) — prioridad baja

`AplicacionPago.deuda` · `CuentaCorriente.cliente` · `Deuda.{cliente, cuentaCorriente, venta}` · `Entrega.{pedido, preparador, repartidor}` · `Notificacion.pedido` · `Presentacion.producto` · `UsuarioPermiso.usuario` · `Invitacion.invitadoPor`

**"Sin detección" no es "segura"** — es ausencia de hallazgo. El dominio financiero (`Deuda`, `AplicacionPago`, `CuentaCorriente`) merece caracterización antes de su primer write path.

*(`Subfamilia.familia`, `Tipo.subfamilia`, `Subtipo.tipo` **sí** tienen análisis individual: §D.4.)*

## F.4 TRANSACTION_MECHANISM_REQUIRED (1)

`AplicacionPago.pago` — `[ND]`: no se verificó si referencia un `Pago` de la misma transacción.

---

# G. PRÓXIMO SLICE RECOMENDADO

## **`Producto.subtipo → Subtipo`**

### Justificación estricta según Policy 51

| Condición §51.4 | Cumplimiento | Evidencia |
|---|---|---|
| **E-1** — puede introducir referencia cross-Business desde superficie de escritura | **SÍ** | 2 write paths con FK del DTO: `catalogo.controller.ts:116→125` (`create`) y `:149→153` (`update`) `[C]` |
| **E-2** — no existe garantía equivalente establecida | **SÍ** | `verificarJerarquia` protege la ruta, no la capacidad. **Gap probado por ejecución**: `ACCEPTED -> producto(A) with subtipo of B` `[E]` docs 31/32 |
| **E-3** — FK simple, destino con `empresaId` | **SÍ** | `subtipoId` una columna; `Subtipo` en `MODELOS_CON_EMPRESA_ID` `[C]` |
| **E-4** — compatible con **todos** los write paths conocidos | **SÍ** | ambos paths escriben un `Subtipo` **preexistente**; **no existe `subtipo.create` en la aplicación**; ninguno en `$transaction`; cero `connect`/`upsert`/nested/`createMany`/raw sobre esta relación `[C]` |

**Condición de admisión §51.7:** se cumple — análisis específico documentado (este §D) antes del cambio de código.

### Por qué es preferible a `MovimientoStock.producto`

Ambos cumplen E-1..E-4. La diferencia es de riesgo y de alcance, no de elegibilidad:

| | Producto.subtipo | MovimientoStock.producto |
|---|---|---|
| Write paths | **2**, mismo controller | **4**, tres servicios distintos |
| Gap probado `[E]` | **sí** | no — solo `[C]` |
| Flujos afectados si falla cerrado | 1 (catálogo) | **3** (recepción, ajuste, devolución) |
| Destino creado en la misma tx | nunca | nunca |
| Cierra una estructura incompleta | **sí** — 4/4 ramas del catálogo | no |
| Patrón de slice ya ejecutado 3 veces | **sí** — `familia`, `subfamilia`, `tipo` | no |

**`Producto.subtipo` es el slice con mayor evidencia, menor superficie de rotura y el único que cierra una asimetría probada.** `MovimientoStock.producto` es el candidato #2 y requiere los positivos de sus tres flujos antes de registrar (§51.8.4).

### Evidencia que el slice debería producir (§51.8)

1. `[C]` entrada en el registry + los 2 write paths con archivo y línea.
2. `[T]` candidato aislado: create mismo-Business (positivo), create cross-Business (rechazo sin persistencia), update cross-Business, forma transaccional, ausencia de persistencia parcial, destino inexistente.
3. `[E]` ejecutar **primero sin el cambio** (para demostrar el gap ya probado en docs 31/32) y luego con él, en CI con las suites de regresión.
4. Demostrar que los 2 write paths legítimos no se rompen.

**Un slice verificado no equivale a B3 globalmente verificado** (§51.8).

---

# H. QUÉ NO DEBE TOCARSE TODAVÍA

| # | Ítem | Motivo |
|---|---|---|
| 1 | **`MovimientoStock.lote`** | **E-4 falla.** Registrarla rompe `recibirCompra` con falso rechazo `[E]`. Requiere decisión de mecanismo primero |
| 2 | `MovimientoStock.recepcionCompra` · `AuditLog.venta` · `AplicacionPago.pago` | misma causa: destino creado en la misma transacción |
| 3 | **El mecanismo del preflight** (`client` → `tx`) | cambio estructural; afecta las 13 relaciones registradas. Requiere su propia autorización, no un slice de registro |
| 4 | **`Subtipo.tipo` · `Tipo.subfamilia` · `Subfamilia.familia`** | **E-1 no se cumple**: sin write path de aplicación (§D.4). Registrarlas sería cobertura sin superficie |
| 5 | **Los 4 FK de padre nested** | registrarlas es **cobertura ilusoria** `[E]` CE-2: Prisma inyecta el FK, el payload no lo contiene |
| 6 | `Legajo.{usuario, cliente}` | `ISO-AMBIG`; depende de `03-DECISIONS/49` |
| 7 | `Pago.deuda` | semántica `[ND]` sin resolver |
| 8 | Las 16 DOMAIN_CONTROL_REQUIRED | requieren análisis individual de E-2 **antes** de decidir si van al registry |
| 9 | **Las 4 entradas con reserva** (`ProductoProveedor` ×2, y el punto abierto sobre entradas preventivas) | §51 no resuelve si se admiten entradas sin vector productivo. **Punto abierto para el Owner** elevado por doc 27 §4.1 |
| 10 | Política 51, contracts, invariants, architecture | fuera del alcance de esta auditoría y del próximo slice |
| 11 | El comentario `empresa-scope.extension.ts:33-37` | dice *"hoy solo VentaItem -> Producto"*; el registry tiene 13. Desactualizado, **no lo toqué** |

---

# RECONCILIACIÓN CON CONTEOS PREVIOS

No reutilicé cifras. Donde un documento previo quedó desactualizado, lo registro **sin reescribirlo**:

| Documento | Decía | Estado real en `9f7abb8` |
|---|---|---|
| `09-TRANSFORMATION/28` (mío) | registry 11 relaciones; `Producto.{subfamilia,tipo,subtipo}` en DOMAIN_CONTROL_REQUIRED | **13 relaciones**; `subfamilia` y `tipo` **registradas y verificadas** `[E]`; solo `subtipo` abierto |
| `09-TRANSFORMATION/25` (mío) | registry 10; "3 relaciones sin compensación" | 13; **1** sin compensación (`MovimientoStock.producto`) |
| `09-TRANSFORMATION/26` (mío) | `Lote.producto` clase 2, no registrada | **registrada y verificada** `[E]` |
| Doc 32 L-01 (red team) | "protección 2 de 4 ramas" | **3 de 4** tras `bcaeadc` |

**Universo re-derivado: 75.** Coincide con §51.2 `[D]` y con mi cómputo independiente `[C]`.

---

# EVIDENCE INDEX

## `[C]` — verificado en esta auditoría

| Hecho | Ubicación |
|---|---|
| Registry = **7 modelos / 13 relaciones**, `Producto: ['familia','subfamilia','tipo']` | `relation-ownership.ts:21-29` en `9f7abb8` |
| Universo 108 = 28 + **75** + 5; 0 FK compuestas | parser del schema |
| **`Producto.subtipo`: exactamente 2 write paths** | `catalogo.controller.ts:116→125`, `:149→153` |
| `subtipoId` obligatorio en el DTO de create | `create-producto.dto.ts:49` |
| Los otros usos de `subtipoId` son lecturas o copias | `inventario:113`, `tienda:114,200`, `ventas:86`, `fidelizacion:175` |
| `verificarJerarquia`: valida coherencia jerárquica + tenant indirecto vía cliente scoped | `catalogo.controller.ts:163-183` |
| `verificarJerarquia` es **condicional** en update | `:144` |
| `Familia`/`Subfamilia`/`Tipo`/`Subtipo` tienen `empresaId` y están en la allow-list | `schema.prisma`; `empresa-scope.extension.ts:46-49` |
| Post-check de `findUnique` devuelve `null` en cross-tenant | `empresa-scope.extension.ts:186-207` |
| **Jerarquía: cero write paths de aplicación** | `jerarquia-catalogo.controller.ts:29-35` (solo `findMany`); grep de create/update sobre los 4 niveles → cero |
| `MovimientoStock`: 4 `create`, todos en `$transaction` | `compras:228, 374`; `inventario:238, 337` |
| `MovimientoStock.producto`: destino **preexistente** en los 4 | ídem |
| **`MovimientoStock.lote`: `Lote` creado en la misma tx** | `compras.service.ts:226` → `:228-232` |
| El preflight recibe `client`, no `tx` | `empresa-scope.extension.ts:156` |
| `verificarNivelesCatalogo` usa el mismo patrón scoped | `fidelizacion.service.ts:102-120` |

## `[E]` — citado (no observado por mí)

| Fuente | Hecho |
|---|---|
| **CI run #21 `37249813759`, job `111574995363`** | **113 tests, 0 fallos; build successful; baseline sin fix 6 fallos/2 pass** — `Producto.{familia, subfamilia, tipo}` |
| `13-AUDIT/31` §60, §137, E-02 | **`ACCEPTED -> producto(A) with subfamilia/tipo/subtipo of B *** GAP CONFIRMED ***`** |
| `13-AUDIT/32` L-01 | protección del catálogo incompleta; `verificarJerarquia` = defensa de call site |
| `09-TRANSFORMATION/25-RED-TEAM` §3.1 (CE-1) | el cliente externo **no ve** filas no confirmadas → falso rechazo |
| ídem §3.2 (CE-2) | el colector no recoge el FK del padre en nested create |
| `09-TRANSFORMATION/27` | 97 tests, 0 fallos (LP-01..08) |
| `13-AUDIT/30` | `ProductoProveedor`, 89 verdes |
| docs 12, 14, 16, 18 | `[E]` PASS por slice |

## `[D]` — documentado

`03-DECISIONS/51` (**canónica**: §1, §2, §4 E-1..E-4, §5, §6.1-6.4, §7, §8, §9) · `03-DECISIONS/49` (Legajo) · `09-TRANSFORMATION/28-31` (slices subfamilia y tipo) · `09-TRANSFORMATION/24, 25, 26, 27` · `13-AUDIT/29-32`.

## `[ND]`

| ID | Ítem |
|---|---|
| ND-1 | E-2 para las 16 DOMAIN_CONTROL_REQUIRED |
| ND-2 | Si `verificarNivelesCatalogo` tiene el mismo gap que `verificarJerarquia` (analogía estructural, no verificada) |
| ND-3 | Si `AplicacionPago.pago` referencia un `Pago` de la misma tx |
| ND-4 | Semántica de `Pago.deuda` |
| ND-5 | Origen del `clienteId` en `Pedido.cliente` |
| ND-6 | TOCTOU del preflight |
| ND-7 | Si la política admite entradas preventivas sin vector productivo |
| ND-8 | Estado de los runs de CI hoy — no verificados por mí |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** No ejecuté tests ni verifiqué runs. Todo `[E]` es citado.

---

**No implementé código. No cambié registry, tests, política 51, architecture/contracts/invariants. No creé ningún implementation slice. No hice commits ni push. No declaré B3 global VERIFIED. No convertí ninguna clasificación en verificación. No inventé write paths. No asumí cobertura por similitud.**
