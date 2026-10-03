# WAPSELL — R7 TRANSFORMATION PLAN — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R7 — PLAN  
**Fuentes:** R6 Tests/Evals + R5 Invariants + R4 Contracts + R3 Architecture + R2 Specialized Specs + R1 Requirements + AS-IS Baseline + Decision Register + Workshop/Reconciliation 001–490

> Este documento define un plan de transformación y validación. No constituye autorización para implementar, migrar, hacer deploy, modificar schema, cambiar contratos canónicos ni ejecutar cambios destructivos.

---

## 1. Objetivo

R7 convierte la especificación acumulada en un **plan ejecutable y trazable**, pero mantiene separadas:

- decisiones pendientes;
- especificación;
- planificación;
- implementación;
- validación.

La regla es:

`Requirement → Contract → Invariant → Test → Plan Item → Task → Implementation → Evidence`

R7 no salta directamente desde requisitos a código.

---

# 2. Estado de partida

El proyecto dispone de:

- AS-IS documentado;
- Workshop Owner 001–490;
- Reconciliation 001–490;
- Decision Register;
- R1 Requirements;
- R2 Specialized Specs;
- R3 Architecture;
- R4 Contracts;
- R5 Invariants;
- R6 Tests/Evals.

El estado objetivo todavía contiene decisiones y detalles técnicos OPEN.

Por lo tanto, el plan utiliza tres clases de trabajo:

### A — Closure
Cerrar una decisión o definición pendiente.

### B — Transformation
Modificar documentación, arquitectura, schema, código o datos conforme a una definición ya aprobada.

### C — Validation
Demostrar mediante evidencia que la transformación conserva los invariants y tests requeridos.

---

# 3. Gates del plan

## G0 — Specification readiness

**Entrada:** R1–R6.

**Condiciones:**
- trazabilidad disponible;
- blockers identificados;
- no existen contradicciones ocultas conocidas.

**Estado:** BASELINE AVAILABLE.

---

## G1 — Functional closure

Antes de contratos ejecutables de cada dominio deben estar cerradas las decisiones funcionales que los afectan.

No requiere cerrar todo Wapsell simultáneamente.

**Estado:** NOT PASSED.

---

## G2 — Technical architecture closure

Antes de modificar identidad, autorización o aislamiento deben definirse los mecanismos técnicos necesarios.

**Estado:** NOT PASSED.

---

## G3 — Implementation readiness

Antes de código de transformación:

- requirements/decision aplicables cerrados;
- contract definido;
- invariant definido;
- test definido;
- alcance de implementación definido;
- estrategia de migración/coexistencia definida cuando corresponda.

**Estado:** NOT PASSED.

---

## G4 — Validation readiness

Antes de declarar una transformación exitosa:

- implementación ejecutada;
- tests relevantes ejecutados;
- evidencia conservada;
- regresión AS-IS evaluada;
- no existen fallos críticos abiertos sin tratamiento.

**Estado:** NOT PASSED.

---

# 4. Workstreams

## WS-01 — Identity & Tenancy

### Objetivo
Transformar:

`Empresa + Usuario + relación actual → Business + User + Membership`

### Dependencies
- Business Context;
- tenant isolation;
- Membership lifecycle;
- migration/coexistence.

### Tasks conceptuales

1. cerrar modelo físico User/Business/Membership;
2. cerrar Business Context;
3. cerrar tenant isolation;
4. definir compatibilidad legacy;
5. diseñar migración Empresa → Business;
6. implementar transformación;
7. validar aislamiento;
8. validar coexistencia;
9. ejecutar cutoff cuando sea autorizado.

**Estado:** BLOCKED FOR IMPLEMENTATION.

---

## WS-02 — Authorization & Team

### Objetivo
Transformar authorization actual hacia Membership-contextual authorization.

### Dependencies
- Profile/Role/Capability precedence;
- Membership lifecycle;
- Business Context.

### Tasks

1. cerrar composición Profile → Role → Capability → Override;
2. definir lifecycle de profiles/roles;
3. definir catálogo final;
4. mapear permisos AS-IS;
5. diseñar compatibilidad;
6. implementar;
7. validar positive/negative authorization.

**Estado:** BLOCKED.

---

## WS-03 — Messaging

### Objetivo
Establecer Wapsell Messaging como superficie comercial central.

### Dependencies
- authorization;
- Business Context;
- ERP use cases;
- audit/events.

### Tasks

1. cerrar contratos de conversación;
2. definir message/event semantics;
3. definir persistence ownership;
4. implementar domain/application boundaries;
5. conectar acciones ERP mediante use cases;
6. validar acceso y bypass;
7. validar trazabilidad.

**Estado:** PARTIAL / DEPENDS ON WS-01/02.

---

## WS-04 — Catalog & Homologation

### Objective
Separar identidad canónica de datos comerciales Business-specific.

### Tasks

1. mantener Product canonical identity;
2. definir Business commercial data;
3. formalizar Variant;
4. cerrar thresholds de homologación;
5. implementar homologation;
6. validar matching y aislamiento.

**Estado:** PARTIAL / HOMOLOGATION BLOCKED.

---

## WS-05 — Cart / Commerce

### Objective
Mantener Cart persistente y Business-scoped y conectarlo con Order.

### Dependencies
- Order;
- Payment;
- AR/Credit;
- Inventory.

**Estado:** BLOCKED AT TRANSITION.

---

## WS-06 — Orders / Sales

### Objective
Formalizar lifecycle Order y Sale.

### Required closure

1. Customer confirmation;
2. stock semantics;
3. payment/AR;
4. Order → Sale;
5. cancellation matrix;
6. transactional effects.

### Implementation

Sólo después de G1/G2/G3 aplicables.

**Estado:** BLOCKED.

---

## WS-07 — Inventory

### Objective
Garantizar stock Business-scoped, no negativo, trazable y concurrency-safe.

### Required closure

- physical/reserved/available;
- reservation timing;
- location semantics;
- transfer semantics.

### Validation

- isolation;
- negative stock;
- concurrency;
- adjustment audit;
- expiration.

**Estado:** BLOCKED FOR CORE ORDER FLOW.

---

## WS-08 — Purchases / Suppliers

### Objective
Formalizar Purchase Order → Receiving → AP.

### Tasks

1. cerrar PO state machine;
2. implementar receiving;
3. preservar discrepancies;
4. implementar partial receiving;
5. integrar AP;
6. validar Business isolation.

**Estado:** PARTIAL.

---

## WS-09 — Pricing / Promotions

### Objective
Formalizar pricing context y promotion rules.

### Required closure

- precedence;
- combination;
- temporal validity;
- customer/branch interaction.

**Estado:** PARTIAL / PROMOTION BLOCKED.

---

## WS-10 — AR / Credit

### Objective
Formalizar receivables y credit.

### Required closure

- credit available formula;
- new purchase effect;
- payment allocation;
- overdue;
- suspension.

**Estado:** BLOCKED.

---

## WS-11 — Payments / Cash

### Objective
Formalizar payment lifecycle y Cash.

### Tasks

1. external payment abstraction;
2. payment states;
3. reversal;
4. mixed payments;
5. Cash lifecycle;
6. reconciliation;
7. integration with Order/Sale/AR.

**Estado:** PARTIAL / CROSS-DOMAIN BLOCKED.

---

## WS-12 — Fulfillment / Repartidores

### Objective
Implementar delivery/pickup dentro de Orders.

### Required closure

- pickup location rule;
- driver delivery states;
- customer confirmation timeout;
- channel/escalation;
- evidence/PIN semantics.

**Estado:** PARTIAL / BLOCKED.

---

## WS-13 — Returns / Refunds

### Objective
Crear Return y Refund como operaciones independientes y trazables.

### Required closure

- Return state machine;
- inspection transitions;
- Refund state machine;
- maximum refundable calculation;
- Cash/Payment/AR effects.

**Estado:** BLOCKED.

---

## WS-14 — Notifications

### Objective
Derivar notificaciones de eventos de negocio.

### Required closure

- channel;
- provider;
- retry;
- retention;
- deduplication strategy.

**Estado:** PARTIAL.

---

## WS-15 — Audit

### Objective
Garantizar trazabilidad transversal.

### Tasks

1. definir audit contract técnico;
2. definir ownership;
3. registrar actor/context/timestamp/operation/reason;
4. proteger integridad;
5. validar Business isolation;
6. validar SaaS scope.

**Estado:** PARTIAL / SaaS boundary OPEN.

---

## WS-16 — Business / SaaS Administration

### Objective
Formalizar Business lifecycle y SaaS administration.

### Required closure

- approval workflow;
- Business states;
- Owner lifecycle;
- SaaS Admin boundary;
- branch/location governance.

**Estado:** BLOCKED.

---

## WS-17 — Brand / Experience

### Objective
Aplicar Wapsell Design System + Business Brand.

### Tasks

1. definir Brand configuration contract;
2. definir public Business identity;
3. contextual navigation;
4. validate customer-facing identity.

**Estado:** PARTIAL.

---

# 5. Dependency graph

```
Identity/Tenancy
      │
      ├── Authorization
      │       │
      │       └── Messaging
      │
      └── Business Context / Isolation
              │
              ├── Catalog
              ├── Customer
              ├── Inventory
              ├── Purchases
              ├── Cash
              └── all Business-scoped domains

Catalog
   ↓
Cart
   ↓
Order
   ├── Inventory
   ├── Payment / AR
   ├── Fulfillment
   └── Sale
          ├── Cash
          ├── Payment
          └── AR

Sale
  ↓
Return
  ↓
Refund
  ├── Payment
  ├── Cash
  └── AR

Domain events
  ├── Notifications
  └── Audit
```

---

# 6. Recommended implementation sequence

Esta secuencia es de planificación, no una autorización de implementación:

### Phase P0 — Decision Closure
Cerrar los blockers funcionales que bloquean contratos/invariants.

### Phase P1 — Technical Architecture Closure
Cerrar Business Context, tenant isolation, physical identity model, authorization enforcement y event strategy.

### Phase P2 — Identity / Tenancy
Implementar User + Business + Membership y coexistencia.

### Phase P3 — Authorization
Implementar effective authorization contextual.

### Phase P4 — Catalog / Customer / Cart
Transformar dominios con dependencias menores.

### Phase P5 — Inventory / Purchases
Implementar stock, receiving y transferencias.

### Phase P6 — Orders / Payments / AR
Implementar el core transaccional una vez cerradas sus semánticas.

### Phase P7 — Fulfillment
Integrar delivery/pickup con Orders.

### Phase P8 — Returns / Refunds
Implementar post-sale operations.

### Phase P9 — Messaging
Conectar Messaging con use cases ERP y eventos.

### Phase P10 — Notifications / Audit
Completar side effects y trazabilidad transversal.

### Phase P11 — Business / SaaS / Brand
Completar onboarding, governance y customer-facing Brand.

### Phase P12 — Cutover / Legacy retirement
Sólo después de validación y autorización explícita.

---

# 7. Migration strategy

La estrategia heredada es:

**incremental + coexistencia temporal + acotada.**

Cada transformación debe contener:

1. AS-IS evidence;
2. target rule;
3. compatibility rule;
4. migration step;
5. rollback/containment strategy;
6. validation;
7. evidence;
8. cutoff condition.

No se autoriza un big-bang migration por este plan.

---

# 8. Traceability requirements

Cada implementation task futuro deberá poder responder:

| Campo | Requerido |
|---|---|
| Requirement ID | Sí |
| Decision ID | Si aplica |
| Specialized Spec | Sí |
| Architecture reference | Si aplica |
| Contract ID | Sí |
| Invariant ID | Si aplica |
| Test ID | Sí |
| AS-IS evidence | Sí para transformación |
| Migration impact | Si aplica |
| Rollback/containment | Si aplica |
| Validation evidence | Al cerrar task |

---

# 9. Definition of Ready — Implementation

Una tarea no debería entrar en implementación si:

- depende de una decisión OPEN;
- no tiene alcance definido;
- no tiene Contract cuando corresponde;
- no tiene Invariant cuando corresponde;
- no tiene Test/Eval;
- no tiene estrategia de coexistencia si modifica comportamiento existente;
- requiere resolver una contradicción no documentada.

---

# 10. Definition of Done — Transformation

Una transformación se considera documentalmente completa cuando:

1. código/schema correspondiente fue implementado;
2. tests relevantes existen;
3. tests relevantes fueron ejecutados;
4. evidencia fue registrada;
5. AS-IS regression fue evaluada;
6. tenant isolation fue validada cuando aplica;
7. authorization fue validada;
8. auditability fue validada;
9. no existen efectos parciales no controlados;
10. documentación se actualizó conforme al flujo de autoridad.

Esto es un criterio de proceso, no una afirmación de cumplimiento actual.

---

# 11. Rollback / containment

Antes de cada transformación de alto impacto se debe definir, cuando corresponda:

- punto de reversión;
- compatibilidad temporal;
- estrategia de datos;
- feature flag o mecanismo equivalente si fuera necesario;
- criterio de abort;
- evidencia de estado previo.

No se define una tecnología concreta para rollback.

---

# 12. Current blockers

R7 hereda los blockers identificados en R4/R5/R6:

1. Stock reservation vs deduction.
2. Order + Payment + AR.
3. Order → Sale.
4. Cancellation matrix.
5. Homologation thresholds.
6. Credit calculation.
7. Authorization precedence.
8. Membership lifecycle actors.
9. Pickup vs location.
10. Delivery confirmation escalation.
11. Return state machine.
12. Refund state machine.
13. Customer ↔ User matching.
14. Business Context representation.
15. Tenant isolation mechanism.
16. Event delivery strategy.

**Estado global:** OPEN / NO RESOLVED BY INFERENCE.

---

# 13. Evidence status

| Artefact | Estado |
|---|---|
| AS-IS | DOCUMENTED |
| Decisions | CANONICAL + WORKSHOP INPUT |
| R1 | DRAFT |
| R2 | DRAFT |
| R3 | DRAFT |
| R4 | DRAFT |
| R5 | DRAFT |
| R6 | SPECIFIED / NOT EXECUTED |
| R7 Plan | THIS DOCUMENT / DRAFT |
| Tasks | NOT CREATED |
| Implementation | NOT EXECUTED |
| Schema | NOT MODIFIED BY R7 |
| Data migration | NOT EXECUTED |
| Deploy | NOT EXECUTED |

---

# 14. R7 — No decide

R7 no decide:

- resolución de blockers;
- schema;
- Prisma;
- API;
- DTOs;
- JWT;
- session architecture;
- RLS;
- event transport;
- provider;
- cloud;
- deployment;
- migration scripts;
- implementation tasks concretos;
- código.

**R7 STATUS: TRANSFORMATION PLAN BASELINE CREATED — DRAFT / NOT APPROVED.**

## 15. Próxima fase

La siguiente fase es **R8 — TASKS**.

R8 deberá convertir los Workstreams y gates de R7 en tareas atómicas, cada una con alcance, dependencias, requisito, contrato, invariant, test, evidencia esperada y criterio de cierre.
