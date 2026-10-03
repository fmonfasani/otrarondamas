# WAPSELL — BUSINESS / PRODUCT ROADMAP

**Version:** v1.0  
**Status:** BASELINE DE TRABAJO  
**Fecha:** 2026-10-01  
**Proyecto:** Wapsell — Otra Ronda Más

## 1. Propósito

Establecer el roadmap general del proceso de construcción de Wapsell como producto SaaS multi-tenant y ubicar el estado actual del proyecto y el próximo flujo de trabajo.

Este documento es un artefacto de proceso. No sustituye la SPEC ni autoriza implementación por sí mismo.

## 2. Proceso general

```
REQUIREMENTS
    ↓
AS-IS BASELINE
    ↓
DECISIONS
    ↓
GENERAL SPECIFICATION
    ↓
TO-BE BUSINESS MODEL
    ↓
SPECIALIZED DOMAIN SPECS
    ↓
CONTRACTS
    ↓
INVARIANTS
    ↓
TESTS / EVALS
    ↓
IMPLEMENTATION PLAN
    ↓
TASKS
    ↓
IMPLEMENTATION
    ↓
VALIDATION
    ↓
REVIEW
    ↓
DELIVERY
```

El flujo se aplica por dominio de negocio. No implica implementar todo el producto antes de especificar sus dominios.

## 3. Estado actual

### Consolidado / avanzado

- Requirements: baseline avanzada.
- AS-IS Baseline: documentada para Otra Ronda Más.
- Decisions: cierre R1/R2/R3 y decisiones estructurales principales documentadas.
- General SPEC: establecida como base de Wapsell.
- TO-BE General: avanzado y en transición hacia especificaciones por dominio.
- Messaging: dominio documentalmente más avanzado, con SPEC, contratos, invariantes, tests/evals, plan y tareas.

### Estado global

La fase actual es:

**TO-BE GENERAL → ESPECIFICACIÓN DE DOMINIOS DE NEGOCIO.**

No implica autorización automática para modificar código, schema o datos.

## 4. Roadmap de dominios

### FASE A — FOUNDATION

1. Identity & Tenancy
   - User
   - Business
   - Membership
   - Roles
   - Permissions
   - Customer ↔ User
   - Authentication
   - Authorization
   - Business context

2. Branding & Experience
   - Brand
   - Design System
   - Business configuration
   - Customer-facing experience
   - Wapsell como plataforma subyacente

### FASE B — COMMERCE

3. Customers
4. Catalog
5. Orders
6. Sales
7. Payments

### FASE C — OPERATIONS

8. Inventory
9. Purchases
10. Cash
11. Fulfillment

### FASE D — COMMUNICATION

12. Messaging

### FASE E — PLATFORM / GOVERNANCE

13. Notifications
14. Reports
15. Audit
16. Security
17. Observability
18. SaaS Administration

### FASE F — TECHNICAL REALIZATION

Para cada dominio suficientemente definido:

Domain Specs → Contracts → Invariants → Tests/Evals → Implementation Plan → Tasks → Code → Migration → Validation.

## 5. Patrón de trabajo por dominio

Cada dominio debe recorrer:

```
AS-IS
  ↓
Requirements / problemas
  ↓
Decisions existentes
  ↓
TO-BE
  ↓
Open Details
  ↓
Owner Decisions
  ↓
Specialized SPEC
  ↓
Contracts
  ↓
Invariants
  ↓
Tests / Evals
  ↓
Implementation Plan
  ↓
Tasks
  ↓
Implementation
  ↓
Validation
```

Las propuestas no se consideran aprobadas hasta contar con la aprobación correspondiente.

## 6. Próximo flujo — Identity & Tenancy

El siguiente flujo es **Identity & Tenancy**, por ser una base estructural para los demás dominios.

### Objetivo

Dejar definido y trazable:

**User ↔ Membership ↔ Business**

y su relación con:

- Customer
- Roles
- Permissions
- Authentication
- Authorization
- Business context

### Secuencia

1. Revisar AS-IS de Identity/Auth.
2. Identificar requirements y gaps.
3. Cruzar con decisiones ya existentes.
4. Construir TO-BE del dominio.
5. Identificar Open Details.
6. Separar decisiones de negocio pendientes de decisiones técnicas.
7. Preparar Owner Decisions únicamente cuando sean necesarias.
8. Elaborar Specialized Spec.
9. Elaborar Contracts.
10. Elaborar Invariants.
11. Elaborar Tests/Evals.
12. Elaborar Implementation Plan.
13. Elaborar Tasks.
14. Solo posteriormente, y con autorización correspondiente, implementar.

## 7. Decisiones existentes relevantes

El flujo Identity & Tenancy debe partir de las decisiones ya registradas, entre ellas:

- D-001 — Business = Tenant.
- D-002 — User global + Membership N:N.
- D-002-bis — Customer independiente de User.
- D-005 — Roles y permisos pertenecen a Membership.
- D-006 — Autenticación/autorización considerando User, Business y Membership.
- OR-002-C — User como identidad global.
- OR-002-D — User + Membership / Customer separado.
- OR-002-E — compatibilidad temporal de sesiones/tokens durante transición.
- P1-A — transformación Empresa → Business.
- A1-A7 — reglas Customer ↔ User.

La implementación técnica concreta de estas decisiones no se presume aprobada por este roadmap.

## 8. Dependencias conceptuales

```
Identity & Tenancy
        ↓
Authorization
        ↓
Business Context
        ↓
Commerce
        ↓
Operations
        ↓
Messaging / Integrations / Reporting
```

## 9. Criterio de avance

Un dominio no se considera terminado por tener documentación aislada.

El avance debe poder demostrarse mediante:

- definición funcional;
- decisiones explícitas;
- TO-BE coherente;
- especificación especializada;
- contratos;
- invariantes;
- tests/evals;
- plan;
- tareas;
- y, cuando corresponda, implementación y validación verificadas.

## 10. Regla de gobierno

**No suponer → no inventar → no modificar sin comprender → no declarar éxito sin verificar.**

Este roadmap no reemplaza documentos canónicos ni constituye autorización de implementación.
