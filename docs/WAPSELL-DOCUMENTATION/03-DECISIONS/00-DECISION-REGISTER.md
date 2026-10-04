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
>
> **R3 NOTE (2026-09-30) — additive; nothing above was deleted.** After this revision the Owner issued
> further rulings (OR-001, OR-002-A on 2026-09-28; R2 confirmations on 2026-09-30) that are recorded in
> **§8 "Owner Rulings posteriores"** at the end of this register, with authority in
> `13-OR-001-OWNER-RULING-CLOSURE.md`, `15-OR-002-A-OWNER-RULING.md` and
> `18-R2-OWNER-DECISION-CLOSURE-REPORT.md`. Where §8 and a cell below differ, the later Owner ruling
> prevails (ISS-08 precedence, §8.4); the earlier text stays as historical evidence. The
> `D-003` WhatsApp clause is `RESOLVED` by §8.1 (R2). Every other `OPEN DETAIL — PENDING OWNER RULING`
> item in §4.3.2 (D-006, D-008, D-009, D-011, D-013, D-015, D-017) **remains pending**.


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
| **D-001** | **Business = Tenant.** Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant. | fmonfasani | 2026-09-28 | Owner verbatim; `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md`; `v1.0-RECONSTRUIDA.md:91-95` | **APPROVED — OWNER-VERBATIM** | `OPEN` — migración y modelo físico no definidos. *(R3, 2026-09-30, nota aditiva: la destinación persistente `Empresa` → `Business` es P1-A opción C (§8.2) y rige `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN` (P5-B); tablas, columnas, migración, compatibilidad, cutover y rollback siguen `OPEN`; implementación NO AUTORIZADA.)* |
| **D-002** | **User** es la identidad global. La relación User ↔ Business se establece mediante **Membership** (N:N); un mismo User puede pertenecer a múltiples Business. Roles y permisos se determinan dentro del Membership. | fmonfasani | 2026-09-28 | Owner verbatim; `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md`; `v1.0-RECONSTRUIDA.md:97-105` | **APPROVED — OWNER-VERBATIM** | `OPEN` — migración Usuario/Cliente, modelo de datos y ciclo de vida. *(R3, 2026-09-30, nota aditiva: OR-002-B…F (§8.1) fijan dirección conceptual —transición incremental con coexistencia temporal, email único global del `User`, `Usuario` → `User` + `Membership`, compatibilidad temporal de sesiones—; mecanismo, diseño físico y migración siguen `OPEN`; implementación NO AUTORIZADA.)* |
| **D-002-bis** *(resolución posterior del Owner)* | **`Customer` NO se fusiona con `User`.** `Customer` representa la relación comercial del comprador/cliente con un `Business`. Puede vincularse opcionalmente a un `User`, sin exigir uno. Pertenece al contexto de un `Business` y puede incluir compras, pedidos, historial, cuenta corriente/deuda cuando aplique, condiciones comerciales y demás datos de Commerce. | fmonfasani | 2026-09-28 | Owner, sesión actual | **APPROVED — OWNER-VERBATIM** | `OPEN` — lifecycle de Customer, modelado de vínculo con User |
| **D-003** | Messaging estará **activo** en el MVP inicial como sistema de mensajería propio de Wapsell. Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero **permanecerán inactivos durante el MVP inicial**. El MVP inicial **no depende de WhatsApp** como canal. | fmonfasani | 2026-09-28 | `v1.0-RECONSTRUIDA.md:107-113`; `v1.1-REVISADA.md:121-127`; resumen en `03-DECISION-WORKSHOP/00` | **APPROVED — `DERIVED / RECONSTRUCTED`**. *(R3, 2026-09-30, nota aditiva: la cláusula "no depende de WhatsApp" quedó `RESOLVED — OWNER-RULED 2026-09-30` como "Wapsell Messaging MVP no depende de WhatsApp"; ver §8.1 D-003/WhatsApp. El resto del texto sigue `DERIVED / RECONSTRUCTED`.)* | `OPEN` — modelo Conversation/Message, realtime, asignación, presencia, attachments, modelo de activación de IA |
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
| 1 | D-003 | *"El MVP inicial no depende de WhatsApp como canal."* | v1.0 only | `OPEN DETAIL — PENDING OWNER RULING` *(historical state at 2026-09-28)* → **`RESOLVED — OWNER-RULED 2026-09-30` (R2, §8.1): "Wapsell Messaging MVP no depende de WhatsApp."** *(R3 note, additive)* |
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
- *(R3, 2026-09-30, additive)* The Owner Rulings in §8 do **not** authorise implementation either:
  `APPROVED ≠ IMPLEMENTATION AUTHORIZED`. Technical Specification = `NOT APPROVED`; Implementation =
  `NOT AUTHORIZED`.

---

## 7. Follow-up obligations created by the reconstructed text

Two reconstructed decisions carry explicit obligations that the first pass could not see.

| # | Decision | Obligation | Evidence required | Class |
|---|---|---|---|---|
| 1 | **D-010** | *"Los controles de integridad existentes deberán **verificarse y mantenerse** como requisito obligatorio del dominio de Inventario."* | Read the actual stock-movement code/constraints and record what exists. The decision makes existing controls a mandatory, verified requirement rather than a new build | `VERIFIED BY CODE` — pending repository inspection |
| 2 | **D-014** | *"No se permite transferencia de stock entre Business **salvo que una operación inter-Business sea definida y autorizada explícitamente en una especificación posterior**."* | A negative requirement with a named escape hatch. It forbids a class of implementation and requires any exception to be specified and approved before it exists | `APPROVED` requirement + `OPEN` escape-hatch definition |
| 3 | **D-003** | *"El MVP inicial **no depende de WhatsApp** como canal."* | A hard architectural constraint on the first iteration, not a preference. Any Messaging design implying a WhatsApp dependency contradicts it | `APPROVED` constraint; verify against `04-MESSAGING-SPEC.md`. *(R3, 2026-09-30: cláusula WhatsApp `RESOLVED — OWNER-RULED`, §8.1; no prohibe integraciones futuras; ninguna integración ni remoción implementada.)* |
| 4 | **D-017** | *"sin requerir una migración inicial a microservicios"*, and infrastructure is added *"cuando exista un requisito concreto que los justifique"* | A prohibition on scope inflation: no Kubernetes/GraphQL/queues may be introduced without a concrete justifying requirement | `APPROVED` constraint; contradicts prior "OPEN DETAIL" framing of these technologies |
| 5 | **D-006** | Four-point validation: User + Business objetivo + Membership válido + roles/permisos | Becomes a candidate invariant. The canonical corpus currently has **no** membership-authorization invariant | `PROPOSED` → Invariants layer |
| 6 | **D-012** | AR is *"asociada al cliente"* | Links AR to the now-separated `Customer` entity (D-002-bis), **not** to `User`. Any AR model keyed on `User` contradicts D-002-bis | `APPROVED` constraint; constrains the AR model |

---

## 8. Owner Rulings posteriores a D-001…D-018 (añadido en R3, 2026-09-30)

> **Sección aditiva.** No reemplaza ni borra nada de §1–§7. Registra los rulings del Owner posteriores al
> workshop del 2026-09-28 y su autoridad. **Un ruling aprobado NO es autorización de implementación.**
> Cada fila conserva: ID, decisión, autoridad, fecha, estado, implementación y detalles abiertos.
> Clasificación de estado usada: `OWNER-RULED` (texto del Owner confirmado con fuente) · `RECONSTRUCTED`
> (texto derivado, sin confirmación verbatim) · `OPEN` · `NOT CONSULTED` · `NOT AUTHORIZED`.

### 8.1 Rulings registrados

| ID | Decisión (texto del Owner) | Autoridad | Fecha | Estado | Implementación | Detalles abiertos |
|---|---|---|---|---|---|---|
| **OR-001** (P1-A, P2-C, P3, P4, P5-B) | Cierre de Owner Ruling OR-001: `Empresa` → `Business`; coexistencia temporal; continuidad sin downtime (Ventas, Caja, Catálogo, Compras, Tienda Online, Auth, datos históricos); `"Roonda"` → `"Otra Ronda Más"`; documentar antes de implementar | `13-OR-001-OWNER-RULING-CLOSURE.md` | 2026-09-28 | `OWNER-RULED` — `CLOSED` | `NOT AUTHORIZED` (ver P5-B) | Modelo físico, migraciones, compatibilidad, deploy, rollback, cutover, fin de la coexistencia |
| **OR-002-A** | `User` global → `Membership` N:N → `Business`; `Customer` independiente de `User`, con vínculo opcional; CON-010 `RESOLVED` en dirección conceptual | `15-OR-002-A-OWNER-RULING.md` (+ D-002, D-002-bis) | 2026-09-28 | `OWNER-RULED` — `CLOSED` | `NOT AUTHORIZED` | Modelo físico, lifecycle de `Customer`, esquema de vínculo |
| **OR-002-B** | "La transición de identidad se realiza de forma incremental, con coexistencia temporal y acotada de ambos modelos, compatible con OR-001 P2-C. No se establece una coexistencia prolongada ni permanente." | `18-R2-OWNER-DECISION-CLOSURE-REPORT.md` §1 (confirmación del Owner en sesión, 2026-09-30) | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` | Mecanismo técnico, duración, criterio de fin de la transición |
| **OR-002-C** | "`User` es una identidad global con email único a nivel global." | `18` §1 | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` | Normalización del email, duplicados actuales, constraint física |
| **OR-002-D** | "`Usuario` pasa a `User` más `Membership`, y `Cliente` pasa a `Customer`, manteniendo `Customer` independiente de `User` con vínculo opcional (OR-002-A)." | `18` §1 | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` | Criterio de vinculación `Customer` ↔ `User` (**"mismo email" NO confirmado — `OPEN`**), destino de filas existentes |
| **OR-002-E** | "Durante la transición existe compatibilidad temporal de sesiones y tokens legacy, respetando la continuidad de Auth de OR-001 P3. Al finalizar la transición se invalidan las sesiones y se requiere un nuevo login." | `18` §1 | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` | Diseño del token, formato, duración, momento del corte |
| **OR-002-F** | "Para OR-002 rige `especificación técnica → aprobación del Owner → implementación`, igual que OR-001 P5-B." | `18` §1 | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` hasta que el Owner apruebe explícitamente una versión concreta de la especificación técnica (documento + fecha) | Especificación técnica (`NOT APPROVED`) |
| **P1-A** (opción C) | "`Empresa` → `Business` aplica tanto a la terminología documental y conceptual como al modelo persistente, como destino final de la transformación." | `18` §1 sobre `13` (OR-001 P1-A) | 2026-09-30 | `OWNER-RULED` (alcance de P1-A) | `NOT AUTHORIZED` — el destino persistente final es `Business`; **no** implica que la migración física esté diseñada ni autorizada | Tablas, columnas, FK, índices, constraints, compatibilidad, coexistencia, migración, rollback, deploy, cutover |
| **P5-B** | "Para la transformación `Empresa` → `Business` rige `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN`." | `18` §1 sobre `13` (OR-001 P5-B) | 2026-09-30 | `OWNER-RULED` | `NOT AUTHORIZED` | Especificación técnica (`NOT APPROVED`) |
| **CON-010 / ISS-07** | "OR-002-A es la resolución normativa posterior de CON-010. Estado canónico actual: `RESOLVED` en dirección conceptual (D-002 + D-002-bis + OR-002-A). La implementación sigue `OPEN`. Las referencias históricas `OPEN` se conservan como evidencia y no se borran." | `18` §1, `15` | 2026-09-30 | `OWNER-RULED` — `RESOLVED` (conceptual) | `OPEN` | Lifecycle de `Customer`, modelado físico del vínculo |
| **ISS-08** | Precedencia documental: 1 Owner Ruling primario; 2 Decision Register; 3 SPEC canónica; 4 TO-BE y derivados; 5 Audit (solo evidencia, no crea decisiones); 6 Workshop y preparation (no normativos); 7 Documentación histórica (solo evidencia). Entre dos rulings prevalece el posterior; un documento posterior que use una decisión no prueba su aprobación; las contradicciones no se resuelven en silencio, se registran como conflicto. | `18` §1 | 2026-09-30 | `OWNER-RULED` | n/a (regla documental) | La aprobación formal de los 7 documentos de `00-GOVERNANCE` (todavía `PROPOSED`) sigue siendo **`OWNER APPROVAL REQUIRED`** |
| **D-003 / WhatsApp** | "Wapsell Messaging MVP no depende de WhatsApp." | `18` §1 | 2026-09-30 | `RESOLVED — OWNER-RULED` | Ninguna integración ni remoción implementada. No prohíbe integraciones futuras | Modelo Conversation/Message y demás detalles de D-003 siguen `OPEN` |

### 8.2 Lo que P1-A opción C NO establece

P1-A opción C fija el **destino final** (`Business` persistente). No establece cuándo, cómo, ni en qué
orden se materializa; tampoco diseña ni autoriza migración física. Todo eso está `OPEN` y sujeto a
P5-B/OR-002-F.

### 8.3 Estados que permanecen (sin cambio por R3)

| Elemento | Estado |
|---|---|
| Criterio "mismo email" para vincular `Customer` ↔ `User` | `OPEN` (no confirmado por el Owner) |
| Autorización de implementación F1 | `NOT AUTHORIZED` |
| D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017 | `NOT CONSULTED` |
| Especificación técnica | `NOT APPROVED` |
| Implementación | `NOT AUTHORIZED` |
| Gates G5, G7, G8, G9 | `OPEN` |

### 8.4 Precedencia aplicable (ISS-08)

Owner Ruling primario → este Registro → SPEC canónica → TO-BE y derivados → Audit (evidencia) →
Workshop/preparation (no normativos) → documentación histórica (evidencia). Entre dos rulings del Owner
prevalece el posterior. Las auditorías `10-AUDIT/13` y `14` (DRAFT) que rotulan B2/C1/D1/E2/F1 como
"decididas por el Owner" no amplían los textos R2 de §8.1: D1 ("mismo email normalizado = misma persona")
**no** está confirmado y F1 ("implementación autorizada") **no** está confirmado.

---

## 9. Owner Rulings OR-B2 (añadido en Block 2, 2026-10-03)

> **Sección aditiva.** No reemplaza, reescribe ni elimina nada de §1–§8. Las filas D-001…D-018, DEC-001,
> OR-001, OR-002-A…F, P1-A, P5-B, CON-010 e ISS-08 de §8.1 permanecen exactamente como estaban.
> Registra las 26 decisiones explícitas del Owner de la sesión `OR-B2-SESSION-2026-10-03`.
> **Un ruling aprobado NO es autorización de implementación.**
> Texto verbatim íntegro, metadata y referencias históricas: `20-OR-B2-OWNER-DECISIONS-2026-10-03.md`.
> Mapeo a los conflictos C-01…C-22 y lista de abiertos: `21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`.
> Estado de cada ruling: `OWNER-RULED` a nivel conceptual. Tipos: `NUEVA` · `REAFIRMA` · `PROMUEVE`.
> Detalles marcados `OPEN IMPLEMENTATION DETAIL` u `OPEN OWNER DECISION` no están decididos.

### 9.1 Rulings registrados

Autoridad de todas las filas: `20-OR-B2-OWNER-DECISIONS-2026-10-03.md` (sesión `OR-B2-SESSION-2026-10-03`). Fecha: 2026-10-03. La columna "Decisión" es una síntesis; el texto verbatim del Owner está en `20-…`. Implementación de todas las filas: `NOT AUTHORIZED`.

| ID | Decisión (síntesis; verbatim en `20-…`) | Estado | Tipo / confirma o supersede | Conflicto resuelto | Detalle abierto | Implementación |
|---|---|---|---|---|---|---|
| **OR-B2-001** | Modelo de autorización del MVP: Membership → Role → Permission. No se adopta Profile → Role → Capability → Overrides. | `OWNER-RULED` | **NUEVA.** Extiende (no reemplaza) D-005 (DERIVED) | C-10 (RESOLVED BY OWNER) | Catálogo de Permissions y reglas de precedencia: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-002** | Un token válido no autoriza por sí mismo. Toda operación protegida valida conceptualmente: User autenticado + Business objetivo + Membership válido + autorización por Role/Permission. | `OWNER-RULED` | **PROMUEVE.** Promueve D-006 (DERIVED, cláusula pendiente de ruling) a OWNER-RULED | C-04 (RESOLVED BY OWNER: 4 validaciones conceptuales); C-02/C-03 (PARTIAL) | Mecanismo de token y de enforcement: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-003** | Membership tiene lifecycle conceptual ACTIVE / INACTIVE. Una Membership INACTIVE no permite operar sobre el Business. | `OWNER-RULED` | **NUEVA.** Cierra blocker 8 del Requirements | Blocker 8 (no es un C-xx) | Transiciones, quién desactiva y efectos sobre sesiones: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-004** | Customer y User son entidades diferentes. Customer puede existir sin User. El vínculo Customer → User es opcional. | `OWNER-RULED` | **REAFIRMA.** Reafirma D-002-bis y OR-002-D | C-01 (RESOLVED BY OWNER); C-14 (PARTIAL, junto con 011) | Criterio de vinculación Customer→User ("mismo email", D1): OPEN OWNER DECISION no resuelta por esta decisión | `NOT AUTHORIZED` |
| **OR-B2-005** | Un email normalizado globalmente único identifica a un User. No puede haber más de un User con el mismo email normalizado. | `OWNER-RULED` | **REAFIRMA.** Reafirma OR-002-C | — (ninguno) | Algoritmo de normalización del email: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-006** | Empresa → Business y Usuario → User/Membership por transición incremental con coexistencia temporal y acotada. Coexistencia física, mecanismo, cutover y rollback quedan para la especificación técnica posterior. | `OWNER-RULED` | **REAFIRMA.** Reafirma OR-002-B, OR-001 P2-C y OR-001 P1-A | — (ninguno) | Coexistencia física, mecanismo de migración, cutover y rollback: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-007** | Un User puede tener múltiples Memberships y puede seleccionar/cambiar el Business activo. El mecanismo técnico del Business Switch queda abierto. | `OWNER-RULED` | **NUEVA.** Cierra la parte conceptual del blocker 14 | Blocker 14 (parcial; no es un C-xx) | Mecanismo técnico del Business Switch: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-008** | Membership Roles del MVP: Owner, Admin, Vendedor, Gestor de Stock (nomenclatura normalizada por el Owner; el texto original decía "Operador de Stock"). Customer y Supplier no son Membership Roles. Repartidor queda fuera del MVP: FUTURE / OPEN. | `OWNER-RULED` | **NUEVA.** Define el catálogo de Membership Roles que no estaba aprobado. Normalizada por el Owner (Gestor de Stock; Repartidor fuera del MVP) | C-10 (RESOLVED BY OWNER, junto con 001 y 009); C-11 (OPEN OWNER DECISION: Repartidor queda FUTURE / OPEN fuera del MVP; SaaS Admin sigue sin decisión) | Permisos por rol: OPEN IMPLEMENTATION DETAIL. Repartidor: FUTURE / OPEN. El AS-IS no tiene Admin y PROVEEDOR es un rol de Usuario: brecha AS-IS/TO-BE, no implementada | `NOT AUTHORIZED` |
| **OR-B2-009** | Owner y Admin son roles distintos. Owner = propiedad/control máximo del Business. Admin = administración delegada. | `OWNER-RULED` | **NUEVA.** Separa "Owner/Admin" que figuraba fusionado | C-10 (RESOLVED BY OWNER); ambigüedad Owner/Admin | Permisos concretos de Owner y de Admin: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-010** | Product es global. Los datos comerciales específicos del Business viven en una relación/oferta específica (conceptualmente Product → BusinessProduct). Modelo físico abierto. | `OWNER-RULED` | **NUEVA.** Resuelve la tensión de REQ-CAT-002 con SPEC §3/§10 y con D-001 | C-13 (RESOLVED BY OWNER, a nivel conceptual) | Qué campos son globales y cuáles del Business: OPEN OWNER DECISION. Modelo físico de BusinessProduct: OPEN IMPLEMENTATION DETAIL. Product global no arrastra stock ni precio (D-001, D-014) | `NOT AUTHORIZED` |
| **OR-B2-011** | El Cart pertenece al Customer cuando existe, con vínculo opcional al User. Debe poder existir Customer sin User. | `OWNER-RULED` | **NUEVA.** Resuelve REQ-CART-001 | C-14 (PARTIAL, junto con 004) | Titular del Cart cuando no existe Customer: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (OPEN OWNER DECISION) | `NOT AUTHORIZED` |
| **OR-B2-012** | Order y Sale son entidades diferentes. Order = intención/proceso comercial. Sale = operación económica confirmada. | `OWNER-RULED` | **PROMUEVE.** Promueve D-007 (DERIVED) a OWNER-RULED | C-16 (base; RESOLVED BY OWNER parcialmente junto con 013 y 014) | Atributos y estados de Order y Sale: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-013** | La Sale nace cuando el Order es confirmado/aceptado comercialmente. No se espera a la entrega. | `OWNER-RULED` | **NUEVA.** Cierra BLOCK-ORD-003 y la cláusula de D-008 | C-16 (parcial); C-06 (junto con 012 y 015) | Quién confirma el Order: OPEN OWNER DECISION (REQ-ORD-002 dice "el Customer confirma"; esta decisión dice "confirmado/aceptado comercialmente") | `NOT AUTHORIZED` |
| **OR-B2-014** | El stock se reserva al confirmar el Order. El descuento físico queda sujeto al flujo transaccional de la especificación especializada. No se inventan estados técnicos ni transaction boundaries. | `OWNER-RULED` | **NUEVA.** Cierra BLOCK-ORD-001 solo para la reserva. No altera D-010 | C-16 (parcial) | Momento y flujo del descuento físico: OPEN OWNER DECISION / especificación especializada. Estados técnicos y transaction boundaries: OPEN IMPLEMENTATION DETAIL, NO inventar | `NOT AUTHORIZED` |
| **OR-B2-015** | Una Sale confirmada es inmutable. Las correcciones se hacen por cancelación, reversión o refund, con trazabilidad. | `OWNER-RULED` | **NUEVA.** Cierra la cláusula pendiente de D-008 y REQ-SALE-002 | C-06 (RESOLVED BY OWNER) | Mecanismos concretos de cancelación, reversión y refund: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-016** | Rotación: producto con vencimiento → FEFO; producto sin vencimiento → FIFO. | `OWNER-RULED` | **NUEVA.** Resuelve la contradicción SPEC §22 (FIFO) vs REQ-INV-005 (FEFO) | C-09 (RESOLVED BY OWNER) | Unidad de rotación (lote o fecha): OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-017** | El MVP contempla Locations/Warehouses de forma mínima, con una ubicación principal/default conceptual. Sin modelo físico todavía. | `OWNER-RULED` | **NUEVA.** Resuelve el alcance de ubicaciones del MVP | C-08 (RESOLVED BY OWNER, alcance mínimo) | Cantidad de branches/warehouses del MVP: OPEN OWNER DECISION. Modelo físico de Location: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-018** | Stock negativo no permitido. | `OWNER-RULED` | **NUEVA.** Eleva a OWNER-RULED un requisito derivado. No altera D-010 | — (ninguno directo) | Mecanismo de garantía: OPEN IMPLEMENTATION DETAIL. D-010 sigue NON-COMPLIANT/GAP en el AS-IS (p. ej. AUD-D010-G02); no se declara implementado | `NOT AUTHORIZED` |
| **OR-B2-019** | Messaging es un dominio/módulo funcional de primera clase. UX conversation-centric. "Primera clase" no implica módulo visual independiente. | `OWNER-RULED` | **NUEVA.** Aclara DEC-001 y SPEC §20 sin alterar DEC-001 | C-12 (RESOLVED BY OWNER) | Forma visual/de navegación del módulo: OPEN IMPLEMENTATION DETAIL | `NOT AUTHORIZED` |
| **OR-B2-020** | IA forma parte de la dirección de producto, no opera en el MVP inicial y no se implementan asistentes IA ahora. Wapsell Messaging MVP no depende de WhatsApp. | `OWNER-RULED` | **REAFIRMA + PROMUEVE.** Reafirma DEC-001 y D-003 (WhatsApp OWNER-RULED). Promueve a OWNER-RULED la cláusula "IA inactiva en el MVP inicial" (DERIVED) | — (ninguno) | Condición de activación futura de IA: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE | `NOT AUTHORIZED` |
| **OR-B2-021** | Una Conversation comercial pertenece a un Business. Los participantes pueden ser Users/Customers; acciones y datos comerciales quedan contextualizados al Business. | `OWNER-RULED` | **NUEVA.** Resuelve REQ-MSG-003 en el sentido de G65 | C-15 (RESOLVED BY OWNER, coincide con G65) | Customer participante sin User: NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE (OPEN OWNER DECISION) | `NOT AUTHORIZED` |
| **OR-B2-022** | Workshop 001–490 no es autoridad normativa: es fuente de discovery y produce requisitos candidatos. Una respuesta del Workshop no se vuelve decisión aprobada automáticamente. | `OWNER-RULED` | **NUEVA.** Define el estatus del Workshop 001–490 bajo ISS-08 | C-21 (RESOLVED BY OWNER) | Ninguno propio. Cada REQ sigue siendo candidato hasta que el Owner lo apruebe | `NOT AUTHORIZED` |
| **OR-B2-023** | ISS-08 aprobado como regla formal de precedencia: OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP / PREPARATION > HISTORICAL. Los documentos derivados no adquieren autoridad por existir. | `OWNER-RULED` | **REAFIRMA.** Aprueba formalmente ISS-08, que figuraba OWNER-RULED en R2 y PROPOSED en Source of Truth | C-22 (PARTIAL) | Ubicación de Requirements, Specialized Specs, Contracts y AS-IS en la precedencia: OPEN OWNER DECISION. Los 7 documentos de gobernanza siguen PROPOSED | `NOT AUTHORIZED` |
| **OR-B2-024** | Modular Monolith aprobado como dirección arquitectónica. NO aprobados: NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes ni otro detalle de stack. | `OWNER-RULED` | **PROMUEVE.** Promueve solo la dirección de D-017 (Modular Monolith) | C-07 (PARTIAL); C-03 (PARTIAL) | Stack: NO aprobado (NestJS, PostgreSQL, Docker, VPS, GraphQL, Kubernetes). Cláusula K8s/GraphQL de D-017: sin ruling | `NOT AUTHORIZED` |
| **OR-B2-025** | Returns y Refunds forman parte del Commerce TO-BE. Implementación en etapa posterior. | `OWNER-RULED` | **NUEVA.** Fija el alcance TO-BE de Returns/Refunds | — (hueco del SPEC) | Implementación y reglas: etapa posterior / especificación especializada | `NOT AUTHORIZED` |
| **OR-B2-026** | Pricing y Promotions forman parte del Commerce TO-BE. Reglas concretas para la especificación especializada correspondiente. | `OWNER-RULED` | **NUEVA.** Fija el alcance TO-BE de Pricing/Promotions | — (hueco del SPEC) | Reglas concretas: especificación especializada correspondiente | `NOT AUTHORIZED` |

### 9.2 Aclaraciones del Owner que prevalecen sobre el texto original de OR-B2-008

- Nomenclatura normativa: **Gestor de Stock**. "Operador de Stock" no es nombre normativo.
- Membership Roles del MVP: Owner, Admin, Vendedor, Gestor de Stock. Customer y Supplier no son Membership Roles.
- Repartidor queda fuera del MVP como Membership Role. Estado `FUTURE / OPEN`. No se elimina del producto futuro.
- IDs `OR-B2-001 … OR-B2-026` y `OR-B2-SESSION-2026-10-03` aprobados por el Owner.

### 9.3 Efecto sobre filas históricas (sin modificarlas)

Las filas originales no se tocan. En el alcance exacto indicado, el ruling OR-B2 posterior prevalece (ISS-08). Donde §4 o §8.3 rotulan una decisión como `DERIVED` o `NOT CONSULTED`, ese rótulo se conserva como evidencia histórica; para el alcance listado rige §9.1.

| Fila histórica | OR-B2 | Alcance del efecto | Lo que NO cambia |
|---|---|---|---|
| D-005 (roles y permisos) | 001, 008, 009 | Modelo Membership → Role → Permission y catálogo de Membership Roles del MVP | Catálogo de permisos y precedencia: `IMPLEMENTATION DETAIL` |
| D-006 (4 validaciones) | 002 | Promovida a `OWNER-RULED`: 4 validaciones conceptuales | Mecanismo de token y enforcement |
| D-007 (Order ≠ Sale) | 012 | Promovida a `OWNER-RULED` | Estados y atributos |
| D-008 (Sale) | 013, 015 | Momento de nacimiento de la Sale e inmutabilidad (cláusula pendiente) | Mecanismos de cancelación/reversión/refund |
| D-010 (integridad de Inventario) | 014, 018 | Coherente; no la altera | `NON-COMPLIANT/GAP` en el AS-IS (p. ej. AUD-D010-G02). No se declara implementado |
| D-017 (arquitectura) | 024 | Solo la dirección Modular Monolith | Stack no aprobado. Cláusula K8s/GraphQL sin ruling |
| D-002-bis / OR-002-D | 004 | Reafirmadas | Criterio de vinculación "mismo email" sigue `OPEN` |
| OR-002-B / OR-002-C | 005, 006 | Reafirmadas | Normalización, coexistencia física, cutover y rollback |
| ISS-08 | 022, 023 | Aprobada formalmente (OR-B2-023) | Los 7 documentos de `00-GOVERNANCE` siguen `PROPOSED`. Ubicación de Requirements, Specialized Specs, Contracts y AS-IS en la precedencia: `OPEN OWNER DECISION` |
| DEC-001 / D-003 | 019, 020 | Aclara y reafirma Messaging/IA/WhatsApp | Condición de activación futura de IA: no determinable |

### 9.4 Estados que permanecen (sin cambio por OR-B2)

| Elemento | Estado |
|---|---|
| D-011, D-013, D-015, D-016 (cláusulas no cubiertas por OR-B2) | `OPEN OWNER DECISION` (en §8.3: `NOT CONSULTED`) |
| Vocabulario de estados de Payment (D-011 vs REQ-PAY-003), C-17 | `OPEN OWNER DECISION` |
| Operaciones sensibles de Cash (D-013), C-05 | `OPEN OWNER DECISION` |
| SaaS Admin (C-11) | `OPEN OWNER DECISION`. Repartidor: `FUTURE / OPEN`, fuera del catálogo de Membership Roles del MVP |
| Cantidad de branches/warehouses del MVP | `OPEN OWNER DECISION` |
| Campos globales vs del Business en Product/BusinessProduct | `OPEN OWNER DECISION` |
| Quién confirma el Order | `OPEN OWNER DECISION` |
| Titular del Cart sin Customer; Customer participante de Conversation sin User | `OPEN OWNER DECISION` (no determinable con la información disponible) |
| Criterio "mismo email" para vincular Customer ↔ User | `OPEN` |
| Cláusula K8s/GraphQL de D-017; CON-008, CON-011, GRF-02 | `OPEN` |
| OR-003, OR-005 | Siguen sin definir. Los IDs no se reutilizan |
| Especificación técnica | `NOT APPROVED` |
| Implementación | `NOT AUTHORIZED` |

### 9.5 Precedencia aplicable (ISS-08, aprobada por OR-B2-023)

Owner Ruling → este Registro → SPEC canónica → TO-BE → Audit → Workshop/preparation → histórico. Entre dos rulings del Owner prevalece el posterior. Las contradicciones no se resuelven en silencio: se registran como conflicto. Workshop 001–490 no es normativo (OR-B2-022).

```text
TECHNICAL SPECIFICATION = NOT APPROVED
IMPLEMENTATION = NOT AUTHORIZED
```

> **POST-OR-B3 — Owner Rulings posteriores (2026-10-03).** Las decisiones OR-B3-001…OR-B3-014 fueron aceptadas expresamente por el Owner el 2026-10-03 y registradas en `03-DECISIONS/22-OR-B3-OWNER-DECISIONS-2026-10-03.md`. Por ISS-08, estas decisiones posteriores prevalecen sobre cualquier texto histórico anterior que las contradiga.

| ID | Área | Estado |
|---|---|---|
| OR-B3-001 | Customer/User matching | CLOSED — OWNER RULING |
| OR-B3-002 | Customer/User association | CLOSED — OWNER RULING |
| OR-B3-003 | SaaS Admin | CLOSED — fuera del MVP operativo |
| OR-B3-004 | Locations | CLOSED — Location genérica, MAIN mínimo, múltiples permitidas |
| OR-B3-005 | Product / BusinessProduct | CLOSED — modelo híbrido |
| OR-B3-006 | Order confirmation | CLOSED — acción comercial autorizada por ORDER_CONFIRM |
| OR-B3-007 | Cart sin Customer | CLOSED — permitido; Customer requerido para Order |
| OR-B3-008 | Customer sin User en Messaging | CLOSED — permitido |
| OR-B3-009 | Decremento físico | CLOSED — movimiento de salida físico |
| OR-B3-010 | Cash sensible | CLOSED — permisos específicos |
| OR-B3-011 | Fulfillment | CLOSED — MVP, sin Repartidor como Membership Role |
| OR-B3-012 | Kubernetes / GraphQL | OPEN como decisión técnica; no prohibido ni aprobado |
| OR-B3-013 | G001–G105 | CLOSED — fuente funcional secundaria |
| OR-B3-014 | MFA/2FA | CLOSED — obligatorio para Owner/Admin |

**Límite:** estos rulings no aprueban la Technical Specification ni autorizan implementación.


## 10. Master Owner Recommendation Package — 2026-10-03

**Status:** CLOSED — OWNER ACCEPTED ALL RECOMMENDATIONS

On 2026-10-03 the Owner explicitly accepted all recommendations in the Master Decision Package previously presented in the working session. The consolidated closure is recorded in:

- `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md`

This acceptance consolidates product and architectural directions across identity/tenancy, authorization, authentication/session, commerce, inventory, payments/cash, fulfillment, messaging, branding, audit/notifications, migration and implementation readiness.

### Authority treatment

1. Existing Owner rulings remain authoritative where they cover the same subject.
2. The master closure does not retroactively alter historical evidence.
3. Technical mechanisms explicitly left OPEN by a higher-authority ruling remain OPEN until separately closed.
4. The accepted package does not authorize schema changes, migrations, destructive code changes, deployment or production cutover.
5. Implementation remains NOT AUTHORIZED until the implementation-readiness gates are satisfied.

### Consolidated accepted directions

- Membership → Role → Permission is the authorization model.
- JWT-centric authentication is the approved incremental authentication direction; JWT alone is not authorization.
- Application-level tenant isolation is the approved tenant-isolation direction.
- Active Business Context is server-established and must correspond to an ACTIVE Membership.
- Owner/Admin MFA is mandatory.
- Customer remains distinct from User; Customer↔User association is controlled.
- Product identity is global conceptually; BusinessProduct carries Business-specific commercial configuration.
- Cart may exist anonymously, but Customer is required before Order.
- Order and Sale remain distinct; Sale is born at commercial confirmation.
- Confirmed Orders reserve stock; physical decrement is represented by actual stock-out movement.
- Negative stock is prohibited; FEFO/FIFO rules apply as approved.
- Inventory is Business-owned; Location is generic with MAIN minimum.
- Payment is separate from Sale; AR/Cuentas por Cobrar is in MVP; Cash is Business-scoped and sensitive operations require explicit Permissions.
- Fulfillment remains under Orders; Repartidor is outside MVP Membership Roles.
- Returns/Refunds and Pricing/Promotions belong to the Commerce TO-BE direction.
- Messaging is first-class, Business-scoped and does not depend on WhatsApp for MVP; AI is inactive in MVP.
- Business Brand is customer-facing over the common Wapsell Design System.
- Modular Monolith is the approved architectural direction.
- Migration remains incremental with controlled coexistence and traceability.

For the complete 43-item accepted package and its implementation-boundary treatment, the master closure artifact above is authoritative for the consolidation, subject to the precedence rule in this register.

**Evidence:** DOCUMENTADO — Owner acceptance in the 2026-10-03 working session.
**Implementation status:** NOT AUTHORIZED.


## R8-ORD-002 — OWNER RULING — 2026-10-03

The Owner explicitly accepted all recommendations A1–L1 from the R8-ORD-002 Order/Sale States and Effects workshop. The authoritative closure is:

`03-DECISIONS/38-R8-ORD-002-OWNER-DECISION-ORDER-SALE-STATES-EFFECTS-2026-10-03.md`

Approved direction:

- A1 — retain the AS-IS Order state vocabulary as transformation starting point, with semantic reconciliation.
- B1 — CONFIRMADO is the commercial confirmation boundary.
- C1 — delivery does not create the Sale or redefine its economic boundary.
- D1 — cancellation before physical exit releases the applicable reservation without inventing a physical stock-out.
- E1 — retain PARCIALMENTE_ENTREGADO as an operational Order state.
- F1 — CANCELADO is terminal.
- G1 — retain CONFIRMADA / ANULADA as conceptual Sale starting vocabulary.
- H1 — confirmed Sale is immutable; corrections use explicit traceable operations.
- I1 — Order and Sale have separate lifecycles.
- J1 — Payment does not determine the Sale lifecycle state.
- K1 — ENTREGADO represents fulfillment completion, not Sale/payment/cash completion.
- L1 — cross-domain correction effects belong to the respective specialized domains.

This ruling closes the conceptual Order/Sale lifecycle boundary. Exact technical state enforcement and cross-domain cancellation/reversal/refund effects remain OPEN in their respective specialized specifications.

**Status: APPROVED — OWNER-VERIFIED — IMPLEMENTATION NOT AUTHORIZED.**

## R8-PAY-002 — OWNER RULING — 2026-10-03

The Owner explicitly accepted all recommendations A1–H1 from the R8-PAY-002 Payment Lifecycle and Reconciliation assessment. Authoritative closure: `03-DECISIONS/39-R8-PAY-002-OWNER-DECISION-PAYMENT-LIFECYCLE-RECONCILIATION-2026-10-03.md`.

Approved direction:
- A1 — retain AS-IS Payment state vocabulary as transformation starting point, with semantic reconciliation.
- B1 — controlled manual payments may be approved at registration; external-provider payments may remain asynchronous.
- C1 — Payment lifecycle is independent from Sale lifecycle.
- D1 — partial payment is valid.
- E1 — overpayment is rejected by default.
- F1 — refund/reversal is an explicit traceable Payment operation.
- G1 — Payment and AR application remain distinct.
- H1 — Payment reconciliation remains distinct from Cash and AR reconciliation.

Exact transition enforcement, external provider mechanics, idempotency, refund persistence, Payment↔Cash effects, AR allocation, Cash reconciliation and technical contracts remain OPEN. **Implementation remains NOT AUTHORIZED.**


## R8-PAY-003 — OWNER RULING — 2026-10-03

The Owner accepted all recommendations A1, B3, C1, D1, E1, F2, G1 and H1. Authoritative closure: `03-DECISIONS/41-R8-PAY-003-OWNER-DECISION-PAYMENT-CASH-AR-EFFECTS-2026-10-03.md`.

Approved direction: Payment may affect Cash according to payment method; timing depends on method/evidence; Payment and AR application remain distinct; Payments may be allocated partially/fully across AR obligations; Payments may exist without AR; partial Payment does not automatically create AR; refunds may produce compensating Cash effects when applicable; Sale cancellation does not erase historical Payments and compensating effects belong to the respective domains.

Exact Cash/AR mechanics, reconciliation, provider mechanics, refund/cancellation workflows and technical contracts remain OPEN. **Implementation remains NOT AUTHORIZED.**

## 9. B2 Owner Decision Closure — 2026-10-04

The Owner accepted the B2 closure recommendations recorded in:
`03-DECISIONS/47-B2-OWNER-DECISION-CLOSURE-2026-10-04.md`

This is a downstream canonical addendum to the earlier register. Historical D-xxx rows are not rewritten.

| ID | Direction | Status |
|---|---|---|
| 1 | At most one ACTIVE Membership per `(User, Business)`. | ACCEPTED |
| 2 | Customer responses retain the cross-cutting security boundary against exposing secrets/authorization-sensitive data. | ACCEPTED |
| 3 | Legacy retirement is a separate process/cutover gate, not a runtime invariant. | ACCEPTED |
| 4 | Exactly one effective Role per Membership in MVP. | ACCEPTED |
| 5 | Permission domains are conceptually approved; atomic IDs, exact matrix rows and persistence remain OPEN. | ACCEPTED |
| 6 | Legacy `UsuarioPermiso`/`Permiso` requires explicit reviewed mapping to target Role→Permission before retirement. | ACCEPTED |
| 7 | Legacy coexistence is bounded and temporary; exact duration/cutover mechanics remain OPEN. | ACCEPTED |
| 8 | Protected operations revalidate current server-side authorization state; no latency SLA is fixed. | ACCEPTED |
| 9 | Public/pre-context paths may operate without Business Permission; protected Business-scoped operations fail closed without applicable authorization. | ACCEPTED |
| 10 | Critical-operation additional authorization control is preserved conceptually; exact design is deferred to a dedicated downstream contract. | ACCEPTED |

These rulings close the corresponding B2 normative questions without authorizing implementation, schema changes, migration, deployment or legacy deletion.

**Authority:** Owner acceptance, 2026-10-04.

## 10. B3 Tests/Evals Owner Decision Closure — 2026-10-04

The Owner accepted the 25 B3 Tests/Evals decisions (B3-TEST-001 … B3-TEST-025) recorded in:
`03-DECISIONS/48-B3-TESTS-EVALS-OWNER-DECISION-CLOSURE-2026-10-04.md`

This is a downstream canonical addendum to the earlier register. Historical D-xxx rows are not rewritten.

| IDs | Direction | Status |
|---|---|---|
| 001 | Canonical test level: unit + PostgreSQL/Prisma integration (unit first); E2E deferred until auth/Business context is sufficiently implemented. | ACCEPTED |
| 002-004 | Existing seed + B3 fixtures; two Businesses + users/memberships + needed entities; Businesses created inside each suite with IDs in variables. | ACCEPTED |
| 005, 021 | Verify the observable isolation property (and the mechanism when useful); PASS requires the expected result and, for mutations, the final persisted state. | ACCEPTED |
| 006, 017 | Server context determines the Business on creation; a client `empresaId` cannot override it. | ACCEPTED |
| 007-009, 018, 019 | Cross-Business read never returns the other Business's record (no imposed error code); update/delete affect only the current Business and are not allowed across Businesses; unique lookups tested only through existing mechanisms. | ACCEPTED |
| 010, 020 | Nested/related ownership: direct FK + nested writes + relevant indirect relations. | ACCEPTED |
| 011 | Legajo/DocumentoLegajo remain OPEN / NOT TESTABLE; no tenant rule invented. | ACCEPTED |
| 012-014 | Transactions preserve the Business context; unsupported operations fail explicitly; the currently relevant raw SQL surface is tested (raw SQL not prohibited in general). | ACCEPTED |
| 015, 016 | Absent or invalid context fails closed. | ACCEPTED |
| 022, 023 | `[T]` only for an executed specific test with a verifiable result; `[E]` only for real execution on target infrastructure with evidence. | ACCEPTED |
| 024, 025 | Failures are classified before any change; B3 Tests/Evals close only with criteria derived, tests implemented and executed, evidence recorded and every failure resolved or formally open/classified. | ACCEPTED |

These rulings close the corresponding B3 Tests/Evals method questions without authorizing implementation, schema changes, test execution or any claim of B3 readiness.

**Authority:** Owner acceptance, 2026-10-04.
