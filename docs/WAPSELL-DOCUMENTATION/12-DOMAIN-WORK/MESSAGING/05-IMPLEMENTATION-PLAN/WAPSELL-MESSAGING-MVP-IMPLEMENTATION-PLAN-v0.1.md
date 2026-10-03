# WAPSELL — MESSAGING MVP
## Implementation Plan v0.1

**Estado:** APPROVED — PLAN BASELINE  
**Fecha:** 2026-10-01  
**Prerequisites:** SPEC, Contracts, Invariants, Tests/Evals aprobados  
**Implementación:** no iniciada por este documento.

---

# 1. Principio

La implementación se ejecutará como transformación incremental del AS-IS
hacia el TO-BE aprobado.

No se implementará directamente desde una idea o desde el código
existente sin trazabilidad.

Cadena:

`Requirements → Decisions → SPEC → Contracts → Invariants → Tests/Evals → Plan → Tasks → Implementation → Validation`

---

# 2. Gates

## Gate A — Technical decisions

Resolver/documentar los detalles técnicos necesarios antes de modificar
código:

1. persistencia física;
2. realtime;
3. storage;
4. authorization enforcement;
5. search;
6. notifications;
7. auditoría;
8. lifecycle/consistency;
9. observability;
10. integración con el AS-IS.

Cada detalle debe conservar estado:

- APPROVED;
- OPEN;
- DEFERRED;
- NOT DETERMINED.

No implementar detalles OPEN por inferencia.

---

## Gate B — Consolidation

Consolidar:

- contratos;
- invariantes;
- tests/evals;
- decisiones técnicas;
- dependencias con Identity/Tenancy;
- impacto en Commerce;
- impacto en Branding;
- impacto en Notifications;
- impacto en Storage.

Resultado esperado: baseline técnica coherente.

---

## Gate C — Technical baseline approval

Antes de implementación debe existir una Technical Specification
consolidada y aprobada.

No se considera aprobación la mera existencia de documentos.

---

# 3. Implementation milestones

## M1 — Foundation

Preparar el módulo de Messaging dentro del modular monolith.

Incluye:

- boundaries;
- dependency rules;
- authorization boundary;
- Business context;
- persistence foundation.

No implementar todavía todas las capacidades.

## M2 — Conversations

Implementar:

- conversación 1:1;
- conversación grupal;
- participantes;
- join/leave;
- group administration;
- participant history.

## M3 — Messages

Implementar:

- text;
- replies;
- reactions;
- edit;
- delete;
- delivery/read state.

## M4 — Attachments

Implementar:

- image;
- file;
- voice;
- validation;
- Wapsell Storage integration;
- secure download.

## M5 — Realtime

Implementar:

- message propagation;
- delivery/read propagation;
- typing;
- presence;
- reconnect;
- authorization.

## M6 — Notifications

Integrar notificaciones de Messaging con la arquitectura aprobada.

## M7 — Search

Implementar:

- conversation search;
- message search;
- filters;
- authorization-aware results.

## M8 — Commercial associations

Implementar asociaciones con:

- Customer;
- Order;
- Sale;
- Product;
- Purchase.

## M9 — Privacy / blocking / deletion

Implementar:

- 1:1 blocking;
- conversation deletion;
- participant visibility boundaries;
- audit behavior.

## M10 — Validation

Ejecutar:

- unit tests;
- integration tests;
- E2E;
- authorization tests;
- IDOR tests;
- concurrency tests;
- storage security tests;
- regression tests;
- build;
- relevant existing tests.

---

# 4. Non-goals

No introducir durante Messaging MVP:

- WhatsApp como dependencia;
- asistentes IA activos sin aprobación específica;
- microservices;
- Kubernetes;
- GraphQL;
- proveedor de storage externo;
- infraestructura de storage fuera de Wapsell-controlled infrastructure;
- funcionalidades no trazables.

---

# 5. Migration principle

La migración desde el AS-IS debe ser incremental.

Debe preservarse funcionalidad existente y evitar una reescritura
destructiva.

Las decisiones de migración física de `Empresa`, `Usuario`,
`Customer` y Membership requieren su propia especificación.

---

# 6. Validation gate

Ningún milestone se declara completo únicamente porque el código compile.

Cada milestone debe demostrar:

1. alcance implementado;
2. tests relevantes;
3. evidencia de ejecución;
4. ausencia de regresiones relevantes;
5. trazabilidad hacia SPEC/Contracts/Invariants.

---

# 7. Delivery gate

Messaging MVP se considera entregable solo después de:

`Implementation → Tests → Execution → Validation → Review → Delivery`

No antes.

---

# 8. Estado

**APPROVED — PLAN BASELINE**
