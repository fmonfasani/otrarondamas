# WAPSELL — R5 INVARIANTS — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R5 — INVARIANTS  
**Fuentes:** R4 Contracts + R3 Architecture + R2 Specialized Specs + R1 Requirements + Decision Register + Workshop/Reconciliation 001–490

> Este documento formaliza invariants funcionales y arquitectónicos que pueden expresarse sin resolver por inferencia los blockers pendientes. No autoriza schema, Prisma, endpoints, DTOs, JWT, migraciones, código, tests automatizados ni deploy.

---

## 1. Objetivo

R5 convierte Contracts suficientemente estables en propiedades que **deben permanecer verdaderas** independientemente de la interfaz utilizada.

Principio:

`Contract → Invariant → Test/Eval`

Un invariant no define necesariamente cómo implementarlo. Define qué no puede violarse.

Los puntos funcionalmente OPEN permanecen explícitamente bloqueados.

---

## 2. Clasificación

- **STABLE:** puede formalizarse sin depender de un blocker abierto.
- **CANDIDATE:** regla estable conceptualmente, pendiente de validación/propagación posterior.
- **BLOCKED:** no puede cerrarse sin una decisión funcional previa.
- **TECHNICAL OPEN:** propiedad clara, mecanismo aún no definido.

---

# 3. Identity & Tenancy Invariants

## INV-ID-001 — User global

**Estado:** STABLE

Un User representa una identidad global de Wapsell.

**Propiedad:**

Un mismo User puede tener múltiples Memberships y no debe convertirse en una identidad distinta por cada Business.

---

## INV-ID-002 — Membership contextual

**Estado:** STABLE

Una Membership siempre relaciona un User con un Business concreto.

**Propiedad:**

Una Membership de Business A no concede por sí misma acceso a Business B.

---

## INV-ID-003 — Membership inactive denies Business operations

**Estado:** STABLE

Una Membership INACTIVE no puede autorizar operaciones Business-scoped.

La reactivación de la Membership debe restaurar el acceso conforme a las reglas vigentes.

---

## INV-ID-004 — Business isolation

**Estado:** STABLE / TECHNICAL OPEN

Un recurso Business-scoped sólo puede ser leído o modificado dentro del Business Context autorizado.

**No decide:** mecanismo físico de aislamiento.

---

## INV-ID-005 — Active Business Context

**Estado:** TECHNICAL OPEN

Toda operación Business-scoped requiere:

`Authenticated User + Target Business + Valid Membership + Effective Authorization`

La representación técnica del contexto permanece OPEN.

---

# 4. Authorization Invariants

## INV-AUTH-001 — Authorization is contextual

**Estado:** STABLE

La autorización de una operación Business-scoped depende del Business/Membership contextual.

Una capability válida en un Business no implica automáticamente la misma capability en otro.

---

## INV-AUTH-002 — UI is not authorization

**Estado:** STABLE

Ocultar una acción en Experience no constituye una autorización suficiente.

La operación debe volver a evaluar authorization en el use case correspondiente.

---

## INV-AUTH-003 — Messaging cannot bypass ERP authorization

**Estado:** STABLE

Una acción ERP iniciada desde Messaging debe cumplir exactamente la autorización requerida por la operación ERP subyacente.

---

## INV-AUTH-004 — Effective authorization composition

**Estado:** BLOCKED

La propiedad de autorización efectiva no puede formalizarse completamente hasta resolver:

`Profile → Roles → Capabilities → Individual Overrides`

No se define precedencia por inferencia.

---

# 5. Messaging Invariants

## INV-MSG-001 — Conversation participation

**Estado:** CANDIDATE

El acceso a una conversación debe estar limitado a participantes y actores autorizados según las reglas de Messaging.

---

## INV-MSG-002 — ERP rule reuse

**Estado:** STABLE

Messaging no puede establecer una segunda versión de una regla ERP.

La operación debe pasar por el use case/domain correspondiente.

---

## INV-MSG-003 — System message distinction

**Estado:** STABLE

Un evento/mensaje generado por el sistema debe poder distinguirse de un mensaje originado por un User.

---

## INV-MSG-004 — Message history

**Estado:** CANDIDATE

Edición/eliminación no debe destruir silenciosamente la trazabilidad requerida por las reglas funcionales.

Retention técnica permanece OPEN.

---

# 6. Catalog Invariants

## INV-CAT-001 — Canonical vs commercial identity

**Estado:** STABLE

La identidad canónica del Product no debe confundirse con precio, stock u otros datos comerciales Business-specific.

---

## INV-CAT-002 — Variant stock/price independence

**Estado:** STABLE

Cuando un Product posee Variants, el stock y precio definidos como propios de Variant no deben atribuirse incorrectamente a otra Variant.

---

## INV-CAT-003 — Homologation state validity

**Estado:** BLOCKED

La secuencia:

`PROPOSED → VALIDATED → RELIABLE → CONSOLIDATED`

no puede convertirse en una máquina formal hasta definir las condiciones de transición y auto-confirmación.

---

# 7. Cart Invariants

## INV-CART-001 — Business-scoped Cart

**Estado:** STABLE

Un Cart pertenece al contexto User + Business.

Un Cart de Business A no puede contener silenciosamente datos comerciales de Business B.

---

## INV-CART-002 — Persistent Cart identity

**Estado:** CANDIDATE

La persistencia del Cart no debe provocar mezcla de carts entre Businesses.

---

# 8. Order & Sale Invariants

## INV-ORD-001 — Order/Sale separation

**Estado:** STABLE

Order y Sale son conceptos distintos.

La existencia de un Order no implica por sí misma la existencia de una Sale.

---

## INV-ORD-002 — Customer confirmation

**Estado:** STABLE

Un flujo que requiera confirmación del Customer no puede avanzar como confirmado sin dicha confirmación.

---

## INV-ORD-003 — Order → Sale transition

**Estado:** BLOCKED

No se formaliza el estado exacto ni las precondiciones de conversión Order → Sale hasta cerrar el blocker correspondiente.

---

## INV-SALE-001 — Confirmed Sale immutability

**Estado:** STABLE

Una Sale confirmada no puede editarse ni eliminarse como si nunca hubiera existido.

Las correcciones requieren una operación explícita.

---

## INV-SALE-002 — Cancellation traceability

**Estado:** CANDIDATE

Una cancelación debe conservar al menos actor, razón y momento de la operación.

---

## INV-SALE-003 — Cancellation effects consistency

**Estado:** BLOCKED

No puede formalizarse la lista exacta de efectos a revertir hasta cerrar la matriz de cancellation por actor/estado.

---

# 9. Inventory Invariants

## INV-INV-001 — Business-owned inventory

**Estado:** STABLE

El inventario pertenece a un Business.

No debe existir acceso implícito a inventario de otro Business.

---

## INV-INV-002 — No negative stock

**Estado:** STABLE

Una operación válida no puede dejar stock disponible/contabilizado por debajo de cero cuando la regla funcional aplicable prohíbe stock negativo.

---

## INV-INV-003 — Physical/reserved/available distinction

**Estado:** STABLE AT CONCEPT LEVEL

El modelo funcional distingue:

- physical;
- reserved;
- available.

La fórmula exacta y momento de actualización permanecen bloqueados.

---

## INV-INV-004 — Reservation timing

**Estado:** BLOCKED

No se fija todavía si el stock se descuenta al crear Order, se reserva al confirmar, o mediante otra transición.

---

## INV-INV-005 — Adjustment traceability

**Estado:** STABLE

Cada ajuste de stock requiere razón y responsable.

---

## INV-INV-006 — Approved receipt immutability

**Estado:** STABLE

Una recepción aprobada no se corrige modificando retrospectivamente la recepción original.

La corrección debe ser una operación explícita.

---

## INV-INV-007 — Expired stock unavailable

**Estado:** STABLE

Stock vencido queda excluido del stock disponible.

---

# 10. Purchase Invariants

## INV-PUR-001 — Receiving records reality

**Estado:** STABLE

La recepción registra cantidades efectivamente recibidas y no reemplaza silenciosamente los datos del Purchase Order.

---

## INV-PUR-002 — Partial receiving

**Estado:** STABLE

Una Purchase Order puede recibir cantidades parciales y conservar trazabilidad del saldo.

---

## INV-PUR-003 — Purchase Business isolation

**Estado:** STABLE

Purchases y sus recepciones pertenecen al Business correspondiente.

---

# 11. Pricing & Promotion Invariants

## INV-PRICE-001 — Effective price context

**Estado:** CANDIDATE

El precio aplicado debe ser trazable al contexto comercial que lo determinó: Business y, cuando corresponda, Branch/Location, Price List, Customer, Quantity y vigencia.

---

## INV-PRICE-002 — Promotion precedence

**Estado:** BLOCKED

No puede establecerse un invariant de precedencia/combinación hasta cerrar las reglas de promociones.

---

# 12. AR & Credit Invariants

## INV-AR-001 — Business-scoped receivable

**Estado:** STABLE

Una cuenta por cobrar pertenece al Business y Customer correspondiente.

---

## INV-AR-002 — Payment application traceability

**Estado:** CANDIDATE

La aplicación de un pago a una o varias deudas debe poder reconstruirse.

---

## INV-AR-003 — Credit formula

**Estado:** BLOCKED

No se fija una fórmula de crédito disponible hasta reconciliar los comportamientos relevados en 198 y 229.

---

# 13. Payments & Cash Invariants

## INV-PAY-001 — External payment identity

**Estado:** STABLE

Un pago externo debe conservar su referencia/identificador externo cuando el provider lo suministra.

---

## INV-PAY-002 — Payment reversal traceability

**Estado:** STABLE

Una reversión no elimina silenciosamente el historial del pago original.

---

## INV-CASH-001 — Cash Business ownership

**Estado:** STABLE

Cada Cash register pertenece a un Business y sus movimientos no pueden mezclarse con los de otro Business.

---

## INV-CASH-002 — Cash lifecycle

**Estado:** STABLE

Las operaciones de Cash respetan conceptualmente:

`Apertura → Operaciones/Movimientos → Arqueo → Cierre`

No se autoriza una operación fuera del lifecycle por simple bypass de UI.

---

## INV-CASH-003 — Cash reconciliation

**Estado:** STABLE

El cierre conserva la diferencia entre importe esperado e importe contado.

---

# 14. Fulfillment Invariants

## INV-FUL-001 — Driver acceptance

**Estado:** STABLE

Un driver seleccionado no puede considerarse en viaje únicamente por haber sido seleccionado; debe aceptar conforme al flujo relevado.

---

## INV-FUL-002 — Order delivery visibility

**Estado:** CANDIDATE

El Customer puede observar el progreso de delivery correspondiente a su Order.

---

## INV-FUL-003 — Delivery confirmation escalation

**Estado:** BLOCKED

No se formaliza timeout, canal ni escalamiento cuando Driver marca delivered y Customer no confirma.

---

# 15. Return Invariants

## INV-RET-001 — Return does not mutate Sale

**Estado:** STABLE

Una Return no modifica directamente la Sale histórica.

Debe existir como operación independiente.

---

## INV-RET-002 — Quarantine before availability

**Estado:** STABLE

Un producto retornado que requiere inspección no vuelve automáticamente a available stock antes de la decisión correspondiente.

---

## INV-RET-003 — Return state machine

**Estado:** BLOCKED

Estados, transiciones y actores deben formalizarse antes de convertirlos en invariants ejecutables.

---

# 16. Refund Invariants

## INV-REF-001 — Refund distinct from Payment

**Estado:** STABLE

Refund no es equivalente a Payment y debe mantener identidad operacional propia.

---

## INV-REF-002 — Refund linkage

**Estado:** STABLE

Cuando corresponda, Refund debe mantener relación con Return, Sale y Payment original.

---

## INV-REF-003 — Refund cannot exceed refundable amount

**Estado:** CANDIDATE

Una operación de Refund no debe superar el máximo reembolsable correspondiente.

La fórmula detallada para descuentos, promociones, shipping, taxes/charges y partial returns debe formalizarse.

---

## INV-REF-004 — Refund state machine

**Estado:** BLOCKED

No se formalizan todavía las transiciones entre PENDING, CONFIRMED, REJECTED y CANCELLED.

---

# 17. Notification Invariants

## INV-NOT-001 — Notification authorization/audience

**Estado:** CANDIDATE

Una notificación sólo debe dirigirse a una audience permitida por el evento y sus reglas de capability/context.

---

## INV-NOT-002 — Event traceability

**Estado:** CANDIDATE

Una notificación relevante debe poder vincularse con el hecho de negocio que la originó.

---

## INV-NOT-003 — Deduplication

**Estado:** CANDIDATE

El mismo hecho originante no debe producir notificaciones duplicadas cuando la regla de producto requiera deduplicación.

---

# 18. Audit Invariants

## INV-AUDIT-001 — Critical mutation auditability

**Estado:** STABLE

Las mutaciones relevantes deben dejar evidencia de actor, timestamp, operación y contexto Business cuando corresponda.

---

## INV-AUDIT-002 — Business audit isolation

**Estado:** STABLE

La consulta de auditoría debe respetar la frontera Business.

---

## INV-AUDIT-003 — Audit immutability

**Estado:** STABLE

Usuarios normales no deben modificar o eliminar registros de auditoría como operación ordinaria.

---

## INV-AUDIT-004 — Historical preservation

**Estado:** STABLE

La eliminación lógica de entidades no debe destruir la historia requerida para auditoría.

---

# 19. Business & SaaS Invariants

## INV-BIZ-001 — Business requires Owner

**Estado:** CANDIDATE

Según el workshop, un Business no existe sin Owner.

El lifecycle exacto de creación/aprobación permanece OPEN.

---

## INV-BIZ-002 — Business lifecycle affects access

**Estado:** CANDIDATE

El estado de Business debe ser considerado al determinar acceso y operaciones permitidas.

---

## INV-BIZ-003 — SaaS Admin boundary

**Estado:** BLOCKED

El alcance exacto de administración cross-Business de SaaS Admin permanece OPEN.

---

# 20. Brand & Experience Invariants

## INV-BRAND-001 — Business brand precedence in customer experience

**Estado:** STABLE AT PRODUCT PRINCIPLE

La experiencia customer-facing identifica principalmente al Business y no debe presentarse como una experiencia genérica de plataforma.

---

## INV-BRAND-002 — Design System consistency

**Estado:** CANDIDATE

La configuración de Brand debe permanecer dentro del Wapsell Design System.

---

# 21. Migration Invariants

## INV-MIG-001 — Incremental coexistence

**Estado:** STABLE DIRECTION

La transformación debe preservar una coexistencia temporal y acotada durante la migración.

---

## INV-MIG-002 — Legacy session cutoff

**Estado:** STABLE DIRECTION / TECHNICAL OPEN

Al finalizar la transición, las sesiones/tokens legacy deben dejar de autorizar acceso y requerir nuevo login.

El mecanismo concreto permanece OPEN.

---

## INV-MIG-003 — No silent semantic loss

**Estado:** CANDIDATE

La migración no debe eliminar funcionalidad existente sin una regla explícita de transformación, compatibilidad o deprecación.

---

# 22. Cross-Domain Invariants

## INV-XDOM-001 — Authorization before domain mutation

**Estado:** STABLE

Ninguna mutación Business-scoped debe producir efectos de negocio antes de validar la autorización requerida.

---

## INV-XDOM-002 — Business context propagation

**Estado:** TECHNICAL OPEN

Las operaciones cross-domain Business-scoped deben conservar el mismo Business Context salvo que exista una operación explícita de frontera, como una operación comercial inter-Business.

---

## INV-XDOM-003 — No direct persistence bypass from Messaging

**Estado:** STABLE

Messaging no puede saltar las reglas de Application/Domain accediendo directamente a persistence de otro dominio.

---

## INV-XDOM-004 — Critical multi-resource consistency

**Estado:** CANDIDATE

Operaciones que cambian múltiples recursos relacionados deben conservar consistencia transaccional.

Las fronteras concretas permanecen OPEN para Order/Sale, Inventory, Payments/AR y Returns/Refunds.

---

# 23. Architecture Invariants

## INV-ARCH-001 — Modular boundary

**Estado:** STABLE

Los dominios deben mantener ownership explícito de sus reglas y evitar acceso descontrolado a persistence de otros módulos.

---

## INV-ARCH-002 — Provider isolation

**Estado:** STABLE

La lógica de negocio no debe depender directamente de SDK-specific semantics de proveedores externos.

---

## INV-ARCH-003 — Modular monolith initial direction

**Estado:** STABLE DIRECTION

La arquitectura inicial permanece como Modular Monolith.

No se deriva una arquitectura de microservicios por este documento.

---

# 24. Blockers heredados que impiden invariants cerrados

| # | Blocker | Impacta |
|---|---|---|
| 1 | Stock: descuento vs reserva | Order, Inventory, Sale |
| 2 | Order + Payment + AR | Cart, Order, Payment, AR |
| 3 | Order → Sale | Order, Sale |
| 4 | Cancellation matrix | Order, Sale, Inventory, Cash, Payment, AR |
| 5 | Homologation thresholds | Catalog |
| 6 | Credit calculation | AR |
| 7 | Profile → Role → Capability → Override | Authorization |
| 8 | Membership lifecycle actors | Identity |
| 9 | Pickup vs concrete location | Fulfillment |
| 10 | Delivery timeout/channel/escalation | Fulfillment |
| 11 | Return state machine | Returns |
| 12 | Refund state machine | Refunds, Payment, Cash, AR |
| 13 | Customer ↔ User matching | Customer/Identity |
| 14 | Business Context representation | Architecture/Auth |
| 15 | Tenant isolation mechanism | Architecture |
| 16 | Event delivery strategy | Architecture/Notifications |

---

# 25. R5 no decide

R5 no decide:

- schema físico;
- Prisma models;
- API endpoints;
- DTOs;
- JWT claims;
- session implementation;
- RLS;
- middleware/guards concretos;
- event payloads;
- event transport;
- broker/queue;
- retry/delivery guarantees;
- cloud topology;
- migration scripts;
- código;
- test implementation.

---

# 26. Evidencia

| Elemento | Estado |
|---|---|
| Workshop 001–490 | DOCUMENTADO / PERSISTIDO |
| Reconciliation | DOCUMENTADO / PERSISTIDO |
| R1 Requirements | DOCUMENTADO / DRAFT |
| R2 Specialized Specs | DOCUMENTADO / DRAFT |
| R3 Architecture | DOCUMENTADO / DRAFT |
| R4 Contracts | DOCUMENTADO / DRAFT |
| R5 Invariants | THIS DOCUMENT / DRAFT |
| Tests/Evals | NOT CREATED |
| Plan | NOT CREATED |
| Tasks | NOT CREATED |
| Schema | NOT MODIFIED |
| Code | NOT MODIFIED |
| Migration | NOT EXECUTED |
| Deploy | NOT EXECUTED |

**R5 STATUS: INVARIANT BASELINE CREATED — DRAFT / NOT APPROVED.**

## 27. Próxima fase

La siguiente fase es **R6 — TESTS / EVALS**.

R6 debe convertir invariants y contracts suficientemente estables en criterios verificables, separando:

- tests funcionales;
- tests de aislamiento Business;
- tests de autorización;
- tests de consistencia/transacción;
- tests de trazabilidad/audit;
- tests de migración/coexistencia;
- evaluaciones de UX/Experience cuando correspondan.

Los blockers OPEN no deben convertirse en tests que asuman una solución no aprobada.
