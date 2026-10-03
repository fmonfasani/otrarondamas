# Wapsell — General Specification
**Version:** 0.2 | **Status:** DRAFT — NOT APPROVED · **Reconciled:** 2026-09-28

> ## Normative basis (read before using this document)
>
> **This document is NOT approved. Its `D-0xx` citations were mis-classified, and the premise
> behind that mis-classification has since been retracted (2026-09-28).**
>
> The previous header claimed `Status: APPROVED — COHERENT WITH DECISIONS D-001..D-018`. That claim
> was unsupported and the header is withdrawn. However, the *reason* originally given for
> withdrawing it — *"the repository contains no decision text"* — was itself **wrong**: that was an
> inventory error. Reconstructed text for all of D-001…D-018 exists (see
> `04-DECISIONS/00-DECISION-REGISTER.md` §4), with two-tier provenance:
> - **D-001, D-002** → `APPROVED — OWNER-VERBATIM` (Owner-confirmed; quotable).
> - **D-003…D-018** → `APPROVED — DERIVED / RECONSTRUCTED` (usable as requirements, **not** quotable
>   as approved text until the Owner confirms wording).
>
> `IMPLEMENTATION DETAIL` remains `OPEN` for every decision: no migration, schema, naming, ID or
> physical model is authorised. DEC-001 (`04-DECISIONS/02-MULTITENANCY.md`, APPROVED 2026-09-25)
> remains the only **originally authored** decision and decides **product direction only**.
>
> Therefore:
> - Every `(Aprobado D-0xx)` marker formerly in this document has been demoted — **correctly**, since
>   the marker format asserted an approval that the source did not carry.
> - Statements that match DEC-001 are kept and marked `DEC-001`.
> - Statements now supported by reconstructed decision text are cited with the decision ID **and** the
>   `DERIVED` qualifier.
> - Everything else is **`TO-BE PROPOSED`** or **`OPEN DETAIL`**, never `APPROVED`.
> - **This document has not been reconciled line-by-line against the reconstructed decision text.**
>   That reconciliation is outstanding; see the report's "To reach PASS".
> - Per `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`: *"A specification is not proof that functionality is
>   implemented."* This document proves neither implementation nor approval.
>
> ### Which claims below are actually corroborated by DEC-001?
>
> DEC-001 is short. Everything it says is listed here; nothing more is approved.
>
> | §  | Claim in this spec | Verdict |
> |---|---|---|
> | 2  | Wapsell is a platform; Otra Ronda Más is the first Business | **APPROVED — DEC-001** (`:7-9`, `:20`) |
> | 3  | `User` is a single global identity | **APPROVED — DEC-001** (`:16`) |
> | 3  | `Membership` is N:N User↔Business | **APPROVED — DEC-001** (`:16-19`) |
> | 3  | Roles/permissions live in the Membership, not globally | **APPROVED — DEC-001** (`:18-19`) |
> | 3  | `Brand` is a Business's commercial identity | **APPROVED — DEC-001** (`:15`) |
> | 9  | Conversation is the central commercial interface | **APPROVED — DEC-001** (`:23`) |
> | 9  | AI assistants are part of the product | **APPROVED — DEC-001** (`:23-25`) |
> | 4–8 | `Tenant` as *the* canonical term; `User`≡`Customer`; token-type validation; 2FA/PCI DSS | **SUPERSEDED — decided since**: D-001 chose `Business` over `Tenant`; D-002/D-002-bis separated `Customer` from `User`; D-006 defines the authorization checks. Token-type mechanics, 2FA and PCI DSS remain `OPEN DETAIL` |
> | 10–16 | Order/Sale split and lifecycles, Payment, Cash, Inventory, Purchases, AR, Fulfillment | **APPROVED — `DERIVED / RECONSTRUCTED`** — text exists for D-007…D-016; direction only, states/contracts still `OPEN` |
> | 20 | Modular Monolith / NestJS / PostgreSQL / Docker / VPS | **APPROVED — `DERIVED / RECONSTRUCTED`** — D-017 approves the *monolithic modular* direction; the concrete stack remains `OPEN` |
> | 21 | Security beyond tenant isolation + Membership authorization | **APPROVED — `DERIVED / RECONSTRUCTED`** — D-006 defines the 4 authorization checks; mechanisms (token types, 2FA, PCI DSS) stay `OPEN` |
> | 22  | Any IN/OUT OF SCOPE item other than those marked DEC-001 | **NOT DETERMINABLE** — author proposal |
> | 24–26 | Domain map, navigation, first vertical | **PROPOSED** — no decision covers these; DEC-001:55-57 excludes the standalone-spec impact |
>
> See `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md`.

## 1. Purpose
Wapsell es una plataforma SaaS diseñada para transformar la gestión comercial de negocios, ofreciendo herramientas robustas para comercio y operaciones, con una experiencia central basada en la comunicación conversacional. Su objetivo es proporcionar una solución multi-tenant flexible y escalable para diversos tipos de negocios.

## 2. Product Definition
Plataforma SaaS multi-tenant de comercio conversacional y gestión comercial. Permite a múltiples unidades de negocio (Business) operar de forma independiente, gestionando sus clientes, catálogo, ventas, inventario, compras y cumplimiento, con un enfoque en la interacción y la comunicación como interfaz principal.

## 3. Terminology
- **Wapsell:** La plataforma SaaS en su conjunto.
- **Business:** La unidad canónica de negocio dentro de la plataforma Wapsell. Cada Business opera de forma aislada y configura su propia identidad comercial (Brand). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **User:** Una identidad global única dentro de Wapsell. Un User puede tener múltiples relaciones (Memberships) con diferentes Business, asumiendo diferentes roles y permisos en cada uno. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Membership:** La relación N:N entre un User y un Business. Define el contexto en el que un User interactúa con un Business, incluyendo su Role y Permissions específicas para ese Business. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Brand:** La identidad comercial visible de un Business hacia sus clientes. Cada Business puede configurar su Brand. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Role:** Un conjunto de Permissions que se asigna a un User dentro de un Membership. Los roles y permisos pertenecen al contexto del Membership. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Permission:** Un derecho específico para realizar una acción o acceder a un recurso dentro de un Business, otorgado a través de un Role en un Membership. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Customer:** Entidad que representa a un cliente de un Business. 
- **Supplier:** Entidad que representa a un proveedor de un Business. 
- **Product:** Un bien o servicio ofrecido por un Business en su catálogo.
- **Order:** Una intención o una operación comercial iniciada por un Customer (e.g., a través de la tienda online). Puede evolucionar a una Sale. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Sale:** Una operación económica confirmada, que puede originarse de un Order o ser una venta directa (e.g., POS). Genera efectos transaccionales (stock, pagos, caja, etc.). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Payment:** Registro de una transacción monetaria. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Cash:** Gestión de efectivo en un punto de venta (caja), incluyendo apertura, movimientos, arqueo y cierre. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Inventory:** El stock de productos de un Business. La propiedad es única por Business (stock único por Business). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Fulfillment:** El proceso de preparación y entrega (o retiro) de un Order/Sale. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Conversation:** Interacción comunicacional central con clientes o dentro del equipo, a través de diversos canales. Parte del Messaging MVP. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]
- **Message:** Una unidad de comunicación dentro de una Conversation. Parte del Messaging MVP. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 4. Multi-tenancy
El sistema implementa aislamiento lógico por Business. Cada Business opera con sus propios datos, configuraciones y Brand, garantizando la separación de la información y la personalización de la experiencia. La arquitectura permite que los Users interactúen con múltiples Business a través de Memberships. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 5. Identity
Se define un `User` global como la identidad única de una persona en la plataforma Wapsell. Esta identidad es independiente de los Business o Roles específicos que el User pueda tener. No se crean identidades separadas para clientes y usuarios administrativos; todo converge en el concepto de `User`. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 6. Membership
La relación entre `User` y `Business` es N:N, gestionada a través de `Membership`. Cada `Membership` define el contexto específico de un `User` dentro de un `Business`, incluyendo el Role y los Permissions asociados a esa relación particular. Un User puede tener diferentes Memberships con diferentes Business. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 7. Authorization
Los Roles y Permissions se gestionan en el contexto del `Membership`. No existen roles comerciales globales asociados únicamente al `User`. El sistema de autorización debe asegurar que las acciones de un User estén restringidas por su Role dentro de un `Membership` específico, y el tipo de token debe validarse rigurosamente en todos los endpoints para prevenir accesos no autorizados. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 8. Branding
La `Brand` (identidad comercial visible) pertenece al `Business`. Cada Business tiene la capacidad de configurar su propia Brand (colores, tipografía, logotipos, etc.). Wapsell como plataforma debe aparecer de forma discreta, mientras que la experiencia del cliente está protagonizada por la Brand del Business. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 9. Messaging
El MVP de Wapsell incluye Messaging como una experiencia central para la interacción comercial y la gestión. Esto abarca la gestión de `Conversations`, `Participants`, `Messages`, `Historial`, estados (leído/no leído), `Adjuntos`, `Contexto Comercial` (relación con Customer, Order, Sale), capacidad de tiempo real y `Notificaciones` básicas. (DEC-001: *"La conversación es la interfaz comercial central, no un canal secundario ni un módulo aparte."*)

> **GRF-01 — CORREGED 2026-09-28. Severity lowered CRITICAL → MEDIUM. Scope-label defect, not a contradiction.**
>
> **Previous reconciliation of this finding was wrong and is hereby retracted.** It asserted that
> D-003 had no decision text and that D-003 contradicted DEC-001. Both claims are false.
>
> What the evidence actually says:
> - **DEC-001** (`02-MULTITENANCY.md:23-25`): *"**Asistentes de IA son parte del producto**, no un
>   descarte del MVP — esto revierte explícitamente el criterio de trabajo inicial de la Fase 1
>   ('los asistentes de IA están fuera del MVP actual salvo que una fuente demuestre lo
>   contrario')"*. **VERIFIED — real decision text.**
> - **D-003** reconstructed text (`WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md:107-113`,
>   `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md:121-127`): *"Messaging estará activo en el MVP inicial
>   como sistema de mensajería propio de Wapsell. Los asistentes de IA estarán preparados
>   técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP
>   inicial. El MVP inicial no depende de WhatsApp como canal."*
>   **Provenance: `DERIVED / RECONSTRUCTED`** — consistent with the workshop register summary
>   (`03-DECISION-WORKSHOP/00`), but not yet Owner-verified verbatim.
>
> **These two statements are compatible, not contradictory.** DEC-001 places AI assistants *in
> product scope* and reverses the assumption that AI is out unless proven otherwise. D-003
> specifies the *activation state per iteration*: technically prepared, inactive during the first
> MVP. "In product scope" and "inactive in the first iteration" are orthogonal.
>
> **Restored statement (D-003):** Los asistentes de IA están técnicamente preparados para
> incorporarse posteriormente y permanecen **inactivos durante el MVP inicial**.
> `APPROVED DIRECTION (DERIVED TEXT) — D-003`. Messaging propio de Wapsell **activo** en el MVP
> inicial, sin dependencia de WhatsApp como canal.
>
> **What genuinely remains OPEN** (framing/label defect, MEDIUM):
> - The old OUT OF SCOPE entry and the "Future Evolution" heading framed AI as a *future
>   addition* to the product, which conflicts with DEC-001's "not a discard" framing. The
>   substantive scope was never in dispute; only the label was wrong.
> - "acciones autónomas" appeared in the old text but appears in **no** decision. Remains
>   unattributed and is **not** restored.
> - DEC-001 (`02-MULTITENANCY.md:61-65`) still leaves undefined: canales soportados, qué hace un
>   asistente de IA concretamente, límites de automatización vs. intervención humana.
>   **OPEN DETAIL.** CON-011 remains OPEN for these sub-items only.

## 10. Commerce
El dominio de Comercio abarca: `Order` (intención/operación comercial), `Sale` (operación económica confirmada), `Customer`, `Catalog` y `Pricing`. La relación `Customer → Order → Sale` es conceptual. El `Catalog` define los `Products` y sus `Pricing`. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 11. Payments
El MVP incluye la capacidad de procesar `Pagos` manuales (e.g., efectivo, transferencia, QR) y la integración con Mercado Pago. La estrategia de integración detallada para Mercado Pago y otras pasarelas críticas se definirá en la Payment SPEC. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 12. Cash
La gestión de `Cash` sigue un ciclo de vida `APERTURA → MOVIMIENTOS → ARQUEO → CIERRE`. Todas las operaciones sensibles deben contar con autorización. Los límites concretos y las reglas finales para las operaciones de caja se definirán en la Cash SPEC — **que no existe: `04-DECISIONS/07-CASH.md` y `02-CANONICAL-SPEC/03-OPERATIONS-SPEC.md` están vacíos** (GRF-08). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 13. Inventory

**Modelo de stock (TO-BE).** El `Inventory` se gestiona con un modelo de **Stock único por Business**. Esto significa que cada Business posee y gestiona su propio stock de productos de forma aislada. El MVP NO introduce ubicaciones físicas (`Depósito`, `Local`) para la gestión de stock; la granularidad por ubicación podrá incorporarse posteriormente, y la arquitectura debe evitar bloquear esa futura evolución. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

**Integridad transaccional del stock — D-010 = requisito aprobado.** La integridad del inventario es un requisito aprobado: el sistema debe garantizar operaciones de movimiento **atómicas**, **concurrentemente seguras**, **resistentes a cantidades inválidas** y **consistentes entre movimientos y existencias resultantes**, mediante **controles de base de datos y/o transacción**. Verificar y mantener los controles de integridad existentes es requisito obligatorio del dominio de Inventario. [D-010 — `APPROVED - OWNER-RULED 2026-09-28`]

> **Estado de la implementación actual: `IMPLEMENTATION NON-COMPLIANT / GAP`.** Verificado por
> código el 2026-09-28 (`10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`): controles
> transaccionales parciales (`AUD-D010-C01`…`C06`) y brechas verificadas
> (`AUD-D010-G01`…`G10`). La cláusula *"controles de base de datos **y/o** transacción"* está
> satisfecha **solo en su mitad transaccional**: existen controles en algunos caminos, pero
> no cubren todos los caminos que modifican stock. **D-010 no está satisfecha por completo.**
>
> La redacción anterior de esta sección —"la integridad del inventario está protegida en base
> de datos, aplicación y tests"— se **retira**: contradice la evidencia verificada.
>
> La ausencia de `CHECK`/`TRIGGER` es **evidencia técnica relevante, no un requisito
> aprobado**: D-010 no exige un `CHECK` concreto, exige *"controles de base de datos y/o
> transacción"*.
>
> **Los detalles de corrección son `PROPOSED / OPEN`.** No hay ningún mecanismo concreto
> aprobado, ni migración autorizada, ni test derivado. Nada de lo anterior describe un estado
> alcanzado.

**Propiedad del stock — D-014 = requisito aprobado.** El inventario pertenece exclusivamente a cada Business, no existe stock global compartido, y **no se permite transferencia de stock entre Business** salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior. [D-014 — `APPROVED - OWNER-RULED 2026-09-28`]

> **Estado de la implementación actual: `VERIFIED BY CODE`.** La implementación es compatible
> con el aislamiento requerido: extensión Prisma creada por request, `empresaId` forzado en
> escrituras, filtrado en lecturas y mutaciones, `findUnique` post-filtrado, `fail-closed`, y
> `Producto` / `Lote` / `MovimientoStock` cubiertos directamente (`AUD-D014-C01`…`C10`).
>
> La prohibición de transferencia se cumple **por ausencia del feature**, no por un control
> que la haga cumplir (`AUD-D014-N02`): no existe entidad, endpoint, service, command, job ni
> cron que mueva stock entre Business. Es un cumplimiento real y frágil — registrar esa
> prohibición como invariante verificable aparece en la auditoría como `PROPOSED / OPEN`, no
> como requisito aprobado.

El MVP incluye la gestión de `Compras`, `Recepción` de bienes, `Cuentas por Pagar` (Accounts Payable) y `Pagos a Proveedores`. Los detalles específicos de los flujos de trabajo de compras, el procesamiento de facturas y las condiciones de pago se definirán en las Purchases/Suppliers/AP SPECs — **que no existen** (GRF-08). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 15. Accounts Receivable
El MVP incluye la gestión de `Cuentas Corrientes` (Accounts Receivable). Conceptualmente, esto contempla el manejo de `saldo`, `deuda`, `crédito`, `cobros` y `aplicación de pagos`, con un historial asociado. Los detalles financieros y funcionales se definirán en la Finance/AR SPEC — **que no existe en el repositorio** (GRF-08). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 16. Fulfillment
El `Lifecycle` conceptual de Fulfillment y Entregas es `ORDER → PREPARACIÓN → RETIRO / ENTREGA → EVIDENCIA DE ENTREGA`. El sistema debe soportar `pickup` y `delivery`, con asignación de `responsables` (drivers), seguimiento del `estado` y captura de `evidencia` de entrega. Los detalles de la gestión de drivers, zonas y tarifas se definirán en la Fulfillment SPEC — **que no existe: `02-CANONICAL-SPEC/03-OPERATIONS-SPEC.md` es un placeholder** (GRF-08). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 17. Reports
Los `Reports` deben proporcionar información clave sobre las operaciones del Business. El alcance conceptual incluye informes de ventas, inventario, caja, compras y clientes. Los detalles específicos de los tipos de informes, métricas y capacidades de filtrado se definirán en la Reports SPEC. (OPEN DETAIL)

## 18. Audit
El sistema debe mantener una `Trazabilidad` de `operaciones críticas`. Esto asegura la auditabilidad de las transacciones y cambios clave dentro de la plataforma. Los detalles de qué operaciones se auditan, cómo se registran y el período de retención se definirán en la Audit SPEC. (OPEN DETAIL)

## 19. Notifications
Las `Notifications` están relacionadas con las operaciones del sistema (e.g., estado de Order, alertas de stock, invitaciones). Los canales, tipos, contenido y la lógica de envío se definirán en la Notifications SPEC. (OPEN DETAIL)

## 20. Architecture
La arquitectura inicial de Wapsell será un **MODULAR MONOLITH**. El stack base incluye NestJS, PostgreSQL, y Docker, desplegado en un VPS. El sistema debe diseñarse con límites de dominio claros para permitir la futura extracción de servicios (microservicios) si fuese necesario, pero NO se implementarán microservicios ni Kubernetes ni GraphQL en esta fase. Messaging es un módulo de primera clase. [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 21. Security
La `Security` se basa en el aislamiento entre Business, la autorización granular por `Membership`, la autenticación de `User` global, y la trazabilidad de auditoría. La validación del tipo de token es crucial. Los detalles de seguridad (e.g., 2FA, PCI DSS) se definirán en la Security SPEC — **que no existe: `02-CANONICAL-SPEC/05-PLATFORM-AND-GOVERNANCE-SPEC.md` es un placeholder** (GRF-08). [DECISION TEXT: DERIVED / RECONSTRUCTED — see `04-DECISIONS/00-DECISION-REGISTER.md` §4]

## 22. MVP Scope

### IN SCOPE
> **Status: `TO-BE PROPOSED` as a whole.** The bullets below are a proposal written by a
> specification author. Only the items explicitly marked **DEC-001** are approved product
> direction. The other items derive from D-0xx decisions whose text does not exist in the
> repository, and from CON findings that remain OPEN. Listing an item here is **not** approval.

- Plataforma SaaS multi-tenant. *(DEC-001, dirección)*
- Gestión de identidad `User` global y `Membership`. *(DEC-001, dirección)*
- Roles y permisos basados en `Membership`. *(DEC-001, dirección)*
- Branding configurable por `Business`. *(DEC-001, dirección)*
- Messaging MVP (conversaciones, mensajes, historia, contexto comercial, tiempo real, notificaciones básicas). *(conversación = interfaz central: DEC-001; el resto del alcance: OPEN)*
- Gestión de `Order` y `Sale` con sus respectivos ciclos de vida. **(D-007, D-008 — texto DERIVED / RECONSTRUCTED; CON-016, CON-017 OPEN)**
- Pagos manuales e integración con Mercado Pago. **(D-011 — texto DERIVED / RECONSTRUCTED; CON-020 OPEN)**
- Gestión de `Cash` (apertura, movimientos, arqueo, cierre, autorización). **(D-013 — texto DERIVED / RECONSTRUCTED)**
- Gestión de `Inventory` (stock único por Business, FIFO, lotes, integridad). **(D-010, D-014 — texto DERIVED / RECONSTRUCTED)**
- Gestión de `Purchases`, `Accounts Payable` y `Pagos a Proveedores`. **(D-015 — texto DERIVED / RECONSTRUCTED; CON-024 OPEN)**
- Gestión de `Accounts Receivable` (cuentas corrientes, deuda, crédito, aplicación de pagos). **(D-012 — texto DERIVED / RECONSTRUCTED; CON-021 OPEN)**
- `Fulfillment` y `Entregas` (preparación, pickup, delivery, evidencia). **(D-016 — texto DERIVED / RECONSTRUCTED; CON-025 OPEN)**
- `Reports` (alcance conceptual). **OPEN DETAIL**
- `Audit` (trazabilidad de operaciones críticas). **OPEN DETAIL**
- `Notifications` (relacionadas con operaciones). **OPEN DETAIL**
- Arquitectura: Modular Monolith, NestJS, PostgreSQL, Docker, VPS. **(D-017 — texto DERIVED / RECONSTRUCTED; CON-026 OPEN)**
- `CI/CD` desde el inicio (TESTS → BUILD → VALIDATION → DEPLOY → RELEASE). **(D-018 — texto DERIVED / RECONSTRUCTED; CON-027 OPEN)**

### OUT OF SCOPE
> **Status: `TO-BE PROPOSED`.** "Out of scope" here is an author proposal, not an owner decision.

- **Asistentes de IA activos durante el MVP inicial.** *(GRF-01 CORRECTED — de-scoped, see §9)*
  D-003: los asistentes de IA están **preparados técnicamente pero inactivos durante el MVP
  inicial**. This is *not* an exclusion from the product — DEC-001 states AI assistants **are part
  of the product** and reverses the Phase 1 "AI out of MVP" criterion. It is an **activation-state
  decision per iteration**. `APPROVED DIRECTION (DERIVED TEXT) — D-003`.
  *Correction note: the previous entry here struck this line entirely and reclassified it as an
  unresolved contradiction. That was wrong — the statement matched D-003 substantively.*
- Stock global o compartido entre Business. *(coherent with DEC-001 tenant isolation)*
- Granularidad de inventario por ubicación física (depósitos/locales) en el MVP. **OPEN DETAIL**
- Microservicios, Kubernetes, GraphQL en la arquitectura inicial. **OPEN DETAIL**
- Detalles de implementación de 2FA, PCI DSS: **OPEN DETAIL** — no existe Security SPEC (GRF-08)
- Contabilidad financiera completa y facturación fiscal electrónica. (CON-003 — OPEN, sin decisión asociada)

### OPEN DETAIL
> Correctly scoped: this is the one section that was already honest. The D-0xx references are
> retained as **topic pointers only** — the decision text behind them does not exist in the
> repository, so they identify *what is undetermined*, not *what was decided*.

- Detalles de las reglas de aprobación (quién, cuándo, cómo se registra, auditoría). (D-009)
- Límites concretos y reglas finales para las operaciones de caja. (D-013)
- Reglas de negocio para autorizar la anulación de `Sale`. (D-008)
- Estrategia de integración detallada de Mercado Pago (credenciales, webhooks, idempotencia). (D-011)
- Detalles financieros y funcionales de `Accounts Receivable`. (D-012)
- Flujos de trabajo de compras, procesamiento de facturas y condiciones de pago. (D-015)
- Detalles de gestión de drivers, zonas y tarifas de entrega. (D-016)
- Tipos de informes, métricas y capacidades de filtrado. (Sección 17 Reports)
- Operaciones a auditar, registro y período de retención. (Sección 18 Audit)
- Canales, tipos, contenido y lógica de envío de notificaciones. (Sección 19 Notifications)
- Requisitos no funcionales (rendimiento, escalabilidad) para la arquitectura. (D-017)
- Frecuencia de despliegue, nivel de automatización de pruebas para CI/CD. (D-018)
- **Alcance funcional de los asistentes de IA**: canales soportados, qué hace un asistente de IA
  concretamente, límites de automatización vs. intervención humana. (DEC-001:61-65 — explícitamente
  NO decidido; GRF-01)
- **Término canónico** de la unidad de negocio. **DECIDIDO por D-001**: `Business` (no `Tenant`). `Empresa` se transforma hacia `Business`. (Estréategia de migración: `OPEN DETAIL`.)
  Ver `04-DECISIONS/00-DECISION-REGISTER.md` §4, fila D-001.
- **Modelo de datos concreto**: `User`/`Customer`, unicidad de email, transformación de `Empresa`.
  (DEC-001:55-57 — explícitamente NO decidido)
- **Destino de los repositorios legacy** `wapsell-clientes` / `wapsell-pdv`. (DEC-001:55-57 —
  explícitamente NO decidido)
- **Impacto sobre el POS standalone**. (DEC-001:55-57 — explícitamente NO decidido)
- **Catálogo de roles y permisos**. (DEC-001 — dirección sí, catálogo NO)

## 23. Future Evolution
- **AI assistants — activation, not adoption.** *(GRF-01 CORRECTED — see §9)* DEC-001 establishes
  AI assistants **as part of the product**, so this heading is **not** the right place for them and
  the previous entry here was mis-framed. What remains genuinely future is their **activation**:
  D-003 keeps them **inactive during the initial MVP** while technically prepared. Their inclusion
  under "Future Evolution" is therefore **misleading and is withdrawn as a scope label**; the
  correct classification is `IN PRODUCT SCOPE — INACTIVE IN FIRST ITERATION (D-003)`.
  *Correction note: the previous entry struck this line and declared it superseded by GRF-01. The
  "part of the product" claim was correct; only the "future addition" framing was defective.*
- **Inventory locations:** El modelo de inventario se puede extender para incluir granularidad por ubicación física (depósitos, locales) en futuras fases.
- **Service extraction:** Los límites de dominio claros de la arquitectura modular monolith facilitan la extracción a microservicios en el futuro si los requisitos de escalabilidad o equipos lo demandan.
- **Nuevas integraciones:** La plataforma está diseñada para ser extensible a futuras integraciones de pasarelas de pago, canales de mensajería u otros servicios externos.

--- 

## 24. Proposed Domain Map (PROPOSED DOMAIN MAP)
- D01 Identity
- D02 Tenancy
- D03 Authorization
- D04 Branding
- D05 Customers
- D06 Catalog
- D07 Pricing
- D08 Messaging
- D09 Orders
- D10 Sales
- D11 Payments
- D12 Cash
- D13 Inventory
- D14 Purchases
- D15 Suppliers
- D16 Accounts Receivable
- D17 Accounts Payable
- D18 Fulfillment
- D19 Notifications
- D20 Reports
- D21 Audit
- D22 Platform

## 25. Proposed Navigation MVP
- 1. Inicio
- 2. Mensajería
- 3. Caja
- 4. Compras
- 5. Stock
- 6. Reportes
- 7. Usuarios y permisos
- 8. Configuración
- Perfil (capacidad transversal)

## 26. Proposed First Implementation Vertical: FOUNDATION
- User
- Business
- Membership
- Role
- Permission
- Business Context
- Authentication

Subsequently (PROPOSED SEQUENCE):
- Customers + Catalog
- Messaging
- Orders
- Sales + Payments
- Inventory + Cash
- Purchases + AR/AP
- Fulfillment
