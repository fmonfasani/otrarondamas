# WAPSELL — R8 TASKS — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R8 — TASKS  
**Fuentes:** R7 Plan + R6 Tests/Evals + R5 Invariants + R4 Contracts + R3 Architecture + R2 Specialized Specs + R1 Requirements + Decision Register + Workshop/Reconciliation 001–490

> R8 convierte el plan en tareas trazables. La existencia de una tarea no autoriza código, schema, datos, migraciones, CI/CD, deploy ni cambios destructivos.

---

## 1. Modelo de tarea

Cadena obligatoria:

`Requirement → Decision → Spec → Contract → Invariant → Test → Task → Evidence`

Estados:
- **PROPOSED:** identificada.
- **READY:** definición y dependencias suficientes.
- **BLOCKED:** depende de una definición OPEN.
- **IN PROGRESS:** ejecución autorizada.
- **IMPLEMENTED:** implementación realizada.
- **VALIDATING:** esperando evidencia.
- **DONE:** implementación + validación demostradas.
- **CANCELLED:** retirada por decisión explícita.

Tipos:
**CLOSE, SPEC, ARCH, CONTRACT, INVARIANT, TEST, TRANSFORM, MIGRATE, VALIDATE, DOC.**

Toda tarea de transformación debe identificar scope, dependencies, requirement/decision aplicables, contract, invariant, test, AS-IS evidence cuando corresponda, expected evidence y exit criteria.

---

# 2. Phase 0 — Decision Closure

| ID | Tarea | Scope | Estado |
|---|---|---|---|
| R8-CLOSE-001 | Resolver reserva vs descuento de stock | Order/Inventory | BLOCKED |
| R8-CLOSE-002 | Resolver Order + Payment + AR | Order/Payment/AR | BLOCKED |
| R8-CLOSE-003 | Definir transición Order → Sale | Order/Sale | BLOCKED |
| R8-CLOSE-004 | Definir matriz de cancelación | Order/Sale/Inventory/Payment/AR/Cash | BLOCKED |
| R8-CLOSE-005 | Definir thresholds de homologación | Catalog | BLOCKED |
| R8-CLOSE-006 | Definir fórmula de crédito disponible | AR/Credit | BLOCKED |
| R8-CLOSE-007 | Definir precedencia Profile → Role → Capability → Override | Authorization | BLOCKED |
| R8-CLOSE-008 | Definir actores del lifecycle Membership | Identity/Team | BLOCKED |
| R8-CLOSE-009 | Resolver pickup vs ubicación concreta | Fulfillment | BLOCKED |
| R8-CLOSE-010 | Resolver timeout/escalamiento de entrega | Fulfillment | BLOCKED |
| R8-CLOSE-011 | Definir máquina de estados Return | Returns | BLOCKED |
| R8-CLOSE-012 | Definir máquina de estados Refund | Refunds | BLOCKED |
| R8-CLOSE-013 | Definir matching Customer ↔ User | Customer/Identity | BLOCKED |
| R8-CLOSE-014 | Definir representación de Business Context | Architecture/Auth | BLOCKED |
| R8-CLOSE-015 | Definir mecanismo de tenant isolation | Architecture | BLOCKED |
| R8-CLOSE-016 | Definir estrategia de delivery de eventos | Architecture/Notifications/Audit | BLOCKED |

### Criterio de cierre común

Cada CLOSE debe propagar su resultado a los documentos que correspondan:

`Decision Register → Specialized Spec → Contract → Invariant → Test/Eval`

No se resuelve ningún blocker por inferencia dentro de R8.

---

# 3. Phase 1 — Identity & Tenancy

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-ID-001 | Modelo físico User/Business/Membership | CLOSE-014/015 | BLOCKED |
| R8-ID-002 | Mapping Empresa → Business | ID-001 | BLOCKED |
| R8-ID-003 | Migración Usuario → User global | ID-001 | BLOCKED |
| R8-ID-004 | Generación de Memberships | ID-001 | BLOCKED |
| R8-ID-005 | Coexistencia legacy | ID-002/003/004 | BLOCKED |
| R8-ID-006 | Validación de aislamiento e identidad | ID-001..005 | BLOCKED |

**Tests principales:** T-ID-001..T-ID-007.

---

# 4. Phase 2 — Authorization & Team

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-AUTH-001 | Especificar composición Profile/Role/Capability/Override | CLOSE-007 | BLOCKED |
| R8-AUTH-002 | Mapear permisos AS-IS | AUTH-001 | BLOCKED |
| R8-AUTH-003 | Implementar autorización contextual | Identity + AUTH-001 | BLOCKED |
| R8-AUTH-004 | Ejecutar suite de autorización positiva/negativa | AUTH-003 | BLOCKED |

**Tests principales:** T-AUTH-001..T-AUTH-006.

---

# 5. Phase 3 — Catalog / Customer / Cart

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-CAT-001 | Separar identidad canónica y datos Business-specific | — | PARTIAL |
| R8-CAT-002 | Formalizar Variant: stock/precio propios | CAT-001 | PARTIAL |
| R8-CAT-003 | Implementar homologación según thresholds aprobados | CLOSE-005 | BLOCKED |
| R8-CUST-001 | Implementar Customer ↔ User opcional | CLOSE-013 | BLOCKED |
| R8-CART-001 | Cart persistente y Business-scoped | Identity/Catalog/Customer | BLOCKED |

**Tests principales:** T-CAT-001..004, T-CART-001..005.

---

# 6. Phase 4 — Inventory / Purchases

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-INV-001 | Formalizar physical/reserved/available | CLOSE-001 | BLOCKED |
| R8-INV-002 | Implementar reserva/concurrencia | INV-001 | BLOCKED |
| R8-INV-003 | Ajustes con razón/responsable | — | READY FOR SPEC REVIEW |
| R8-PUR-001 | Formalizar lifecycle Purchase Order | — | PARTIAL |
| R8-PUR-002 | Implementar Receiving con cantidades reales | PUR-001 | PARTIAL |
| R8-PUR-003 | Implementar partial receiving y discrepancias | PUR-002 | PARTIAL |

**Tests principales:** T-INV-001..007, T-PUR-001..004.

---

# 7. Phase 5 — Orders / Sales / Payments / AR / Cash

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-ORD-001 | Formalizar Order state machine | CLOSE-001..004 | BLOCKED |
| R8-ORD-002 | Definir boundary transaccional Order | ORD-001 | BLOCKED |
| R8-ORD-003 | Implementar Order → Sale | ORD-001/002 | BLOCKED |
| R8-SALE-001 | Inmutabilidad y cancelación de Sale | CLOSE-004 | BLOCKED |
| R8-PAY-001 | Formalizar lifecycle Payment | CLOSE-002 | BLOCKED |
| R8-AR-001 | Formalizar lifecycle AR/Credit | CLOSE-002/006 | BLOCKED |
| R8-CASH-001 | Validar lifecycle Cash | — | PARTIAL |

**Tests principales:** T-ORD-001..004, T-SALE-001..004, T-PAY-001..002, T-AR-001..005, T-CASH-001..004.

---

# 8. Phase 6 — Fulfillment / Repartidores

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-FUL-001 | Formalizar Fulfillment state machine | CLOSE-009/010 | BLOCKED |
| R8-FUL-002 | Validar aceptación del driver | FUL-001 | BLOCKED |
| R8-FUL-003 | Validar visibilidad del delivery al Customer | FUL-001 | BLOCKED |

**Tests principales:** T-FUL-001..004.

---

# 9. Phase 7 — Returns / Refunds

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-RET-001 | Formalizar Return state machine | CLOSE-011 | BLOCKED |
| R8-RET-002 | Implementar efectos de Return sobre Inventory | RET-001 | BLOCKED |
| R8-REF-001 | Formalizar Refund state machine | CLOSE-012 | BLOCKED |
| R8-REF-002 | Implementar efectos Refund → Payment/Cash/AR | REF-001 | BLOCKED |
| R8-REF-003 | Validar máximo reembolsable y double refund | Refund formula | BLOCKED |

**Tests principales:** T-RET-001..004, T-REF-001..006.

---

# 10. Phase 8 — Messaging

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-MSG-001 | Cerrar Conversation contract | Identity/Authorization | BLOCKED |
| R8-MSG-002 | Definir Message/System Event model | MSG-001 | BLOCKED |
| R8-MSG-003 | Conectar Messaging con ERP use cases | Authorization + domain contracts | BLOCKED |
| R8-MSG-004 | Validar acceso, bypass y trazabilidad | MSG-003 | BLOCKED |

**Regla:** Messaging no crea una segunda versión de las reglas ERP ni accede directamente a persistence de otro dominio.

**Tests principales:** T-MSG-001..006.

---

# 11. Phase 9 — Notifications / Audit

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-NOT-001 | Definir Notification contract | CLOSE-016 | BLOCKED |
| R8-NOT-002 | Implementar notifications trazables/autorizadas | NOT-001 | BLOCKED |
| R8-AUD-001 | Definir Audit contract técnico | — | PARTIAL |
| R8-AUD-002 | Implementar y validar integridad del Audit | AUD-001 | PARTIAL |

**Tests principales:** notification y audit tests definidos en R6.

---

# 12. Phase 10 — Business / SaaS / Brand

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-BIZ-001 | Formalizar Business lifecycle | — | BLOCKED |
| R8-BIZ-002 | Definir boundary de SaaS Admin | — | BLOCKED |
| R8-BIZ-003 | Formalizar Branch/Location/Warehouse | — | BLOCKED |
| R8-BRAND-001 | Definir Brand configuration contract | — | PARTIAL |
| R8-BRAND-002 | Validar identidad Business customer-facing | BRAND-001 | BLOCKED |

---

# 13. Phase 11 — Migration / Cutover

| ID | Tarea | Dependencia | Estado |
|---|---|---|---|
| R8-MIG-001 | Migration rehearsal controlado | Identity + schema + coexistence | BLOCKED |
| R8-MIG-002 | Data reconciliation | MIG-001 | BLOCKED |
| R8-MIG-003 | Legacy session cutoff rehearsal | Legacy compatibility | BLOCKED |
| R8-MIG-004 | Gate de autorización para cutover | G4 + evidence | BLOCKED |

No se ejecuta cutover real por R8.

---

# 14. Phase 12 — Global Validation

| ID | Validación | Estado |
|---|---|---|
| R8-VAL-001 | Requirement traceability audit | PROPOSED |
| R8-VAL-002 | Cross-Business isolation audit | PROPOSED |
| R8-VAL-003 | Authorization abuse suite | PROPOSED |
| R8-VAL-004 | Regression AS-IS suite | PROPOSED |
| R8-VAL-005 | Migration evidence audit | PROPOSED |

---

# 15. Dependency chain

```
Decision Closure
      ↓
Architecture Closure
      ↓
Identity / Tenancy
      ↓
Authorization
      ↓
Catalog / Customer / Cart
      ↓
Inventory / Purchases
      ↓
Orders / Payments / AR
      ↓
Fulfillment
      ↓
Returns / Refunds

Messaging ───────────────┐
                         ├── Notifications / Audit
Business / SaaS / Brand ─┘

All transformation
      ↓
Global Validation
      ↓
Cutover authorization
```

---

# 16. Definition of Ready

Una tarea pasa a READY solamente si:

- scope definido;
- dependencias resueltas;
- decisiones aplicables cerradas;
- Contract disponible cuando corresponda;
- Invariant disponible cuando corresponda;
- Test/Eval identificado;
- evidencia esperada definida;
- no requiere resolver una contradicción por inferencia.

---

# 17. Definition of Done

Una tarea de transformación no está DONE sólo porque compile.

Debe existir:

1. implementación;
2. test relevante;
3. ejecución;
4. evidencia;
5. validación de aislamiento cuando aplique;
6. validación de authorization cuando aplique;
7. validación de auditability cuando aplique;
8. regresión cuando corresponda;
9. documentación actualizada según el flujo de autoridad.

---

# 18. R8 no decide

R8 no decide:

- blockers funcionales;
- schema concreto;
- Prisma;
- endpoints;
- DTOs;
- JWT;
- sesiones;
- RLS;
- brokers/event transport;
- proveedores;
- cloud/deployment;
- código;
- datos de producción.

R8 define **qué trabajo debe realizarse**, no cómo resolver por inferencia las decisiones abiertas.

---

# 19. Evidence status

| Elemento | Estado |
|---|---|
| R1 Requirements | DRAFT |
| R2 Specialized Specs | DRAFT |
| R3 Architecture | DRAFT |
| R4 Contracts | DRAFT |
| R5 Invariants | DRAFT |
| R6 Tests/Evals | SPECIFIED / NOT EXECUTED |
| R7 Plan | DRAFT |
| R8 Tasks | THIS DOCUMENT / DRAFT |
| Implementation | NOT EXECUTED BY R8 |
| Schema | NOT MODIFIED BY R8 |
| Data migration | NOT EXECUTED |
| Deploy | NOT EXECUTED |

**R8 STATUS: TASK BASELINE CREATED — DRAFT / NOT APPROVED.**

## 20. Next phase

Después de R8 corresponde:

`R8 Review / Approval → READY tasks → Implementation → Validation → Evidence → Delivery`

Las tareas BLOCKED deben pasar primero por el cierre de las decisiones correspondientes.
