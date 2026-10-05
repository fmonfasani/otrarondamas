# B3 — POLICY → BACKLOG RECONCILIATION
## APLICACIÓN DE E-1..E-4 A LAS 75 RELACIONES — READ-ONLY

**Estado:** RECONCILIACIÓN — READ-ONLY — NO CANÓNICO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas` · **Branch:** `chore/build-in-ci` · **Commit:** `2e0c3ee` (`docs(b3): close Lote.producto relation isolation slice`)
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md` (OWNER-APPROVED v0.1)

**Acción:** sin modificar código, registry ni documentos históricos. Sin commits ni push. **No se agrega ninguna relación al registry.** No se declara B3 VERIFIED ni ningún `ISO-*` VERIFIED.

**Evidencia:** `[C]` código/schema · `[T]` test escrito · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable.

> En esta reconciliación **no ejecuté tests ni verifiqué runs de CI**. Todo `[E]` es **citado** con su fuente. Los criterios E-1, E-3 y E-4 se computaron del schema y del código; **E-2 no es computable** y se resuelve por análisis específico, como la propia política exige (§51.6.3). Lo declaro donde corresponde.

---

# 1. LA POLÍTICA APLICADA

Transcripción operativa de `03-DECISIONS/51` §4 `[D]`:

| Criterio | Enunciado | ¿Computable? |
|---|---|---|
| **E-1** | Su persistencia **puede introducir una referencia cross-Business desde una superficie de escritura** interceptable por la extensión | **Sí** — presencia de write path (directo o anidado) ∧ FK presente en el payload |
| **E-2** | **No existe una garantía equivalente ya establecida** en la capa de persistencia | **No** — requiere análisis por relación (§51.6.3) |
| **E-3** | FK simple (una columna) ∧ destino con `empresaId` directo | **Sí** — del schema |
| **E-4** | Estrategia de enforcement **compatible con todos los write paths conocidos** | **Parcialmente** — computable el caso bloqueante (destino creado en la misma tx) |

**Entra al registry si se cumplen las cuatro.** Una relación admitida requiere además la condición de evidencia de §51.8 (código + test + ejecución primero sin el cambio).

## 1.1 Precisión sobre E-2 que gobierna toda la matriz

§51.6.3 es explícito: una validación de servicio es "equivalente" —y por tanto **E-2 falla**— *"únicamente si se demuestra que cubre **todos** los write paths de la relación, incluidos los de la capa de persistencia accesibles desde el cliente scoped. Una validación que cubre solo el path principal no cumple E-2."*

**Consecuencia verificada:** ninguna de las validaciones compensatorias conocidas ha sido **demostrada** suficiente bajo ese estándar. Verifiqué el caso más citado `[C]`:

`verificarJerarquia` (`catalogo.controller.ts:163-183`) valida **coherencia jerárquica** (que el subtipo pertenezca al tipo, el tipo a la subfamilia, etc.) y su chequeo de tenant es **indirecto**: un `db.subtipo.findUnique` con cliente scoped. Vive en un solo controller y **no cubre** la escritura por cliente scoped desde otro call site.

Por lo tanto, en la matriz la columna **E-2 = "no"** significa *"existe una validación de dominio candidata a ser equivalente, pendiente de demostración"*, **no** *"E-2 está resuelto"*. Esa es la diferencia entre `DOMAIN_CONTROL_REQUIRED` y una exclusión definitiva.

---

# 2. DISTRIBUCIÓN RESULTANTE

Universo: **75** relaciones con FK en el origen hacia modelo con `empresaId` (excluyendo `Empresa`), conforme §51.2 `[D]`. Las 33 restantes de las 108 son **OUT_OF_SCOPE/GLOBAL** (§6).

| Estado | Cantidad | Registradas | Pendientes |
|---|---|---|---|
| **REGISTRY_REQUIRED** | **12** | **11** | **1** |
| TRANSACTION_MECHANISM_REQUIRED | **4** | 0 | 0 (bloqueadas) |
| DOMAIN_CONTROL_REQUIRED | **20** | 0 | 20 |
| DERIVED_OWNERSHIP | **22** | 0 | 0 (sin acción) |
| AMBIGUOUS | **3** | 0 | 0 (bloqueadas) |
| NO_CURRENT_WRITE_SURFACE | **14** | 0 | 0 (monitor) |
| **Subtotal universo** | **75** | **11** | **21** |
| OUT_OF_SCOPE/GLOBAL (fuera del universo) | 33 | — | — |
| **Total** | **108** | | |

**Cobertura: 11 de 75 (14,7%).** Según §51.9, la cobertura relacional **no** está completa: 64 relaciones del universo no tienen análisis específico documentado por relación.

---

# 3. MATRIZ — REGISTRY_REQUIRED (12)

Cumplen E-1..E-4. Once ya registradas; una pendiente.

| # | Relación (fk) | E-1 | E-2 | E-3 | E-4 | write | comp. | tx dep | reg | T | CI | Evid | Status | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | VentaItem.producto → Producto (`productoId`) | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| 2 | VentaItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| 3 | PedidoItem.producto → Producto (`productoId`) | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| 4 | PedidoItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| 5 | CompraItem.producto → Producto (`productoId`) | sí | sí | sí | sí | nested + update | — | no | **SÍ** | sí | sí | `[E]` 97/0 | **CLOSED** | ninguna |
| 6 | DevolucionProveedorItem.producto → Producto | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` 97/0 | **CLOSED** | ninguna |
| 7 | DevolucionProveedorItem.lote → Lote (`loteId`) | sí | sí | sí | sí | nested | — | no | **SÍ** | sí | sí | `[E]` 97/0 | **CLOSED** | ninguna |
| 8 | Producto.familia → Familia (`familiaId`) | sí | sí | sí | sí | directo | — | no | **SÍ** | sí | sí | `[E]` 97/0 | **CLOSED** | ninguna |
| 9 | ProductoProveedor.producto → Producto | **no** | sí | sí | **no** | **ninguno** | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED con reserva** | registrar la reserva §5.1 |
| 10 | ProductoProveedor.proveedor → Proveedor | **no** | sí | sí | **no** | **ninguno** | — | no | **SÍ** | sí | sí | `[E]` PASS | **CLOSED con reserva** | ídem |
| 11 | **Lote.producto → Producto** (`productoId`) | sí | sí | sí | sí | directo | `getCompra` scoped | no | **SÍ** | sí | sí | `[E]` LP-01..08, 97/0 | **CLOSED con reserva** | registrar la reserva §5.2 |
| 12 | **MovimientoStock.producto → Producto** (`productoId`) | **sí** | **sí** | **sí** | **sí** | directo ×4, en tx | **ninguna** | **no** | **no** | no | no | ninguna | **P0 — ABIERTO** | BL-01 (§7) |

**`MovimientoStock.producto` es la única relación del universo que cumple E-1..E-4, no tiene validación compensatoria y no está registrada** `[C]`. Coincide con el P0 del encargo.

**Su E-4 se cumple** porque en los 4 sitios de escritura el `Producto` es **preexistente** (no se crea en la misma transacción): `compras.service.ts:231, 374`; `inventario.service.ts:241, 340` `[C]`.

---

# 4. MATRIZ — LAS OTRAS CINCO CLASES

## 4.1 TRANSACTION_MECHANISM_REQUIRED (4) — **E-4 FALLA**

§51.6.1: el preflight lee con el cliente base y **no ve filas no confirmadas** de la transacción en curso. Registrar estas relaciones produciría un **rechazo falso** (P2025).

| # | Relación (fk) | E-1 | E-2 | E-3 | **E-4** | tx dep | Status | Next action |
|---|---|---|---|---|---|---|---|---|
| 1 | **MovimientoStock.lote → Lote** (`loteId`) | sí | sí | sí | **NO** | **sí** — `tx.lote.create` (:226) → `loteId: lote.id` (:228) | **BLOCKED** | BL-05: decisión de mecanismo |
| 2 | MovimientoStock.recepcionCompra → RecepcionCompra | sí | sí | sí | **NO** | sí — `tx.recepcionCompra.create` (:214) → (:238) | **BLOCKED** | BL-05 |
| 3 | AuditLog.venta → Venta (`ventaId`) | sí | sí | sí | **NO** | sí — Venta creada en la tx (`ventas.service.ts:190`) | **BLOCKED** | BL-05 |
| 4 | AplicacionPago.pago → Pago (`pagoId`) | no | sí | sí | **NO** | probable `[ND]` | **BLOCKED** | BL-05 + caracterizar |

**`MovimientoStock.lote` es BLOCKED por limitación del mecanismo**, exactamente como indica el encargo. Verificado por mí en código `[C]` y por ejecución en el red team `[E]` citado (CE-1).

**§51.6.1 es taxativo:** *"El hecho de que otro write path de la misma relación apunte a destinos ya confirmados no basta: E-4 exige compatibilidad con todos los write paths conocidos."* Por eso `DevolucionProveedorItem.lote` **sí** está registrada (su `Lote` llega del DTO, preexistente) y `MovimientoStock.lote` **no** puede estarlo, siendo el mismo destino. El registry es por relación, no por ruta.

**No se excluye para siempre** (§51.5): entra si una estrategia alternativa (preflight con `tx`, verificación posterior) demuestra E-4.

## 4.2 DOMAIN_CONTROL_REQUIRED (20) — **E-2 pendiente de demostración**

Cumplen E-1, E-3, E-4. Existe una validación de dominio candidata a ser equivalente, **no demostrada** bajo el estándar de §51.6.3.

| # | Relación (fk) | Validación candidata | Ev. | Status | Next action |
|---|---|---|---|---|---|
| 1 | **Producto.subfamilia → Subfamilia** (`subfamiliaId`) | `verificarJerarquia` scoped | `[C]` | **P1 — ABIERTO** | **BL-02** |
| 2 | **Producto.tipo → Tipo** (`tipoId`) | `verificarJerarquia` scoped | `[C]` | **P1 — ABIERTO** | **BL-02** |
| 3 | **Producto.subtipo → Subtipo** (`subtipoId`) | `verificarJerarquia` scoped | `[C]` | **P1 — ABIERTO** | **BL-02** |
| 4 | ReglaFidelizacion.familia → Familia | `verificarNivelesCatalogo` | `[D]` | ABIERTO | BL-03 |
| 5 | ReglaFidelizacion.subfamilia → Subfamilia | ídem | `[D]` | ABIERTO | BL-03 |
| 6 | ReglaFidelizacion.tipo → Tipo | ídem | `[D]` | ABIERTO | BL-03 |
| 7 | ReglaFidelizacion.subtipo → Subtipo | ídem | `[D]` | ABIERTO | BL-03 |
| 8 | Compra.proveedor → Proveedor | `db.proveedor.findUnique` scoped (`:102`) | `[C]` | ABIERTO | BL-04 |
| 9 | Venta.cliente → Cliente | `clientesService.obtener(empresaId,…)` | `[D]` | ABIERTO | BL-04 |
| 10 | Pedido.cliente → Cliente | origen del `clienteId` | **`[ND]`** | ABIERTO | BL-04: caracterizar primero |
| 11 | DevolucionProveedor.proveedor → Proveedor | `compra.proveedorId` tras `getCompra` | `[C]` | ABIERTO | BL-06 |
| 12 | DevolucionProveedor.compra → Compra | `getCompra(empresaId,…)` | `[C]` | ABIERTO | BL-06 |
| 13 | PagoProveedor.compra → Compra | `getCompra(empresaId,…)` | `[C]` | ABIERTO | BL-06 |
| 14 | PagoProveedor.proveedor → Proveedor | `compra.proveedorId` | `[C]` | ABIERTO | BL-06 |
| 15 | RecepcionCompra.compra → Compra | `getCompra(empresaId,…)` | `[C]` | ABIERTO | BL-06 |
| 16 | AperturaCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | ABIERTO | BL-07 |
| 17 | ArqueoCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | ABIERTO | BL-07 |
| 18 | MovimientoCaja.caja → Caja | `getCajaDeEmpresa` | `[D]` | ABIERTO | BL-07 |
| 19 | ArqueoCaja.autorizacion → Autorizacion | `caja.service.ts:235` | `[D]` | ABIERTO | BL-07 |
| 20 | ArqueoCaja.usuarioEntrante → Usuario | lectura scoped (`caja.service.ts:132`) | `[C]` | ABIERTO | BL-07 |

**Las tres P1 del encargo (`Producto.subfamilia/tipo/subtipo`) caen aquí, no en REGISTRY_REQUIRED.** Es consistente: la política no las excluye, las somete a análisis específico. Dos salidas posibles, ambas legítimas bajo §51:

- **(a)** demostrar que `verificarJerarquia` cubre todos los write paths → E-2 falla → se documenta como no registrada (§51.9.b);
- **(b)** demostrar que **no** los cubre → E-2 se cumple → admisión al registry con la evidencia de §51.8.

**La asimetría a resolver:** `Producto.familia` **está** registrada y sus tres hermanas no, con idéntico origen, idéntica validación e idéntico riesgo `[C]`.

## 4.3 DERIVED_OWNERSHIP (22) — **E-1 falso o riesgo sin superficie**

§51.5 y §51.6.2: el FK no proviene del input del cliente. **§51.6.2 advierte que esto reduce el riesgo pero no lo demuestra nulo** — la garantía vive en el servicio, no en la persistencia.

| Subgrupo | Cant. | E-1 | Fundamento |
|---|---|---|---|
| → `Usuario` desde contexto autenticado | 14 | sí, pero sin vector | ningún DTO declara `usuarioId`; ninguna ruta lo acepta `[C]` |
| → padre/registro resuelto por lectura previa | 4 | sí, sin vector | `Pago.venta`, `Pago.pedido`, `AuditLog.autorizacion`, `Invitacion.invitadoPor` |
| **FK del padre en nested create** | **4** | **NO** | `VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra`, `DevolucionProveedorItem.devolucion` — **Prisma inyecta el FK; no está en el payload** → registrarlas sería **cobertura ilusoria** `[E]` citado (CE-2) |

**Status: NO ACTION.** **Next action:** documentar el análisis por relación para cumplir §51.9.b (hoy sin análisis individual).

## 4.4 AMBIGUOUS (3)

| # | Relación | Por qué | Status | Next action |
|---|---|---|---|---|
| 1 | Legajo.usuario → Usuario | `Legajo` sin `empresaId`; dos FK opcionales y únicas | **`ISO-AMBIG`** | esperar `03-DECISIONS/49` |
| 2 | Legajo.cliente → Cliente | ídem | **`ISO-AMBIG`** | ídem |
| 3 | Pago.deuda → CuentaCorriente (`deudaId`) | campo `deuda`, destino `CuentaCorriente` (`schema.prisma:783-784`) | **semántica `[ND]`** | BL-08: resolver semántica |

## 4.5 NO_CURRENT_WRITE_SURFACE (14) — **E-1 falso hoy**

`AplicacionPago.deuda` · `CuentaCorriente.cliente` · `Deuda.cliente` · `Deuda.cuentaCorriente` · `Deuda.venta` · `Entrega.pedido` · `Entrega.preparador` · `Entrega.repartidor` · `Notificacion.pedido` · `Presentacion.producto` · `Subfamilia.familia` · `Tipo.subfamilia` · `Subtipo.tipo` · `UsuarioPermiso.usuario`

**Status: MONITOR.** **Next action:** reevaluar al aparecer un write path. "Sin detección" **no** es "segura" (§9.2). Dominio financiero (`Deuda`, `AplicacionPago`, `CuentaCorriente`) merece caracterización antes de su primer write.

---

# 5. RESERVAS SOBRE RELACIONES YA REGISTRADAS

Dos entradas del registry no satisfacen E-1 como la política lo define. **No propongo retirarlas** — las registro para que el Owner decida si la política admite entradas preventivas.

## 5.1 `ProductoProveedor.producto` / `.proveedor` — **E-1 = no**

`grep -rn "productoProveedor\|ProductoProveedor" src/` excluyendo specs devuelve **solo** `empresa-scope.extension.ts:50` y `relation-ownership.ts:27` `[C]`: **cero código de aplicación, cero write path**. No hay superficie de escritura desde la que pudiera introducirse una referencia cross-Business.

**E-1 literal: no se cumple.** La entrada protege superficie **potencial**, no existente. Es la pregunta que §51 no resuelve: ¿la política admite entradas sin vector productivo?

## 5.2 `Lote.producto` — E-1 sí, pero el gap no es explotable desde la API

El propio cierre del slice lo declara `[D]`: *"El gap no es explotable desde el input de la API actual. El único write path productivo… deriva el valor de un `CompraItem` ya verificado; el DTO no lo recibe."* Lo verifiqué `[C]`: `Lote.create` tiene un solo sitio (`compras.service.ts:226`), con `productoId` de `compra.items` vía `getCompra(empresaId,…)` (`:185, :192`), que rechaza con 404 cualquier `compraItemId` ajeno (`:193-197`).

El doc 27 §4.1 ya eleva esto: *"Punto abierto para el Owner: si la política admite entradas sin vector productivo demostrado."*

**Las dos reservas son el mismo punto abierto**, y afecta directamente a las tres P1: si se admiten entradas preventivas, `Producto.subfamilia/tipo/subtipo` entran por simetría con `familia`; si no, las cuatro deberían reexaminarse.

---

# 6. OUT_OF_SCOPE / GLOBAL (33, fuera del universo de 75)

| Subgrupo | Cant. | Fundamento |
|---|---|---|
| `X.empresa → Empresa` | **28** | la columna de scope misma (§51.2). `MODELOS_CON_EMPRESA_ID` = 28/28, completa `[C]` |
| `UsuarioPermiso.permiso → Permiso` | 1 | `Permiso` es catálogo **global legítimo** |
| `DocumentoLegajo.legajo → Legajo` | 1 | destino sin `empresaId` → **E-3 falla**; el preflight lanza (extensión `:121-124`) |
| `MovimientoCaja/ArqueoCaja/CierreCaja.aperturaCaja → AperturaCaja` | 3 | ídem E-3; ownership derivado vía `caja` |

**Status: OUT_OF_SCOPE.** Las 5 últimas requieren estrategia de ownership derivado, inexistente (§51.5).

---

# 7. BACKLOG PRIORIZADO

**Ninguna entrada es autorización.** Candidatos con su bloqueo y dependencia.

| ID | Prio | Relación(es) | Clase | Acción propuesta | Bloqueo |
|---|---|---|---|---|---|
| **BL-01** | **P0** | **MovimientoStock.producto → Producto** | REGISTRY_REQUIRED | **Candidato de admisión.** Cumple E-1..E-4; sin validación compensatoria; destino preexistente en los 4 sitios. Requiere la evidencia de §51.8: test aislado (create mismo-Business, create cross rechazado sin persistencia, update cross, forma transaccional, sin persistencia parcial, destino inexistente), ejecutado **primero sin el cambio** | **Ninguno técnico.** Advertencia: afecta 3 flujos (recepción, ajuste, devolución); §51.8.4 exige demostrar que no se rompen |
| **BL-02** | **P1** | **Producto.{subfamilia, tipo, subtipo}** | DOMAIN_CONTROL_REQUIRED | **Análisis específico de E-2.** Demostrar si `verificarJerarquia` cubre todos los write paths incluido el del cliente scoped. Resuelve además la asimetría con `familia` | Depende de la resolución de §5 (¿se admiten entradas preventivas?) |
| **BL-03** | P1 | ReglaFidelizacion.{familia, subfamilia, tipo, subtipo} | DOMAIN_CONTROL_REQUIRED | Verificar `[C]` la compensación (hoy solo `[D]`), luego E-2 | — |
| **BL-04** | P2 | Compra.proveedor · Venta.cliente · Pedido.cliente | DOMAIN_CONTROL_REQUIRED | Caracterizar controles; `Pedido.cliente` primero (origen `[ND]`) | — |
| **BL-05** | **BLOCKED** | **MovimientoStock.lote** · MovimientoStock.recepcionCompra · AuditLog.venta · AplicacionPago.pago | TRANSACTION_MECHANISM_REQUIRED | **NO registrar.** Decisión de mecanismo: preflight con `tx`, verificación posterior, o por construcción | **Limitación del mecanismo** (§51.6.1) |
| **BL-06** | P2 | Compras: DevolucionProveedor ×2 · PagoProveedor ×2 · RecepcionCompra.compra | DOMAIN_CONTROL_REQUIRED | Caracterizar `getCompra` como control común | — |
| **BL-07** | P3 | Caja: 5 relaciones | DOMAIN_CONTROL_REQUIRED | Caracterizar `getCajaDeEmpresa` | — |
| **BL-08** | P3 | Pago.deuda | AMBIGUOUS | Resolver semántica | modelo |
| **BL-09** | P3 | Legajo ×2 | AMBIGUOUS | Esperar decisión 49 | **Owner** |
| **BL-10** | P4 | 22 DERIVED_OWNERSHIP | — | Documentar análisis por relación (§51.9.b) | — |
| **BL-11** | P4 | 14 NO_CURRENT_WRITE_SURFACE | — | Monitor; caracterizar el dominio financiero antes de su primer write | — |
| **BL-12** | P4 | 4 FK de padre nested | DERIVED_OWNERSHIP | Documentar que registrarlas es **cobertura ilusoria** | — |

**Orden del encargo, respetado y fundamentado:** P0 `MovimientoStock.producto` (único REGISTRY_REQUIRED pendiente) → P1 `Producto.{subfamilia,tipo,subtipo}` (análisis de E-2) → `MovimientoStock.lote` **BLOCKED** por E-4.

---

# 8. RECONCILIACIÓN: POLÍTICA ↔ INVENTARIO ↔ HISTÓRICOS

**No reescribo ningún histórico.** Registro las diferencias.

| # | Diferencia | Política 51 | Inventario (doc 25) | Reconciliación |
|---|---|---|---|---|
| **R-1** | Registry: **11** relaciones (7 modelos) | §2: *"10 antes de este slice; 11 después de Lote → Producto"* | doc 25 decía **10** | **La política es correcta.** `Lote: ['producto']` se registró en `ea436dc` `[C]`. El doc 25 es anterior; **no se reescribe** |
| **R-2** | `Lote.producto`: ¿clase 1 o 2? | §51.5 lo pone en "ownership derivado por servidor", admitido tras análisis (doc 26 §5.1) `[D]` | doc 25: "sin compensación"; doc 26 §1.3: "**con** compensación", clase 2 | **Ambas lecturas eran parciales.** Tiene compensación `[C]` **y** fue admitido al registry tras análisis específico. Clasificado aquí como **REGISTRY_REQUIRED con reserva** (§5.2). El doc 26 queda superado por el slice; **no se reescribe** |
| **R-3** | "3 relaciones sin compensación" | — | doc 25 §6 | **Corregido en doc 26 §1.3 a 2**, y hoy a **1**: solo `MovimientoStock.producto`. `Lote.producto` tiene compensación y está registrada; `MovimientoStock.lote` está bloqueada |
| **R-4** | Universo = 75 | §2, citando doc 24 `[D]` | computado por parser | **Coinciden.** Re-verificado: 108 = 28 + 75 + 5; 0 FK compuestas `[C]` |
| **R-5** | Las 7 clasificaciones | **no están en la política** — §51.5 lista 6 *clases* con otros nombres | doc 26 las aplicó como taxonomía del encargo | **Siguen siendo taxonomía operativa, no norma.** El mapeo a las clases de §51.5 está en §2 de este documento |
| **R-6** | ¿Admite entradas preventivas? | **no lo resuelve** | — | **Punto abierto** elevado por doc 27 §4.1 y por §5 de este documento. Afecta a 4 entradas existentes y a las 3 P1 |
| **R-7** | `empresa-scope.extension.ts:33-37` dice *"hoy solo VentaItem -> Producto"* | — | — | **Desactualizado**: el registry tiene 11 relaciones. Doc 27 §6 lo registra como pendiente. **No lo toqué** |
| **R-8** | Condición de completitud | §9: cada relación en uno de dos estados documentados | — | **64 de 75 sin análisis específico por relación.** La cobertura relacional **no** está completa; B3 **no** puede declararse VERIFIED por este eje |

---

# 9. CIERRE

## Estado según §51.9

| Condición | Estado |
|---|---|
| (a) registradas con `[T]`+`[E]` | **11** — de ellas 6 con `[E]` PASS citado y 5 dentro del run de 97/0 |
| (b) no registradas con análisis específico documentado | **0 individualmente**; 64 tienen análisis **de clase**, no por relación |
| Ninguna en "sin análisis" | **NO CUMPLIDO** |

**Cobertura relacional: NO COMPLETA. B3 no puede declararse VERIFIED por este eje** (§51.9).

## Lo que NO hice

No agregué relaciones al registry. No modifiqué código, registry ni documentos históricos (23, 24, 25, 26, 29, 30 intactos). No hice commits ni push. No declaré B3 VERIFIED ni ningún `ISO-*` VERIFIED. No resolví E-2 para ninguna relación — eso requiere el análisis específico que la política exige.

---

# 10. EVIDENCE INDEX

## `[C]` — verificado o computado en esta reconciliación

| Hecho | Método / ubicación |
|---|---|
| Registry = **7 modelos / 11 relaciones**, con `Lote: ['producto']` | `apps/api/src/prisma/relation-ownership.ts:21-29`; commit `ea436dc` |
| Universo 108 = 28 → `Empresa` + **75** → con `empresaId` + 5 → sin; 0 FK compuestas | parser del schema |
| E-1, E-3, E-4 computados para las 75 | parser + barrido de `src/**` no-spec |
| `MovimientoStock.producto`: 4 sitios, destino **preexistente** | `compras.service.ts:231, 374`; `inventario.service.ts:241, 340` |
| `MovimientoStock.lote`: destino **creado en la misma tx** | `compras.service.ts:226` → `:228-230` |
| El preflight recibe `client`, no `tx` | `empresa-scope.extension.ts:156` |
| `verificarJerarquia` valida **coherencia jerárquica**; tenant indirecto; un solo controller | `catalogo.controller.ts:163-183` |
| `Lote.create`: un solo sitio; `productoId` de `compra.items` vía `getCompra` | `compras.service.ts:185, 192, 219-226`; 404 en `:193-197` |
| `ProductoProveedor`: **cero código de aplicación** | `grep` excl. specs → solo los 2 archivos del mecanismo |
| El mecanismo exige destino con `empresaId` | extensión `:121-124` |

## `[E]` — citado (no observado por mí)

| Fuente | Hecho |
|---|---|
| `09-TRANSFORMATION/27-LOTE-PRODUCTO-…CLOSURE` | **97 tests, 0 fallos**; LP-01..LP-08 individualmente `✓` |
| `09-TRANSFORMATION/25-RED-TEAM-…POLICY` §3.1 (CE-1) | el cliente externo **no ve** filas no confirmadas → falso rechazo |
| ídem §3.2 (CE-2) | el colector **no recoge** el FK del padre en nested create |
| `13-AUDIT/30` | `ProductoProveedor` cerrado, 89 verdes |
| docs 12, 14, 16, 18 | `[E]` PASS por slice (Gates 4, 6.1, 6.2, 6.3) |

## `[D]` — documentado

`03-DECISIONS/51` (**política aplicada**: §1 transcripción, §4 E-1..E-4, §5 clases, §6.1-6.4, §7-§9) · `03-DECISIONS/49` (Legajo) · `09-TRANSFORMATION/24` (opciones, OD-1..OD-6) · `25-RELATION-COVERAGE-INVENTORY` (las 75) · `26-COVERAGE-POLICY-RECONCILIATION` · `26-LOTE-PRODUCTO-…AUDIT` · `27-…CLOSURE` · `13-AUDIT/29, 30`.

## `[ND]`

| ID | Ítem |
|---|---|
| ND-1 | **E-2 para las 20 de DOMAIN_CONTROL_REQUIRED** — requiere análisis por relación (§51.6.3) |
| ND-2 | Si la política admite entradas preventivas sin vector productivo (§5) |
| ND-3 | Origen del `clienteId` en `Pedido.cliente` |
| ND-4 | Si `AplicacionPago.pago` referencia un `Pago` de la misma tx |
| ND-5 | Semántica de `Pago.deuda` |
| ND-6 | `verificarNivelesCatalogo`: solo `[D]`, no verificado `[C]` |
| ND-7 | Estado de los runs de CI hoy — no verificados |
| ND-8 | TOCTOU del preflight |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** No ejecuté tests ni verifiqué runs.

---

**No modifiqué código, registry ni documentos históricos. No hice commits ni push. No agregué relaciones al registry. No declaré B3 VERIFIED.**
