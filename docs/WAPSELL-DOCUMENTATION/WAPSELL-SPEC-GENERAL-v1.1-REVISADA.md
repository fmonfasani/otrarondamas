# WAPSELL — SPEC GENERAL v1.1
## Documento derivado de auditoría — NO CANÓNICO HASTA APROBACIÓN

**Estado:** DRAFT — REVISADA  
**Fecha:** 2026-09-28  
**Propósito:** consolidar la dirección de producto y las decisiones D-001…D-018 sin adelantar contratos, invariantes, arquitectura detallada ni requisitos especializados.

---

# 1. Control documental

## 1.1 Naturaleza

Esta versión es una **revisión derivada** de la SPEC General v1.0.

No reemplaza todavía el archivo canónico del repositorio.

La revisión aplica la siguiente separación:

- **DECISION** — decisión aprobada por el Owner.
- **REQUIREMENT** — comportamiento que se deriva de una decisión o de la SPEC General existente.
- **PROPOSAL** — propuesta aún no convertida en requisito aprobado.
- **OPEN DETAIL** — aspecto que requiere definición posterior.
- **AS-IS** — comportamiento/documentación del sistema existente.
- **TO-BE** — estado objetivo.

## 1.2 Fuente documental

La SPEC General v1.0 existente contiene requisitos globales WRF, NFR, experiencia propuesta, arquitectura conceptual y límites de dominio propuestos. Los WRF-09…WRF-17, por ejemplo, definen catálogo, pedidos, ventas, pagos, inventario, compras, entregas, reportes y auditoría. 

La documentación reconciliada del workshop registra D-001…D-018 como decisiones aprobadas por el Owner, pero la persistencia de esas formulaciones en el Decision Register canónico debe completarse.

---

# 2. Definición de Wapsell

**DECISION**

Wapsell es una plataforma SaaS de comercio conversacional y gestión comercial multinegocio.

El modelo conceptual canónico es:

```text
User
  │
  └── Membership
        │
        └── Business / Tenant
              │
              └── Brand
```

El Business constituye la unidad de aislamiento multi-tenant.

La conversación constituye la experiencia comercial central.

El ERP constituye el motor operativo detrás de esa experiencia.

---

# 3. Conceptos canónicos

## 3.1 User

**DECISION — D-002**

`User` representa la identidad global de la plataforma.

Un mismo User puede pertenecer a múltiples Business.

## 3.2 Business / Tenant

**DECISION — D-001**

`Business` es la unidad de negocio y aislamiento multi-tenant.

`Empresa` es el concepto AS-IS que será transformado hacia el modelo Business.

La estrategia concreta de migración permanece **OPEN DETAIL**.

## 3.3 Membership

**DECISION — D-002 / D-005**

`Membership` representa la relación entre User y Business.

Los roles y permisos pertenecen al Membership.

El mismo User puede tener diferentes roles y permisos en diferentes Business.

## 3.4 Brand

**DECISION — D-004**

Cada Business puede configurar su Brand sobre el Design System canónico de Wapsell.

La marca del Business es protagonista en la experiencia orientada al cliente; Wapsell permanece como plataforma subyacente.

---

# 4. Decisiones aprobadas

## D-001 — Business / Tenant

Business = Tenant.

Empresa se transforma hacia Business y Business constituye la unidad de aislamiento multi-tenant.

**OPEN DETAIL:** migración y modelo físico.

## D-002 — User / Membership

User es la identidad global.

La relación User ↔ Business se establece mediante Membership.

Un User puede pertenecer a múltiples Business.

**OPEN DETAIL:** migración de Usuario/Cliente, modelo de datos y ciclo de vida.

## D-003 — Messaging / AI

Messaging estará activo en el MVP inicial como sistema de mensajería propio de Wapsell.

Los Asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP inicial.

**OPEN DETAIL:** modelo de Conversation/Message, realtime, asignación, presencia, attachments, integración futura de asistentes.

## D-004 — Design System / Brand

Wapsell tendrá un Design System canónico común.

Cada Business podrá configurar su Brand sobre ese sistema.

**OPEN DETAIL:** modelo de configuración, tokens, assets y límites de personalización.

## D-005 — Roles / Permissions

Los roles y permisos pertenecen al Membership.

El acceso se determina por Membership activo y autorizaciones correspondientes.

**OPEN DETAIL:** catálogo definitivo de roles, permisos, lifecycle y administración.

## D-006 — Authorization

Todo acceso autenticado debe validarse mediante User y Membership.

Un token válido por sí solo no autoriza acceso a un Business.

**OPEN DETAIL:** tipos de token, guards, middleware/interceptors, errores, sesión y seguridad complementaria.

## D-007 — Order / Sale

Order y Sale son entidades conceptualmente diferentes.

Order representa una solicitud/intención de compra y su proceso de preparación/confirmación.

Sale representa la operación comercial efectivamente confirmada.

Una Order puede dar origen a una Sale bajo las condiciones que se definan.

Una operación de venta presencial/POS puede originar una Sale directamente.

**OPEN DETAIL:** estados y condiciones exactas de conversión.

## D-008 — Sale lifecycle

Una Sale atraviesa un ciclo de vida explícito.

La confirmación constituye el momento en que se aplican sus efectos comerciales, operativos y económicos correspondientes.

Una Sale confirmada no se elimina.

Su anulación es una operación explícita que genera las reversiones o ajustes correspondientes.

Los efectos deben ejecutarse de manera transaccional y consistente.

**OPEN DETAIL:** estados completos, autorizaciones y efectos detallados sobre cada dominio.

## D-009 — Governance

La SPEC es la fuente de verdad del producto.

Las propuestas deben distinguirse de requisitos aprobados.

Toda implementación debe poder trazarse hasta su requisito, decisión o especificación correspondiente.

**OPEN DETAIL:** workflow documental y mecanismo formal de aprobación.

## D-010 — Stock integrity

Wapsell debe garantizar integridad transaccional del stock.

Los movimientos deben ejecutarse de forma atómica y concurrentemente segura.

No deben permitirse cantidades negativas o estados inconsistentes salvo una regla explícitamente definida por negocio.

**OPEN DETAIL:** mecanismos concretos de DB/transacción y pruebas.

## D-011 — Payments

Wapsell soportará pasarelas de pago externas, comenzando por Mercado Pago como integración prioritaria.

La integración se desacoplará del dominio comercial mediante una abstracción de proveedor.

Los pagos externos tendrán estados y trazabilidad propios.

**OPEN DETAIL:** API, checkout, webhooks, credenciales, conciliación y estados concretos.

## D-012 — Accounts Receivable

Wapsell soportará Cuentas por Cobrar por Business.

Una venta no cancelada completamente puede generar una cuenta por cobrar asociada al cliente.

Se deberán registrar saldos pendientes y cobros posteriores aplicables a las deudas correspondientes.

**OPEN DETAIL:** modelo de deuda, aplicación de cobros, estados y reglas de crédito.

## D-013 — Cash

Cada Business gestionará sus propias cajas.

La caja tendrá ciclo de apertura, operaciones/movimientos, arqueo y cierre.

Los movimientos conservarán trazabilidad de origen, importe, medio de pago y usuario responsable.

Una caja cerrada no se modifica directamente.

**OPEN DETAIL:** estados, autorizaciones, ajustes y conciliación.

## D-014 — Inventory ownership

El inventario pertenece exclusivamente a cada Business.

No existe stock global compartido entre Business.

Las compras, ventas, ajustes y movimientos se registran en el contexto del Business correspondiente.

**OPEN DETAIL:** ubicaciones, transferencias y modelo físico.

## D-015 — Purchases / AP

Las Compras se gestionan dentro del Business.

Una Compra representa una adquisición a un Proveedor.

Puede registrar productos, cantidades, precios, condiciones de pago y recepción.

Una obligación pendiente genera una Cuenta por Pagar asociada al Business y Proveedor.

**OPEN DETAIL:** lifecycle, documentos, pagos y conciliación.

## D-016 — Fulfillment

Fulfillment pertenece al dominio de Pedidos.

Un pedido podrá pasar por preparación, asignación de entrega y entrega, con estados explícitos y trazabilidad.

El Business podrá gestionar repartidores, zonas y tarifas.

Debe existir seguimiento y evidencia de entrega.

**OPEN DETAIL:** modelo de repartidor, tracking, evidencia, zonas y tarifas.

## D-017 — Architecture

Wapsell se implementará inicialmente como un monolito modular.

Los dominios y responsabilidades estarán separados lógicamente.

La arquitectura debe permitir evolución posterior de componentes sin requerir una migración inicial a microservicios.

No se establece actualmente una adopción obligatoria de Kubernetes, GraphQL, colas u otras tecnologías enterprise.

**OPEN DETAIL:** arquitectura física, infraestructura, comunicación y seguridad adicional.

## D-018 — CI/CD

Wapsell contará progresivamente con un pipeline CI/CD automatizado.

Debe contemplar validaciones de código, build, pruebas automatizadas y, cuando corresponda, integración/E2E y despliegues controlados.

Los cambios que no superen las validaciones obligatorias no avanzarán al siguiente entorno.

**OPEN DETAIL:** plataforma, branching, environments, gates y estrategia de releases.

---

# 5. Principios de producto

## 5.1 Conversación como interfaz

**DECISION / PRINCIPIO**

La conversación es la experiencia central de interacción comercial.

Los módulos ERP permanecen disponibles como herramientas operativas especializadas.

La representación conversacional de una operación no sustituye a la entidad operativa responsable.

## 5.2 Multi-tenancy

**DECISION**

Los recursos comerciales y operativos pertenecen al Business correspondiente.

El aislamiento debe mantenerse en todas las operaciones.

## 5.3 Branding

**DECISION**

La experiencia frente al cliente se presenta bajo la Brand del Business, sobre el Design System de Wapsell.

---

# 6. Mapa funcional global

La SPEC General existente identifica como capacidades globales:

- identidad;
- negocios;
- Membership;
- roles;
- conversaciones;
- mensajería;
- asistentes;
- atención humana;
- catálogo;
- pedidos;
- ventas;
- pagos;
- inventario;
- compras;
- entregas;
- reportes;
- auditoría.

Estas capacidades corresponden a los WRF definidos en la SPEC General v1.0. 

**Clasificación:** REQUIREMENTS / DERIVED REQUIREMENTS.

Los IDs WRF existentes se conservan como referencia documental de la SPEC v1.0; no se crean nuevos IDs en esta revisión.

---

# 7. Dominios

El mapa de dominios de la SPEC v1.0 es conceptual y propone:

- Identity
- Business
- Authorization
- Messaging
- Assistants
- Customers
- Catalog
- Commerce
- Sales
- Orders
- Inventory
- Purchases
- Payments
- Cash
- Fulfillment
- Notifications
- Reports
- Audit
- Platform

**Clasificación actual:** PROPOSAL / DOMAIN MAP.

Los límites definitivos serán establecidos en las SPEC especializadas y Architecture.

No se consideran todavía contratos ni límites técnicos definitivos.

---

# 8. Experiencia comercial

La SPEC v1.0 propone como experiencia objetivo:

```text
Entrar
  ↓
Identificar negocio
  ↓
Conversar
  ↓
Consultar
  ↓
Elegir productos
  ↓
Generar pedido
  ↓
Pagar
  ↓
Consultar estado
```

**Clasificación:** PROPOSAL / PRODUCT FLOW.

La necesidad de crear una cuenta antes de conversar permanece abierta en la documentación existente.

El flujo detallado se especificará posteriormente.

---

# 9. Onboarding del Business

La SPEC v1.0 propone:

```text
Abrir mi negocio
  ↓
Identidad
  ↓
Qué vendo
  ↓
Importar catálogo
  ↓
Configurar asistente
  ↓
Probar conversación
  ↓
Publicar
  ↓
Compartir enlace / QR
  ↓
Primera conversación
  ↓
Primer pedido
  ↓
Primera venta
```

**Clasificación:** PROPOSAL.

No constituye todavía un requisito funcional aprobado.

---

# 10. Requisitos no funcionales globales

La SPEC v1.0 identifica como categorías:

- seguridad;
- aislamiento multi-tenant;
- autenticación;
- autorización;
- trazabilidad;
- observabilidad;
- disponibilidad;
- consistencia;
- recuperación ante errores;
- idempotencia;
- escalabilidad;
- protección de datos.

Los objetivos cuantitativos permanecen pendientes.

**Clasificación:** REQUIREMENT CATEGORIES.

No se definen todavía SLO/SLA, latencia, throughput, RPO/RTO ni retención cuantitativa.

---

# 11. Messaging

Messaging es parte activa del MVP.

La SPEC v1.0 requiere comunicación bidireccional de baja latencia y contempla:

- recepción de mensajes;
- envío;
- actualización de conversaciones;
- estados;
- presencia cuando corresponda;
- asignación;
- transferencia humano/asistente.

La tecnología concreta permanece abierta.

**Nota:** los asistentes de IA están preparados conceptualmente, pero permanecen inactivos durante el MVP conforme a D-003.

---

# 12. AS-IS → TO-BE

La transformación debe conservar la separación entre:

```text
AS-IS
  ↓
DECISION
  ↓
TO-BE
```

Ejemplo:

```text
AS-IS
Empresa
  ↓
D-001
  ↓
TO-BE
Business / Tenant
```

Otro ejemplo:

```text
AS-IS
Usuario / Cliente separados
  ↓
D-002
  ↓
TO-BE
User + Membership + relaciones comerciales
```

La migración concreta no se define en esta SPEC.

---

# 13. MVP

El MVP se define por decisiones aprobadas y por requisitos documentados.

No se deben convertir automáticamente todas las propuestas de la SPEC v1.0 en funcionalidades obligatorias del MVP.

Particularmente:

- Messaging: activo.
- AI assistants: preparados pero inactivos.
- Business/Tenancy: núcleo.
- User/Membership: núcleo.
- Sales/Orders/Payments/Inventory/Purchases/Cash/Fulfillment: sujetos a sus SPEC especializadas.
- arquitectura inicial: Modular Monolith.
- CI/CD: evolución progresiva.

El alcance detallado de cada dominio se establece en las SPEC especializadas.

---

# 14. Elementos deliberadamente fuera de esta SPEC

No se formalizan aquí:

- contratos API;
- esquema de base de datos;
- endpoints;
- eventos;
- estados técnicos completos;
- permisos exhaustivos;
- invariantes formales;
- pruebas;
- métricas de performance;
- infraestructura detallada;
- deployment topology;
- modelos concretos de Mercado Pago;
- lifecycle detallado de Customer;
- lifecycle detallado de AR/AP;
- modelo físico de Inventory;
- modelo detallado de Fulfillment.

Estos corresponden a capas posteriores.

---

# 15. Invariants — estado

La SPEC v1.0 contiene candidatos `INV-Gxx`, incluyendo stock no negativo, histórico comercial, idempotencia, auditoría, identidad de asistentes y separación de dominios.

En esta revisión esos elementos **NO se declaran invariantes formales**.

Estado:

**OPEN — TO BE FORMALIZED IN INVARIANTS LAYER**

La etapa de Invariants deberá definir:

- identificador;
- formulación normativa;
- alcance;
- evidencia;
- prueba asociada.

---

# 16. Architecture — estado

D-017 establece únicamente la dirección inicial:

```text
MODULAR MONOLITH
```

La arquitectura detallada será posterior.

Orden:

```text
SPEC GENERAL
      ↓
SPECIALIZED SPECS
      ↓
ARCHITECTURE
      ↓
CONTRACTS
      ↓
INVARIANTS
      ↓
TESTS / EVALS
```

---

# 17. Traceability

La trazabilidad mínima requerida será:

```text
Decision
   ↓
Requirement
   ↓
Specialized SPEC
   ↓
Architecture / Contract
   ↓
Invariant
   ↓
Test
   ↓
Implementation
   ↓
Validation Evidence
```

No se considerará una decisión implementada únicamente porque aparezca mencionada en una SPEC.

---

# 18. Open Detail Register

Quedan explícitamente abiertos:

1. migración Empresa → Business;
2. migración Usuario/Cliente → User/Membership;
3. lifecycle de Membership;
4. catálogo definitivo de roles;
5. catálogo de permisos;
6. token/session model;
7. Customer ↔ User;
8. estados completos de Order;
9. estados completos de Sale;
10. conversión Order → Sale;
11. efectos detallados de Sale;
12. reglas de anulación;
13. Mercado Pago;
14. Payment states;
15. AR model;
16. Cash states;
17. Inventory locations;
18. transfers;
19. Purchases lifecycle;
20. AP model;
21. Fulfillment lifecycle;
22. tracking;
23. delivery evidence;
24. Messaging data model;
25. realtime technology;
26. AI activation model;
27. Brand configuration;
28. architecture physical topology;
29. CI/CD tooling;
30. quantitative NFRs.

---

# 19. Specialized SPEC map

| SPEC | Responsabilidad |
|---|---|
| 01 Identity & Tenancy | User, Business, Membership, authorization foundation |
| 02 Commerce | Customers, Catalog, Orders, Sales, Payments, AR |
| 03 Operations | Inventory, Purchases, AP, Cash, Fulfillment |
| 04 Messaging | Conversation, Message, realtime, human handling, AI readiness |
| 05 Platform & Governance | Governance, architecture direction, CI/CD |
| 06 Branding & Experience | Design System, Brand, customer-facing experience |

Los límites se validarán durante la elaboración de cada SPEC.

---

# 20. Criterio de aprobación de esta SPEC

La SPEC General podrá pasar a estado **APPROVED** cuando:

1. D-001…D-018 estén registrados en el Decision Register canónico con sus textos aprobados.
2. No existan decisiones contradictorias.
3. AS-IS y TO-BE estén diferenciados.
4. Las propuestas estén marcadas como propuestas.
5. Los OPEN DETAIL estén explícitos.
6. No haya invariantes/contratos técnicos prematuramente formalizados.
7. La trazabilidad hacia las SPEC especializadas esté definida.
8. El alcance de la General SPEC no invada las capas posteriores.

---

# 21. Estado actual

**SPEC General v1.1 — DRAFT / REVISED AFTER AUDIT**

### Resultado de auditoría

- Dirección de producto: PASS
- Decisiones D-001…D-018: PASS
- Multi-tenancy: PASS
- Messaging: PASS
- Commerce direction: PASS
- Inventory ownership: PASS
- Architecture direction: PASS
- CI/CD direction: PASS
- Separation AS-IS/TO-BE: PASS
- Invariants formalization: REMOVED / DEFERRED
- New WRF IDs: NOT CREATED
- Domain map: PROPOSAL
- MVP detail: OPEN / SPECIALIZED SPECS
- Contracts: NOT DEFINED
- Tests/Evals: NOT DEFINED

**Conclusión:** READY FOR SPECIALIZED SPECS, sujeto a registrar formalmente las decisiones aprobadas en el Decision Register canónico.
