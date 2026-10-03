# WAPSELL — R6 TESTS / EVALS — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R6 — TESTS / EVALS  
**Fuentes:** R5 Invariants + R4 Contracts + R3 Architecture + R2 Specialized Specs + R1 Requirements + Decision Register + Workshop/Reconciliation 001–490

> Este documento define criterios de verificación derivados de invariants y contracts estables. No afirma que estos tests estén implementados ni ejecutados. No autoriza código, schema, migraciones, CI/CD ni cambios de infraestructura.

---

## 1. Objetivo

R6 transforma reglas verificables en **casos de prueba y evaluación**.

Cadena:

`Invariant / Contract → Test Case → Evidence → Result`

Un test definido aquí no significa que exista todavía en Jest, Playwright, Cypress, integración, E2E o CI.

---

## 2. Estados de evidencia

- **SPECIFIED:** criterio definido.
- **IMPLEMENTED:** test existe en código.
- **EXECUTED:** test fue ejecutado.
- **PASSED:** ejecución satisfactoria con evidencia.
- **FAILED:** ejecución con evidencia de fallo.
- **BLOCKED:** no puede ejecutarse sin cerrar una decisión.
- **NOT EXECUTED:** todavía no existe evidencia de ejecución.

Este documento se encuentra en **SPECIFIED**.

---

# 3. Test Matrix — Identity & Tenancy

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-ID-001 | Un User puede tener múltiples Memberships | Functional | SPECIFIED |
| T-ID-002 | Membership A no concede acceso a Business B | Isolation | SPECIFIED |
| T-ID-003 | Membership INACTIVE rechaza operación Business-scoped | Authorization | SPECIFIED |
| T-ID-004 | Reactivación restaura acceso según reglas vigentes | Functional | SPECIFIED |
| T-ID-005 | Recurso Business A no aparece en contexto Business B | Isolation | SPECIFIED |
| T-ID-006 | Business Context requiere User + Business + Membership + authorization | Authorization | SPECIFIED |
| T-ID-007 | Cambio de Business no mezcla recursos del contexto anterior | Isolation | SPECIFIED |

**Bloqueados:** representación técnica del Business Context y mecanismo de tenant isolation.

---

# 4. Authorization Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-AUTH-001 | Capability contextual por Business | Authorization | SPECIFIED |
| T-AUTH-002 | UI oculta no sustituye authorization | Security | SPECIFIED |
| T-AUTH-003 | Messaging no bypassa autorización ERP | Security | SPECIFIED |
| T-AUTH-004 | Profile/Role/Capability precedence | Authorization | BLOCKED |
| T-AUTH-005 | Individual override | Authorization | BLOCKED |
| T-AUTH-006 | Profile inactive behavior | Authorization | BLOCKED |

---

# 5. Messaging Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-MSG-001 | Participante autorizado puede acceder a conversación | Functional | SPECIFIED |
| T-MSG-002 | Usuario no autorizado no puede acceder | Security | SPECIFIED |
| T-MSG-003 | Acción ERP desde Messaging usa authorization del use case | Integration | SPECIFIED |
| T-MSG-004 | Mensaje de sistema se distingue de mensaje de User | Functional | SPECIFIED |
| T-MSG-005 | Edición conserva historial requerido | Audit/Functional | SPECIFIED |
| T-MSG-006 | Eliminación conserva indicador/trazabilidad | Audit/Functional | SPECIFIED |

Retention técnica permanece OPEN.

---

# 6. Catalog Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-CAT-001 | Product canonical no mezcla datos Business-specific | Isolation | SPECIFIED |
| T-CAT-002 | Variant mantiene stock/precio propios | Functional | SPECIFIED |
| T-CAT-003 | Homologation respeta estados definidos | Functional | BLOCKED |
| T-CAT-004 | No se auto-homologa fuera de thresholds autorizados | Functional | BLOCKED |

---

# 7. Cart Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-CART-001 | Cart está aislado por Business | Isolation | SPECIFIED |
| T-CART-002 | Persistencia no mezcla carts | Functional | SPECIFIED |
| T-CART-003 | Customer modifica cantidades | Functional | SPECIFIED |
| T-CART-004 | Customer elimina productos | Functional | SPECIFIED |
| T-CART-005 | Cart → Order respeta confirmación/payment/stock semantics | Integration | BLOCKED |

---

# 8. Order / Sale Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-ORD-001 | Order y Sale son entidades/conceptos diferenciados | Domain | SPECIFIED |
| T-ORD-002 | Order requiere Customer confirmation cuando corresponde | Functional | SPECIFIED |
| T-ORD-003 | Order no contiene stock no disponible | Functional | BLOCKED |
| T-ORD-004 | Order → Sale ocurre sólo bajo precondiciones definidas | State Machine | BLOCKED |
| T-SALE-001 | Sale confirmada no puede editarse | Integrity | SPECIFIED |
| T-SALE-002 | Sale confirmada no puede eliminarse como si no existiera | Integrity | SPECIFIED |
| T-SALE-003 | Cancellation conserva actor/razón/momento | Audit | SPECIFIED |
| T-SALE-004 | Cancellation revierte efectos correctos | Integration | BLOCKED |

---

# 9. Inventory Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-INV-001 | Inventory está aislado por Business | Isolation | SPECIFIED |
| T-INV-002 | Stock no queda negativo | Concurrency/Integrity | SPECIFIED |
| T-INV-003 | Physical/reserved/available mantienen semántica consistente | Domain | BLOCKED |
| T-INV-004 | Reserva/descuento ocurre en transición definida | State | BLOCKED |
| T-INV-005 | Ajuste exige razón y responsable | Audit | SPECIFIED |
| T-INV-006 | Recepción aprobada permanece inmutable | Integrity | SPECIFIED |
| T-INV-007 | Stock vencido no aparece como available | Functional | SPECIFIED |

---

# 10. Purchase Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-PUR-001 | Receiving registra cantidades reales | Functional | SPECIFIED |
| T-PUR-002 | Receiving parcial conserva saldo | Functional | SPECIFIED |
| T-PUR-003 | Diferencias contra PO quedan trazables | Audit | SPECIFIED |
| T-PUR-004 | Purchase no cruza Business | Isolation | SPECIFIED |

---

# 11. Pricing / Promotions Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-PRICE-001 | Precio aplicado es trazable a contexto comercial | Functional | SPECIFIED |
| T-PRICE-002 | Precio respeta vigencia cuando corresponde | Functional | SPECIFIED |
| T-PRICE-003 | Promotion precedence | Functional | BLOCKED |
| T-PRICE-004 | Promotion combination | Functional | BLOCKED |

---

# 12. AR / Credit Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-AR-001 | AR permanece dentro del Business | Isolation | SPECIFIED |
| T-AR-002 | Payment application es reconstruible | Audit | SPECIFIED |
| T-AR-003 | Un pago puede aplicarse a varias deudas | Functional | SPECIFIED |
| T-AR-004 | Credit available respeta fórmula aprobada | Functional | BLOCKED |
| T-AR-005 | Nueva compra respeta política de crédito | Integration | BLOCKED |

---

# 13. Payments / Cash Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-PAY-001 | External payment conserva external ID | Integration | SPECIFIED |
| T-PAY-002 | Reversal conserva historial | Integrity | SPECIFIED |
| T-CASH-001 | Cash pertenece a Business | Isolation | SPECIFIED |
| T-CASH-002 | Lifecycle de Cash se respeta | State | SPECIFIED |
| T-CASH-003 | Cierre registra expected vs counted | Functional | SPECIFIED |
| T-CASH-004 | Mixed payments mantienen trazabilidad | Integration | SPECIFIED |

---

# 14. Fulfillment Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-FUL-001 | Driver debe aceptar antes de iniciar viaje | State | SPECIFIED |
| T-FUL-002 | Customer observa delivery progress | Functional | SPECIFIED |
| T-FUL-003 | Driver DELIVERED + Customer NOT CONFIRMED sigue regla definida | State | BLOCKED |
| T-FUL-004 | Pickup respeta ubicación asignada | Functional | PARTIAL/BLOCKED |

---

# 15. Returns Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-RET-001 | Return no edita Sale original | Integrity | SPECIFIED |
| T-RET-002 | Producto en inspección no vuelve automáticamente a available | Inventory | SPECIFIED |
| T-RET-003 | Return state machine | State | BLOCKED |
| T-RET-004 | Partial return conserva cantidades correctas | Functional | BLOCKED pending state semantics |

---

# 16. Refund Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-REF-001 | Refund es distinto de Payment | Domain | SPECIFIED |
| T-REF-002 | Refund mantiene linkage requerido | Integrity | SPECIFIED |
| T-REF-003 | Refund no supera máximo reembolsable | Financial | SPECIFIED/CANDIDATE |
| T-REF-004 | Refund state machine | State | BLOCKED |
| T-REF-005 | Double refund prevention | Integrity | SPECIFIED |
| T-REF-006 | Partial refund calcula máximo correctamente | Financial | BLOCKED pending formula |

---

# 17. Notification Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-NOT-001 | Notification respeta audience/capability | Security | SPECIFIED |
| T-NOT-002 | Notification referencia evento originante | Traceability | SPECIFIED |
| T-NOT-003 | Duplicate notifications are suppressed when required | Functional | SPECIFIED |

Provider, retry y channel específicos permanecen OPEN.

---

# 18. Audit Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-AUD-001 | Critical mutation genera audit evidence | Audit | SPECIFIED |
| T-AUD-002 | Audit respeta Business isolation | Security | SPECIFIED |
| T-AUD-003 | Usuario normal no modifica audit | Security | SPECIFIED |
| T-AUD-004 | Logical deletion preserva history | Integrity | SPECIFIED |
| T-AUD-005 | Audit contiene actor/timestamp/operation/context | Audit | SPECIFIED |

---

# 19. Business / SaaS Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-BIZ-001 | Business requiere Owner | Lifecycle | BLOCKED |
| T-BIZ-002 | Business state afecta access | Authorization | PARTIAL |
| T-BIZ-003 | SaaS Admin cross-Business scope | Security | BLOCKED |
| T-BIZ-004 | Business creation approval workflow | Lifecycle | BLOCKED |

---

# 20. Brand / Experience Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-BRAND-001 | Customer-facing experience identifies Business | UX | SPECIFIED |
| T-BRAND-002 | Brand stays within Wapsell Design System | UX | SPECIFIED |
| T-BRAND-003 | Navigation follows User + Business + Membership + capabilities | UX/Security | SPECIFIED |

---

# 21. Migration / Compatibility Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-MIG-001 | Legacy coexistence remains bounded | Migration | SPECIFIED |
| T-MIG-002 | Legacy sessions remain compatible only during transition | Security | TECHNICAL OPEN |
| T-MIG-003 | Legacy sessions invalid after cutoff | Security | TECHNICAL OPEN |
| T-MIG-004 | Migration preserves required existing functionality | Regression | SPECIFIED |
| T-MIG-005 | No silent semantic loss | Regression | SPECIFIED |

---

# 22. Cross-Domain Tests

| ID | Verifica | Tipo | Estado |
|---|---|---|---|
| T-XDOM-001 | Authorization occurs before mutation | Security | SPECIFIED |
| T-XDOM-002 | Business Context propagates across synchronous use cases | Isolation | TECHNICAL OPEN |
| T-XDOM-003 | Messaging cannot bypass domain application rules | Architecture | SPECIFIED |
| T-XDOM-004 | Critical multi-resource operation is atomic/consistent | Transaction | BLOCKED by boundaries |

---

# 23. Architecture Tests

## T-ARCH-001 — Domain boundary enforcement

**Objetivo:** detectar acceso directo no autorizado de un módulo a persistence de otro dominio.

**Estado:** SPECIFIED.

## T-ARCH-002 — Provider isolation

**Objetivo:** verificar que domain/application no dependan directamente de SDK-specific provider semantics.

**Estado:** SPECIFIED.

## T-ARCH-003 — Modular boundary

**Objetivo:** detectar dependencias que violen ownership explícito de módulos.

**Estado:** SPECIFIED.

---

# 24. Negative / Abuse Test Families

Además de happy paths, R6 requiere evaluar:

1. acceso con Membership de otro Business;
2. Membership INACTIVE;
3. capability insuficiente;
4. recurso inexistente en Business actual;
5. intento de modificar Sale confirmada;
6. intento de stock negativo;
7. doble refund;
8. acceso no autorizado a audit;
9. bypass desde Messaging;
10. uso de sesión legacy fuera del período permitido;
11. operaciones concurrentes sobre último stock cuando la semántica esté aprobada;
12. reintentos de operaciones financieras.

Los casos bloqueados no deben ejecutarse contra una semántica inventada.

---

# 25. Evidencia de ejecución

R6 **no afirma ejecución**.

Estado actual:

| Evidencia | Estado |
|---|---|
| Test specifications | SPECIFIED |
| Automated tests | NOT CREATED |
| Test execution | NOT EXECUTED |
| Coverage | NOT DETERMINABLE |
| CI validation | NOT EXECUTED |
| E2E validation | NOT EXECUTED |
| Production validation | NOT EXECUTED |

---

# 26. Gate hacia R7

R7 puede comenzar con la definición de un **Plan de transformación y validación** porque R6 ya establece qué debe comprobarse.

Antes de implementation, cada test crítico deberá mapearse a:

`Requirement → Contract → Invariant → Test → Implementation → Evidence`

Los blockers siguen siendo OPEN y no se convierten en comportamiento implícito.

---

# 27. R6 — No decide

R6 no decide:

- implementación de tests;
- framework de tests;
- schema;
- API;
- DTO;
- JWT;
- infraestructura;
- CI provider;
- deployment;
- migration implementation;
- resolución de blockers funcionales.

**R6 STATUS: TEST / EVAL BASELINE CREATED — DRAFT / NOT APPROVED.**
