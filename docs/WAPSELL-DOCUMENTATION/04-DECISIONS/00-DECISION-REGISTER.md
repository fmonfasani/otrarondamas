# Wapsell — Canonical Decision Register

**Status:** RECONCILED
**Reconciliation date:** 2026-09-28
**Authority per `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`:** "Approved decisions → Decision Register"

> **READ THIS FIRST — revised 2026-09-28.** This register was first reconciled on 2026-09-28 and
> revised the same day after four **root-level** audit artifacts were discovered. The Owner confirms
> D-001…D-018 were approved during the Decision Workshop.
>
> **The first reconciliation asserted that the repository contains no decision text for them. That
> was wrong** — it was an inventory error (only subdirectories were enumerated). Reconstructed text
> for all 18 decisions exists in `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` §3 and
> `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` §4. See §4 for the text and §4.1 for the artifact
> authority register.
>
> Current treatment:
> - **D-001, D-002 (and the D-002-bis `Customer` resolution) → `OWNER-VERBATIM`.**
> - **D-003…D-018 → `DERIVED / RECONSTRUCTED`** — faithful to the workshop register summaries and
>   usable as requirements, but **not** quotable as approved text until the Owner confirms wording.
> - **`IMPLEMENTATION DETAIL` → `OPEN`** for every decision. No migration, schema, naming, ID or
>   physical model is authorised by this register.
> - The previous `03-CONFLICTS/07-DECISION-REGISTER.md`, which listed the *question* in the
>   "Decision" column and marked it `APPROVED`, remains a documentation defect and is now
>   historical.
> - `DEC-001` is still the only decision with **originally authored** text. Where it answers part
>   of a question directly, that excerpt is preserved and marked `DEC-001 DERIVED`.


## 1. Decision namespaces (§4 of mandate)

| Namespace | Layer | Location | Status |
|---|---|---|---|
| `DEC-001…` | Canonical Decision Register — product-direction decisions | `04-DECISIONS/` | ACTIVE |
| `D-001…D-018` | Decision Workshop — derived decisions prepared as questions for the Owner | `03-DECISION-WORKSHOP/` | APPROVED (per Owner). **Text available:** D-001/D-002 `OWNER-VERBATIM`; D-003…D-018 `DERIVED / RECONSTRUCTED` — see §4 |

`04-DECISIONS/02-MULTITENANCY.md:53` reserves the numbering `DEC-002, DEC-003, ...` for the
decisions needed to execute DEC-001. That numbering **was never applied**. This register does
**not** invent it. The relationship is documented, not renumbered.

## 2. Namespace equivalence

| Workshop ficha | Would-be register ID | Relationship | Status |
|---|---|---|---|
| D-001…D-018 | `DEC-002…DEC-019` | Anticipated by DEC-001, never assigned | **UNRESOLVED — see GRF-02** |

---

## 3. DEC-001 — the only decision with ORIGINALLY AUTHORED text

> D-001…D-018 are *reconstructed*; DEC-001 is *authored*. The distinction matters: DEC-001 can be
> quoted verbatim, the reconstructed set cannot (§6).

| Field | Value |
|---|---|
| **ID** | DEC-001 |
| **Type** | Product Direction / Canonical Decision |
| **Decision** | Wapsell = Platform (not a single-business app). Business = Tenant. Brand = visible commercial identity of the Business. User = global identity, independent of how many Businesses it is linked to. Membership = User ↔ Business, N:N; roles and permissions live in the context of that membership, not in the global user. Conversation is the central commercial interface. AI assistants are part of the product, not discarded from the MVP — this explicitly reverses the Phase 1 working criterion. Otra Ronda Más becomes Wapsell's first Business/tenant. |
| **Owner** | fmonfasani |
| **Date** | 2026-09-25 |
| **Evidence** | `04-DECISIONS/02-MULTITENANCY.md` (VERIFIED — full text present, lines 6-27) |
| **Status** | **APPROVED** |
| **Replaces** | — |
| **Replaced by** | — |
| **Resolves** | CON-001 (documental only; code migration not started) |
| **Explicitly does NOT decide** | 5 items at `02-MULTITENANCY.md:53-72`: concrete data model; migration plan; functional scope of messaging/AI; fate of the repository; impact on standalone-premise specs |

**Consequence:** the 5 undecided items map to D-001, D-002, D-003, D-004 (partly) and
governance. They are the reason D-001…D-018 existed at all.

---

## 4. D-001…D-018 — approved; reconstructed text now available (revised 2026-09-28)

> **REVISION 2026-09-28.** The previous version of this section stated that no decision text
> existed anywhere in the repository and that all 18 were `APPROVED — TEXT RECONSTRUCTION
> REQUIRED`. **That was an inventory error**: four root-level artifacts were never enumerated
> (the first pass only walked subdirectories). Reconstructed text for **all 18 decisions** exists
> in `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` §3 (lines 87-344) and
> `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` §4, both non-canonical DRAFTs dated 2026-09-28.
>
> **Provenance is now two-tier and must not be flattened:**
> - **D-001, D-002 → `OWNER-VERBATIM`.** Confirmed word-for-word by the Owner in the current
>   session and byte-consistent with the root artifacts.
> - **D-003…D-018 → `DERIVED / RECONSTRUCTED`.** Faithful to the workshop register summaries
>   (`03-DECISION-WORKSHOP/00`) and internally consistent, but **not** yet Owner-verified. These
>   may be used as requirements, **not** as quotable approved text.
>
> `Fecha`: **2026-09-28** per the root artifacts ("aprobadas por el Owner durante el workshop del
> 2026-09-28") — `DERIVED`, previously recorded as `NOT DOCUMENTED`.
> `Owner`: fmonfasani (`DERIVED`, attribution not a signed record).
> `IMPLEMENTATION DETAIL` remains `OPEN` throughout: no migration, schema, naming, ID or physical
> model is authorised by any entry below.

| ID | Decisión | Owner | Fecha | Evidencia | Estado | `IMPLEMENTATION DETAIL` |
|---|---|---|---|---|---|---|
| **D-001** | **Business = Tenant.** Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant. | fmonfasani | 2026-09-28 | Owner verbatim; `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md`; `v1.0-RECONSTRUIDA.md:91-95` | **APPROVED — OWNER-VERBATIM** | `OPEN` — migración y modelo físico no definidos |
| **D-002** | **User** es la identidad global. La relación User ↔ Business se establece mediante **Membership** (N:N); un mismo User puede pertenecer a múltiples Business. Roles y permisos se determinan dentro del Membership. | fmonfasani | 2026-09-28 | Owner verbatim; `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md`; `v1.0-RECONSTRUIDA.md:97-105` | **APPROVED — OWNER-VERBATIM** | `OPEN` — migración Usuario/Cliente, modelo de datos y ciclo de vida |
| **D-002-bis** *(resolución posterior del Owner)* | **`Customer` NO se fusiona con `User`.** `Customer` representa la relación comercial del comprador/cliente con un `Business`. Puede vincularse opcionalmente a un `User`, sin exigir uno. Pertenece al contexto de un `Business` y puede incluir compras, pedidos, historial, cuenta corriente/deuda cuando aplique, condiciones comerciales y demás datos de Commerce. | fmonfasani | 2026-09-28 | Owner, sesión actual | **APPROVED — OWNER-VERBATIM** | `OPEN` — lifecycle de Customer, modelado de vínculo con User |
| **D-003** | Messaging estará **activo** en el MVP inicial como sistema de mensajería propio de Wapsell. Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero **permanecerán inactivos durante el MVP inicial**. El MVP inicial **no depende de WhatsApp** como canal. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:107-113`; `v1.1-REVISADA.md:121-127`; resumen en `03-DECISION-WORKSHOP/00` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — modelo Conversation/Message, realtime, asignación, presencia, attachments, modelo de activación de IA |
| **D-004** | Wapsell tendrá un **Design System canónico común**. Cada Business podrá configurar su **Brand** sobre dicho sistema. La experiencia orientada al cliente debe identificarse principalmente con la marca del Business, mientras Wapsell permanece como plataforma subyacente. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:115-121` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — modelo de configuración, tokens, assets, límites de personalización |
| **D-005** | Roles y permisos **pertenecen al Membership**. Un User puede tener diferentes roles y permisos en diferentes Business. El acceso se determina mediante el **Membership activo** y sus autorizaciones. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:123-129` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — catálogo definitivo de roles y permisos, lifecycle, administración |
| **D-006** | Todo acceso autenticado debe validarse mediante: (1) identidad global User; (2) Business objetivo; (3) Membership válido; (4) roles y permisos necesarios. **Un token válido por sí solo no autoriza** una operación sobre un Business. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:131-140` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — tipos de token, guards, middleware/interceptors, errores, sesión |
| **D-007** | `Order` y `Sale` son entidades conceptualmente diferentes. `Order` = solicitud/intención de compra y su preparación/confirmación. `Sale` = operación comercial efectivamente confirmada. Una Order puede originar una Sale cuando se cumplen las condiciones definidas. **No toda Order constituye necesariamente una Sale.** Una venta presencial/POS puede originar una Sale directamente. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:142-152` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — condiciones y estados exactos de conversión |
| **D-008** | Una Sale atraviesa un **ciclo de vida explícito**. La confirmación es el momento en que se aplican sus efectos comerciales, operativos y económicos. Una Sale confirmada **no se elimina**; su anulación es una **operación explícita** que genera reversiones o ajustes sobre stock, caja, pagos y cuentas por cobrar según corresponda. Los efectos deben ejecutarse de manera **transaccional y consistente**, evitando estados parcialmente aplicados. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:154-171` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — estados completos, autorizaciones, efectos por dominio |
| **D-009** | La **SPEC es la fuente de verdad** del producto. Ninguna funcionalidad, cambio de alcance, decisión arquitectónica o modificación relevante del comportamiento se considera requisito aprobado sin definición y aprobación documental. Las propuestas deben distinguirse de los requisitos aprobados. Toda implementación debe poder trazarse hasta su requisito, decisión o especificación. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:173-181` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — workflow documental y mecanismo formal de aprobación |
| **D-010** | Wapsell debe garantizar **integridad transaccional del stock** mediante controles de base de datos y/o transacción. Los movimientos deben ser atómicos, concurrentemente seguros, resistentes a cantidades inválidas y consistentes entre movimientos y existencias resultantes. **Los controles de integridad existentes deberán verificarse y mantenerse** como requisito obligatorio del dominio de Inventario. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:183-194` | **APPROVED — OWNER-RULED 2026-09-28** (§4.3.1: v1.0 prevails) — text `DERIVED / RECONSTRUCTED` | `OPEN` — mecanismos concretos de DB/transacción y pruebas. **Ruling: verificar los controles de integridad EXISTENTES es obligatorio, y las cantidades inválidas se rechazan SIN excepción por Business (carve-out de v1.1 RECHAZADO).** |
| **D-011** | Wapsell debe soportar integración con **pasarelas de pago externas**. **Mercado Pago** es la integración prioritaria. La integración se desacoplará mediante una **abstracción de proveedor**. Los pagos externos mantendrán estados y trazabilidad de: autorización, aprobación, rechazo, cancelación y conciliación, cuando corresponda. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:196-214` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — API, checkout, webhooks, credenciales, idempotencia, conciliación |
| **D-012** | Wapsell debe soportar **Cuentas por Cobrar por Business**. Una venta parcialmente o no cancelada puede generar una cuenta por cobrar **asociada al cliente**. El sistema debe permitir consultar saldos pendientes, registrar cobros posteriores, aplicarlos a deudas, mantener trazabilidad y consultar el saldo del cliente. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:216-230` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — modelo de deuda, aplicación de cobros, estados, reglas de crédito |
| **D-013** | Cada Business gestiona **sus propias cajas**. Ciclo: `Apertura → Operaciones/Movimientos → Arqueo → Cierre`. Los movimientos deben registrar Business, origen, importe, medio de pago y usuario responsable. Las operaciones sensibles están sujetas a permisos del Membership. Una **caja cerrada no se modifica directamente**; las correcciones se realizan mediante operación compensatoria o mecanismo de ajuste autorizado. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:232-258` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — estados, autorizaciones, ajustes, conciliación |
| **D-014** | El inventario **pertenece exclusivamente a cada Business**. **No existe stock global compartido** entre Business. Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente. **No se permite transferencia de stock entre Business** salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:260-268` | **APPROVED — OWNER-RULED 2026-09-28** (§4.3.1: v1.0 prevails) — text `DERIVED / RECONSTRUCTED` | `OPEN` — ubicaciones y modelo físico. **Ruling: la transferencia de stock entre Business está PROHIBIDA salvo especificación posterior explícita (democión a OPEN DETAIL de v1.1 RECHAZADA).** |
| **D-015** | Las Compras pertenecen al Business. Una Compra representa una **adquisición a un Proveedor** y puede registrar productos, cantidades, precios, condiciones de pago y recepción. Con importe pendiente se genera una **Cuenta por Pagar** asociada al Business y al Proveedor. Los pagos posteriores deben registrarse y aplicarse a las obligaciones, manteniendo trazabilidad y conciliación de saldos. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:270-286` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — lifecycle, documentos, pagos, conciliación |
| **D-016** | Fulfillment pertenece al **dominio de Pedidos**. Un pedido puede pasar por `Preparación → Asignación de entrega → Entrega`, con estados explícitos, trazabilidad, gestión de repartidores, zonas, tarifas, seguimiento y **evidencia de entrega**. Fulfillment no constituye necesariamente un módulo principal independiente de navegación. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:288-312` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — modelo de repartidor, tracking, evidencia, zonas, tarifas |
| **D-017** | Wapsell se implementará inicialmente como un **monolito modular**. Debe separar claramente dominios y responsabilidades y permitir evolucionar componentes individualmente **sin requerir una migración inicial a microservicios**. Se prioriza simplicidad, mantenibilidad, separación de dominios y evolución incremental. Infraestructura, comunicación y seguridad adicionales se incorporan cuando exista un requisito concreto que los justifique. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:314-327` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — topología física, infraestructura, comunicación, seguridad adicional |
| **D-018** | Wapsell deberá contar con un **pipeline CI/CD automatizado**, incorporado progresivamente: validaciones de código, build, pruebas automatizadas, integración/E2E cuando corresponda y despliegues controlados. Los cambios que no superen validaciones obligatorias **no deben avanzar al siguiente entorno**. La estrategia será incremental. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:329-343` | **APPROVED — `DERIVED / RECONSTRUCTED`** | `OPEN` — plataforma, branching, environments, gates, estrategia de releases |

### 4.1 Register of newly discovered root-level artifacts (GRF-14a)

These files are **non-canonical DRAFTs**. They must not be cited as approved, and they are
**not** part of the canonical source-of-truth map. Their function is as the **root-level
provenance record**: the artifacts from which the reconstructed text in **§4 above** was
derived. **§4 of this register is now the canonical carrier**; where §4 and these drafts
differ, §4 governs, and where a draft disagrees with the Owner-verbatim text, the Owner
prevails.

> **Why they are registered here (GRF-14a).** The first governance pass enumerated only
> subdirectories and therefore never saw these 5 root-level `.md` files, and wrongly
> concluded the decision text did not exist (retracted as GRF-09). Recording them here
> makes the derivation auditable: every `DERIVED / RECONSTRUCTED` row in §4 cites its
> line range.

| File | Declared status | Authority class | Contains |
|---|---|---|---|
| `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` | `DRAFT — BASE PARA APROBACIÓN` | **DERIVED — non-canonical** | Verbatim-style text D-001…D-018 (§3), Contracts outline (§29), candidate invariants `INV-G01…INV-G07` (§30), advancement chain (§41) |
| `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` | `DRAFT — REVISADA` / *"NO CANÓNICO HASTA APROBACIÓN"* | **DERIVED — non-canonical** | Condensed D-001…D-018 (§4), AS-IS/DECISION/TO-BE separation, 30-item Open Detail Register (§18), 8 approval criteria (§20). **Explicitly defers invariant formalisation** |
| `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md` | `DRAFT — DERIVADA, NO CANÓNICA` | **DERIVED — non-canonical** | D-001/D-002/D-005/D-006 narrative; Business/Tenant equivalence; Customer-as-failure-modes analysis |
| `WAPSELL-DECISION-REGISTER-D001-D018.md` | *"propuesta de actualización del registro canónico"* | **PROPOSED — non-canonical** | One-line summaries of all 18 decisions; the only file labelling all 18 `APPROVED` |

**v1.0 vs v1.1 relationship:** v1.1 is a later, more disciplined review of v1.0. It **removes** the
premature `INV-G01…INV-G07` formalisation (v1.0 §30) and defers it to the Invariants layer
(v1.1 §15: *"NO se declaran invariantes formales"*). Neither is canonical.

**The "v1.1 governs" rule is conditional and was adjudicated — see §4.3.** v1.1 is a
*compression* of v1.0: where it is silent, silence is not a retraction. Applying "v1.1 governs"
mechanically would have silently dropped normative clauses. The Owner adjudicated the divergences
on 2026-09-28.

### 4.3 Divergence adjudication between v1.0 and v1.1 (2026-09-28)

Ten normative clauses exist in **only one** of the two drafts. A third source,
`WAPSELL-DECISION-REGISTER-D001-D018.md`, is a one-line summary per decision and confirms the
*core* of all 18 but resolves none of these clauses. Adjudicated as follows.

#### 4.3.1 Ruled by the Owner — v1.0 prevails (2)

| ID | Ruling | Binding text | Consequence |
|---|---|---|---|
| **D-010** | **v1.0 completo** | *"Wapsell debe garantizar integridad transaccional del stock mediante controles de base de datos y/o transacción. Las operaciones de movimiento deben ser atómicas, concurrentemente seguras, resistentes a cantidades inválidas y consistentes entre movimientos y existencias resultantes. **Los controles de integridad existentes deberán verificarse y mantenerse como requisito obligatorio del dominio de Inventario.**"* | **Verification of existing stock controls is a requirement of the decision, not an optional audit.** Invalid quantities are rejected with **no per-Business exception** — the v1.1 carve-out (*"salvo una regla explícitamente definida por negocio"*) is **REJECTED**. Triggers read-only code verification of the Inventory domain. |
| **D-014** | **v1.0: prohibición** | *"El inventario pertenece exclusivamente a cada Business. No existe stock global compartido entre Business. Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente. **No se permite transferencia de stock entre Business** salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior."* | Cross-Business stock transfer is **prohibited**, not `OPEN`. Yields a **cross-entity verifiable invariant**: no code path may move stock between Business. The v1.1 demotion of "transferencias" to `OPEN DETAIL` is **REJECTED**. |

#### 4.3.2 Pending Owner ruling — recorded as `OPEN DETAIL`, both variants cited (8)

None of these is normative yet. Each is listed so the decision is not lost; each is **not**
promoted to a requirement, and none may be cited as approved wording.

| # | ID | Clause in dispute | Present in | Status |
|---|---|---|---|---|
| 1 | D-003 | *"El MVP inicial no depende de WhatsApp como canal."* | v1.0 only | `OPEN DETAIL — PENDING OWNER RULING` |
| 2 | D-006 | **4** authorization checks (User, Business objetivo, Membership válido, roles/permisos) vs **2** (User, Membership) | 4 checks: v1.0 · 2 checks: v1.1 + root | `OPEN DETAIL — PENDING OWNER RULING` |
| 3 | D-008 | Whether Sale cancellation must explicitly reverse **stock, cash, payments and AR** | v1.0 (enumerated) · v1.1 (`OPEN`) | `OPEN DETAIL — PENDING OWNER RULING` |
| 4 | D-009 | *"Ninguna funcionalidad, cambio de alcance, decisión arquitectónica o modificación relevante del comportamiento se considera requisito aprobado sin definición y aprobación documental correspondiente."* | v1.0 only | `OPEN DETAIL — PENDING OWNER RULING` — ⚠️ note: v1.1 demotes to `OPEN` the very clause that governs this register's own approval process. Self-referential; needs resolution. |
| 5 | D-011 | Whether `conciliación` is a normative payment state | v1.0 (state) · v1.1 (`OPEN`) | `OPEN DETAIL — PENDING OWNER RULING` |
| 6 | D-013 | *"Las operaciones sensibles están sujetas a permisos del `Membership`."* | v1.0 only | `OPEN DETAIL — PENDING OWNER RULING` |
| 7 | D-015 | Whether *"trazabilidad y conciliación de saldos"* is normative | v1.0 (normative) · v1.1 (`OPEN`) | `OPEN DETAIL — PENDING OWNER RULING` |
| 8 | D-017 | *"No se establece actualmente una adopción obligatoria de Kubernetes, GraphQL, colas u otras tecnologías enterprise."* | v1.1 only | `OPEN DETAIL — PENDING OWNER RULING` |

**Effect on §4.** The §4 rows for D-010 and D-014 are now `OWNER-RULED` (text settled, still
`DERIVED` as to provenance). The other eight decisions carry a split-clause caveat: their §4
summary follows **v1.1** by default, and the v1.0-only wording stays non-normative until ruled.

### 4.2 What the reconstructed text resolves

| Previously blocked | Now resolvable from text | Still `OPEN` |
|---|---|---|
| GRF-09 "no decision text" | **Withdrawn** — text exists for all 18 | Owner verbatim confirmation for D-003…D-018 |
| GRF-01 AI scope | **Settled** — in product scope (DEC-001), inactive in first iteration (D-003) | canales, comportamiento del asistente, límites de automatización (CON-011) |
| CON-009 canonical term | **Resolved** — `Business` is the term; `Tenant` denotes the isolation function | migración y modelo físico |
| CON-010 `User`/`Cliente` split | **Resolved** — `Customer` is a separate commercial entity, not a merged `User` | lifecycle de Customer, modelado del vínculo |
| CON-006 AI scope label | **Re-characterised** — labelling defect (MEDIUM), not a contradiction | — |
| CON-002 and most of CON-009…CON-027 | Text now available to reason from | require Owner confirmation before being marked `RESOLVED` |
| Contracts / Invariants / Tests | v1.0 §29-30 give candidate inputs | all three layers remain `NOT DOCUMENTED` in the canonical corpus |

---

## 5. Dependencies (registered, not resolved)

Per `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md`, preserved as documented.

| Decision | Depends On | Blocks | Dependency satisfied? | Implementation detail |
|---|---|---|---|---|
| D-001 | NONE | D-002…D-017 (12) | Partially — direction from DEC-001 | OPEN |
| D-002 | D-001 | D-003, D-005, D-006, D-007, D-012 | Partially — direction from DEC-001 | OPEN |
| D-003 | D-001, D-002 | D-017 | No | OPEN |
| D-004 | D-001 | NONE | Partially — Brand concept only | OPEN |
| D-005 | D-002 | D-006 | Partially — principle only | OPEN |
| D-006 | D-002, D-005 | NONE | No | OPEN |
| D-007 | D-001 | D-008, D-016 | No | OPEN |
| D-008 | D-007, D-012, D-013 | NONE | No | OPEN |
| D-009 | NONE | NONE | No | OPEN |
| D-010 | D-008 | NONE | No | OPEN |
| D-011 | D-001 | NONE | No | OPEN |
| D-012 | D-001, D-002 | D-008 | No | OPEN |
| D-013 | D-001 | D-008 | No | OPEN |
| D-014 | D-001 | D-015 | No | OPEN |
| D-015 | D-001, D-014 | NONE | No | OPEN |
| D-016 | D-001, D-007 | NONE | No | OPEN |
| D-017 | D-001, D-002, D-003 | D-018 | No | OPEN |
| D-018 | D-017 | NONE | No | OPEN |

**A decision being APPROVED does not mean its details are defined.** All 18 have text (two-tier
provenance per §4) and all 18 retain `Implementation detail: OPEN`. Approving a direction does not
authorise a schema, a migration, an identifier name or a physical model.

---

## 6. What this register does NOT authorise

- **D-003…D-018 may not be quoted as Owner-approved verbatim.** Their text is
  `DERIVED / RECONSTRUCTED`. Use them as requirements; do not present them as quotable approved
  wording.
- **No implementation detail whatsoever** is authorised: no schema, no migration, no physical
  model, no identifier naming, no endpoint, no event name.
- The `Status: APPROVED — COHERENT WITH DECISIONS D-001..D-018` header on
  `02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md`, `01-IDENTITY-AND-TENANCY-SPEC.md` and
  `02-COMMERCE-SPEC.md` remains **unsupported** as written. It overstates coherence: the canonical
  specs predate the reconstructed text and have not been reconciled against it line by line.
- The four root-level artifacts (§4.1) are **not** approved documents and confer no authority.

---

## 7. Follow-up obligations created by the reconstructed text

Two reconstructed decisions carry explicit obligations that the first pass could not see.

| # | Decision | Obligation | Evidence required | Class |
|---|---|---|---|---|
| 1 | **D-010** | *"Los controles de integridad existentes deberán **verificarse y mantenerse** como requisito obligatorio del dominio de Inventario."* | Read the actual stock-movement code/constraints and record what exists. The decision makes existing controls a mandatory, verified requirement rather than a new build | `VERIFIED BY CODE` — pending repository inspection |
| 2 | **D-014** | *"No se permite transferencia de stock entre Business **salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior**."* | A negative requirement with a named escape hatch. It forbids a class of implementation and requires any exception to be specified and approved before it exists | `APPROVED` requirement + `OPEN` escape-hatch definition |
| 3 | **D-003** | *"El MVP inicial **no depende de WhatsApp** como canal."* | A hard architectural constraint on the first iteration, not a preference. Any Messaging design implying a WhatsApp dependency contradicts it | `APPROVED` constraint; verify against `04-MESSAGING-SPEC.md` |
| 4 | **D-017** | *"sin requerir una migración inicial a microservicios"*, and infrastructure is added *"cuando exista un requisito concreto que los justifique"* | A prohibition on scope inflation: no Kubernetes/GraphQL/queues may be introduced without a concrete justifying requirement | `APPROVED` constraint; contradicts prior "OPEN DETAIL" framing of these technologies |
| 5 | **D-006** | Four-point validation: User + Business objetivo + Membership válido + roles/permisos | Becomes a candidate invariant. The canonical corpus currently has **no** membership-authorization invariant | `PROPOSED` → Invariants layer |
| 6 | **D-012** | AR is *"asociada al cliente"* | Links AR to the now-separated `Customer` entity (D-002-bis), **not** to `User`. Any AR model keyed on `User` contradicts D-002-bis | `APPROVED` constraint; constrains the AR model |
