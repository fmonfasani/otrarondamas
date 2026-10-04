B3 — TENANT ISOLATION INVARIANTS
## PARALLEL CONTEXT 1 — NORMATIVE DERIVATION & RECONCILIATION

### OBJETIVO

Derivar el conjunto de invariants B3 a partir del resultado ya obtenido en:

B3 — Tenant Isolation Contracts

El resultado de Contracts fue:

VERDICT: READY WITH RECONCILIATION

Hallazgo principal:

B3 es mayoritariamente EXTEND, no NEW.

La mayoría de las 12 propiedades de R8-ARCH-002 ya están cubiertas por contratos existentes y deben extenderse, no duplicarse.

No crear un segundo contrato general de Tenant Isolation.

### ESTADO DEL CONTRATO B3

Los candidatos contractuales identificados son:

- B3-CON-014/015 — ownership DERIVED
- B3-CON-017/018 — validación de FK de entrada
- B3-CON-019 — ownership AMBIGUOUS
- B3-CON-022/023/024 — frontera pre-contexto vs bypass
- B3-CON-012 — operaciones nested prospectivas/condicionales

El resultado de Contracts determinó:

- 24 candidatos contractuales;
- 4 EXISTING;
- 9 EXTEND;
- 1 ADAPT;
- 9 NEW;
- 1 OPEN TECHNICAL DETAIL;
- 12/12 propiedades de R8-ARCH-002 cubiertas;
- 13/13 gaps + R4 + R14 cubiertos;
- 17/17 vectores cross-tenant cubiertos;
- 0 Owner Decisions requeridas;
- 0 contradicciones cross-contract.

### REGLAS

NO:

- modificar código;
- modificar schema;
- modificar migraciones;
- modificar datos;
- ejecutar tests;
- hacer commits;
- hacer push;
- modificar contratos canónicos;
- crear Owner Decisions;
- inventar comportamiento;
- convertir ausencia de evidencia en cumplimiento.

NO asumir que un contrato EXTEND necesita un nuevo invariant si ya existe uno equivalente.

La regla de no-duplicación es obligatoria.

### AUTORIDAD

OWNER RULING
>
DECISION REGISTER
>
CANONICAL SPEC
>
TO-BE
>
CONTRACTS
>
INVARIANTS
>
AUDIT
>
HISTORICAL

Fuente principal:

03-DECISIONS/28-R8-ARCH-002-OWNER-DECISION-TENANT-ISOLATION-2026-10-03.md

También revisar:

- R8-ARCH-003
- R8-ID-003
- R8-AUTH-001
- contratos de Identity/Tenancy
- contratos de Commerce
- invariants R5/R6/B1
- B3 AS-IS Audit
- B3 Contracts result

### CORRECCIÓN AS-IS OBLIGATORIA

El análisis B3 Contracts corrigió el balance de nested writes:

4 seguros / 1 vulnerable.

Existe un patrón seguro en:

compras.service.ts:128

donde `crearCompra` realiza lectura scoped previa para validar FK.

El caso vulnerable es:

compras.service.ts:343-398

`crearDevolucion`

No tratar esto como ausencia de mecanismo general.

El patrón existente debe ser preservado/extenderse.

### CONNECT / NESTED OPERATIONS

El análisis verificó:

- connect: 0 usos actuales
- connectOrCreate: 0 usos actuales
- nested update/delete: 0 usos actuales

Por lo tanto:

NO declararlos vulnerabilidades AS-IS.

Si se deriva una obligación para ellos, debe clasificarse como:

PROSPECTIVE / CONDITIONAL

y trazarse a B3-CON-012.

### DERIVACIÓN

Construir invariants en namespace:

INV-B3-*

Familias:

INV-B3-CTX-*
INV-B3-CRE-*
INV-B3-READ-*
INV-B3-MUT-*
INV-B3-REL-*
INV-B3-TX-*
INV-B3-FAIL-*
INV-B3-BYPASS-*
INV-B3-XTENANT-*

Para cada invariant:

- ID
- statement normativo
- source
- contract
- R8-ARCH-002 property
- B3 gap
- cross-tenant vector
- evidencia
- estado
- dependencia técnica

### COBERTURA OBLIGATORIA

Las 12 propiedades de R8-ARCH-002 deben estar trazadas:

1. Business Context antes de Business-scoped operation.
2. Context asociado a Membership válida.
3. INACTIVE Membership no puede operar.
4. Client Business ID no puede overridear Context.
5. Create asigna Business desde Context.
6. Read restringido al Context.
7. Update/Delete no cruzan Business.
8. Unique lookup no expone otro Business.
9. Nested/related persistence preserva ownership.
10. Transactions preservan isolation.
11. Missing/invalid Context falla cerrado.
12. Cross-Business negative verification.

### MODEL OWNERSHIP

Clasificar cada caso relevante:

DIRECT
DERIVED
GLOBAL
AMBIGUOUS
UNKNOWN

No asumir:

sin empresaId ≠ global.

Los modelos DERIVED deben tener invariant de ownership derivado.

Los AMBIGUOUS deben tener invariant de fail-closed / indeterminación, sin inventar mecanismo.

### FK

Debe existir un invariant que capture:

Una FK Business-scoped recibida desde una entrada externa no puede permitir que una operación vincule una entidad perteneciente a otro Business.

Trazar:

B3-CON-017/018
→ G-B3-05
→ crearDevolucion
→ invariant

No definir aquí el mecanismo técnico.

### PRE-CONTEXT VS BYPASS

Distinguir explícitamente:

- acceso legítimo pre-contexto;
- bypass Business-scoped.

No crear un invariant que prohíba operaciones legítimas de autenticación/login.

Trazar:

B3-CON-022/023/024
→ R14
→ invariant.

### IMPORTANTÍSIMO

No considerar "covered by contract" como "verified by implementation".

Usar estados:

DOCUMENTED
DERIVED
CONDITIONAL
BLOCKED
NOT DETERMINABLE

Nunca:

IMPLEMENTED
VERIFIED

porque todavía no hay ejecución.

### OUTPUT

Entregar:

1. Executive Summary
2. Authority
3. Contract → Invariant derivation
4. R8-ARCH-002 12-property coverage
5. Existing invariant reconciliation
6. B3 invariant set
7. Ownership classification
8. FK validation invariants
9. Nested persistence invariants
10. Transaction invariants
11. Pre-context / bypass invariants
12. Cross-Business invariants
13. Gap → invariant matrix
14. Vector → invariant matrix
15. Contract → invariant traceability
16. Existing / Extend / Adapt / New classification
17. Cross-contract reconciliation
18. Open technical dependencies
19. Readiness gates
20. Final verdict
21. Evidence index

### VERDICT PERMITIDO

No declarar implementation readiness.

Usar uno de:

READY FOR B3 TEST/EVAL DERIVATION
READY WITH RECONCILIATION
BLOCKED
FAIL

La decisión debe basarse en estabilidad real de los invariants.

No inventar bloqueos que sean simplemente detalles de implementación.
