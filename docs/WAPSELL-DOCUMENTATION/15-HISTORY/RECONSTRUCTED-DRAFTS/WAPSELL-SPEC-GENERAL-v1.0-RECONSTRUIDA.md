# WAPSELL — SPEC GENERAL

**Documento:** SPEC General  
**Versión:** v1.0  
**Estado:** DRAFT — BASE PARA APROBACIÓN  
**Producto:** Wapsell  
**Fecha:** 2026-09-28  
**Fuente de verdad:** esta SPEC, una vez aprobada, en conjunto con el Decision Register y las SPEC especializadas.  
**Estado de implementación:** NO DERIVADO. Esta SPEC define el TO-BE funcional y conceptual; no implica cambios de código, base de datos o infraestructura.

---

## 1. Propósito

Wapsell es una plataforma SaaS de comercio conversacional y gestión comercial multinegocio.

Wapsell combina:

- mensajería comercial;
- identidad y gestión de Business;
- catálogo y productos;
- clientes;
- pedidos;
- ventas;
- pagos;
- cuentas por cobrar;
- inventario;
- compras;
- cuentas por pagar;
- caja;
- fulfillment;
- reportes;
- auditoría;
- branding por Business.

El principio de producto es:

> **La conversación es la interfaz principal; el ERP es el motor operativo detrás de ella.**

Wapsell es la plataforma. Un Business utiliza Wapsell como infraestructura comercial. Otra Ronda Más es el primer Business/tenant de la plataforma.

**Estado:** DECIDIDO / TO-BE.

---

## 2. Modelo conceptual canónico

Los conceptos fundamentales son:

```text
Wapsell Platform
       │
       ├── User
       │
       └── Business (Tenant)
              │
              ├── Brand
              └── Memberships
                     │
                     └── User ↔ Business
```

### 2.1 User

`User` es la identidad global de Wapsell.

Un mismo User puede pertenecer a múltiples Business.

### 2.2 Business

`Business` es la unidad comercial y de aislamiento multi-tenant.

El concepto histórico `Empresa` se transforma conceptualmente en `Business`.

### 2.3 Membership

`Membership` representa la relación entre un User y un Business.

Los roles y permisos pertenecen al contexto del Membership.

### 2.4 Brand

`Brand` representa la identidad comercial configurable de un Business sobre el Design System canónico de Wapsell.

---

## 3. Decisiones normativas

Las siguientes decisiones fueron aprobadas por el Owner durante el workshop del 2026-09-28 y se incorporan a esta SPEC.

### D-001 — Business = Tenant

Business es la unidad de aislamiento multi-tenant.

`Empresa` se transforma conceptualmente en `Business`.

### D-002 — User global + Membership

User es la identidad global.

La relación User ↔ Business se establece mediante Membership.

Un mismo User puede pertenecer a múltiples Business.

Roles y permisos se determinan dentro del Membership.

### D-003 — Messaging

Messaging estará activo en el MVP inicial como sistema de mensajería propio de Wapsell.

Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP inicial.

El MVP inicial no depende de WhatsApp como canal.

### D-004 — Design System y Brand

Wapsell tendrá un Design System canónico común.

Cada Business podrá configurar su Brand sobre dicho sistema.

La experiencia orientada al cliente debe identificarse principalmente con la marca del Business, mientras Wapsell permanece como plataforma subyacente.

### D-005 — Roles y permisos

Roles y permisos pertenecen al Membership.

Un User puede tener diferentes roles y permisos en diferentes Business.

El acceso se determina mediante el Membership activo y sus autorizaciones.

### D-006 — Autorización contextual

Todo acceso autenticado debe validarse mediante:

1. identidad global User;
2. Business objetivo;
3. Membership válido;
4. roles y permisos necesarios.

Un token válido por sí solo no autoriza una operación sobre un Business.

### D-007 — Order vs Sale

`Order` y `Sale` son entidades conceptualmente diferentes.

- `Order` representa una solicitud/intención de compra y su proceso de preparación/confirmación.
- `Sale` representa la operación comercial efectivamente confirmada.
- Una Order puede originar una Sale cuando se cumplen las condiciones definidas para su conversión.
- No toda Order constituye necesariamente una Sale.
- Una venta presencial/POS puede originar una Sale directamente.

Las condiciones detalladas de conversión permanecen para la SPEC especializada.

### D-008 — Sale lifecycle

Una Sale atraviesa un ciclo de vida explícito.

La confirmación constituye el momento en que se aplican sus efectos comerciales, operativos y económicos correspondientes.

Una Sale confirmada no se elimina.

Su anulación debe registrarse como una operación explícita que genere las reversiones o ajustes necesarios sobre:

- stock;
- caja;
- pagos;
- cuentas por cobrar;

según corresponda.

Los efectos deben ejecutarse de manera transaccional y consistente, evitando estados parcialmente aplicados.

### D-009 — Governance

La SPEC es la fuente de verdad del producto.

Ninguna funcionalidad, cambio de alcance, decisión arquitectónica o modificación relevante del comportamiento se considera requisito aprobado sin definición y aprobación documental correspondiente.

Las propuestas deben distinguirse de los requisitos aprobados.

Toda implementación debe poder trazarse hasta su requisito, decisión o especificación.

### D-010 — Integridad de inventario

Wapsell debe garantizar integridad transaccional del stock mediante controles de base de datos y/o transacción.

Las operaciones de movimiento deben ser:

- atómicas;
- concurrentemente seguras;
- resistentes a cantidades inválidas;
- consistentes entre movimientos y existencias resultantes.

Los controles de integridad existentes deberán verificarse y mantenerse como requisito obligatorio del dominio de Inventario.

### D-011 — Pagos externos

Wapsell debe soportar integración con pasarelas externas.

Mercado Pago es la integración prioritaria.

La integración se desacoplará mediante una abstracción de proveedor de pagos.

Los pagos externos deberán mantener estados y trazabilidad del proceso de:

- autorización;
- aprobación;
- rechazo;
- cancelación;
- conciliación;

cuando corresponda.

Los detalles de implementación de Mercado Pago permanecen OPEN DETAIL.

### D-012 — Accounts Receivable

Wapsell debe soportar Cuentas por Cobrar por Business.

Una venta parcialmente o no cancelada puede generar una cuenta por cobrar asociada al cliente.

El sistema debe permitir:

- consultar saldos pendientes;
- registrar cobros posteriores;
- aplicar cobros a deudas;
- mantener trazabilidad;
- consultar el saldo del cliente.

El modelo detallado de AR permanece OPEN DETAIL.

### D-013 — Cash

Cada Business gestiona sus propias cajas.

El ciclo de caja incluye conceptualmente:

```text
Apertura
   ↓
Operaciones / Movimientos
   ↓
Arqueo
   ↓
Cierre
```

Los movimientos deben registrar:

- Business;
- origen;
- importe;
- medio de pago;
- usuario responsable.

Las operaciones sensibles están sujetas a permisos del Membership.

Una caja cerrada no se modifica directamente. Las correcciones deben realizarse mediante operación compensatoria o mecanismo de ajuste autorizado.

### D-014 — Inventory ownership

El inventario pertenece exclusivamente a cada Business.

No existe stock global compartido entre Business.

Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente.

No se permite transferencia de stock entre Business salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior.

### D-015 — Purchases / Accounts Payable

Las Compras pertenecen al Business.

Una Compra representa una adquisición a un Proveedor y puede registrar:

- productos;
- cantidades;
- precios;
- condiciones de pago;
- recepción.

Cuando existe importe pendiente, se genera una Cuenta por Pagar asociada al Business y al Proveedor.

Los pagos posteriores deben poder registrarse y aplicarse a las obligaciones correspondientes.

Debe mantenerse trazabilidad y conciliación de saldos.

### D-016 — Fulfillment

Fulfillment pertenece al dominio de Pedidos.

Un pedido puede pasar por:

```text
Preparación
   ↓
Asignación de entrega
   ↓
Entrega
```

Debe existir:

- estados explícitos;
- trazabilidad;
- gestión de repartidores;
- zonas;
- tarifas;
- seguimiento;
- evidencia de entrega.

Fulfillment no constituye necesariamente un módulo principal independiente de navegación.

### D-017 — Architecture

Wapsell se implementará inicialmente como un **monolito modular**.

La arquitectura debe separar claramente dominios y responsabilidades y permitir evolucionar componentes individualmente sin requerir una migración inicial a microservicios.

Se prioriza:

- simplicidad;
- mantenibilidad;
- separación de dominios;
- evolución incremental.

Infraestructura, mecanismos de comunicación y capacidades de seguridad adicionales se incorporarán cuando exista un requisito concreto que los justifique.

### D-018 — CI/CD

Wapsell deberá contar con un pipeline CI/CD automatizado.

El pipeline deberá incorporar progresivamente:

- validaciones de código;
- build;
- pruebas automatizadas;
- integración/E2E cuando corresponda;
- despliegues controlados.

Los cambios que no superen validaciones obligatorias no deben avanzar al siguiente entorno.

La estrategia será incremental y alineada con la arquitectura y madurez del proyecto.

---

## 4. Principios de producto

### 4.1 Conversación como interfaz principal

La conversación constituye la experiencia comercial principal.

### 4.2 ERP como motor operativo

Las operaciones reales pertenecen a dominios estructurados.

Messaging no reemplaza:

- Orders;
- Sales;
- Payments;
- Inventory;
- Cash;
- Purchases;
- Fulfillment.

### 4.3 Separación de dominios

La experiencia puede estar unificada, pero los dominios mantienen responsabilidades separadas.

```text
Messaging ≠ Orders ≠ Sales ≠ Payments ≠ Inventory
```

### 4.4 Multi-tenancy

Cada Business constituye un límite de aislamiento.

### 4.5 Branding

La identidad visible frente al cliente corresponde al Business.

### 4.6 Trazabilidad

Las operaciones relevantes deben poder reconstruirse mediante registros adecuados.

### 4.7 Incrementalidad

La plataforma evoluciona mediante incrementos verificables y trazables.

### 4.8 Governance

No se implementan requisitos no aprobados como si fueran decisiones.

---

## 5. Roles y contexto de acceso

El modelo normativo es:

```text
User
  │
  └── Membership
          │
          ├── Business
          ├── Roles
          └── Permissions
```

El catálogo exacto de roles y permisos se definirá en la SPEC especializada de Identity/Authorization.

No se establece en esta SPEC una matriz exhaustiva de permisos.

---

## 6. Navegación conceptual

La navegación del producto será contextual al Business y al rol/permisos del Membership.

Para perfiles administrativos/operativos, la estructura conceptual podrá agrupar:

- Inicio;
- Mensajería;
- Caja;
- Compras;
- Stock;
- Reportes;
- Usuarios y permisos;
- Configuración.

**Nota:** la navegación concreta y su visibilidad por rol se define en las SPEC especializadas de Experience/Identity.

Fulfillment pertenece a Pedidos y no se define como módulo principal independiente.

---

## 7. Dominios funcionales

Wapsell se organiza conceptualmente en los siguientes dominios:

| Dominio | Responsabilidad |
|---|---|
| Platform | Capacidades propias de la plataforma |
| Identity | Identidad global |
| Business/Tenancy | Business y aislamiento |
| Authorization | Membership, roles y permisos |
| Messaging | Conversaciones y mensajes |
| Branding | Brand y experiencia comercial |
| Customers | Relación comercial con clientes |
| Catalog | Productos y catálogo |
| Orders | Pedidos |
| Sales | Ventas |
| Payments | Pagos |
| Accounts Receivable | Deudas y cobros |
| Inventory | Existencias y movimientos |
| Purchases | Compras y abastecimiento |
| Accounts Payable | Obligaciones con proveedores |
| Cash | Caja |
| Fulfillment | Preparación y entregas |
| Notifications | Notificaciones |
| Reports | Información operacional |
| Audit | Trazabilidad |

Los límites definitivos serán refinados en las SPEC especializadas.

---

## 8. Messaging

Messaging es un dominio activo del MVP.

Debe soportar conceptualmente:

- conversaciones;
- mensajes;
- participantes;
- contexto del Business;
- contexto del cliente;
- contexto comercial;
- asignación;
- lectura/estado;
- adjuntos cuando corresponda;
- transferencia entre atención humana y capacidades futuras.

La conversación puede referenciar:

```text
Customer
Order
Sale
Payment
Delivery
```

La conversación no constituye la fuente primaria de verdad de esas operaciones.

### 8.1 IA

Durante el MVP:

```text
Messaging = ACTIVO
AI Assistants = PREPARADOS TÉCNICAMENTE / INACTIVOS
```

La activación funcional de asistentes de IA requerirá una especificación posterior.

---

## 9. Commerce

El dominio comercial comprende, entre otros:

```text
Customer
Catalog
Order
Sale
Payment
Accounts Receivable
```

La experiencia puede ser conversacional, presencial u originarse desde otras interfaces.

---

## 10. Sales

Una Sale representa la operación comercial efectivamente confirmada.

Puede originarse:

- directamente;
- desde una Order;
- desde una interacción conversacional;
- desde una operación presencial/POS.

La confirmación de Sale es el punto de aplicación de sus efectos según D-008.

Una Sale confirmada no se elimina.

La anulación es una operación explícita.

Los estados concretos de Sale serán definidos en la SPEC especializada.

---

## 11. Orders

Order representa intención/solicitud de compra y proceso de preparación/confirmación.

Order y Sale son entidades diferentes.

La conversión:

```text
Order → Sale
```

ocurre bajo condiciones que serán definidas en la SPEC de Commerce/Orders.

No se establece aquí una lista de estados concreta.

---

## 12. Payments

Payments administra pagos vinculados a operaciones comerciales.

Debe poder soportar:

- pagos manuales;
- pagos externos;
- estados propios;
- trazabilidad;
- aplicación a obligaciones cuando corresponda.

Mercado Pago es la primera integración externa prioritaria.

Los estados exactos y contratos externos permanecen OPEN DETAIL.

---

## 13. Accounts Receivable

AR pertenece al contexto del Business.

Conceptualmente:

```text
Sale
  ↓
Importe pendiente
  ↓
Accounts Receivable
  ↓
Cobro
  ↓
Aplicación
  ↓
Saldo actualizado
```

La implementación detallada queda para la SPEC especializada.

---

## 14. Inventory

Inventory pertenece exclusivamente al Business.

Debe mantener:

- existencias;
- movimientos;
- ajustes;
- entradas;
- salidas;
- trazabilidad.

Las operaciones de stock deben ser transaccionalmente seguras.

No existe stock global de Wapsell.

---

## 15. Purchases y Accounts Payable

Purchases pertenece al Business.

Conceptualmente:

```text
Compra
  ↓
Recepción
  ↓
Inventario
  ↓
Obligación pendiente
  ↓
Accounts Payable
  ↓
Pago
```

El detalle de documentos, estados y conciliación se define en la SPEC especializada.

---

## 16. Cash

Cash pertenece al Business.

Ciclo:

```text
OPEN
  ↓
OPERATIONS
  ↓
COUNT / ARQUEO
  ↓
CLOSED
```

Los nombres técnicos definitivos de estados quedan OPEN DETAIL.

El principio normativo es que una caja cerrada no se modifica directamente.

---

## 17. Fulfillment

Fulfillment pertenece a Orders.

Puede incluir:

- preparación;
- asignación;
- reparto;
- entrega;
- seguimiento;
- evidencia.

Debe operar en contexto de Business.

Los modelos concretos de repartidor, zona, tarifa, tracking y evidencia quedan para la SPEC especializada.

---

## 18. Catalog

Catalog representa los productos comercializables del Business.

La estructura vigente del catálogo debe respetar la definición canónica existente del dominio y ser refinada en la SPEC especializada.

Esta SPEC no redefine niveles, variantes, códigos o reglas de precio que todavía no hayan sido aprobados específicamente.

El catálogo no constituye el stock físico.

---

## 19. Customers

Customers representa la relación comercial con un Business.

El modelo definitivo de identidad del cliente debe ser compatible con:

```text
Global User
Membership
Customer relationship
```

La reconciliación completa entre la identidad global y perfiles de cliente se define en Identity/Customers.

No se deben eliminar comportamientos AS-IS sin definir su transformación.

---

## 20. Branding y Design System

Wapsell tendrá un Design System canónico.

El Business puede configurar su Brand sobre ese sistema.

Conceptualmente:

```text
WAPSELL DESIGN SYSTEM
        │
        └── Business Brand
              ├── Logo
              ├── Colors
              ├── Typography
              ├── Assets
              └── Customer-facing identity
```

La marca del Business es protagonista frente al cliente.

Los valores concretos del sistema y el contrato de theming se definirán en la SPEC de Branding.

---

## 21. Multi-tenancy y aislamiento

Regla fundamental:

> Ninguna operación de un Business puede acceder, modificar o exponer datos de otro Business sin una autorización explícita de plataforma definida posteriormente.

Toda operación contextual de Business debe resolver:

```text
Authenticated User
      ↓
Membership
      ↓
Business Context
      ↓
Role / Permission
      ↓
Operation
```

El aislamiento debe cubrir como mínimo:

- autorización;
- aplicación;
- acceso a datos;
- persistencia;
- contratos;
- auditoría.

Los mecanismos técnicos concretos se definen en Architecture y Contracts.

---

## 22. Auditoría

Las operaciones sensibles deben conservar información suficiente para reconstruir:

- quién;
- qué;
- cuándo;
- sobre qué entidad;
- contexto del Business;
- origen;
- cambios relevantes.

La estructura técnica de Audit queda para la SPEC especializada.

---

## 23. Notificaciones

Notifications será una capacidad transversal.

Las notificaciones podrán originarse en:

- Orders;
- Sales;
- Payments;
- Fulfillment;
- Messaging;
- otros dominios.

No se define todavía una tecnología concreta de notificación.

---

## 24. Reportes

Reports debe permitir consultar información operacional del Business.

Áreas conceptuales:

- ventas;
- productos;
- stock;
- compras;
- clientes;
- pagos;
- caja;
- fulfillment.

El alcance analítico avanzado queda OPEN DETAIL.

---

## 25. Requisitos funcionales globales

| ID | Requisito |
|---|---|
| WRF-01 | Gestionar identidad global de User |
| WRF-02 | Gestionar Business/Tenant |
| WRF-03 | Gestionar Membership User ↔ Business |
| WRF-04 | Gestionar roles y permisos contextuales |
| WRF-05 | Gestionar conversaciones |
| WRF-06 | Gestionar mensajería propia de Wapsell |
| WRF-07 | Preparar técnicamente capacidades futuras de asistentes |
| WRF-08 | Gestionar clientes |
| WRF-09 | Gestionar catálogo |
| WRF-10 | Gestionar Orders |
| WRF-11 | Gestionar Sales |
| WRF-12 | Gestionar Payments |
| WRF-13 | Gestionar Accounts Receivable |
| WRF-14 | Gestionar Inventory |
| WRF-15 | Gestionar Purchases |
| WRF-16 | Gestionar Accounts Payable |
| WRF-17 | Gestionar Cash |
| WRF-18 | Gestionar Fulfillment |
| WRF-19 | Gestionar Reports |
| WRF-20 | Registrar Audit |
| WRF-21 | Gestionar Brand por Business |

---

## 26. Requisitos no funcionales globales

La arquitectura deberá contemplar:

- seguridad;
- aislamiento multi-tenant;
- autenticación;
- autorización;
- consistencia;
- trazabilidad;
- auditabilidad;
- idempotencia cuando corresponda;
- observabilidad;
- recuperación ante errores;
- protección de datos;
- mantenibilidad;
- evolución incremental.

Los objetivos cuantitativos de:

- disponibilidad;
- latencia;
- throughput;
- retención;
- recuperación;

permanecen OPEN DETAIL.

---

## 27. Arquitectura conceptual

La arquitectura conceptual es:

```text
                         WAPSELL PLATFORM
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
     IDENTITY               BUSINESS                 MESSAGING
        │                       │                        │
        │          ┌────────────┼────────────┐           │
        │          │            │            │           │
        │       Commerce    Operations    Branding      │
        │          │            │            │           │
        │       Orders       Inventory     Brand         │
        │       Sales        Purchases                   │
        │       Payments     Cash                        │
        │       AR/AP        Fulfillment                 │
        │                                                │
        └───────────────────────┬────────────────────────┘
                                │
                             REPORTS
                                │
                              AUDIT
```

Esta arquitectura es lógica.

La decisión de implementación es:

> **Modular Monolith inicialmente.**

No implica microservicios.

---

## 28. Arquitectura de implementación

D-017 establece:

```text
Initial Architecture
        =
Modular Monolith
```

El sistema debe mantener separación clara entre dominios.

La extracción futura de componentes podrá realizarse cuando exista una necesidad concreta.

No se adopta como requisito actual:

- Kubernetes;
- microservicios;
- GraphQL;
- colas distribuidas;
- infraestructura enterprise adicional;

salvo que una decisión o requisito posterior lo justifique.

---

## 29. Contracts

Los contratos entre dominios deberán definir progresivamente:

- emisor;
- receptor;
- operación/evento;
- datos;
- autorización;
- invariantes;
- idempotencia;
- errores;
- trazabilidad.

Los nombres de eventos y contratos concretos no se consideran aprobados hasta documentarse en la capa de Contracts.

---

## 30. Invariants globales

Los invariantes globales se definirán formalmente después de las SPEC especializadas.

Como principios aprobados/derivados de esta SPEC:

### INV-G01 — Tenant isolation

Una operación de un Business no puede acceder a datos de otro Business sin autorización explícita.

### INV-G02 — Membership authorization

Un User no puede ejecutar una operación contextual de Business sin Membership válido y autorización suficiente.

### INV-G03 — Inventory integrity

Los movimientos de inventario deben preservar consistencia transaccional.

### INV-G04 — Sale finality

Una Sale confirmada no se elimina.

### INV-G05 — Explicit cancellation

La anulación de una Sale es una operación explícita.

### INV-G06 — Domain separation

Messaging no sustituye las entidades operativas.

### INV-G07 — Traceability

Las operaciones críticas deben mantener trazabilidad suficiente.

La formalización técnica de invariantes queda para la fase correspondiente.

---

## 31. Governance y control de cambios

Toda modificación relevante debe poder asociarse a:

- requisito;
- decisión;
- SPEC;
- impacto;
- aprobación;
- fecha.

Una SPEC especializada no debe contradecir una decisión global.

Si aparece una contradicción:

```text
SPEC especializada
        ↓
conflicto
        ↓
Decision / Governance
        ↓
resolución
        ↓
SPEC actualizada
```

---

## 32. Estados de especificación

Se utilizarán explícitamente:

- `APPROVED` — aprobado;
- `DRAFT` — borrador;
- `PROPOSED` — propuesta;
- `OPEN DETAIL` — decisión global aprobada pero detalle aún pendiente;
- `NOT DETERMINABLE` — no verificable con la evidencia disponible;
- `SUPERSEDED` — reemplazado.

No se debe presentar `OPEN DETAIL` como requisito técnico ya definido.

---

## 33. Alcance del MVP

### Dentro del alcance conceptual

- Multi-tenancy;
- User global;
- Membership;
- autorización contextual;
- Business;
- Brand;
- Messaging propio de Wapsell;
- clientes;
- catálogo;
- Orders;
- Sales;
- Payments;
- Accounts Receivable;
- Inventory;
- Purchases;
- Accounts Payable;
- Cash;
- Fulfillment;
- Reports;
- Audit.

### Preparado pero inactivo

- asistentes de IA.

### Fuera de la decisión actual

No se fija aquí una implementación concreta para:

- WhatsApp como canal;
- arquitectura de microservicios;
- Kubernetes;
- GraphQL;
- infraestructura distribuida;
- capacidades avanzadas de IA.

---

## 34. Otra Ronda Más

Otra Ronda Más es el primer Business/tenant de Wapsell.

Conceptualmente:

```text
WAPSELL
   │
   └── Business
          └── Otra Ronda Más
```

El código existente de Otra Ronda Más constituye AS-IS y fuente de conocimiento/requisitos.

No debe asumirse que Wapsell es simplemente un renombrado del sistema existente.

La transformación del código y datos será objeto de Architecture, Transformation Plan y Tasks posteriores.

---

## 35. AS-IS → TO-BE

La transformación debe mantener separación documental.

```text
AS-IS
  ↓
Decision
  ↓
TO-BE
  ↓
Architecture
  ↓
Implementation
```

Esta SPEC no declara implementado ningún elemento TO-BE.

La existencia de un modelo o módulo AS-IS no implica que su diseño actual sea el TO-BE.

---

## 36. Trazabilidad de decisiones

| Decisión | Área principal |
|---|---|
| D-001 | Business / Tenancy |
| D-002 | Identity / Membership |
| D-003 | Messaging |
| D-004 | Branding |
| D-005 | Authorization |
| D-006 | Security / Authorization |
| D-007 | Commerce / Orders / Sales |
| D-008 | Sales |
| D-009 | Governance |
| D-010 | Inventory |
| D-011 | Payments |
| D-012 | Accounts Receivable |
| D-013 | Cash |
| D-014 | Inventory / Tenancy |
| D-015 | Purchases / Accounts Payable |
| D-016 | Fulfillment |
| D-017 | Architecture |
| D-018 | CI/CD |

---

## 37. SPEC especializadas

La siguiente estructura se propone para desarrollar el detalle:

1. Identity & Tenancy
2. Commerce
3. Operations / Inventory / Purchases / Cash / Fulfillment
4. Messaging
5. Platform & Governance
6. Branding & Experience

Los nombres definitivos de archivos e IDs de SPEC deben mantenerse alineados con el repositorio canónico existente y no inventarse como nuevos IDs si ya existe una nomenclatura aprobada.

---

## 38. OPEN DETAIL

Las siguientes cuestiones no quedan inventadas por esta SPEC:

### Identity
- modelo físico User/Membership;
- estados de Membership;
- lifecycle de User;
- tokens concretos;
- JWT claims;
- 2FA/MFA;
- recuperación de credenciales.

### Authorization
- matriz definitiva de permisos;
- roles exactos;
- reglas de administración;
- autorización por endpoint.

### Messaging
- protocolo realtime;
- almacenamiento y retención;
- moderación;
- presencia;
- adjuntos;
- contratos de realtime.

### AI
- capacidades;
- permisos;
- herramientas;
- límites;
- activación;
- gobernanza.

### Commerce
- estados exactos de Order;
- condiciones exactas de conversión Order → Sale;
- estados exactos de Sale;
- reglas de cancelación;
- descuentos;
- promociones;
- loyalty.

### Payments
- estados técnicos;
- integración concreta de Mercado Pago;
- webhooks;
- conciliación;
- idempotencia concreta;
- credenciales.

### AR/AP
- modelo de deuda;
- aplicación de pagos;
- documentos;
- conciliación;
- vencimientos;
- estados.

### Cash
- estados técnicos;
- tipos de movimiento;
- arqueo;
- diferencias;
- autorizaciones específicas.

### Inventory
- modelo de movimientos;
- lotes;
- vencimientos;
- reservas;
- transferencias;
- controles concretos de concurrencia.

### Fulfillment
- modelo de repartidores;
- zonas;
- tarifas;
- tracking;
- evidencia;
- estados técnicos.

### Architecture
- estructura de módulos;
- despliegue;
- observabilidad;
- colas;
- cache;
- realtime;
- estrategia de extracción.

### CI/CD
- proveedor;
- pipeline exacto;
- ambientes;
- gates;
- estrategia de release.

---

## 39. Criterios de aceptación de esta SPEC

Esta SPEC será candidata a aprobación cuando:

1. las 18 decisiones estén registradas en el Decision Register;
2. cada decisión esté trazada a esta SPEC o a una SPEC especializada;
3. no existan decisiones contradictorias;
4. los detalles abiertos estén identificados como `OPEN DETAIL`;
5. AS-IS y TO-BE permanezcan separados;
6. no existan funcionalidades inventadas presentadas como aprobadas;
7. los límites de dominio sean suficientemente claros para comenzar las SPEC especializadas;
8. la arquitectura inicial esté alineada con D-017;
9. Messaging esté alineado con D-003;
10. Inventory esté alineado con D-014;
11. Order/Sale esté alineado con D-007/D-008.

---

## 40. Estado documental

**Estado actual:** `DRAFT — BASE PARA APROBACIÓN`

**Decisiones D-001…D-018:** aprobadas en workshop por el Owner.

**Implementación:** no iniciada como consecuencia de esta SPEC.

**Architecture detallada:** pendiente.

**Contracts:** pendiente.

**Invariants formales:** pendiente.

**Tests/Evals:** pendiente.

**Plan:** pendiente.

**Tasks:** pendiente.

**Código:** sin cambios derivados de este documento.

**Deploy:** no realizado.

---

## 41. Regla de avance

El proyecto seguirá:

```text
REQUIREMENTS
     ↓
SPEC GENERAL              ← ESTE DOCUMENTO
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
     ↓
PLAN
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

No se debe saltar directamente de esta SPEC a implementación.

