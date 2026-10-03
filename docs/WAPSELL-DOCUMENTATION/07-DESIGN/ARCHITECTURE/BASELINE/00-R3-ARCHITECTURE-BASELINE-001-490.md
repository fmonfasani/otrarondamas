# WAPSELL — R3 ARCHITECTURE — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R3 — ARCHITECTURE  
**Fuentes:** Decision Register + AS-IS baseline + R1 Requirements + R2 Specialized Specs + Workshop Reconciliation 001–490

> Este documento define una arquitectura objetivo de alto nivel. No autoriza schema, migraciones, contratos, implementación, deploy ni cambios destructivos.

## 1. Objetivo
Definir las fronteras arquitectónicas de Wapsell manteniendo la separación entre Platform/Core, Business/Tenancy, Brand/Design System, Commerce/ERP, Messaging e Identity/Roles/Permissions.

## 2. Dirección arquitectónica
La dirección documentada es **Modular Monolith initially**. No se adopta microservices como arquitectura inicial. La estructura debe permitir evolución posterior sin exigir una migración inicial a microservicios.

## 3. Arquitectura lógica objetivo
```text
WAPSELL PLATFORM
│
├── Experience / Web
│   ├── Messaging
│   ├── Spaces / Navigation
│   ├── Catalog
│   ├── Orders / Sales
│   └── Business / Team / Configuration
│
├── Application / Use Cases
│   ├── Identity / Authorization / Tenancy
│   ├── Messaging / Commerce / Catalog
│   ├── Inventory / Purchases / Payments / Cash
│   ├── AR / Fulfillment / Returns / Refunds
│   └── Notifications / Audit / Business-SaaS
│
├── Domain / Business Rules
│   └── Business entities and invariants
│
└── Infrastructure
    ├── PostgreSQL / Prisma
    ├── Auth providers
    ├── Payment providers
    ├── Notification providers
    ├── Storage
    └── External integrations
```

Este es un modelo lógico, no un diagrama de despliegue.

## 4. Capas
### Experience
Responsable de navegación contextual, Spaces, Messaging UX, Catalog, Orders/Sales, operaciones y Brand. No debe ser fuente de reglas de dominio.

### Application
Responsable de use cases, orquestación, authorization checks, transaction boundaries y workflows cross-domain.

### Domain
Responsable de reglas de negocio y conceptos de Identity, Tenancy, Authorization, Messaging, Catalog, Customer, Cart, Orders, Sales, Inventory, Purchases, Pricing, Promotions, AR, Payments, Cash, Fulfillment, Returns, Refunds, Notifications, Audit y Business/SaaS.

### Infrastructure
Responsable de persistence, proveedores externos, storage, payments, notifications y adapters.

## 5. Fronteras principales
**Platform/Core:** User global, authentication, Membership, authorization framework y SaaS administration.

**Business/Tenancy:** Business es la frontera comercial y de aislamiento. Customers, Inventory, Purchases, Sales, Orders, Payments, Cash, configuración, Branches, Warehouses y recursos Business-scoped quedan bajo ella.

**Brand:** configuración del Business sobre el Wapsell Design System. La identidad comercial visible es la del Business.

**Commerce/ERP:** motor operativo detrás de la experiencia: Catalog, Cart, Orders, Sales, Inventory, Purchases, Suppliers, Pricing, Promotions, AR, Payments, Cash, Fulfillment, Returns y Refunds.

**Messaging:** boundary de primera clase y superficie comercial central. Puede mostrar ERP state, invocar use cases y registrar eventos, pero no debe manipular persistence de dominios directamente.

## 6. Identity y Authorization
Flujo conceptual:
```text
Credential / OAuth
       ↓
Global User
       ↓
Target Business Context
       ↓
Membership
       ↓
Effective Authorization
       ↓
Use Case
       ↓
Business-scoped Resource
```
Authentication responde quién es el User; Membership responde pertenencia contextual; Authorization responde si puede ejecutar la operación; tenant isolation protege la frontera Business.

## 7. Tenant isolation
Business es la frontera conceptual de tenant. Todo use case Business-scoped debe establecer Business Context antes de acceder a recursos.

**Mecanismo técnico: OPEN.** El AS-IS usa Empresa-based Prisma scoping; esto es evidencia actual, no decisión TO-BE.

## 8. Business Context
Una operación Business-scoped requiere User autenticado + Business objetivo + Membership válida + autorización efectiva.

Representación exacta OPEN: request context, session, token claims, explicit resource context o combinación. No se selecciona mecanismo en R3.

## 9. Transaction boundaries
Las operaciones que modifican múltiples recursos de consistencia crítica requieren atomicidad apropiada.

Ejemplos afectados: Sale confirmation, Order cancellation y Refund. Las fronteras concretas dependen de state machines todavía abiertas.

## 10. Comunicación cross-domain
En el modular monolith se prioriza coordinación explícita mediante application services, interfaces entre módulos y eventos para side effects apropiados. No se exige broker externo.

Debe evitarse acceso descontrolado entre módulos directamente sobre persistence.

## 11. Messaging ↔ ERP
```text
Messaging Action
      ↓
Authorization
      ↓
Application Use Case
      ↓
Domain Rule
      ↓
Persistence / Transaction
      ↓
Domain/System Event
      ↓
Conversation Event / Notification
```
Esto evita duplicar reglas entre Messaging y ERP.

## 12. Persistence
AS-IS: PostgreSQL + Prisma + Empresa scoping.

TO-BE: persistence relacional compatible con modular monolith, ownership explícito de datos y acceso tenant-aware.

Physical model de User, Business, Membership, Customer↔User, Branch, Warehouse, permissions, audit y messaging permanece OPEN.

## 13. External integrations
Los proveedores externos deben aislarse mediante adapters/interfaces. Categorías: authentication, payments, notifications, storage y futuras integrations.

Mercado Pago permanece como prioridad histórica del Decision Register.

Wapsell Messaging MVP no depende de WhatsApp. No se autoriza integración WhatsApp por este artefacto.

## 14. Audit
Audit es transversal. Las mutaciones relevantes deben producir hechos auditables con actor, Business context cuando corresponda, timestamp, operación, cambios de estado y razón.

Audit debe respetar Business isolation; SaaS Admin puede acceder cross-Business dentro de su ámbito autorizado. Storage/query strategy permanece OPEN.

## 15. Notifications
Las notifications deben derivarse preferentemente de eventos de dominio/aplicación y aplicar audience/capability policies antes de llegar al provider.

Canal, provider, retry, batching y retention permanecen OPEN.

## 16. Security boundaries
1. Authentication boundary.
2. Authorization boundary.
3. Business Context boundary.
4. Tenant isolation boundary.
5. External provider boundary.
6. Audit boundary.

La navegación frontend nunca sustituye authorization.

## 17. Domain ownership
| Concern | Primary domain |
|---|---|
| Global identity | Identity |
| Membership | Tenancy / Identity |
| Permissions | Authorization |
| Conversations | Messaging |
| Product identity | Catalog |
| Customer relationship | Customer |
| Cart | Cart / Commerce |
| Order lifecycle | Orders |
| Confirmed commercial operation | Sales |
| Stock | Inventory |
| Supplier acquisition | Purchases |
| Price | Pricing |
| Promotions | Promotions |
| Debt | AR |
| External payment | Payments |
| Cash register | Cash |
| Delivery | Fulfillment |
| Return | Returns |
| Refund | Refunds |
| Notification delivery | Notifications |
| Historical traceability | Audit |
| Business lifecycle | Business / SaaS |

## 18. AS-IS → Architecture target
El AS-IS ya contiene NestJS, Prisma, PostgreSQL, authentication, permissions, Empresa scoping, catalog, sales, orders, inventory, purchases, cash y customers. Eso es evidencia de capacidades actuales, no conformidad automática con TO-BE.

La transformación debe seguir: AS-IS verification → gap → transformation rule → implementation → validation.

## 19. Principales gaps arquitectónicos
1. Empresa → Business.
2. Usuario → global User.
3. User↔Business → Membership.
4. Business Context.
5. contextual authorization.
6. Messaging domain.
7. Brand configuration.
8. multi-Business identity.
9. formal tenant isolation.
10. cross-domain application boundaries.
11. event/audit model.
12. Returns/Refunds architecture.
13. SaaS Administration.
14. migration/coexistence strategy.

## 20. Architecture OPEN items
| ID | Tema | Estado |
|---|---|---|
| A-OPEN-001 | Tenant isolation mechanism | OPEN |
| A-OPEN-002 | Business Context representation | OPEN |
| A-OPEN-003 | User/Business/Membership physical model | OPEN |
| A-OPEN-004 | Authorization precedence | OPEN |
| A-OPEN-005 | Order/Sale transaction boundaries | OPEN pending state matrix |
| A-OPEN-006 | Inventory reservation transaction boundaries | OPEN pending stock semantics |
| A-OPEN-007 | Payment/AR transaction semantics | OPEN |
| A-OPEN-008 | Return/Refund transaction semantics | OPEN |
| A-OPEN-009 | Event delivery strategy | OPEN |
| A-OPEN-010 | Migration/cutover architecture | OPEN |

## 21. Principios
1. Business isolation.
2. Global User identity.
3. Membership-based authorization.
4. Domain ownership.
5. Messaging as central commercial interface.
6. ERP as operational engine.
7. Transactional consistency.
8. Auditability.
9. Provider abstraction.
10. Incremental transformation.
11. Modular monolith initially.
12. No implementation inference from open requirements.

## 22. R3 no decide
R3 no decide exact database schema, Prisma model changes, RLS, JWT claims, session implementation, API routes, DTOs, event payload schemas, broker/queues, microservices, cloud topology, deployment, migration scripts ni code modifications.

## 23. Próxima fase
R3 establece fronteras arquitectónicas. La siguiente capa es **R4 — Contracts**.

Contracts sólo deben cerrarse donde las semantics funcionales, state transitions, authorization, tenant context y transaction semantics estén suficientemente estables. Los OPEN deben permanecer explícitos.

## 24. Evidencia
| Elemento | Estado |
|---|---|
| AS-IS | DOCUMENTADO + CODE EVIDENCE |
| Decision Register | CANONICAL |
| Workshop 001–490 | DOCUMENTADO / PERSISTIDO |
| Reconciliation | DOCUMENTADO / PERSISTIDO |
| R1 | DOCUMENTADO / DRAFT |
| R2 | DOCUMENTADO / DRAFT |
| R3 Architecture | THIS DOCUMENT / DRAFT |
| Contracts | NOT CREATED |
| Invariants | NOT CREATED |
| Tests/Evals | NOT CREATED |
| Schema | NOT MODIFIED |
| Code | NOT MODIFIED |
| Migration | NOT EXECUTED |

**R3 STATUS: ARCHITECTURAL BASELINE CREATED — DRAFT / NOT APPROVED.**