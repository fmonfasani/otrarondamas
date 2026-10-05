# B3 — COVERAGE POLICY RECONCILIATION & BACKLOG
## MATRIZ DE ESTADO POR RELACIÓN — READ-ONLY

**Estado:** RECONCILIACIÓN Y BACKLOG — READ-ONLY — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Repo:** `fmonfasani/otrarondamas` · **Branch:** `chore/build-in-ci` · **Commit:** `72e794d`

**Acción:** sin modificar código, registry, workflows ni contratos históricos. Sin commits ni push. **No se agrega ninguna relación al registry. No se convierte ninguna clasificación en implementación. No se declara B3 VERIFIED.**

**Evidencia:** `[C]` código/schema · `[T]` test escrito · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable.

> En esta reconciliación **no ejecuté tests ni verifiqué runs**. Todo `[E]` es **citado** con su fuente. Verifiqué de forma independiente los hechos de código que cambian una clasificación (§1.2, §4.1).

---

# 1. ADVERTENCIAS DE ENTRADA — LEER ANTES DE LA MATRIZ

## 1.1 El texto de la política aprobada no está en el repositorio

El encargo indica *"OWNER APPROVED Relation Ownership Coverage Policy v0.1"*. **Verificado `[C]`:**

| Búsqueda | Resultado |
|---|---|
| `grep -rln "Coverage Policy"` en toda la documentación | **1 archivo**: mi propio audit `24-…COVERAGE-POLICY-AUDIT`, que **propone opciones sin decidir** |
| `grep -rln "REGISTRY_REQUIRED\|DOMAIN_CONTROL_REQUIRED"` | **cero coincidencias** |
| `03-DECISIONS/` (50 documentos) | ninguna entrada de política de cobertura relacional |

**Las 7 clasificaciones que pide el encargo no existen en ningún documento del repositorio.** No puedo reconciliar contra el texto aprobado porque no está escrito.

**Qué hago en su lugar, y qué no:** aplico las 7 clasificaciones **como taxonomía provista por el encargo**, derivando cada asignación de evidencia de código/schema. **No infiero el contenido de la política** (umbrales, obligatoriedad, condición de completitud). Donde una clasificación dependa de un criterio que la política debería fijar, lo marco `[ND]`.

**Esto no bloquea el entregable** — la matriz es útil y trazable — pero su columna `policy classification` es **una propuesta de asignación**, no la aplicación de una norma aprobada. El documento de decisión sigue faltando (§7).

## 1.2 Un contraejemplo ejecutado invalida el orden P0 del encargo

El encargo instruye: *"P0 = las 3 relaciones sin compensación… respetar la dependencia: `Lote.producto` antes de `MovimientoStock.lote`"*.

El red team (`09-TRANSFORMATION/25-RED-TEAM-RELATION-OWNERSHIP-COVERAGE-POLICY`) probó **por ejecución** `[E]` que **`MovimientoStock.lote` no es registrable en absoluto** con el mecanismo actual. **Lo verifiqué en código de forma independiente `[C]`:**

| Hecho | Evidencia propia |
|---|---|
| El preflight recibe **`client`**, no `tx` | `empresa-scope.extension.ts:156` — `verificarOwnershipRelacional(client, …)` `[C]` |
| `recibirCompra` crea el `Lote` **dentro** de la transacción | `compras.service.ts:226` — `const lote = await tx.lote.create(...)` `[C]` |
| …y acto seguido lo referencia desde `MovimientoStock` | `compras.service.ts:228-230` — `loteId: lote.id` `[C]` |
| El cliente externo **no ve** filas no confirmadas de esa tx | `[E]` citado (red team CE-1: *"outer-client findUnique → NOT VISIBLE"*) |

**Conclusión:** registrar `MovimientoStock.lote` haría que el preflight consulte con el cliente externo un `Lote` que todavía no está confirmado, no lo encuentre, y **rechace una operación válida con P2025**. Rompería `recibirCompra`.

**La dependencia que el encargo plantea existe, pero su conclusión se invierte:** no es "`Lote.producto` antes de `MovimientoStock.lote`"; es que **`MovimientoStock.lote` queda fuera del registry** y pasa a `TRANSACTION_MECHANISM_REQUIRED` (clase 3) — necesita un cambio del mecanismo (preflight con `tx`, o verificación diferida), no un slice de registro.

**No ejecuto esa reclasificación como decisión.** La registro como hallazgo que la política debe resolver, y mantengo las tres relaciones en P0 con la acción corregida.

## 1.3 Corrección a mi propio inventario: `Lote.producto` **sí** tiene compensación

En `09-TRANSFORMATION/25-RELATION-COVERAGE-INVENTORY` clasifiqué `Lote.producto` como "sin compensación identificada". **Corrijo `[C]`:**

`Lote.create` tiene **un solo sitio** (`compras.service.ts:226`) y su `productoId` proviene de `item.productoId`, donde `item` sale de `itemsPorId`, construido desde `compra.items` (`:192`), y `compra` viene de **`getCompra(empresaId, compraId)`** (`:185`) — una lectura **scoped**, que además rechaza con 404 cualquier `compraItemId` ajeno (`:193-197`) `[C]`.

**`Lote.producto` tiene compensación de dominio real y verificada.** Las relaciones **sin ninguna compensación** no son 3 sino **2**: `MovimientoStock.producto` y `MovimientoStock.lote`. Y de esas dos, una (`.lote`) no es registrable.

---

# 2. TAXONOMÍA APLICADA

Definiciones operativas con las que asigno cada clase. Derivadas de evidencia, no de la política (que falta).

| Clase | Criterio de asignación |
|---|---|
| **1 REGISTRY_REQUIRED** | FK provista por el cliente ∧ existe write path ∧ el destino es preexistente al momento de la escritura (no creado en la misma tx) ∧ FK presente en el payload |
| **2 DOMAIN_CONTROL_REQUIRED** | FK del cliente ∧ existe control compensatorio en el servicio, verificado o documentado ∧ no registrable sin redundancia o riesgo |
| **3 TRANSACTION_MECHANISM_REQUIRED** | el destino se crea dentro de la misma transacción → el preflight con cliente externo produciría **falso rechazo** |
| **4 DERIVED_OWNERSHIP** | FK derivada del servidor (contexto autenticado, lectura scoped previa, padre nested) → sin superficie de ataque del cliente |
| **5 AMBIGUOUS** | el ownership de tenant no es determinable sin resolución de modelo |
| **6 NO_CURRENT_WRITE_SURFACE** | sin write path ni nested observable hoy |
| **7 GLOBAL / OUT_OF_SCOPE** | destino global legítimo, o relación estructuralmente no registrable (destino sin `empresaId`), o la columna de scope misma |

**Distribución resultante sobre el universo de 108:**

| Clase | Cantidad |
|---|---|
| 1 REGISTRY_REQUIRED | **12** (10 ya registradas + 2 pendientes) |
| 2 DOMAIN_CONTROL_REQUIRED | **12** |
| 3 TRANSACTION_MECHANISM_REQUIRED | **5** |
| 4 DERIVED_OWNERSHIP | **26** |
| 5 AMBIGUOUS | **3** |
| 6 NO_CURRENT_WRITE_SURFACE | **17** |
| 7 GLOBAL / OUT_OF_SCOPE | **33** (28 →`Empresa` + 5 →destino sin `empresaId`) |
| **Total** | **108** |

---

# 3. MATRIZ DE ESTADO — CLASE 1: REGISTRY_REQUIRED

## 3.1 Ya registradas y cerradas (10)

| Relación | Universo | Policy | Registry | Compensating | Write | Mech | T | CI | Evid | Status | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| VentaItem.producto → Producto | G1 | 1 | **sí** | `resolverItems` scoped | nested | sí | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| VentaItem.reglaFidelizacion → ReglaFidelizacion | G1 | 1 | **sí** | reglas desde `listarReglasActivas` | nested | sí | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| PedidoItem.producto → Producto | G1 | 1 | **sí** | lectura scoped previa | nested | sí | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| PedidoItem.reglaFidelizacion → ReglaFidelizacion | G1 | 1 | **sí** | ídem | nested | sí | sí | sí | `[E]` PASS | **CLOSED** | ninguna |
| ProductoProveedor.producto → Producto | G1 | 1 | **sí** | — | **ninguno** | sí | sí | sí | `[E]` PASS | **CLOSED** (superficie potencial) | ninguna |
| ProductoProveedor.proveedor → Proveedor | G1 | 1 | **sí** | — | **ninguno** | sí | sí | sí | `[E]` PASS | **CLOSED** (superficie potencial) | ninguna |
| CompraItem.producto → Producto | G1 | 1 | **sí** | `db.producto.findMany` scoped | nested + update | sí | sí | **no** | **TESTED, NOT EXECUTED** | observar run de CI |
| DevolucionProveedorItem.producto → Producto | G1 | 1 | **sí** | ninguna en el call site | nested | sí | sí | sí | **no observada** | **TESTED, CI AÑADIDO** | observar run |
| DevolucionProveedorItem.lote → Lote | G1 | 1 | **sí** | ninguna en el call site | nested | sí | sí | sí | **no observada** | **TESTED, CI AÑADIDO** | observar run |
| Producto.familia → Familia | G1 | 1 | **sí** | `verificarJerarquia` scoped | create + update | sí | sí | **no** | **TESTED, NOT EXECUTED** | observar run |

**Nota sobre `DevolucionProveedorItem.lote`:** es registrable y funciona porque allí el `Lote` **es preexistente** (llega del DTO). El mismo par origen→destino `MovimientoStock.lote` **no** lo es, porque el `Lote` se crea en la misma tx. **El registry es por relación, no por ruta** — limitación estructural del mecanismo `[C]`/`[E]` citado.

## 3.2 Pendientes de clase 1 (2)

| Relación | Universo | Policy | Registry | Compensating | Write | Mech | T | CI | Evid | Status | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **MovimientoStock.producto → Producto** | G1 | **1** | no | **NINGUNA** | create ×4, en tx | **sí** | no | no | ninguna | **P0 — ABIERTO** | ver §6, BL-01 |
| ArqueoCaja.usuarioEntrante → Usuario | G2 | **1** | no | lectura scoped (`caja.service.ts:132`) | create + update, en tx | sí | no | no | ninguna | ABIERTO (bajo riesgo) | ver §6, BL-09 |

**`MovimientoStock.producto` es la única relación del universo con FK del cliente, write path real, destino preexistente y cero compensación** `[C]`. Es el candidato de clase 1 más fuerte que queda.

---

# 4. MATRIZ DE ESTADO — CLASE 2: DOMAIN_CONTROL_REQUIRED (12)

FK del cliente con control compensatorio en el servicio. Registrarlas sería redundante o riesgoso; lo que falta es **evidencia de que el control compensatorio funciona**, no un registro.

| Relación | Compensating control | Verificado | Write | T | Evid | Status | Next action |
|---|---|---|---|---|---|---|---|
| **Lote.producto → Producto** | `getCompra(empresaId,…)` → `compra.items`; rechaza `compraItemId` ajeno con 404 | **`[C]` propio** (§1.3) | create (1 sitio), en tx | no | ninguna | **P0 — ABIERTO** | ver §6, BL-02 |
| Producto.subfamilia → Subfamilia | `verificarJerarquia(db,…)` scoped, antes de create y update | `[C]` | create + update | no | ninguna | ABIERTO | BL-03 |
| Producto.tipo → Tipo | ídem | `[C]` | create + update | no | ninguna | ABIERTO | BL-03 |
| Producto.subtipo → Subtipo | ídem | `[C]` | create + update | no | ninguna | ABIERTO | BL-03 |
| ReglaFidelizacion.familia → Familia | `verificarNivelesCatalogo` | `[D]` | create + update | no | ninguna | ABIERTO | BL-04 |
| ReglaFidelizacion.subfamilia → Subfamilia | ídem | `[D]` | create + update | no | ninguna | ABIERTO | BL-04 |
| ReglaFidelizacion.tipo → Tipo | ídem | `[D]` | create + update | no | ninguna | ABIERTO | BL-04 |
| ReglaFidelizacion.subtipo → Subtipo | ídem | `[D]` | create + update | no | ninguna | ABIERTO | BL-04 |
| Compra.proveedor → Proveedor | `db.proveedor.findUnique` scoped (`compras.service.ts:102`) | `[C]` | create + update, en tx | no | ninguna | ABIERTO | BL-05 |
| Venta.cliente → Cliente | `clientesService.obtener(empresaId,…)` | `[D]` | create, en tx | no | ninguna | ABIERTO | BL-06 |
| Pedido.cliente → Cliente | origen del `clienteId` en tienda | **`[ND]`** | create + update, en tx | no | ninguna | **ABIERTO — `[ND]`** | BL-07: caracterizar primero |
| DevolucionProveedor.proveedor → Proveedor | `compra.proveedorId` tras `getCompra` | `[C]` | create, en tx | no | ninguna | ABIERTO (bajo) | BL-10 |

**Asimetría a registrar:** `Producto.familia` **está** registrada y sus tres hermanas (`subfamilia`, `tipo`, `subtipo`) no, pese a tener idéntico origen, idéntica compensación e idéntico riesgo `[C]`. Es inconsistencia de cobertura, no un defecto de seguridad.

---

# 5. MATRIZ DE ESTADO — CLASES 3 A 7

## 5.1 Clase 3 — TRANSACTION_MECHANISM_REQUIRED (5)

**No registrables sin cambiar el mecanismo.** El destino se crea en la misma transacción y el preflight usa el cliente externo → falso rechazo `[E]` citado + `[C]` propio.

| Relación | Destino creado en la misma tx | Sitio | Status | Next action |
|---|---|---|---|---|
| **MovimientoStock.lote → Lote** | **sí** — `tx.lote.create` (:226) → `loteId: lote.id` (:228) | `compras.service.ts` | **P0 — NO REGISTRABLE** | ver §6, BL-08 |
| MovimientoStock.recepcionCompra → RecepcionCompra | **sí** — `tx.recepcionCompra.create` (:214) → `recepcionCompraId` (:238) | `compras.service.ts` | ABIERTO | BL-08 |
| AuditLog.venta → Venta | **sí** — Venta creada en la tx, luego `ventaId` | `ventas.service.ts:190` | ABIERTO | BL-08 |
| CierreCaja.aperturaCaja → AperturaCaja | parcial — apertura preexistente, actualizada en la misma tx | `caja.service.ts:269-276` | ABIERTO | BL-08 |
| AplicacionPago.pago → Pago | **probable** | `pagos.service.ts:55` | **`[ND]`** | BL-08: caracterizar |

**Esta clase es el hallazgo estructural más importante de la reconciliación.** No se resuelve con slices de registro; requiere decidir si el preflight debe usar `tx` o si se adopta verificación diferida. Es materia de T01-05 y del mecanismo, no de la política de cobertura.

## 5.2 Clase 4 — DERIVED_OWNERSHIP (26)

FK derivada del servidor: contexto autenticado (`usuarioId` del JWT), lectura scoped previa, o padre nested. **Sin superficie de ataque del cliente** `[C]`: ningún DTO declara `usuarioId`, ninguna ruta lo acepta.

| Subgrupo | Cantidad | Ejemplos | Status |
|---|---|---|---|
| → `Usuario` desde contexto | 19 | `AuditLog.usuario`, `Venta.usuario`, `Pago.usuario`, `Compra.usuario`, `AperturaCaja.usuario`… | **NO ACTION** |
| → padre resuelto por lectura scoped | 5 | `RecepcionCompra.compra`, `PagoProveedor.compra`, `DevolucionProveedor.compra`, `ArqueoCaja.caja`, `MovimientoCaja.caja` | **NO ACTION** |
| → FK del padre en nested create | 4 | `VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra`, `DevolucionProveedorItem.devolucion` | **NO ACTION — cobertura ilusoria** |
| → registro creado en la misma tx | −2 | reasignados a clase 3 | — |

**Sobre los 4 FK de padre nested:** registrarlos sería **cobertura ilusoria** `[E]` citado — Prisma inyecta el FK y el payload no lo contiene, así que el colector no recoge nada. Verificado por el red team ejecutando el colector: `VentaItem.venta` no aparece en las referencias.

**Excepción ya tratada:** `ArqueoCaja.usuarioEntrante` sí viene del DTO y está en clase 1 (§3.2).

## 5.3 Clase 5 — AMBIGUOUS (3)

| Relación | Por qué | Status | Next action |
|---|---|---|---|
| `Legajo.usuario → Usuario` | `Legajo` sin `empresaId`; dos FK opcionales y únicas | **`ISO-AMBIG`** | esperar decisión de modelo (`03-DECISIONS/49`) |
| `Legajo.cliente → Cliente` | ídem | **`ISO-AMBIG`** | ídem |
| `Pago.deuda → CuentaCorriente` | campo llamado `deuda`, destino `CuentaCorriente` (`schema.prisma:783-784`) | **semántica `[ND]`** | resolver semántica antes de clasificar |

## 5.4 Clase 6 — NO_CURRENT_WRITE_SURFACE (17)

Sin write path ni nested observable. **"Sin detección" ≠ "segura"** — es ausencia de hallazgo, no prueba de ausencia.

`CuentaCorriente.cliente` · `Deuda.cliente` · `Deuda.venta` · `Deuda.cuentaCorriente` · `AplicacionPago.deuda` · `Presentacion.producto` · `Subfamilia.familia` · `Tipo.subfamilia` · `Subtipo.tipo` · `Entrega.pedido` · `Entrega.preparador` · `Entrega.repartidor` · `Notificacion.pedido` · `UsuarioPermiso.usuario` · `DevolucionProveedorItem.devolucion` · `PedidoItem.pedido` · `VentaItem.venta`

**Status: MONITOR.** **Next action:** reevaluar cuando se cree un write path. Dominio financiero (`Deuda`, `AplicacionPago`, `CuentaCorriente`) merece caracterización previa a su primer write.

## 5.5 Clase 7 — GLOBAL / OUT_OF_SCOPE (33)

| Subgrupo | Cantidad | Fundamento |
|---|---|---|
| `X.empresa → Empresa` | **28** | la columna de scope misma; gestionada por `MODELOS_CON_EMPRESA_ID` (28/28, completa). Verificarla es tautológico |
| `UsuarioPermiso.permiso → Permiso` | 1 | `Permiso` es catálogo **global legítimo** |
| `DocumentoLegajo.legajo → Legajo` | 1 | destino sin `empresaId` → el mecanismo **lanza** (extensión `:121-124`) |
| `MovimientoCaja/ArqueoCaja/CierreCaja.aperturaCaja → AperturaCaja` | 3 | ídem; ownership derivado vía `caja` |

**Status: OUT OF SCOPE** del registry. Las 5 últimas requieren estrategia de ownership derivado, que no existe.

---

# 6. BACKLOG PRIORIZADO

**Ninguna entrada es una autorización.** Son candidatos de verificación con su dependencia y su bloqueo.

## P0 — las tres relaciones del encargo, con la acción corregida

| ID | Relación | Clase | Acción propuesta | Bloqueo / dependencia |
|---|---|---|---|---|
| **BL-01** | **MovimientoStock.producto → Producto** | **1 REGISTRY_REQUIRED** | **Candidato de registro.** Única relación con FK del cliente, write path, destino preexistente y **cero compensación**. El `productoId` llega del DTO en `compras.service.ts:231, 374` | **Ninguno técnico.** `Producto` es preexistente en los 4 sitios → el preflight funciona. **Advertencia:** afecta 3 flujos (recepción, ajuste, devolución); los positivos de los tres deberían existir antes |
| **BL-02** | **Lote.producto → Producto** | **2 DOMAIN_CONTROL_REQUIRED** | **Caracterizar el control existente, no registrar.** Tiene compensación verificada (§1.3). Un test que demuestre que un `compraItemId` ajeno es rechazado cubre la propiedad sin tocar el mecanismo | Ninguno. **Reclasificado** respecto de mi inventario previo |
| **BL-08** | **MovimientoStock.lote → Lote** | **3 TRANSACTION_MECHANISM_REQUIRED** | **NO registrar.** Registrarla rompe `recibirCompra` con falso rechazo `[E]`. Requiere decisión de mecanismo: preflight con `tx`, o verificación diferida | **BLOQUEADO por el mecanismo.** No es un slice de registro |

**El orden del encargo queda así:** `BL-01` (registrable, sin compensación) → `BL-02` (caracterizar) → `BL-08` (bloqueado, requiere decisión de mecanismo). La dependencia *"`Lote.producto` antes de `MovimientoStock.lote`"* **se respeta y se supera**: ambas se resuelven antes, por vías distintas, y `MovimientoStock.lote` no llega a registrarse.

## P1 — asimetrías de cobertura (consistencia, no seguridad)

| ID | Relaciones | Clase | Acción propuesta | Nota |
|---|---|---|---|---|
| BL-03 | `Producto.{subfamilia, tipo, subtipo}` | 2 | Decidir si se completan por registry (como `familia`) o se caracteriza `verificarJerarquia` | **Asimetría dentro de un modelo ya registrado.** `verificarJerarquia` valida además coherencia jerárquica, que **no** es ownership — registrar no la sustituye |
| BL-04 | `ReglaFidelizacion.{familia, subfamilia, tipo, subtipo}` | 2 | Caracterizar `verificarNivelesCatalogo` | compensación solo `[D]`; conviene verificarla `[C]` primero |

## P2 — caracterización de controles compensatorios

| ID | Relación | Clase | Acción propuesta |
|---|---|---|---|
| BL-05 | `Compra.proveedor` | 2 | test de caracterización del `findUnique` scoped |
| BL-06 | `Venta.cliente` | 2 | ídem para `clientesService.obtener` |
| BL-07 | `Pedido.cliente` | 2 | **caracterizar primero** — origen del `clienteId` es `[ND]` |
| BL-09 | `ArqueoCaja.usuarioEntrante` | 1 | riesgo bajo (es un Usuario, no dato de negocio); ya validado a mano |
| BL-10 | `DevolucionProveedor.proveedor` | 2 | riesgo bajo; `compra.proveedorId` tras `getCompra` |

## P3 — decisiones de mecanismo y de modelo (no son slices)

| ID | Ítem | Quién resuelve |
|---|---|---|
| BL-11 | **Preflight con `tx` vs verificación diferida** — desbloquea las 5 de clase 3 | arquitectura / mecanismo |
| BL-12 | **Registry por relación vs por ruta** — `DevolucionProveedorItem.lote` registrable y `MovimientoStock.lote` no, mismo destino | arquitectura |
| BL-13 | Semántica de `Pago.deuda` | modelo |
| BL-14 | `Legajo`/`DocumentoLegajo` (`ISO-AMBIG`) | **Owner** (`03-DECISIONS/49` existe) |
| BL-15 | Estrategia de ownership derivado para las 5 de clase 7 | arquitectura / contrato |

## P4 — observación

| ID | Ítem |
|---|---|
| BL-16 | Observar los runs de CI de los 4 slices registrados **sin** `[E]`: `CompraItem.producto`, `DevolucionProveedorItem.producto/lote`, `Producto.familia` |
| BL-17 | Las 17 de clase 6: reevaluar al aparecer un write path. Prioridad al dominio financiero |

---

# 7. EL DOCUMENTO QUE SIGUE FALTANDO

La política aprobada **no está escrita** (§1.1). Mientras no exista:

- la columna `policy classification` de esta matriz es **propuesta de asignación**, no aplicación de norma;
- no hay condición de completitud → B3 no tiene criterio de salida para cobertura relacional;
- las clases 1 y 2 no tienen umbral que decida cuándo una compensación de dominio es suficiente y cuándo hace falta registry.

**Documento necesario:** `03-DECISIONS/5x-OWNER-DECISION-RELATION-OWNERSHIP-COVERAGE-POLICY-v0.1.md`, que fije: la regla de admisión al registry; el tratamiento de las relaciones de clase 3 (mecanismo transaccional); el tratamiento de las de clase 4 (derivadas, sin superficie); si las clases 2 se cubren por registry o por caracterización del control; y el criterio de completitud.

**Si la política ya fue aprobada verbalmente**, el paso siguiente es transcribirla a `03-DECISIONS/` **antes** de ejecutar cualquier entrada del backlog, porque BL-01 y BL-03 dependen directamente de su umbral.

---

# 8. CIERRE

## Distribución final

| Clase | Cant. | Cerradas | Abiertas | Bloqueadas |
|---|---|---|---|---|
| 1 REGISTRY_REQUIRED | 12 | 6 `[E]` + 4 `[T]` | **2** | 0 |
| 2 DOMAIN_CONTROL_REQUIRED | 12 | 0 | 12 | 0 |
| 3 TRANSACTION_MECHANISM_REQUIRED | 5 | 0 | 0 | **5** |
| 4 DERIVED_OWNERSHIP | 26 | — | — | NO ACTION |
| 5 AMBIGUOUS | 3 | 0 | 0 | 3 |
| 6 NO_CURRENT_WRITE_SURFACE | 17 | — | — | MONITOR |
| 7 GLOBAL / OUT_OF_SCOPE | 33 | — | — | OUT OF SCOPE |

## Lo que cambió respecto de mis auditorías previas

| # | Antes | Ahora | Causa |
|---|---|---|---|
| 1 | "3 relaciones sin compensación" | **2** | `Lote.producto` tiene compensación verificada `[C]` (§1.3) |
| 2 | `MovimientoStock.lote` = candidato de registro | **no registrable** | CE-1 `[E]` + verificación propia `[C]` (§1.2) |
| 3 | 23 con riesgo demostrable → candidatas | **12 clase 1 + 12 clase 2 + 5 clase 3** | la taxonomía separa lo registrable de lo que requiere mecanismo |
| 4 | — | 4 FK de padre nested = **cobertura ilusoria** | CE-2 `[E]` citado |

## Lo que NO hice

No agregué relaciones al registry. No convertí las 23 en implementación. No declaré B3 VERIFIED. No modifiqué código, registry, workflows ni contratos históricos. No hice commits ni push. No inferí el contenido de la política aprobada.

---

# 9. EVIDENCE INDEX

## `[C]` — verificado por mí en esta reconciliación

| Hecho | Ubicación |
|---|---|
| El texto de la política **no existe** en el repo | `grep -rln "Coverage Policy"` → 1 archivo (mi propio audit, que propone sin decidir); `grep "REGISTRY_REQUIRED"` → cero |
| El preflight recibe `client`, no `tx` | `src/prisma/empresa-scope.extension.ts:156` |
| `recibirCompra` crea `Lote` en tx y lo referencia | `src/compras/compras.service.ts:226, 228-230` |
| `RecepcionCompra` creada en tx y referenciada | `:214, :238` |
| **`Lote.create` tiene un solo sitio**; `productoId` de `compra.items` vía `getCompra(empresaId,…)` | `:185, :192, :219-226` |
| `recibirCompra` rechaza `compraItemId` ajeno con 404 | `:193-197` |
| `MovimientoStock.producto` recibe `productoId` del DTO | `:231, :374` |
| `verificarJerarquia` scoped antes de create y update | `src/catalogo/catalogo.controller.ts:95-100, 145-150` |
| `Compra.proveedor` validado con `findUnique` scoped | `src/compras/compras.service.ts:102` |
| Registry = 6 modelos / 10 relaciones, commiteado | `git show HEAD:apps/api/src/prisma/relation-ownership.ts` |
| El mecanismo exige destino con `empresaId` | extensión `:121-124` |
| Universo: 108 / 28 / 75 / 5; 50 E→E; 25 noE→E; 0 FK compuestas | computado en `09-TRANSFORMATION/25-RELATION-COVERAGE-INVENTORY` |

## `[E]` — citado (no observado por mí)

| Ref | Hecho | Fuente |
|---|---|---|
| CE-1 | **El cliente externo no ve filas no confirmadas de una tx abierta** → registrar relaciones same-tx produce falso rechazo | `09-TRANSFORMATION/25-RED-TEAM-RELATION-OWNERSHIP-COVERAGE-POLICY` §3.1 |
| CE-2 | El colector **no recoge** el FK del padre en nested create (`VentaItem.venta` ausente) | ídem §3.2 |
| — | 6 relaciones con `[E]` PASS | docs 12, 14, 16, 18, 30 |
| — | `ProductoProveedor` cerrado con 89 verdes | `13-AUDIT/30` |

## `[D]` — documentado

`03-DECISIONS/28-R8-ARCH-002` (12 propiedades; §6 abierto) · `03-DECISIONS/49` (`Legajo`/`DocumentoLegajo`) · `09-TRANSFORMATION/24` (opciones de política, OD-1..OD-6) · `09-TRANSFORMATION/25-RELATION-COVERAGE-INVENTORY` (las 75) · `09-TRANSFORMATION/25-RED-TEAM-…POLICY` (contraejemplos, T01-01/03/05) · `13-AUDIT/29, 30` (red team del slice).

## `[ND]`

| ID | Ítem |
|---|---|
| ND-1 | **Contenido de la política aprobada** — no está en el repositorio |
| ND-2 | Umbral que decide registry vs control de dominio (clases 1 vs 2) |
| ND-3 | Origen del `clienteId` en `Pedido.cliente` |
| ND-4 | Si `AplicacionPago.pago` referencia un `Pago` de la misma tx |
| ND-5 | Semántica de `Pago.deuda` |
| ND-6 | Suficiencia de `verificarNivelesCatalogo` (solo `[D]`) |
| ND-7 | Estado de los runs de CI hoy |

## Clases no emitidas

**`[T]` observado = 0** · **`[E]` observado = 0.** No ejecuté tests ni verifiqué runs.

---

**No modifiqué código, registry, workflows ni contratos históricos. No hice commits ni push. No agregué relaciones al registry. No convertí clasificaciones en implementación. No declaré B3 VERIFIED.**
