# RECONCILIACIÓN PROPUESTA B3 vs POLICY 51 — POST `Producto.subtipo`

**Naturaleza:** reconciliación **READ-ONLY**. **No se modificó ningún archivo. No hay commits ni push. No se declara B3 VERIFIED.**

**Base re-derivada:** repo `fmonfasani/otrarondamas` · branch `chore/build-in-ci` · HEAD `15d493f` (`docs(b3): close Producto.subtipo relation isolation slice`). Working tree limpio salvo el untracked preexistente `09-TRANSFORMATION/32-…` (no lo toqué).

**Política canónica:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.

**Evidencia:** `[C]` código · `[T]` test · `[E]` ejecución · `[D]` documentado · `[ND]` no determinable. Todo `[E]` de CI está **citado** desde los cierres (`[D]`); yo no ejecuté tests ni verifiqué runs. Lo único que verifiqué por ejecución propia es lectura: schema, registry, greps de código y existencia/contenido de commits (`git show --stat` `[C]`).

---

## 1. GLOBAL COVERAGE VERDICT

**B3 GLOBAL: NOT VERIFIED.**

Fundamento §51.9, con números re-derivados del repo actual:

| Condición §51.9 | Estado re-derivado |
|---|---|
| (a) registradas con `[T]`+`[E]` | **14 de 75** |
| (b) no registradas con análisis individual suficiente, criterio estricto | **4 de 61** (solo FK de padre nested, E-1 NO por clase §5) |
| ninguna en “sin análisis” | **NO CUMPLIDO — 47 pendientes de análisis individual** |

Cobertura del registry: **14/75 (18,7%)**. Relaciones con análisis individual completo (registradas + E-1 NO factual + E-4 NO documentado + candidata analizada): **25/75**; el resto requiere trabajo o aclaración del Owner (detalles en §10).

---

## 2. UNIVERSO TOTAL ACTUAL — RE-DERIVADO `[C]`

Parser propio sobre `apps/api/prisma/schema.prisma` (1.128 líneas):

- Modelos: **42**; con `empresaId`: **28**.
- Relaciones con FK en el origen: **108** = **28** → `Empresa` + **75** → modelo con `empresaId` (excluida `Empresa`) + **5** → modelo sin `empresaId`.
- **Cero FK compuestas** (grep `fields:[..,..]` sin resultados) → **E-3 = sí para las 75** `[C]`.
- **Universo Policy 51 = 75.** Coincide con la cifra de referencia de §51.2, pero esta vez **re-derivada**, no citada.

Las 5 fuera del universo (destino sin `empresaId`): `DocumentoLegajo.legajo→Legajo`, `ArqueoCaja.aperturaCaja`, `MovimientoCaja.aperturaCaja`, `CierreCaja.aperturaCaja` (→`AperturaCaja`), `UsuarioPermiso.permiso→Permiso`.

## 3. REGISTRY ACTUAL — RELEÍDO `[C]`

`apps/api/src/prisma/relation-ownership.ts:21-29` en HEAD `15d493f`:

```
VentaItem: ['producto', 'reglaFidelizacion']            (2)
PedidoItem: ['producto', 'reglaFidelizacion']           (2)
CompraItem: ['producto']                                (1)
DevolucionProveedorItem: ['producto', 'lote']           (2)
Producto: ['familia', 'subfamilia', 'tipo', 'subtipo']  (4)
ProductoProveedor: ['producto', 'proveedor']            (2)
Lote: ['producto']                                      (1)
```

**Registry actual: 7 modelos / 14 relaciones.** Antes del slice: 7/13. El único cambio es `+ 'subtipo'` (commit `bcc89b8`, verificado con `git show --stat` `[C]`).

---

## 4. TABLA COMPLETA DE RELACIONES RELEVANTES

Convención: **E-3 y pertenencia al registry re-derivadas `[C]`**. E-1/E-2/clasificación de filas no re-auditadas se heredan del doc 32 como **`[D]`** y quedan marcadas pendientes; **no se presentan como verificadas**.

### 4.1 REGISTRY_REQUIRED — registradas y verificadas (14)

| Relación | E-1 | E-2 | E-3 | E-4 | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| VentaItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 12, 17/17 `[D]` | VERIFIED WITH LIMITATIONS |
| VentaItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 18 Gate 6.3 `[D]` | VERIFIED WITH LIMITATIONS |
| PedidoItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 14, run `37217710481` `[D]` | VERIFIED WITH LIMITATIONS |
| PedidoItem.reglaFidelizacion → ReglaFidelizacion | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` doc 16 Gate 6.2 `[D]` | VERIFIED WITH LIMITATIONS |
| CompraItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0, doc 27 `[D]` | VERIFIED WITH LIMITATIONS |
| DevolucionProveedorItem.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0 `[D]` | VERIFIED WITH LIMITATIONS |
| DevolucionProveedorItem.lote → Lote | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` 97/0 `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.familia → Familia | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` run #21 `37249813759`, 113/0 `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.subfamilia → Subfamilia | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` run #21, 113/0; baseline 6 fallos/2 pass `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.tipo → Tipo | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` run #21, job `111574995363`, 113/0 `[D]` | VERIFIED WITH LIMITATIONS |
| **Producto.subtipo → Subtipo** | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` cierre 34: baseline 6/8 fallos, candidato 8/8, CI run `37251097001` / job `111578714578`, 121/0, build OK `[D]`; commits `bcc89b8` + `15d493f` verificados `[C]` | **VERIFIED WITH LIMITATIONS** |
| ProductoProveedor.producto → Producto | **no** | sí | sí | **no** | REGISTRY_REQUIRED (reserva) | `[E]` doc 25, 89/0 `[D]` | CLOSED con reserva — ver §9 |
| ProductoProveedor.proveedor → Proveedor | **no** | sí | sí | **no** | REGISTRY_REQUIRED (reserva) | `[E]` doc 25 `[D]` | CLOSED con reserva — ver §9 |
| Lote.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | `[E]` LP-01..08, 97/0 `[D]` | VERIFIED WITH LIMITATIONS |

### 4.2 REGISTRY_REQUIRED — analizada, pendiente de slice (1)

| Relación | E-1 | E-2 | E-3 | E-4 | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| MovimientoStock.producto → Producto | sí | sí | sí | sí | REGISTRY_REQUIRED | análisis doc 32 §E.1 `[D]` + 4 `movimientoStock.create` re-verificados `[C]` (`compras.service.ts:228,374`; `inventario.service.ts:238,337`) | **ABIERTA — candidata, NO implementar ahora** |

### 4.3 TRANSACTION_MECHANISM_REQUIRED — E-4 falla (4)

| Relación | E-1 | E-2 | E-3 | E-4 | Clasificación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| MovimientoStock.lote → Lote | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]` `tx.lote.create` (`compras.service.ts:226`) referenciado en `:228-232`; preflight con `client`, no `tx` `[D]`; `[E]` CE-1 citado | **BLOCKED** |
| MovimientoStock.recepcionCompra → RecepcionCompra | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]`+`[D]` doc 32 | BLOCKED |
| AuditLog.venta → Venta | sí | sí | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[C]`+`[D]` doc 32 | BLOCKED |
| AplicacionPago.pago → Pago | no | `[ND]` | sí | **NO** | TRANSACTION_MECHANISM_REQUIRED | `[ND]` | BLOCKED — sin análisis |

### 4.4 DOMAIN_CONTROL_REQUIRED — E-2 `[ND]` (16, pendientes)

E-1 sí / E-2 `[ND]` / E-3 sí / E-4 sí `[D]` doc 32. Ninguna tiene análisis individual: `ReglaFidelizacion.familia`, `ReglaFidelizacion.subfamilia`, `ReglaFidelizacion.tipo`, `ReglaFidelizacion.subtipo`, `Compra.proveedor`, `Venta.cliente`, `Pedido.cliente`, `DevolucionProveedor.compra`, `DevolucionProveedor.proveedor`, `PagoProveedor.compra`, `PagoProveedor.proveedor`, `RecepcionCompra.compra`, `AperturaCaja.caja`, `ArqueoCaja.caja`, `MovimientoCaja.caja`, `ArqueoCaja.usuarioEntrante`. **Estado: pendientes.**

### 4.5 DERIVED_OWNERSHIP (22: 4 analizadas + 18 pendientes)

Analizadas, E-1 NO (FK inyectada por Prisma, cobertura ilusoria `[D]` doc 25-RED-TEAM CE-2): `VentaItem.venta`, `PedidoItem.pedido`, `CompraItem.compra`, `DevolucionProveedorItem.devolucion`. **Cuentan para §51.9.b estricto.**

Pendientes (18, clase `[D]` doc 32, E-1/E-2 sin análisis individual): `AperturaCaja.usuario`, `ArqueoCaja.autorizacion`, `ArqueoCaja.usuario`, `AuditLog.autorizacion`, `AuditLog.usuario`, `Autorizacion.autorizador`, `CierreCaja.usuario`, `Compra.usuario`, `DevolucionProveedor.usuario`, `MovimientoCaja.usuario`, `MovimientoStock.usuario`, `Pago.pedido`, `Pago.usuario`, `Pago.venta`, `PagoProveedor.usuario`, `Pedido.usuario`, `RecepcionCompra.usuario`, `Venta.usuario`.

### 4.6 AMBIGUOUS / bloqueadas documentadas (3)

| Relación | Estado |
|---|---|
| Legajo.usuario → Usuario | BLOCKED — depende de `03-DECISIONS/49` `[D]` |
| Legajo.cliente → Cliente | BLOCKED — ídem `[D]` |
| Pago.deuda → CuentaCorriente | BLOCKED — semántica `[ND]` (`schema.prisma:783-784` `[C]`) |

### 4.7 NO_CURRENT_WRITE_SURFACE (15: 3 analizadas + 12 pendientes)

Analizadas (ver §6): `Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia`.
Pendientes (12): `AplicacionPago.deuda`, `CuentaCorriente.cliente`, `Deuda.cliente`, `Deuda.cuentaCorriente`, `Deuda.venta`, `Entrega.pedido`, `Entrega.preparador`, `Entrega.repartidor`, `Notificacion.pedido`, `Presentacion.producto`, `UsuarioPermiso.usuario`, `Invitacion.invitadoPor`.

**Control de suma: 14 + 1 + 4 + 16 + 22 + 3 + 15 = 75.** ✓

---

## 5. ESTADO DE LAS CUATRO RELACIONES PRODUCTO

| Relación | E-1..E-4 | Evidencia | Estado |
|---|---|---|---|
| Producto.familia | sí ×4 | `[E]` run #21 `37249813759`, 113/0 `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.subfamilia | sí ×4 | `[E]` run #21, 113/0; baseline 6 fallos/2 pass `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.tipo | sí ×4 | `[E]` run #21 job `111574995363`, 113/0 `[D]` | VERIFIED WITH LIMITATIONS |
| Producto.subtipo | sí ×4 | `[E]` cierre 34: baseline ST 6 fallos/2 pasan (ST-02, ST-03, ST-05, ST-07 y segmento P2025 de ST-08 `RESOLVED`; ST-06 `P2003`; ST-01/ST-04 pasan); candidato ST-01..ST-08 8/8; regresión Producto-Tipo 8/8; CI run `37251097001`, job `111578714578`, **121 tests / 0 fallos**, build success `[D]`; fix `bcc89b8` y cierre `15d493f` verificados en repo `[C]` | **VERIFIED WITH LIMITATIONS** |

**Catálogo Producto 4/4 ramas registradas.** Limitaciones comunes vigentes (cierres 29/31/34): `verificarJerarquia` protege la ruta HTTP, no la capacidad; no cubierto `[E]`: nested/`connect`/`upsert`/`updateMany`/raw/SQL/HTTP real; TOCTOU `[ND]`; la integridad inter-nivel depende de relaciones no registradas (ver §6).

## 6. ESTADO DE LAS TRES INTER-NIVEL

Re-verificación propia `[C]`:

- `jerarquia-catalogo.controller.ts`: **solo lectura** — cuatro `findMany` (`:32-35`), cero escrituras; su comentario declara carga vía `seed.ts` (`:8-13`).
- Grep en `apps/api/src`: **cero** `(db|tx).(subtipo|tipo|subfamilia|familia).(create|update|createMany|updateMany|upsert)(`. (Los writers de `Subtipo` vía `seed.ts` con `PrismaClient` propio constan en doc 33 `[D]`, no re-verificados por mí.)

| Relación | E-1 | Clasificación | Estado |
|---|---|---|---|
| Subtipo.tipo → Tipo | **no** | NO_CURRENT_WRITE_SURFACE | análisis factual completo; **MONITOR** |
| Tipo.subfamilia → Subfamilia | **no** | NO_CURRENT_WRITE_SURFACE | ídem |
| Subfamilia.familia → Familia | **no** | NO_CURRENT_WRITE_SURFACE | ídem |

**Matiz de política (importante):** `NO_CURRENT_WRITE_SURFACE` **no es una clase de §51.5** (lista cerrada del Owner). El análisis factual cumple el fondo de §51.9.b (documenta por qué E-1 no se cumple), pero el encuadre canónico queda **OPEN / OWNER CLARIFICATION**: o se acepta E-1=falso como análisis suficiente, o el Owner agrega la clase. **Next action: ninguna** hasta que aparezca un CRUD de jerarquía.

## 7. ESTADO DE MovimientoStock.producto

- 4 `create`, todos en `$transaction`, re-verificados `[C]` (§4.2).
- E-1 **sí**: `crearDevolucion` persiste `item.productoId` del DTO (`compras.service.ts:374-384` `[C]`; ausencia de validación compensatoria según doc 32 §E.1 `[D]`).
- E-2 **sí** `[D]`; E-3 **sí** `[C]`; E-4 **sí** `[D]` (destino preexistente en los cuatro sitios; ninguno crea `Producto` en la misma tx).
- **REGISTRY_REQUIRED — ABIERTA, candidata #1, NO implementar en esta reconciliación.**
- Advertencia §51.8.4: 3 flujos (recepción, ajuste, devolución); el slice deberá traer los positivos de los tres.

## 8. ESTADO DE MovimientoStock.lote

- E-1 sí / E-2 sí / E-3 sí / **E-4 NO** → **TRANSACTION_MECHANISM_REQUIRED — BLOCKED**.
- Re-verificado `[C]`: `recibirCompra` crea el `Lote` en la tx (`compras.service.ts:226`) y lo referencia (`:228-232`); el preflight usa el cliente base, no `tx` (`[D]` doc 32 + `[E]` CE-1 citado: falso rechazo con `P2025`).
- **No cambiar esta clasificación sin evidencia nueva.** §51.6.1 taxativo: otro write path con destino confirmado no basta.
- Asimetría registrada: `DevolucionProveedorItem.lote` sí está en el registry porque allí el `Lote` llega del DTO preexistente — el registry es por relación, no por ruta (limitación estructural `[C]`+`[D]`).

## 9. ESTADO DE ProductoProveedor — OPEN POLICY QUESTION

- Registry contiene `ProductoProveedor: ['producto','proveedor']` `[C]`.
- **Cero** escrituras `productoProveedor.*` en `apps/api/src` `[C]`; el cierre 25 §10.3 ya lo había constatado `[D]`.
- E-1 **no** (sin write path actual) / E-4 **no** (reserva) `[C]`+`[D]`; aun así registrada y con `[E]` 89/0 (PP-01..PP-06) `[D]`.
- **Documentación exigida:** mantener ambas entradas como `REGISTRY_REQUIRED (reserva)` + `CLOSED con reserva`, con la nota explícita: *“entrada preventiva sin vector productivo actual; su admisibilidad bajo §51 (E-1 exige superficie de escritura) es una pregunta abierta al Owner (doc 24 OD-2, doc 27 §4.1). No remover ni ‘regularizar’ unilateralmente.”*
- Riesgo si se remueve sin decisión: se pierde la única protección ejecutada sobre esa capacidad futura; riesgo si se conserva sin aclaración: precedente de entradas preventivas.

## 10. CANTIDADES

- **Registry:** 14 relaciones / 7 modelos.
- **Individualmente analizadas (no registradas):** 11 — E-1 NO: 4 nested + 3 inter-nivel (encuadre canónico open) · E-4 NO: 3 (`MovimientoStock.lote`, `MovimientoStock.recepcionCompra`, `AuditLog.venta`) · analizada pendiente de slice: 1 (`MovimientoStock.producto`).
- **Documentadas-bloqueadas (análisis parcial, no §51.9.b):** 3 (`Legajo.usuario`, `Legajo.cliente`, `Pago.deuda`).
- **Pendientes de análisis individual:** **47** (16 DOMAIN_CONTROL + 18 DERIVED + 12 NO_WRITE_SURFACE + `AplicacionPago.pago`).
- Control: 14 + 11 + 3 + 47 = **75**. ✓

## 11. PRÓXIMO SLICE RECOMENDADO

**`MovimientoStock.producto → Producto`.** (Recomendar ≠ implementar.)

## 12. JUSTIFICACIÓN

- Es la **única** relación con E-1..E-4 cumplidos y sin registrar (§4.2).
- Cierra el inventario pendiente tras completar el catálogo 4/4; es el candidato #2 natural del doc 32, ahora promovido por cierre de `subtipo`.
- Condiciones de admisión §51.7: análisis específico preexistente (doc 32 §E.1) + re-verificación de los 4 `create` en esta reconciliación.
- Evidencia a producir (§51.8): `[C]` entrada + 4 write paths con línea; `[T]` candidato (positivo mismo-Business, rechazo cross sin persistencia, update, forma transaccional, sin persistencia parcial, destino inexistente); `[E]` baseline sin cambio + con cambio en CI con regresiones; §51.8.4: positivos de los **tres** flujos.
- Diferencia con `MovimientoStock.lote`: aquella tiene E-4 NO probado; esta no. No son intercambiables.

## 13. RIESGOS / PREGUNTAS ABIERTAS

1. **Entradas preventivas (ProductoProveedor):** ¿admite §51 entradas sin vector productivo? → OWNER CLARIFICATION.
2. **Clase NO_CURRENT_WRITE_SURFACE:** ¿E-1=falso basta para §51.9.b sin clase §5? → OWNER CLARIFICATION.
3. **E-4 bloqueadas:** ¿cómo computan para §51.9 si E-1/E-2 sí se cumplen pero el mecanismo las bloquea? → OWNER CLARIFICATION (propongo categoría “analizada-bloqueada” como tercer estado documentado).
4. **TOCTOU del preflight** `[ND]`, común a las 14 registradas.
5. **Superficie no cubierta `[E]`** en todos los slices: nested/`connect`/`upsert`/`updateMany`/raw/HTTP real.
6. **`AplicacionPago.pago`** `[ND]`: sin verificar si referencia un `Pago` de la misma tx.
7. **Semántica `Pago.deuda`** `[ND]` (`schema.prisma:783-784`).
8. **`Legajo.*`** bloqueado por decisión 49.
9. **Comentario desactualizado** `empresa-scope.extension.ts:33-37` (“hoy solo VentaItem→Producto” con 14 registradas) — no tocado, reportado.
10. **Doc 32 untracked** en el working tree: snapshot pre-`subtipo`, ya superado en los hechos (ver §14).

## 14. RECOMENDACIÓN SOBRE EL DOCUMENTO 32

**Crear una nueva reconciliación (p. ej. `35-B3-COVERAGE-RECONCILIATION-POST-SUBTIPO-2026-10-05.md`), sin actualizar ni reemplazar el 32. Motivos:**

1. El 32 es un **snapshot pre-`subtipo`** (registry 13, `subtipo` abierto como candidato #1); hoy esos dos hechos cambiaron (`15d493f`).
2. Está **untracked** y refleja el estado en `9f7abb8`; editarlo reescribiría la traza de auditoría.
3. Reemplazarlo eliminaría la baseline contra la que se mide el progreso (13→14, candidato #1→cerrado).
4. El nuevo documento debe citar al 32 como *superseded snapshot*, incorporar los cierres 33/34 y esta reconciliación, y heredar sus §D–F como `[D]` pendiente de re-auditoría individual.

**Cumplimiento del encargo:** no implementé código; no toqué registry, tests, schema, workflow, contracts/invariants/architecture; no creé slices; no modifiqué el documento 32; no hice commits ni push; no declaré B3 VERIFIED.
