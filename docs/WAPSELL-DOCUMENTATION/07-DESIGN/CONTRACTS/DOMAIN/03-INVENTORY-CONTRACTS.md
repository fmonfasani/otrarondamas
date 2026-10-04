# Wapsell — Contracts / Inventory
**Fase:** Contracts 3.0 — Inventory · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> **Purpose:** convertir las direcciones de D-010 y D-014 en contratos observables, preservando estrictamente la diferencia entre requisito aprobado, evidencia AS-IS, gap de implementación y futura capa de invariantes.
>
> **Autoridad:** D-010 y D-014; D-001 como frontera de Business; D-008/D-015/D-016 únicamente donde generan efectos sobre Inventory.
>
> **No se crean decisiones, invariantes, tests, schema, migrations ni correcciones de código.**

---

## 1. C-INV-001 — Inventory ownership
**Source:** D-014.

**Contract candidate:** Inventory pertenece exclusivamente al Business correspondiente.

**Observable obligations**
- No existe stock global compartido entre Business.
- Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente.
- Una operación de un Business no puede convertir stock de otro Business en stock propio.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

## 2. C-INV-002 — Cross-Business transfer prohibition
**Source:** D-014 Owner ruling 2026-09-28.

Las transferencias de stock entre Business están prohibidas salvo una operación inter-Business definida y autorizada explícitamente en una especificación posterior.

**Observable obligations**
- No existe un flujo implícito de transferencia inter-Business.
- La ausencia de una autorización válida no puede interpretarse como permiso.
- La posible excepción futura requiere especificación explícita.

**Importante:** la prohibición actual no es OPEN DETAIL. La posible cláusula de escape sí lo es.

## 3. C-INV-003 — Business-scoped inventory operations
**Source:** D-001 + D-014.

Toda operación de Inventory se ejecuta dentro de un Business context válido.

- La operación debe corresponder al Business autorizado.
- No debe aceptar silenciosamente un Business distinto del contexto autorizado.
- El mecanismo técnico de aislamiento permanece fuera de este contrato.

## 4. C-INV-004 — Atomic stock movement
**Source:** D-010.

Las operaciones de movimiento de stock deben ser atómicas y concurrentemente seguras.

- Un movimiento no debe quedar parcialmente aplicado.
- Las existencias resultantes deben ser consistentes con el movimiento registrado.
- Las cantidades inválidas deben ser rechazadas conforme al ruling vigente de D-010.
- El mecanismo de transacción, locking o constraint no se determina aquí.

## 5. C-INV-005 — Stock validity
**Source:** D-010.

Wapsell no debe aceptar operaciones que produzcan cantidades de stock inválidas. El ruling vigente establece que las cantidades inválidas se rechazan sin excepción por Business.

El criterio exacto de cantidad inválida que requiera definición adicional permanece OPEN si no está especificado por D-010.

## 6. C-INV-006 — Movement/result consistency
**Source:** D-010.

Los movimientos y las existencias resultantes deben permanecer consistentes.

- Un movimiento confirmado debe corresponder a un cambio de existencia consistente.
- Una operación fallida no debe dejar solamente una parte del efecto.
- La relación física entre movimiento y existencia queda para Invariants e implementación.

## 7. C-INV-007 — Inventory effects from Commerce
**Source:** D-008 + D-014 + D-010.

Las operaciones comerciales que produzcan efectos de inventario deben hacerlo dentro del Business correspondiente y respetando los contratos de Inventory.

La confirmación de una Sale es la frontera comercial definida por D-008; el detalle exacto de efectos y timing queda para Commerce e Invariants.

## 8. C-INV-008 — Purchase inventory boundary
**Source:** D-015.

Una Purchase que genere recepción de productos puede producir efectos sobre Inventory dentro del Business correspondiente.

D-015 define Purchase, recepción y AP; no define aquí la implementación de recepción ni los movimientos concretos.

## 9. C-INV-009 — Fulfillment inventory boundary
**Source:** D-016.

Las operaciones de fulfillment que requieran información de disponibilidad o produzcan efectos de preparación/entrega deben respetar el Business ownership del Inventory.

No se decide aquí si reservar, descontar o restaurar stock en cada etapa.

## 10. AS-IS implementation evidence
La auditoría 10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md es read-only y no normativa.

Para D-014, el AS-IS verifica controles de aislamiento mediante una Prisma Client Extension, sobrescritura/filtros de empresaId, fail-closed en operaciones no contempladas y cobertura de modelos como Producto, Lote y MovimientoStock. Esto constituye VERIFIED BY CODE, no una garantía de cumplimiento TO-BE completa.

Para D-010, la auditoría clasifica la implementación como APPROVED REQUIREMENT + IMPLEMENTATION NON-COMPLIANT / GAP.

Por lo tanto, este contrato no declara D-010 cumplido.

## 11. D-010 implementation gap boundary
Los hallazgos AUD-* son evidencia de auditoría, no requisitos.

Entre los gaps documentados se encuentran ausencia de tests reales que protejan los controles, tipoMovimiento como texto libre, consolidación de stock en memoria y riesgos de consistencia derivados de claves desnormalizadas, además de otros hallazgos de integridad/transaccionalidad.

Este documento no prescribe ninguna corrección. La traducción de estos contratos a invariantes verificables pertenece a la siguiente capa.

## 12. AS-IS → GAP → DECISION → CONTRACT → OPEN DETAIL

| AS-IS / evidence | GAP | Decision | Contract | Open Detail |
|---|---|---|---|---|
| Inventory scoped through AS-IS Empresa | Canonical unit becomes Business | D-001/D-014 | C-INV-001/C-INV-003 | migration/physical isolation |
| No global stock feature | Ownership direction formalized | D-014 | C-INV-001 | physical model |
| No inter-Business transfer feature | Prohibition must remain explicit | D-014 | C-INV-002 | future exception specification |
| Request-level empresa scope verified | Full TO-BE authorization still depends on D-006 | D-006/D-014 | C-INV-003 | context mechanism |
| Stock movement controls exist but D-010 audit finds gaps | Required atomic/concurrent integrity not fully demonstrated | D-010 | C-INV-004 | DB/transaction mechanism |
| Invalid quantities need enforcement | Requirement exists; implementation evidence incomplete | D-010 | C-INV-005 | exact invalidity criteria |
| Movement and resulting stock can diverge under identified gaps | Consistency obligation needs formal invariant | D-010 | C-INV-006 | consistency invariant |
| Sale/Purchase/Fulfillment affect stock boundaries | Exact timing not fully defined | D-008/D-015/D-016 | C-INV-007/008/009 | effect timing |

## 13. Traceability

| Contract | Decision | TO-BE | Audit evidence | Invariant | Test |
|---|---|---|---|---|---|
| C-INV-001 | D-014 | 03-INVENTORY | AUD-D014-* | NOT CREATED | NOT CREATED |
| C-INV-002 | D-014 | 03-INVENTORY | AUD-D014-* | NOT CREATED | NOT CREATED |
| C-INV-003 | D-001/D-014 | 03-INVENTORY | AUD-D014-* | NOT CREATED | NOT CREATED |
| C-INV-004 | D-010 | 03-INVENTORY | AUD-D010-* | NOT CREATED | NOT CREATED |
| C-INV-005 | D-010 | 03-INVENTORY | AUD-D010-* | NOT CREATED | NOT CREATED |
| C-INV-006 | D-010 | 03-INVENTORY | AUD-D010-* | NOT CREATED | NOT CREATED |
| C-INV-007 | D-008/D-010/D-014 | 02-COMMERCE + 03-INVENTORY | AUD-D010-* | NOT CREATED | NOT CREATED |
| C-INV-008 | D-015 | 02-COMMERCE + 03-INVENTORY | AS-IS | NOT CREATED | NOT CREATED |
| C-INV-009 | D-016 | 02-COMMERCE + 03-INVENTORY | AS-IS | NOT CREATED | NOT CREATED |

## 14. Open Details
1. Physical inventory model.
2. Business-context propagation mechanism.
3. Exact definition of invalid stock quantity.
4. Transaction/locking mechanism.
5. Database-level integrity controls.
6. Movement type representation.
7. Movement/result consistency relation.
8. Reservation semantics.
9. Availability semantics.
10. Sale → inventory effect timing.
11. Purchase receiving → inventory effect timing.
12. Fulfillment → inventory effect timing.
13. Reversal/return inventory effects.
14. Lot lifecycle and expiry behavior.
15. Physical locations.
16. Inventory reporting.
17. Future inter-Business transfer exception specification.
18. Regression-test coverage required for D-010.
19. Concurrency-test strategy.
20. Reconciliation strategy.

## 15. Evidence classification

| Statement | Classification |
|---|---|
| Inventory belongs to Business | DOCUMENTED — D-014 |
| No global shared stock | DOCUMENTED — D-014 |
| Inter-Business transfer prohibited | DOCUMENTED — D-014 Owner ruling |
| Business isolation controls exist AS-IS | VERIFIED BY CODE — D-014 audit |
| D-010 implementation fully compliant | FALSE / NOT SUPPORTED |
| D-010 implementation has verified gaps | VERIFIED BY CODE — D-010 audit |
| Exact physical inventory schema | NOT DETERMINABLE |
| Exact transaction mechanism | NOT DETERMINABLE |
| Exact reservation model | NOT DETERMINABLE |
| Future transfer exception | NOT DETERMINABLE |

## 16. Closure
**Contracts 3.0 — Inventory: drafted.**

This layer preserves the critical distinction: D-010 approved requirement ≠ current implementation compliance; D-014 verified isolation ≠ complete TO-BE implementation.

No invariant, test, schema, migration, implementation change or conflict closure was created.

**Next contract group:** Cash + Payments boundary, followed by Messaging and Platform contracts.

---

# R5 Canonical Reconciliation — 2026-10-03

> Additive reconciliation against OR-B2/OR-B3 and the reconciled Inventory TO-BE. Historical contract text above is retained for traceability.

## R5-INVENTORY-001 — Reservation and physical decrement

A confirmed Order reserves stock. Physical stock decrement is represented by a registered stock-out movement representing actual physical stock exit.

This closes the conceptual timing rule without defining reservation records, movement schema, locking, transaction boundaries or implementation mechanics.

## R5-INVENTORY-002 — Stock integrity

Negative stock is prohibited. Products with expiry use FEFO; products without expiry use FIFO.

## R5-INVENTORY-003 — Location boundary

Inventory uses a generic Location concept. A MAIN location is the minimum conceptual requirement and multiple Locations are permitted. No separate Branch/Warehouse conceptual model is introduced by this reconciliation.

Physical Location model and cardinality remain OPEN.


## R8 ARCHITECTURE CLOSURE ADDENDUM — 2026-10-03

Inventory persistence is subject to the approved application-level tenant boundary:

- the effective Business Context is established by the application;
- inventory operations cannot use a client-supplied Business identifier to override context;
- inventory reads/writes must remain Business-scoped;
- related/nested stock persistence must preserve ownership;
- invalid or absent Business context fails closed;
- cross-Business inventory access is a negative verification requirement.

The existing Empresa-based implementation is AS-IS evidence and must be adapted incrementally; it is not the final authorization authority.

Authority: R8-ARCH-002. Exact transaction, locking and persistence mechanisms remain implementation detail.
