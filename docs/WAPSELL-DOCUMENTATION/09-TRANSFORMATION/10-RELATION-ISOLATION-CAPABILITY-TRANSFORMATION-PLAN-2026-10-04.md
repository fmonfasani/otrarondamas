# Relation Isolation Capability v0.1 — Transformation Plan

**Fecha:** 2026-10-04  
**Estado:** PLAN — OWNER AUTHORIZED FOR STEPWISE EXECUTION  
**Tipo:** Transformation / Controlled Implementation Plan  
**Ámbito:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Implementación de producto:** NO INICIADA

## 1. Objetivo

Cerrar incrementalmente el gap demostrado por TE-B3-001, transformando el aislamiento actual basado principalmente en ownership directo por empresaId hacia un aislamiento tenant-aware que también gobierne relaciones persistentes entre recursos de distintos Business.

Este plan es una línea de transformación acotada. No autoriza rediseños ajenos al problema.

## 2. AS-IS trigger

TE-B3-001 demostró por ejecución real que Business A puede persistir una Venta A cuyo VentaItem referencia un Producto B.

Estado conocido:

- direct empresaId isolation: existente;
- unique lookup isolation: existente;
- transaction context: existente;
- unsupported top-level operations: fail-closed existente;
- nested/related relation isolation: incompleto;
- TE-B3-001: FAIL.

## 3. Alcance

### IN SCOPE

1. Auditoría de ownership relacional.
2. Matriz de relaciones tenant-aware.
3. Contrato técnico de relation isolation.
4. Diseño de enforcement reusable.
5. Implementación incremental.
6. Cobertura inicial Venta → VentaItem → Producto.
7. Tests positivos/negativos.
8. Verificación de ausencia de persistencia parcial.
9. Extensión solo a relaciones confirmadas por auditoría.
10. Regresión B3 y clasificación de evidencia.

### OUT OF SCOPE

- User/Membership redesign;
- Business/Tenant redesign;
- JWT;
- autorización funcional;
- migraciones de datos;
- schema changes salvo necesidad demostrada;
- cambios de producto ajenos;
- parches específicos por módulo sin justificación;
- deploy;
- cambios destructivos;
- declarar B3 VERIFIED antes de ejecutar la evidencia correspondiente.

## 4. Gates

### Gate 0 — Baseline
Registrar estado reproducible de B3/B4 y TE-B3-001. Evidence: [E].

### Gate 1 — Relation Ownership Audit
Inspeccionar schema, tenant extension, scoped factory, servicios con nested writes, FK tenant-aware, transacciones y raw SQL.

Output:
Parent → Child → Related Resource → Ownership → Mechanism → Exposure → Evidence → Disposition.

### Gate 2 — Technical Contract
Definir Business Context, ownership resolution, same-Business allow, cross-Business reject, fail-closed, transaction preservation, no partial persistence y no client-controlled ownership.

### Gate 3 — Mechanism Design
Evaluar mecanismo reusable, centralizable, nested-write aware, fail-closed, transaction-safe y extensible. No asumir la solución antes de Gate 1.

### Gate 4 — Minimal Implementation
Primero Venta → VentaItem → Producto.

### Gate 5 — Persistence Integrity
Cross-Business rejection debe dejar Venta, VentaItem y recurso externo sin cambios.

### Gate 6 — Coverage Expansion
Agregar solo relaciones confirmadas por la matriz.

### Gate 7 — B3 Regression
Reejecutar tests B3 aplicables y clasificar PASS/FAIL/CONDITIONAL/NOT TESTABLE.

### Gate 8 — Evidence Closure
Separar [C], [T], [E], [D] y [ND]. No promover invariantes por inferencia.

## 5. Invariantes

**RI-01:** el cliente no establece Business Context mediante empresaId.

**RI-02:** una relación tenant-aware solo conecta recursos del Business efectivo.

**RI-03:** relaciones válidas same-Business continúan funcionando.

**RI-04:** relaciones cross-Business son rechazadas/no disponibles según contrato.

**RI-05:** una operación rechazada no deja persistencia parcial.

**RI-06:** relaciones sin estrategia de ownership conocida fallan cerradas.

**RI-07:** el enforcement es reusable y no duplicado por módulo.

**RI-08:** el Business Context se conserva dentro de transacciones.

## 6. Constraint técnico descubierto

El aislamiento actual usa Prisma Client Extension. La documentación de Prisma establece que el componente query no soporta nested read/write operations como hooks independientes.

Por lo tanto, no se asumirá que otro $allModels.$allOperations resolverá automáticamente nested operations. La solución puede inspeccionar el payload top-level, pero deberá representar explícitamente el ownership relacional o usar otra frontera reusable.

**Estado:** OPEN — resolver en Gate 3.

## 7. Candidatos, aún no aprobados

- Registry declarativo de relaciones + preflight.
- Persistence boundary wrapper.
- Enfoque híbrido manteniendo direct scope y agregando relation enforcement.

La elección queda abierta hasta cerrar el contrato técnico.

## 8. Regla de trabajo

AUDIT → CONTRACT → DESIGN → IMPLEMENT → TEST → REGRESSION → EVIDENCE.

No producción durante Gate 1. No schema/migrations sin evidencia específica. No ampliar alcance por hallazgos adyacentes.

## 9. Success criteria

La capability v0.1 solo se considera completada cuando el mecanismo está implementado, TE-B3-001 pasa en ejecución real, el positivo pasa, no existe persistencia parcial, regresions pasan y la cobertura/evidencia quedan documentadas.

Esto no implica automáticamente B3 VERIFIED.

## 10. Trazabilidad

Trigger: TE-B3-001 + ejecución B3.

Fuentes: empresa-scope.extension.ts, schema.prisma, EmpresaScopedPrismaService, B3 Persistence Isolation Contract T-01 y B3 Tests/Evals.

Transformation layer: docs/WAPSELL-DOCUMENTATION/09-TRANSFORMATION/.
