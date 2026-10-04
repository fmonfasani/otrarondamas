# Relation Isolation Capability v0.1 — Gate 8 Evidence Closure

**Fecha:** 2026-10-04  
**Estado:** EVIDENCE CLOSURE — COVERED SLICES VERIFIED; GLOBAL B3 NOT VERIFIED  
**Ámbito:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Branch:** `fix/gate-6-1-pedidoitem-producto`

## 1. Propósito

Este documento cierra el Gate 8 de la transformación incremental de relation isolation con la evidencia realmente disponible.

El cierre distingue estrictamente:

- evidencia de código `[C]`;
- evidencia de tests ejecutados `[T]`;
- evidencia de ejecución real sobre infraestructura PostgreSQL/CI `[E]`;
- documentación/decisiones aprobadas `[D]`;
- aspectos no determinables con la evidencia disponible `[ND]`.

Este cierre **no declara B3 global VERIFIED** y no promueve por inferencia los invariantes o criterios que no fueron ejecutados.

## 2. Baseline y secuencia de evidencia

La secuencia de transformación verificada es:

1. Gate 4: `VentaItem → Producto` — implementación mínima y evidencia de ejecución.
2. Gate 6.1: `PedidoItem → Producto` — gap confirmado por ejecución, fix mínimo y verificación.
3. Gate 6.2: `PedidoItem → ReglaFidelizacion` — gap confirmado por ejecución, fix mínimo y verificación.
4. Gate 6.3: `VentaItem → ReglaFidelizacion` — gap confirmado por Run #61, fix mínimo y verificación por Run #62.
5. Gate 7: regresión B3 sobre la infraestructura B4 — Run #62 SUCCESS.

La regla aplicada fue:

**test first → classify → minimal fix → rerun → verify.**

## 3. Gate 6.3 — evidencia cerrada

### 3.1 Gap confirmado

Run #61:

- GitHub Actions run: `37219467529`
- Run number: **61**
- Workflow: **B4 Verification Infrastructure**
- Resultado: **FAILURE**
- Tests: 40 total; 34 PASS; 6 FAIL.

Los seis casos fallidos fueron:

- V-02 — nested `Venta.create` con Regla B;
- V-03 — `VentaItem.create` con Regla B;
- V-04 — `VentaItem.createMany` con Regla B;
- V-05 — mixed nested write;
- V-06 — nested `Venta.update`;
- V-08 — interactive transaction.

V-01 y V-07 pasaron.

**Clasificación:** CONFIRMED GAP [E].

### 3.2 Fix mínimo

Commit:

`520a6ef315f7e49d5284fd867de4c38641e5a192`

Cambio único de producción:

```ts
VentaItem: ['producto', 'reglaFidelizacion'],
PedidoItem: ['producto', 'reglaFidelizacion'],
```

No se modificaron schema, migrations, fixtures, CI ni el mecanismo genérico de relation ownership.

### 3.3 Verificación posterior

Run #62:

- GitHub Actions run: `37219761177`
- Run number: **62**
- Workflow: **B4 Verification Infrastructure**
- Job: `api-verification`
- Resultado: **SUCCESS**
- `npm test`: SUCCESS
- `npm run test:e2e`: SUCCESS.

La ejecución posterior verifica los casos de Gate 6.3 y la regresión de la suite B3.

**Gate 6.3: VERIFIED BY EXECUTION [E].**

## 4. Gate 7 — B3 Regression

Run #62 ejecutó:

- generación Prisma;
- `prisma db push` sobre PostgreSQL descartable;
- tests unitarios;
- tests de integración/E2E configurados por B4.

El job `api-verification` terminó **SUCCESS** y los pasos de `npm test` y `npm run test:e2e` terminaron **SUCCESS**.

**Gate 7: PASS [E].**

Esta evidencia demuestra ausencia de regresión en las suites ejecutadas sobre el estado que contiene el fix de Gate 6.3.

No significa que todos los criterios históricos de B3 hayan sido ejecutados: el cierre de G7 se limita a la regresión efectivamente ejecutada por la infraestructura disponible.

## 5. Evidence Matrix

| Área | Evidencia | Clase | Estado |
|---|---|---|---|
| Registry relation ownership | Código declara `VentaItem → Producto` y `VentaItem → ReglaFidelizacion` | [C] | VERIFIED |
| DMMF traversal | Mecanismo reusable inspeccionado en código | [C] | VERIFIED |
| Gate 6.1 | `PedidoItem → Producto` | [E] | VERIFIED |
| Gate 6.2 | `PedidoItem → ReglaFidelizacion` | [E] | VERIFIED |
| Gate 6.3 pre-fix | Cross-Business persistence aceptada | [E] | CONFIRMED GAP |
| Gate 6.3 post-fix | V-01…V-08 + suite ejecutada | [E] | VERIFIED |
| Persistence negative behavior | Rechazo de casos cross-Business y ausencia de persistencia parcial en los casos cubiertos | [E] | VERIFIED FOR COVERED SLICES |
| Transaction behavior | V-08 ejecutado dentro de `$transaction` | [E] | VERIFIED FOR GATE 6.3 |
| B3 regression | Run #62 | [E] | PASS |
| Technical contract T-01 | Decisiones y reglas de isolation | [D] | APPROVED |
| Global B3 invariant set | ISO-001…ISO-009 | [D] | SPECIFICATION SOURCE |
| B3 global verification | Todos los criterios canónicos | [ND] / NOT EXECUTED | NOT VERIFIED |
| Legajo/DocumentoLegajo | ISO-009 / TE-B3-009 | [ND] | NOT VERIFIED |
| Raw SQL full surface | TE-B3-006 | [ND] | NOT VERIFIED |
| Path independence complete | TE-B3-008 | [ND] | NOT VERIFIED |
| Inherited B1 execution set | TE-ID-004…011 | [ND] | NOT VERIFIED as a complete set |

## 6. What is actually closed

Queda cerrado con evidencia de ejecución:

- relation ownership mechanism para las relaciones registradas;
- Gate 4 slice;
- Gate 6.1;
- Gate 6.2;
- Gate 6.3;
- Gate 7 regression;
- ausencia de regresión observable en las suites ejecutadas por B4.

La capability incremental demostrada puede expresarse como:

```
VentaItem  → Producto
PedidoItem → Producto
PedidoItem → ReglaFidelizacion
VentaItem  → ReglaFidelizacion
```

Estas aristas tienen evidencia de ejecución real.

## 7. What remains open

No se declara cerrado:

1. **B3 global tenant isolation.**
2. Cobertura exhaustiva de todas las relaciones tenant-aware identificadas por la auditoría.
3. TE-B3-006 / ISO-006 completo, especialmente la superficie raw SQL definida por la matriz canónica.
4. TE-B3-008 / ISO-008 como propiedad completa de independencia de path.
5. TE-B3-009 / ISO-009 para Legajo/DocumentoLegajo.
6. Criterios heredados B1 que no cuentan con ejecución específica registrada.
7. P12 como gate global de negative verification, si la matriz canónica exige la ejecución del conjunto completo.

Estos puntos permanecen abiertos porque no existe evidencia suficiente para promoverlos a VERIFIED.

## 8. No inferencias permitidas

El siguiente razonamiento queda explícitamente prohibido:

> "Las cuatro relaciones verificadas funcionan, por lo tanto B3 completo está VERIFIED."

No es válido.

También queda prohibido:

> "La suite B3 pasó, por lo tanto todos los invariantes ISO-001…ISO-009 están verificados."

Tampoco es válido.

El resultado correcto es:

> **Covered relation-isolation slices: VERIFIED [E].**  
> **B3 global tenant isolation: NOT VERIFIED.**

## 9. Scope control

Este cierre no:

- modifica schema;
- crea migrations;
- rediseña User/Membership;
- modifica JWT;
- redefine Business/Tenant;
- modifica autorización funcional;
- modifica seed;
- amplía el registry fuera de las relaciones ejecutadas;
- declara éxito sobre relaciones no verificadas;
- realiza deploy;
- realiza cambios destructivos.

## 10. Gate 8 verdict

**GATE 8 — EVIDENCE CLOSURE: CLOSED FOR THE EXECUTED RELATION-ISOLATION SLICES.**

Evidence classification:

- **[C]** mechanism and registry: verified by code inspection;
- **[E]** Gates 6.1, 6.2, 6.3 and Gate 7: verified by real CI/PostgreSQL execution;
- **[D]** contract, owner decisions and transformation plan: documented/approved;
- **[ND]** remaining global B3 criteria and unexecuted surfaces.

### Final transformation state

**Relation Isolation Capability v0.1:**  
**VERIFIED FOR EXECUTED/COVERED SLICES [E] — GLOBAL CLOSURE PENDING EXPANDED COVERAGE.**

**B3 Tenant Isolation:**  
**NOT VERIFIED GLOBALLY.**

No invariant or canonical Test/Eval criterion is promoted to VERIFIED solely by inference from this document.
