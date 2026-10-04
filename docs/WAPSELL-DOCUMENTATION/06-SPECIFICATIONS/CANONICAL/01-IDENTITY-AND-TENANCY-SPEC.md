# Wapsell — Identity, Tenancy, Membership & Authorization Specification
**Version:** 0.2 | **Status:** DRAFT — NOT APPROVED · **Reconciled:** 2026-09-28

> ## Normative basis (read before using this document)
>
> The previous header claimed `APPROVED — COHERENT WITH DECISIONS D-001..D-018`. **That was
> unsupported** and is withdrawn. The *reason* originally given — *"the repository holds no decision
> text"* — was itself **wrong** (an inventory error, retracted 2026-09-28). Reconstructed text for all
> of D-001…D-018 exists; see `04-DECISIONS/00-DECISION-REGISTER.md` §4:
> - **D-001, D-002, D-002-bis → `APPROVED — OWNER-VERBATIM`** (quotable).
> - **D-003…D-018 → `APPROVED — DERIVED / RECONSTRUCTED`** (usable as requirements, not quotable as
>   approved text until the Owner confirms wording).
>
> `IMPLEMENTATION DETAIL` is `OPEN` throughout. DEC-001 (`04-DECISIONS/02-MULTITENANCY.md`) remains
> the only **originally authored** decision and is a *direction* memo that explicitly **excludes**
> the data model, migration plan and token design (`:55-57`).
>
> This is the spec most exposed to that exclusion, so three of its claims are corrected here:
>
> | Section | Claim | Verdict |
> |---|---|---|
> | §2 Aislamiento — *"D-001: Tenant es término canónico"* | `Tenant` is the canonical term | **SUPERSEDED 2026-09-28 — now decided the other way.** D-001 is now available as **`OWNER-VERBATIM`**: *"Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant."* The canonical entity term is **`Business`**. `Tenant` denotes the multi-tenant **isolation function**, not the entity name. **CON-009 CLOSED.** |
> | §1 Unicidad — *"(e.g., por email global o ID único)"* | global email uniqueness | **STILL `OPEN`.** D-001/D-002 text does not decide it; `Usuario.email @unique` remains an open question (`05-ASIS/04-ASIS-IDENTITY.md:68`). |
> | §1 / §8 Transformación — *"`Usuario` y `Cliente` se reconcilian"* / *"el TO-BE consolidará"* | merge `Usuario`+`Cliente` into `User` | **REFUTED 2026-09-28 — permanently.** D-002-bis (**`OWNER-VERBATIM`**) settles it: **`Customer` is NOT merged with `User`.** `Customer` is the commercial relationship of the buyer/client with a `Business`, optionally linked to a `User` without requiring one, scoped to a `Business` context, and may carry purchases, orders, history, current account/debt, commercial terms and other Commerce data. **CON-010 CLOSED.** The *migration* remains `OPEN`. |
>
> ### Terminology authority (governs this entire document)
>
> Per D-001, this spec uses **`Business`** as the entity term. Legacy `Tenant` occurrences are
> retained below **only** where they describe the isolation mechanism ("multi-tenant isolation"), and
> are **not** normative naming. A full mechanical rename has deliberately **not** been performed:
> §1/§3–§10 still read `Tenant` as the entity, and rewriting them mechanically risks converting
> `Tenant` into a different meaning without Owner review. **Flagged for the D-001 reconciliation
> pass** — see `04-DECISIONS/00-DECISION-REGISTER.md` §4.
>
> ### Decision provenance in this document
>
> - **D-001, D-002, D-002-bis → `OWNER-VERBATIM`.** Quotable as approved.
> - **D-005, D-006 → `DERIVED / RECONSTRUCTED`.** Usable as requirements; **not** quotable as
>   approved text until the Owner confirms wording.
> - `IMPLEMENTATION DETAIL` is `OPEN` throughout: no schema, no identifier naming, no token design.
>
> Remaining `(D-0xx)` markers are **topic pointers only**, not evidence of a decided requirement.
> §4/§6 D-009 approval rules, §9 D-006 token design and §10 boundaries remain **`OPEN`** — the
> reconstructed D-005/D-006/D-009 text gives direction but does not specify catalogues, token types
> or boundary mechanics.
>
> See `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md`.

> ### Ruling traceability (R1, 2026-09-30 — additive note; no normative text of this document was changed)
>
> - **Source / Authority:** `04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md` — **OR-001, `CLOSED` 2026-09-28**.
>   P1-A: the decided destination of `Empresa` is `Business` (rename). P2-C: temporary coexistence of both
>   models. P3: continuity without downtime over Ventas, Caja, Catálogo, Compras, Tienda Online, Auth and
>   Datos históricos. P4: `"Roonda"` → `"Otra Ronda Más"`. P5-B: document first; implement only after the
>   Owner approves the migration specification. D-001 `IMPLEMENTATION DETAIL` = `SPECIFICATION REQUIRED`
>   (`13` §6).
> - **Source / Authority:** `04-DECISIONS/15-OR-002-A-OWNER-RULING.md` — **OR-002-A, `CLOSED` 2026-09-28**.
>   `CON-010` is `RESOLVED` in conceptual direction: `User` (global) → `Membership` (N:N) → `Business`;
>   `Customer` is an independent commercial relationship, not merged with `User`, with an optional
>   `Customer → User` link. Authority: D-002 + D-002-bis. The `CLOSED` used in the verdict table above and
>   the `RESOLVED` of the ruling are a vocabulary difference, not a substantive one.
> - **Still `OPEN` (not decided by either ruling):** physical model, tables/columns/FKs, compatibility
>   mechanism, deployment strategy, Prisma migrations, criterion for ending the coexistence, rollback,
>   isolation mechanism, and whether "rename" in P1-A is physical or conceptual. The paragraph
>   *"A full mechanical rename has deliberately not been performed"* above therefore remains accurate; the
>   terminology pass it flags is a separate, pending action that R1 did not perform.
> - **Neither ruling authorizes physical implementation** (no `Membership` table, migration, Prisma, JWT,
>   guard, API or role change).
> - `OR-002-B…F` have no primary ruling and are **not** propagated here. *(R1 statement — superseded by the R3 note below; preserved as historical.)*
>
> **R3 note (2026-09-30) — additive; no normative text of this document was changed.**
> - **Source / Authority:** Owner rulings of 2026-09-30 (R2), recorded in `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` and `04-DECISIONS/00-DECISION-REGISTER.md` §8.1. `OR-002-B…F`, `P1-A` (option C) and `P5-B` are now ruled at the conceptual level:
>   - **OR-002-B:** incremental transition; coexistence temporary and bounded; no prolonged or permanent coexistence.
>   - **OR-002-C:** `User` is a global identity with globally unique email (the *uniqueness mechanism* remains `OPEN DETAIL`).
>   - **OR-002-D:** `Usuario` → `User` + `Membership`; `Cliente` → `Customer`, independent of `User`, optional link.
>   - **OR-002-E:** temporary compatibility of legacy sessions/tokens (respecting OR-001 P3); at the end of the transition sessions are invalidated and a new login is required.
>   - **OR-002-F / P5-B:** `specification → Owner approval → implementation`.
>   - **P1-A (option C):** `Empresa` → `Business` as the final destination for documentary terminology and the persistent model. This does **not** mean the physical migration is designed or authorized.
> - **Still `OPEN` / not authorized:** whether Customer↔User matching by "same email" applies (`OPEN`); physical model, compatibility mechanism, criteria/timing for ending the coexistence, token/session mechanics; Technical Specification `NOT APPROVED`; implementation `NOT AUTHORIZED`; `F1` is not an authorization.

> ### POST-OR-B2 note (2026-10-03) — additive; no normative text of this document was changed
>
> - **Source / Authority:** Owner rulings `OR-B2-001 … OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`), texto verbatim en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`; registro en `03-DECISIONS/00-DECISION-REGISTER.md` §9; mapeo a conflictos en `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Autoridad ISS-08 (aprobada por OR-B2-023): Owner Ruling > Decision Register > SPEC canónica. Entre dos rulings prevalece el posterior.
> - **Cómo leer este documento ahora:** el texto original se conserva como evidencia histórica. Donde abajo se indica "superado", rige el OR-B2 citado **solo en ese alcance**; el resto del párrafo no se reescribe ni se promueve. Los rótulos `DERIVED / RECONSTRUCTED` y `TO-BE PROPOSED` del texto original se conservan; no se convierten en `APPROVED` por esta nota.
>
> | Sección de este documento | Efecto POST-OR-B2 | Autoridad |
> |---|---|---|
> | Cabecera y §1.1 — unicidad *"El mecanismo de unicidad es `OPEN DETAIL`"* | Se conserva. OR-B2-005 decide a nivel conceptual: un email normalizado globalmente único identifica a un `User`; no puede haber más de un `User` con el mismo email normalizado. Reglas de normalización y mecanismo de unicidad: `OPEN IMPLEMENTATION DETAIL`. | OR-B2-005 (reafirma OR-002-C) |
> | §1.1 Autenticación (D-006 `DERIVED`) | D-006 queda promovida a `OWNER-RULED` en el alcance de las 4 validaciones conceptuales: `User` autenticado, `Business` objetivo, `Membership` válido, autorización por `Role`/`Permission`. Un token válido no autoriza por sí mismo. Tipos de token, guards y enforcement: `IMPLEMENTATION DETAIL` / `OPEN`. | OR-B2-002 |
> | §1.1 / §1.2 / Cabecera — `Customer` | Reafirmado: `Customer` y `User` son entidades diferentes; `Customer` puede existir sin `User`; vínculo `Customer → User` opcional. Criterio de vinculación por "mismo email": sigue `OPEN`. Ciclo de vida del `Customer` y modelado del vínculo: `OPEN DETAIL` (OR-003 sin definir). | OR-B2-004 (reafirma D-002-bis, OR-002-A/D) |
> | §1.2 / §2 / Transformación AS-IS → TO-BE | `Empresa → Business` y `Usuario → User` + `Membership` por transición incremental con coexistencia temporal y acotada. Coexistencia física, mecanismo, cutover y rollback: especificación técnica posterior. El texto de la cabecera sobre "mecánica de rename pendiente" no se altera. | OR-B2-006 (reafirma OR-001, OR-002-B/D) |
> | §3.1 Membership — *"Estado… `OPEN DETAIL`"* | `Membership` tiene lifecycle conceptual `ACTIVE` / `INACTIVE`; una `Membership` `INACTIVE` no permite operar sobre el `Business`. Los demás estados mencionados en el texto (pendiente, invitada, suspendida) **no** quedan decididos por OR-B2. Conflicto abierto con G44/G67/G69/G72/G74 del registro G001–G105 (ver doc 21 §4, G-N4). | OR-B2-003 |
> | §3.1 Múltiples Memberships | Un `User` puede tener múltiples `Membership`s y seleccionar/cambiar el `Business` activo. Mecanismo técnico del Business Switch: `OPEN IMPLEMENTATION DETAIL`. | OR-B2-007 |
> | §4 Roles / §5 Permissions | Modelo conceptual del MVP: `Membership → Role → Permission`. No se adopta `Profile → Role → Capability → Overrides`. Roles del MVP: **Owner, Admin, Vendedor, Gestor de Stock** (nomenclatura oficial; "Operador de Stock" no es normativo). `Owner` = propiedad/control máximo del `Business`; `Admin` = administración delegada. `Customer` y `Supplier` no son Membership Roles. `Repartidor`: fuera del MVP como Membership Role, `FUTURE / OPEN` (D-016 sigue `OPEN`). Catálogo de permisos, permisos por rol y precedencia: `IMPLEMENTATION DETAIL`. El ejemplo "Asistente en Business B" (§3.1) y el enum AS-IS `RolUsuario` (§4.2) describen el estado anterior; el AS-IS no tiene `Admin` y D-010 sigue `NON-COMPLIANT / GAP`. Nada de esto se declara implementado. | OR-B2-001, 008, 009 |
> | §7.1 / §10 — super-administrador de plataforma | Sigue `OPEN DETAIL / FUTURE`. SaaS Admin (C-11): `OPEN OWNER DECISION`. | — |
> | Gobernanza | Precedencia ISS-08 aprobada; los documentos de `00-GOVERNANCE` siguen `PROPOSED` salvo ISS-08. | OR-B2-023 |
> - **Sigue `OPEN`:** ver `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md` §3 (`OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL`, `FUTURE / OPEN`).
> - **Estado:** este documento sigue `DRAFT — NOT APPROVED`. No se redactó la SPEC consolidada. `TECHNICAL SPECIFICATION = NOT APPROVED`. `IMPLEMENTATION = NOT AUTHORIZED`.

## 1. IDENTITY

### 1.1. User
- **Concepto:** `User` es la identidad global y única de una persona en la plataforma Wapsell. Representa a cualquier individuo que interactúa con la plataforma, ya sea como cliente, empleado de un Business, o administrador de la plataforma.
- **Unicidad:** La identidad de `User` es única a nivel de plataforma. *(Dirección: DEC-001:16 — "`User` es una identidad global").* **El mecanismo de unicidad es `OPEN DETAIL` / NOT DECIDED:** DEC-001:55-57 excluye explícitamente el modelo de datos, y `05-ASIS/04-ASIS-IDENTITY.md:68` registra `Usuario.email @unique` como pregunta abierta. La mención original a "email global o ID único" se retira por no tener respaldo.
- **Ciclo de vida:** Incluye registro, autenticación, gestión de perfil, y desactivación/eliminación. Los detalles de cada estado (e.g., activo, inactivo, suspendido) son `OPEN DETAIL`.
- **Estado:** `OPEN DETAIL`.
- **AutenticaciÃ³n:** El `User` se autentica en la plataforma Wapsell, no en un `Business` especÃ­fico. *(D-006 `DERIVED / RECONSTRUCTED`: el texto reconstruido exige validar `User` + `Business` objetivo + `Membership` vÃ¡lido + roles/permisos, y establece que un token vÃ¡lido por sÃ­ solo no autoriza una operaciÃ³n sobre un `Business`. El mecanismo â€”tipos de token, guards, middlewareâ€” es `IMPLEMENTATION DETAIL` / `OPEN`.)*
- **Relación con Membership:** Un `User` puede tener múltiples `Membership`s, cada una asociándolo a un `Business` diferente con un `Role` y `Permissions` específicos. Un `User` NO pertenece exclusivamente a un `Tenant`. *(APROBADO — DEC-001:16-19.)*

### 1.2. AS-IS Identity Context
- **`Usuario` (AS-IS):** En el AS-IS, `Usuario` es una identidad para el panel administrativo, acoplada 1:1 a `Empresa`. `Usuario.email` es globalmente único. (Evidencia: `05-ASIS/04-ASIS-IDENTITY.md`)
- **`Cliente` (AS-IS):** En el AS-IS, `Cliente` es una identidad separada para la tienda online, acoplada 1:1 a `Empresa`. (Evidencia: `05-ASIS/04-ASIS-IDENTITY.md`)
- **Transformación — RESUELTA 2026-09-28 (D-002-bis, `OWNER-VERBATIM`):** ~~El AS-IS de `Usuario` y `Cliente` debe reconciliarse en la nueva identidad `User` global. (D-002)~~ **La fusión queda REFUTADA de forma permanente.** `User` es la identidad global de la plataforma; `Customer` es una entidad **comercial separada** que representa la relación del comprador/cliente con un `Business`. `Customer` **puede** vincularse a un `User` pero **no está obligado** a hacerlo (compradores con y sin login son válidos; coherente con el cliente anónimo de `05-ASIS/07-ASIS-FLOWS.md:39`). **CON-010 CERRADA.** El mecanismo de **migración** AS-IS → TO-BE sigue siendo `OPEN DETAIL` — la decisión aprueba la dirección, no el plan de migración.

## 2. BUSINESS (multi-tenancy)

### 2.1. Business (Concepto Canónico TO-BE) — `APPROVED` (D-001, `OWNER-VERBATIM`)
- **Concepto — `APPROVED DECISION` (D-001, `OWNER-VERBATIM`):** **Business = Tenant. `Empresa` se transforma en `Business` y pasa a ser la unidad de aislamiento multi-tenant.** El término de entidad es **`Business`**; `Tenant` describe la **función de aislamiento multi-tenant**, no el nombre de la entidad. El vocabulario era `OPEN DETAIL`; ya no lo es. **CON-009 CERRADA** (2026-09-28).
- **Identidad:** Cada `Business` tiene una identidad única dentro de la plataforma Wapsell. **`IMPLEMENTATION DETAIL` / `OPEN`** — la decisión no define identificadores, nombres ni claves.
- **Aislamiento:** El aislamiento es **multi-tenant por `Business`**: los datos y recursos comerciales (catálogo, ventas, inventario, `Customer`s, etc.) de un `Business` son inaccesibles desde otros. *(Dirección: D-001 — el `Business` es la unidad de aislamiento multi-tenant. El **mecanismo** concreto —row-level security, filtro obligatorio, esquema por `Business`— es `IMPLEMENTATION DETAIL` / `OPEN`.)*
  - ~~(D-001: Tenant es término canónico, aislamiento lógico)~~ **CORREGIDO 2026-09-28:** la conclusión era correcta pero su atribución era falsa. El término canónico de entidad es `Business` (D-001); `Tenant` nombra la función de aislamiento.
- **Ownership:** `Business` es el propietario conceptual de sus datos comerciales y `Brand`.
- **Relación con Brand:** La `Brand` (identidad comercial visible) pertenece al `Business` y es configurable por él. *(DEC-001:15 — VERIFIED; D-004 — `DERIVED / RECONSTRUCTED`.)*
- **Relación con Membership:** Los `User`s se relacionan con un `Business` a través de `Membership`s, que definen su contexto y autorización dentro de ese `Business`. *(`APPROVED` — D-002, `OWNER-VERBATIM`: `User` global, `Membership` N:N.)*
- **Relación con recursos comerciales:** Todos los recursos comerciales críticos (Products, Orders, Sales, Inventory, `Customer`s, etc.) están asociados a un `Business`. `APPROVED` en dirección (D-001, D-014); el modelo de datos es `OPEN`.

### 2.2. AS-IS Business Context
- **`Empresa` (AS-IS):** En el AS-IS, `Empresa` es la raíz del aislamiento de datos, con una relación 1:N directa y fija con `Usuario`. (Evidencia: `05-ASIS/03-ASIS-DATA.md`, `05-ASIS/04-ASIS-IDENTITY.md`)
- **Transformación - dirección APPROVED, mecanismo OPEN:** El concepto AS-IS Empresa se transforma en TO-BE **Business**. *(D-001, OWNER-VERBATIM: *Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant.* La estrategia concreta de migración y el modelo físico **no están definidos** - IMPLEMENTATION DETAIL.)* **CON-009 CERRADA** solo en el plano terminológico.

## 3. MEMBERSHIP

### 3.1. Membership (Concepto Canónico TO-BE)
- **Concepto:** `Membership` representa la relación N:N entre un `User` y un `Business`. Es el contexto a través del cual un `User` interactúa con un `Tenant` específico.
- **Pertenencia:** Una `Membership` vincula a un `User` con un `Business`.
- **Rol contextual:** Cada `Membership` tiene un `Role` asociado, que define las responsabilidades y capacidades del `User` dentro de ese `Business`.
- **Permisos contextuales:** Los `Permissions` se derivan del `Role` asignado a la `Membership` y son válidos solo en el contexto de ese `Business`.
- **Estado de la relación:** Una `Membership` puede tener un estado (e.g., activa, pendiente, invitada, inactiva). Los detalles de los estados son `OPEN DETAIL`.
- **Autorización dentro del Business:** La autorización para las acciones de un `User` dentro de un `Business` se determina a través de su `Membership` y los `Permissions` asociados a esta.
- **Múltiples Memberships:** Un mismo `User` puede tener múltiples `Membership`s (e.g., ser Owner en Business A y Asistente en Business B). (D-002: N:N User ↔ Tenant mediante Membership).

## 4. ROLES

### 4.1. Role (Concepto Canónico TO-BE)
- **Concepto:** Un `Role` es un conjunto predefinido de `Permissions` que se asigna a un `User` en el contexto de una `Membership` con un `Business`. Define un perfil de acceso y responsabilidad dentro de un `Business`.
- **Finalidad:** Agrupar `Permissions` para simplificar la gestión de la autorización.
- **Alcance:** Los `Role`s son válidos solo dentro del contexto de un `Business` específico (a través de `Membership`). No existen roles comerciales globales asociados únicamente al `User`. (D-005).
- **Relación con Membership:** Un `Role` se asigna a un `User` como parte de su `Membership` con un `Business`. (D-005).
- **Permisos generales:** Un `Role` confiere un conjunto de `Permissions` al `User` a través de la `Membership`.
- **Restricciones conocidas — CORREGIDA (2026-09-28):** ~~La decisión D-009 (Approval Process) establece que un proceso de aprobación flexible se utilizará para algunas operaciones~~ **Retirado por falta de respaldo, y la premisa de retiro también era incorrecta.** D-009 **sí** tiene texto reconstruido (`APPROVED — DERIVED / RECONSTRUCTED`), pero ese texto se refiere a **gobernanza documental** — *"la SPEC es la fuente de verdad del producto; las propuestas deben distinguirse de los requisitos aprobados; toda implementación debe trazarse hasta su requisito, decisión o especificación"* — y **no** define un proceso de aprobación flexible para operaciones. La ficha `D-009-approval-process.md` conserva la pregunta original. Que exista una capa de reglas de negocio además de `Permission` es **TO-BE PROPOSED**; qué operaciones la requieren, quién aprueba y cómo se registra es **`OPEN DETAIL`**. CON-018 **permanece OPEN** — ninguna decisión cubre el alcance de calidad/datos que lo sustente.

### 4.2. AS-IS Roles Context
- **`RolUsuario` (AS-IS):** En el AS-IS, `RolUsuario` es un `enum` vinculado a `Usuario`, donde el rol no autoriza directamente, sino que determina qué legajo pedir. (Evidencia: `05-ASIS/03-ASIS-DATA.md`, `05-ASIS/05-ASIS-AUTHORIZATION.md`).
- **Transformación:** Los roles AS-IS deben transformarse y redefinirse para operar en el contexto de `Membership`. (D-005).

## 5. PERMISSIONS

### 5.1. Permission (Concepto Canónico TO-BE)
- **Concepto:** Una `Permission` representa una capacidad atómica y autorizable dentro de la plataforma Wapsell (e.g., `sales.create`, `inventory.adjust`).
- **Pertenencia:** Los `Permissions` pertenecen al contexto de `Membership`, heredados de los `Role`s asignados a la `Membership`. (D-005).
- **Modelo:** `User → Membership → Business → Role → Permissions`. (D-005).
- **Separación de Role:** Un `Role` agrupa `Permissions`; un `Permission` es la unidad granular de autorización. Esta separación permite flexibilidad para asignar permisos directamente (si es necesario y aprobado) o a través de Roles.
- **Catálogo detallado:** El catálogo completo de `Permissions` (e.g., `catalogo.gestionar`, `ventas.crear`, `inventario.ajustes`) es `OPEN DETAIL` y será objeto de una especificación posterior.

## 6. AUTHORIZATION

### 6.1. Modelo Conceptual de Autorización TO-BE
La autorización en Wapsell sigue un flujo conceptual:

`Request`
  `→ Authenticated User` (Se verifica la identidad del User global)
→ `Business Context` (Se establece el Business activo de la operación)
→ `Membership` (Se resuelve la relación User ↔ Business, que incluye el Role y Permissions)
  `→ Role` (Se identifican los Roles del User para el Business activo)
  `→ Permission` (Se verifican los Permissions asociados al Role en el Membership)
  `→ Business Rule` (Se evalúan reglas de negocio adicionales, como las de aprobación - D-009)
  `→ Action` (La acción es autorizada o rechazada).

### 6.2. Principios de Autorización
- **Autorización estructural:** Basada en `User`, `Business`, `Membership`, `Role` y `Permission`. Esto define quién puede hacer qué en un `Tenant`.
- **AutorizaciÃ³n por regla de negocio:** TO-BE PROPOSED â€” algunas operaciones podrÃ­an requerir aprobaciÃ³n adicional o condiciones especÃ­ficas definidas por reglas de negocio, incluso si el `User` tiene el `Permission` base. **(D-009 `DERIVED / RECONSTRUCTED` â€” NO CUBIERTO: el texto de D-009 trata gobernanza documental â€”la SPEC es fuente de verdad, propuestas vs requisitos aprobados, trazabilidadâ€”, no un proceso de aprobaciÃ³n por operaciÃ³n. `OPEN DETAIL`.)**
- **Autorización especial/aprobación:** Ciertas operaciones críticas (e.g., arqueo de caja con diferencia) pueden requerir una aprobación explícita de otro `User` con el `Permission` adecuado, sin auto-autorización. Los detalles son `OPEN DETAIL`.
- **No sobreinterpretación de Permisos:** Tener un `Permission` no implica automáticamente autorización para todas las operaciones si una regla de negocio (D-009) o una `Security Boundary` (Sección 10) impone una restricción adicional.

## 7. BUSINESS CONTEXT

### 7.1. Determinación Conceptual del Business Activo
El sistema debe determinar de forma segura y fiable el `Business` activo (`Business Context`) en cada operación para un `Authenticated User`. Este `Business Context` se deriva siempre de la `Membership` del `User`.

### 7.2. Principios del Business Context
- **No confiar en entrada del cliente:** El `tenantId` (o equivalente) enviado por el cliente NO debe ser la única fuente para determinar el `Business Context`. Siempre debe validarse contra la(s) `Membership`(s) del `Authenticated User`.
- **Validar Membership:** El `User` debe tener una `Membership` activa con el `Business` al que intenta acceder.
- **Validar Permissions:** Los `Permissions` asociados a la `Membership` se aplican para las acciones dentro del `Business Context`.
- **Aislar consultas y mutaciones:** Todas las operaciones de datos (consultas y mutaciones) deben estar intrínsecamente ligadas al `Business Context` activo del `User` para prevenir el acceso o la modificación de datos de otros `Business` (`cross-tenant access`). (Evidencia: `05-ASIS/03-ASIS-DATA.md` - `empresaId` en casi todos los modelos).
- **Impedir Cross-Business Access:** El acceso a datos o funcionalidades de un `Business` diferente al del `Business Context` activo está estrictamente prohibido a menos que haya un `Membership` explícito y los `Permissions` adecuados (e.g., para un `User` super-administrador de plataforma, que es `OPEN DETAIL / FUTURE`).

## 8. AUTHENTICATION

### 8.1. Modelo Conceptual de Autenticación TO-BE
La autenticación es el proceso de verificar la identidad de un `User` global en Wapsell.

- **Mecanismos:** Se soportarán mecanismos de autenticación basados en credenciales (e.g., email y contraseña) y proveedores de identidad externos (e.g., Google OAuth 2.0). (D-006: Identidad global User; AS-IS ya soporta Google OAuth).
- **Ciclo de vida:** Incluye registro, login, recuperación de contraseña, cierre de sesión.
- **2FA/MFA:** `OPEN DETAIL / FUTURE`. (No aprobado en las decisiones actuales).

### 8.2. AS-IS Authentication Context
- **Mecanismos AS-IS:** El AS-IS soporta login por password (bcrypt) y Google OAuth 2.0 para `Usuario` y `Cliente` por separado, con discriminación por campo `type` en el JWT. (Evidencia: `05-ASIS/04-ASIS-IDENTITY.md`).
- **Transformación:** El TO-BE consolidará estos mecanismos bajo la identidad `User` global. (D-002, D-006).

## 9. SESSION / TOKEN

### 9.1. Modelo Conceptual de Sesión y Token TO-BE
- **Identidad:** El token debe representar la identidad del `User` global. (D-006).
- **Sesión:** La sesión del `User` es gestionada a nivel de plataforma.
- **Contexto Business:** El token debe incluir (o permitir derivar de forma segura) el `Business Context` activo y la `Membership` asociada, que a su vez contiene el `Role` y `Permissions`. (D-006: El contexto debe permitir resolver User + Tenant + Membership + Role + Permissions).
- **Claims:** Los claims del token deben ser mínimos, seguros y necesarios para la autenticación y la resolución del `Business Context` y `Membership`. No se deben incluir todos los `Permissions` explícitamente en el token, sino que deben resolverse dinámicamente en el backend. Los detalles del formato JWT (o token equivalente) son `OPEN DETAIL`.
- **Autorización:** El token se utiliza para autenticar al `User` y proporcionar el `Business Context` y la `Membership` necesaria para el proceso de autorización. No es un token conceptualmente independiente para cada Tenant. (D-006).

### 9.2. AS-IS Session/Token Context
- **Formato AS-IS:** El AS-IS utiliza JWTs con un campo `type` (usuario/cliente) para discriminar identidades separadas, y permisos granulares en una tabla `Permiso`/`UsuarioPermiso`. (Evidencia: `05-ASIS/04-ASIS-IDENTITY.md`, `05-ASIS/05-ASIS-AUTHORIZATION.md`)
- **Reutilización:** El formato JWT actual puede ser reutilizado, adaptando los claims para reflejar el `User` global y la `Membership` en lugar de `Usuario`/`Cliente` separados. La estrategia de adaptación es `OPEN DETAIL`.

## 10. SECURITY BOUNDARIES

### 10.1. Fronteras de Seguridad Conceptuales TO-BE
- **User boundary:** La identidad del `User` (e.g., email) es propiedad de la plataforma Wapsell y es globalmente única. (D-002).
- **Business boundary:** Los datos comerciales y la configuración (`Brand`) son propiedad del `Business` y están aislados lógicamente entre `Business`. (`Business Context` garantiza esto). (D-001, D-004).
- **Membership boundary:** La autorización de un `User` dentro de un `Business` está estrictamente determinada por su `Membership` (que incluye el `Role` y `Permissions`). Un `User` no tiene derechos por defecto sobre un `Tenant` sin una `Membership` explícita.
- **Domain boundary:** Cada módulo o dominio funcional debe validar el `Business Context` y la autorización (`Membership`/`Role`/`Permissions`) antes de ejecutar cualquier operación, garantizando que un `User` solo acceda a los datos y funcionalidades permitidos dentro de su `Business` activo.

```text
Platform (Wapsell Global Identity Layer)
  │
  ├── User (Global Unique Identity)
  │     │
│     ├── Membership (User ↔ Business N:N)
  │     │     ├── Role (e.g., OWNER, ASISTENTE, VENDEDOR)
  │     │     └── Permissions (Derived from Role within Membership)
  │     │
  │     ├── Business A
  │     │     └── Resources (Catalog, Sales, Inventory, etc.)
  │     │
  │     └── Business B
  │           └── Resources (Catalog, Sales, Inventory, etc.)
  │
  └── Other Global Platform Services (e.g., Billing, Onboarding - OPEN DETAIL)
```

## POST-OR-B3 — OWNER RULINGS SUPERSEDING HISTORICAL OPEN ITEMS

Este bloque tiene autoridad posterior sobre cualquier formulación anterior de esta SPEC que contradiga OR-B3.

1. **Customer ↔ User:** asociación opcional y controlada; el sistema puede detectar/proponer coincidencias, pero no vincula automáticamente solo por email sin el control/confirmación aplicable.
2. **SaaS Admin:** existe conceptualmente a nivel plataforma, fuera del MVP operativo.
3. **Locations:** concepto genérico, MAIN mínimo y múltiples Locations permitidas; no se crean Branch/Warehouse como conceptos separados por este ruling.
4. **Roles MVP:** Owner, Admin, Vendedor y Gestor de Stock. Customer/Supplier no son Membership Roles; Repartidor sigue futuro/open.
5. **Authorization:** Membership → Role → Permission. No se autoriza Profile/Capability/Overrides en MVP.
6. **MFA/2FA:** obligatorio para Owner y Admin; mecanismo técnico de seguridad permanece abierto.
7. **Business Switch:** múltiples Memberships y cambio de Business siguen conceptualmente aprobados; mecanismo técnico continúa abierto.

**Estado:** DRAFT — NOT APPROVED. `TECHNICAL SPECIFICATION = NOT APPROVED`; `IMPLEMENTATION = NOT AUTHORIZED`.
