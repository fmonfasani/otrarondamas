# WAPSELL — RELEVAMIENTO, ESTADO Y ROADMAP GENERAL

Fecha: 2026-10-03
Estado: STATUS / ROADMAP
Naturaleza: consolidación derivada de AS-IS, Decision Register, TO-BE y workshop 001-490. No modifica por sí mismo el Decision Register, TO-BE, Contracts, Invariants ni código.

## 1. Estado ejecutivo

El relevamiento funcional llegó a 490 decisiones/definiciones de Owner.

Las 490 fueron persistidas como evidencia de workshop en:
docs/WAPSELL-DOCUMENTATION/04-DECISIONS/01-OWNER-WORKSHOP-RELEVAMIENTO-001-490.md

Commit: 6147ded7dfa3bb3f51675dc6300bfc4406b879d1

Esto NO significa 490 funcionalidades implementadas ni que cada respuesta sea automáticamente una decisión canónica. El siguiente paso es reconciliar el workshop con las decisiones canónicas y convertirlo en requisitos y especificaciones trazables.

Estado global:
- Discovery funcional: AVANZADO.
- AS-IS: DOCUMENTADO + EVIDENCIA DE CÓDIGO.
- TO-BE: SUSTANCIAL, pero DRAFT / NOT APPROVED.
- Workshop Owner: 490 decisiones capturadas y persistidas.
- Contracts: NO CERRADOS.
- Invariants formales: NO CERRADOS.
- Tests/Evals sistemáticos: PENDIENTES.
- Implementation: existe AS-IS funcional, pero la transformación completa todavía no está ejecutada.

## 2. Estado del relevamiento

### Definido

El workshop cubrió Identity/Tenancy, Users, Membership, Roles/Profiles/Capabilities, Messaging, Groups, Contacts, Businesses, Branding, Catalog, Products, homologación, Pricing, Promotions, Customers, Orders, Sales, Inventory, Locations, Warehouses, Transfers, Suppliers, Purchases, AR/Credit, Cash, Payments, Returns, Refunds, Delivery, Drivers, Notifications y Audit.

Las decisiones canónicas previas ya establecen:
- Wapsell = Platform.
- Business = unidad de negocio y aislamiento.
- User = identidad global.
- Membership = relación User-Business.
- Customer separado de User.
- Messaging = interfaz comercial central.
- Commerce/ERP = motor operativo.
- Brand configurable por Business sobre Design System común.
- Order y Sale conceptualmente diferentes.
- Sale confirmada inmutable.
- Stock con integridad transaccional.
- Inventory, Cash, AR y Purchases pertenecen al Business.
- Payments externos con abstracción.
- Fulfillment dentro de Orders.
- Arquitectura inicial modular monolith.
- CI/CD incremental.

### Abierto

Continúan abiertos:
- modelo físico User/Business/Membership;
- Business Context técnico;
- tokens/sesiones/revocación;
- mecanismo definitivo de tenant isolation;
- catálogo formal de Roles y Capabilities;
- modelo formal Profile -> Role -> Capability;
- lifecycle técnico completo;
- Messaging formal;
- estados completos de Order/Sale;
- reglas precisas de reserva/stock;
- homologación automática y thresholds;
- estados y permisos de Returns/Refunds;
- onboarding y SaaS Administration;
- contratos;
- invariantes;
- tests/evals;
- plan de migración y cutover.

## 3. Reconciliaciones necesarias

1. 077 vs 161-165: descuento físico de stock frente a reserva y momento de confirmación.
2. 078 vs Order/Sale/AR: relación entre pago obligatorio del Order y operaciones con deuda.
3. 079 vs 099/381: criterio definitivo Order -> Sale.
4. 091/092/389: matriz exacta de cancelación por actor y estado.
5. 123/124/140: condiciones de homologación automática.
6. 198: regla de cálculo del límite de crédito.
7. 003/005 vs 273: Role/Permission frente al modelo Profile -> Roles atomizados -> Capabilities.
8. 001/304: semántica de Membership ACTIVA/INACTIVA frente a desactivación temporal.
9. 345/346/359: pickup como modalidad frente a asignación de Branch.
10. 378-380: timeout/escalamiento de confirmación de entrega.

No deben resolverse silenciosamente.

## 4. Mapa funcional consolidado

### Messaging
Conversaciones, Groups, Contacts, mensajes, replies, lectura, typing, mute, attachments, productos, carts, Orders, eventos ERP, delivery, returns, refunds y notifications.

### Businesses
Identidad del negocio, configuración, Brand, información pública, visibilidad, branches, warehouses, estado, ownership y Memberships.

### Clientes / Contacts
Contact = agenda privada del User.
Customer = relación comercial Customer-Business, independiente de User y opcionalmente vinculable.

### Catalog
Products, producto canónico, homologación, categorías, variantes, identificadores, imágenes y configuración comercial.

### Stock
Stock físico/disponible/reservado, ubicaciones, warehouses, lotes, vencimientos, FEFO, ajustes, transferencias, trazabilidad y concurrencia.

### Purchases / Suppliers
Supplier, SKU de proveedor, cotizaciones, Purchase Orders, confirmaciones, recepciones, discrepancias y cuentas por pagar.

### Orders
Cart -> Order, confirmación, preparación, ready, pickup/delivery, asignación, tracking, cancelación, evidencia y conversión a Sale.

### Sales
Sale confirmada, historial inmutable, cancelación, reversión, Payments, AR, Reports y Audit.

### Cash / Payments
Cajas múltiples, apertura, movimientos, cierre, conciliación, métodos de pago, pagos mixtos, pagos externos, estados y refunds.

### Accounts Receivable
Deudas, vencimientos, mora, límites, condiciones, pagos parciales, aplicación automática, reminders, recargos y crédito disponible.

### Returns / Refunds
Solicitud, aprobación, retorno físico, inspección, cuarentena, reposición, intercambio, refund, refund parcial, ajuste AR e incidencias.

### Repartidores / Fulfillment
Disponibilidad, asignación, aceptación, viaje, entrega, evidencia/PIN, tracking y eventos en conversación. Fulfillment permanece conceptualmente dentro de Orders.

### Team / Roles / Permissions
Membership, Team, Owner, Profiles, Roles, Capabilities, overrides, invitaciones, deactivación y ownership.

### Reports / Audit
Reportes operativos/financieros, stock, compras, ventas, AR, Cash, márgenes, historial y auditoría.

### SaaS Administration
Onboarding, lifecycle Business, ownership, administración de plataforma, restricciones de suscripción y auditoría administrativa. El detalle permanece abierto.

## 5. AS-IS -> TO-BE

### AS-IS documentado/verificado

El baseline establece:
- Empresa como frontera de negocio.
- Usuario acoplado a Empresa.
- Cliente separado de Usuario.
- email globalmente único.
- JWT.
- password/bcrypt.
- Google OAuth.
- JwtAuthGuard.
- PermissionsGuard.
- LegajoAprobadoGuard.
- UsuarioPermiso.
- EmpresaScopedPrismaService.
- PostgreSQL/Prisma.
- módulos reales de catálogo, ventas, pedidos, inventario, compras, caja, clientes y auth.

El AS-IS no implementa como modelo TO-BE:
- Business;
- Membership;
- Conversation/Message Wapsell;
- Business onboarding;
- tenant model global.

### TO-BE

Destino conceptual:
User -> Membership -> Business -> recursos Business-scoped

Y:
Customer -> relación comercial con Business
Customer -> vínculo opcional -> User

### Estado de transformación

| Área | Estado |
|---|---|
| Empresa -> Business | Dirección decidida |
| Usuario -> User global | Dirección decidida |
| User-Business -> Membership N:N | Dirección decidida |
| Customer separado de User | Decidido |
| Auth global + Membership authorization | Dirección decidida; mecanismo OPEN |
| Tenant isolation por Business | Dirección decidida; mecanismo OPEN |
| Messaging propio | Dirección decidida; implementación pendiente |
| Commerce detrás de Messaging | Dirección decidida |
| Inventory integrity | Requisito decidido; existe GAP documentado |
| Payments abstraction | Dirección decidida |
| AR | Dirección decidida |
| Returns/Refunds | Workshop decidido; especificación pendiente |
| Audit | Workshop decidido; especificación pendiente |
| Migration | Dirección decidida; plan pendiente |

## 6. Roadmap

### R0 — Reconciliación del workshop
Comparar 490 decisiones con Decision Register, eliminar duplicaciones, resolver tensiones y clasificar cada elemento como Decision, Requirement, Open Detail, Technical Decision o Proposal.

Salida: Canonical Reconciled Decision Set.

### R1 — Requirements
Transformar las decisiones reconciliadas en requisitos, actores, reglas, estados, permisos, precondiciones, postcondiciones y eventos.

### R2 — TO-BE Functional Specs
Cerrar/reconciliar Identity & Tenancy, Messaging, Commerce, Inventory, Operations, Payments/Cash, Returns/Refunds, Fulfillment, Platform/Governance y Branding/Experience.

### R3 — Architecture
Definir modular monolith, boundaries, application/domain/infrastructure, tenancy enforcement, auth, sessions, messaging, event model y transaction boundaries.

### R4 — Contracts
Formalizar API/domain contracts, estados y transiciones, authorization, Messaging, Payments, Inventory, Orders/Sales, Returns/Refunds y Notifications.

### R5 — Invariants
Formalizar invariantes críticos:
- aislamiento entre Businesses;
- stock nunca negativo;
- Sale confirmada inmutable;
- refund no excede máximo;
- doble refund imposible;
- pagos idempotentes;
- reservas/liberaciones consistentes;
- Membership inválida no autoriza;
- auditoría preservada;
- operaciones financieras transaccionales.

### R6 — Tests / Evals
Unit, integration, authorization, tenant isolation, concurrency, payments, Order/Sale, refunds/returns, E2E y regression.

### R7 — Transformation Plan
Migración, coexistencia temporal, compatibilidad, cutover, rollback, observabilidad y validación de datos.

### R8 — Implementation
Orden propuesto, sujeto a aprobación:
1. Identity/Tenancy.
2. Authorization.
3. Business Context.
4. Commerce core.
5. Inventory integrity.
6. Messaging foundation.
7. Orders/Sales.
8. Payments/Cash/AR.
9. Purchases/Suppliers.
10. Fulfillment.
11. Returns/Refunds.
12. Notifications.
13. Audit/Reports.
14. SaaS administration.

Este orden es ROADMAP PROPUESTO, no todavía Plan aprobado.

## 7. Estado general por evidencia

| Área | Clasificación |
|---|---|
| AS-IS | VERIFICADO POR CÓDIGO + DOCUMENTADO |
| Identity/Tenancy conceptual | DECIDIDO |
| D-001…D-018 | REGISTRADOS EN CANONICAL REGISTER |
| Workshop 001-490 | DECIDIDO EN WORKSHOP + PERSISTIDO |
| Requirements | DOCUMENTADO / PARCIAL |
| TO-BE | DOCUMENTADO / DRAFT — NOT APPROVED |
| Specialized Specs | PARCIALES |
| Contracts | NO CERRADOS |
| Invariants | NO CERRADOS |
| Tests/Evals | PENDIENTES COMO CAPA SISTEMÁTICA |
| Architecture | DIRECCIÓN DECIDIDA; DETALLE OPEN |
| Migration | DIRECCIÓN DECIDIDA; PLAN OPEN |
| Implementation | AS-IS FUNCIONAL EXISTENTE; TRANSFORMACIÓN PENDIENTE |
| CI/CD | DIRECCIÓN DECIDIDA; implementación requiere verificación específica |

## 8. Lectura correcta del proyecto

Wapsell ya no está principalmente en etapa de descubrir qué producto se quiere construir.

Tampoco corresponde implementar directamente las 490 respuestas.

El proyecto está en:

DISCOVERY FUNCIONAL AVANZADO
-> RECONCILIACIÓN
-> ESPECIFICACIÓN FORMAL
-> CONTRATOS/INVARIANTES/TESTS
-> PLAN
-> IMPLEMENTACIÓN

La prioridad inmediata es convertir el volumen de decisiones en una estructura normativa trazable.

## 9. Cadena de gobernanza

REQUIREMENTS
-> SPEC GENERAL
-> SPECS ESPECIALIZADAS
-> ARCHITECTURE
-> CONTRACTS
-> INVARIANTS
-> TESTS/EVALS
-> PLAN
-> TASKS
-> IMPLEMENTATION
-> VALIDATION
-> REVIEW
-> DELIVERY

No debe saltarse directamente desde Workshop a código.

## 10. Conclusión

Estado global:
FUNCTIONAL DISCOVERY ADVANCED / SPECIFICATION RECONCILIATION REQUIRED

Fortalezas:
- AS-IS real documentado.
- Evidencia de código existente.
- Dirección multi-tenant definida.
- Identity model definido.
- Commerce ampliamente relevado.
- Messaging definido como interfaz central.
- 490 decisiones capturadas y persistidas.

Gaps principales:
- reconciliar workshop;
- formalizar Requirements;
- cerrar Open Details;
- reconciliar TO-BE;
- Contracts;
- Invariants;
- Tests/Evals;
- Transformation Plan;
- Implementation incremental;
- Validation.

Regla operativa:
Workshop -> Reconciliation -> Requirements/Decisions -> SPEC -> Contracts/Invariants/Tests -> Plan -> Implementation.

No se debe convertir automáticamente una respuesta del workshop en código ni declarar implementada una capacidad solo porque esté documentada.
