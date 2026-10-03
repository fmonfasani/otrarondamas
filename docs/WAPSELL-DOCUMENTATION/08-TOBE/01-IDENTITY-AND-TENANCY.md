# Wapsell — Identity & Tenancy (TO-BE)
**Fase:** 6.0 — TO-BE Foundation · **Creado:** 2026-09-28 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> - **D-001, D-002, D-002-bis → `APPROVED — OWNER-VERBATIM`.** Citable como texto aprobado
>   (`04-DECISIONS/00-DECISION-REGISTER.md` §4, filas D-001/D-002/D-002-bis).
> - **D-005, D-006 → `APPROVED — DERIVED / RECONSTRUCTED`.** Usable como requisito, **no** citable como
>   texto aprobado hasta que el Owner confirme la redacción.
> - **DEC-001 → `APPROVED DIRECTION`.** Único texto redactado originalmente; excluye explícitamente el
>   modelo de datos, el plan de migración y el diseño de token (`04-DECISIONS/02-MULTITENANCY.md:55-57`).
> - **`IMPLEMENTATION DETAIL` = `OPEN` en todo el documento.** Ninguna sección aquí autoriza schema,
>   nombres de identificadores, diseño de token ni plan de migración.
> - **`Business`** es el término canónico de entidad; `Tenant` nombra la función de aislamiento
>   multi-tenant, no la entidad (D-001 `OWNER-VERBATIM`; §Terminology authority de la SPEC).
>
> - **Trazabilidad de rulings (R1, 2026-09-30 — nota aditiva; el texto de este documento no se modificó):**
>   - **Source / Authority:** `04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md` — OR-001, `CLOSED`
>     2026-09-28: `Empresa` → `Business` (P1-A), convivencia temporal (P2-C), continuidad sin downtime en
>     Ventas, Caja, Catálogo, Compras, Tienda Online, Auth y Datos históricos (P3), `"Roonda"` →
>     `"Otra Ronda Más"` (P4), documentar antes de implementar (P5-B). `IMPLEMENTATION DETAIL` de D-001 =
>     `SPECIFICATION REQUIRED`.
>   - **Source / Authority:** `04-DECISIONS/15-OR-002-A-OWNER-RULING.md` — OR-002-A, `CLOSED` 2026-09-28:
>     `CON-010` `RESOLVED` en dirección conceptual (`User` global → `Membership` N:N → `Business`;
>     `Customer` independiente, vínculo opcional a `User`). Autoridad: D-002 + D-002-bis.
>   - Ninguno de los dos rulings autoriza implementación física ni decide modelo físico, mecanismo de
>     compatibilidad, fin de la coexistencia, rollback, token/guards ni catálogo de roles. `OR-002-B…F`
>     siguen sin ruling primario y no se propagan aquí. *(Superado por la nota R3 siguiente; se conserva como evidencia histórica de R1.)*
> - **Propagación R3 (2026-09-30 — nota aditiva; ninguna línea anterior fue borrada):**
>   **Source / Authority:** `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` §1 y
>   `04-DECISIONS/00-DECISION-REGISTER.md` §8. El Owner confirmó el 2026-09-30, a nivel **conceptual**:
>   - **OR-002-B:** la transición de identidad es incremental, con coexistencia temporal y acotada de ambos
>     modelos, compatible con OR-001 P2-C; no hay coexistencia prolongada ni permanente.
>   - **OR-002-C:** `User` es una identidad global con email único a nivel global.
>   - **OR-002-D:** `Usuario` pasa a `User` más `Membership`; `Cliente` pasa a `Customer`, independiente de
>     `User`, con vínculo opcional. **No** se define "mismo email = misma persona": el criterio de vinculación
>     `Customer` ↔ `User` sigue `OPEN`.
>   - **OR-002-E:** durante la transición hay compatibilidad temporal de sesiones y tokens legacy (respetando la
>     continuidad de Auth de OR-001 P3); al finalizar se invalidan las sesiones y se requiere un nuevo login.
>     Sin mecanismo técnico definido.
>   - **OR-002-F / P5-B:** `especificación técnica → aprobación del Owner → implementación`.
>   - **P1-A (opción C):** `Empresa` → `Business` como destino final, tanto documental/conceptual como persistente.
>   - Siguen `OPEN`: normalización de email, duplicados, constraint, diseño de token, duración, criterio de fin de
>     la transición, modelo físico, migración, rollback y cutover. Especificación técnica = `NOT APPROVED`;
>     implementación = `NOT AUTHORIZED`. Sin tokens, guards, tablas ni endpoints definidos aquí.
>
> Este documento es **TO-BE conceptual**. No produce schema, contratos, invariantes, tests ni plan. Es
> el escalón TO-BE de la cadena `REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS →
> PLAN → IMPLEMENTATION`.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Resoluciones de conflicto: 0.**

---

## 0. Alcance

Cubre los conceptos de **identidad, tenencia, pertenencia y autorización** del TO-BE de Wapsell:
`User`, `Business`, `Membership`, `Role`, `Permission`, `Customer`, `Business Context`,
`Authentication`, `Session/Token` y las fronteras de seguridad. La definición canónica de estos
conceptos reside en `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`; este documento es su
expresión TO-BE y su reconciliación explícita con el AS-IS.

Fuera de alcance: modelo de datos físico, migraciones, contratos, invariantes, plan e
implementación.

---

## 1. Modelo conceptual

Seis conceptos gobiernan la capa de identidad. La columna *Autoridad* es la clave de lectura de todo
el documento.

| Concepto | Naturaleza | Relación esencial | Autoridad |
|---|---|---|---|
| **User** | Identidad **global** y única de una persona en la plataforma | Raíz de identidad; puede tener muchas `Membership` | **D-002** `OWNER-VERBATIM`; `DEC-001:16` |
| **Business** | Unidad canónica de negocio y **aislamiento** multi-tenant | Propietario de datos comerciales y `Brand`; no "contiene" un User | **D-001** `OWNER-VERBATIM`; `DEC-001:13-14` |
| **Membership** | Relación **N:N** User ↔ Business | Es el contexto de autorización; porta `Role`/`Permission` | **D-002** `OWNER-VERBATIM`; `DEC-001:18-19` |
| **Role** | Conjunto de permisos en el contexto de una `Membership` | Se asigna a un User **por Business**, nunca global | **D-005** `DERIVED` |
| **Permission** | Capacidad atómica autorizable | Se hereda del `Role` dentro de la `Membership` | **D-005** `DERIVED` |
| **Customer** | Relación **comercial** comprador ↔ Business | **NO** es un `User`; vínculo opcional a `User` | **D-002-bis** `OWNER-VERBATIM` |

Diagrama canónico (SPEC §10, `:180-196`):

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

---

## 2. Business (tenancy)

### 2.1 Concepto — `APPROVED` (D-001, `OWNER-VERBATIM`)

> **"Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento
> multi-tenant."** — D-001

- El término de entidad es **`Business`**; `Tenant` describe la **función de aislamiento**
  multi-tenant, no el nombre de la entidad. **CON-009 CERRADA** (2026-09-28), plano terminológico.
- **Aislamiento:** los datos y recursos comerciales (catálogo, ventas, inventario, `Customer`s, etc.)
  de un `Business` son inaccesibles desde otros. El **mecanismo** (row-level security, filtro
  obligatorio, esquema por Business, u otro) es `IMPLEMENTATION DETAIL` / `OPEN` — D-001 no lo decide.
- **Ownership:** `Business` es el propietario conceptual de sus datos comerciales y de su `Brand`.
- **Identidad:** cada `Business` tiene identidad única dentro de la plataforma; identificadores,
  nombres y claves son `IMPLEMENTATION DETAIL` / `OPEN`.
- **Recursos:** todos los recursos comerciales críticos (Products, Orders, Sales, Inventory,
  `Customer`s) están asociados a un `Business` — dirección aprobada (D-001, D-014); el modelo de datos
  es `OPEN`.
- **Inventory:** pertenece exclusivamente a cada `Business`; sin stock global compartido; sin
  transferencia inter-Business salvo especificación posterior explícita (D-014 `OWNER-RULED`).

### 2.2 AS-IS → Business

`Empresa` (AS-IS) → `Business` (TO-BE): dirección **APROVED** (D-001); estrategia concreta de
migración y modelo físico `OPEN`. Detalle en §11.

---

## 3. User (identidad global)

### 3.1 Concepto — `APPROVED` (D-002, `OWNER-VERBATIM`)

- `User` es la identidad **global** de una persona en Wapsell: cliente, empleado de un Business o
  administrador de plataforma. — `DEC-001:16`
- **Unicidad:** la identidad es única a nivel de plataforma. El **mecanismo de unicidad** (email
  global, ID único, u otro) es **`OPEN DETAIL` / NOT DECIDED**: DEC-001:55-57 excluye el modelo de
  datos y `05-ASIS/04-ASIS-IDENTITY.md:68` registra `Usuario.email @unique` como pregunta abierta. La
  mención heredada a "email global o ID único" **se retira** por no tener respaldo.
- **Autenticación:** el `User` se autentica en la plataforma, **no** en un `Business` específico
  (D-006; mecanismo `OPEN`).
- **Ciclo de vida:** registro, autenticación, perfil, desactivación/eliminación. Estados concretos
  (activo, inactivo, suspendido) = `OPEN DETAIL`.
- **Relación:** un `User` puede tener múltiples `Membership`, una por `Business` (D-002). No pertenece
  exclusivamente a un `Business`.

### 3.2 AS-IS → User

`Usuario` (AS-IS, acoplado 1:1 a `Empresa`) → `User` (TO-BE, identidad global reutilizable): dirección
**APPROVED** (D-002); la **fusión con `Cliente` queda refutada** por D-002-bis (ver §9 y §11). El
mecanismo de migración es `OPEN DETAIL`.

---

## 4. Membership (pertenencia)

### 4.1 Concepto — `APPROVED` (D-002, `OWNER-VERBATIM`)

- `Membership` es la relación **N:N** entre un `User` y un `Business`. Es el contexto a través del cual
  un `User` interactúa con un `Business` específico. — D-002; `DEC-001:18-19`
- **Rol contextual:** cada `Membership` tiene un `Role` asociado, que define las responsabilidades y
  capacidades del `User` **dentro de ese** `Business`.
- **Permisos contextuales:** los `Permission` se derivan del `Role` de la `Membership` y son válidos
  **solo** en el contexto de ese `Business`.
- **Estado de la relación:** una `Membership` puede tener estado (activa, pendiente, invitada,
  inactiva). Los estados concretos y su ciclo = `OPEN DETAIL`.
- **Múltiples Memberships:** un mismo `User` puede ser Owner en un Business y Asistente en otro
  (D-002).

### 4.2 Función de `Membership` en la capa de identidad

La `Membership` es el **único** puente legítimo entre un `User` y un `Business`. No existe derecho por
defecto: sin `Membership` explícita y activa, un `User` no tiene acceso a un `Business` (SPEC §10,
`:177`).

---

## 5. Role

### 5.1 Concepto — `APPROVED` (D-005, `DERIVED`)

- Un `Role` es un conjunto predefinido de `Permission` que se asigna a un `User` **en el contexto de
  una `Membership`** con un `Business`. Define un perfil de acceso y responsabilidad dentro de ese
  `Business`.
- **Alcance:** los `Role` son válidos **solo** dentro del contexto de un `Business` específico (vía
  `Membership`). No existen roles comerciales globales asociados únicamente al `User` (D-005;
  `DEC-001:18-19`).
- **Finalidad:** agrupar `Permission` para simplificar la gestión de la autorización.
- **Catálogo definitivo** de roles, su lifecycle y su administración = `OPEN DETAIL` (D-005).
- **Reglas de negocio adicionales** (capas de aprobación más allá del `Permission`) =
  `TO-BE PROPOSED` / `OPEN DETAIL`. El texto de D-009 trata **gobernanza documental**, no un proceso de
  aprobación por operación; **CON-018 OPEN** (SPEC §4.1, `:99`; §6.2, `:130`).

### 5.2 AS-IS → Role

`RolUsuario` (AS-IS: `enum` vinculado a `Usuario` que **no autoriza**, solo determina qué legajo
pedir) → `Role` contextual de `Membership` (TO-BE). Los roles AS-IS deben transformarse para operar
en contexto de `Membership` (D-005). Detalle en §11.

---

## 6. Permission

### 6.1 Concepto — `APPROVED` (D-005, `DERIVED`)

- Una `Permission` es una capacidad **atómica y autorizable** dentro de la plataforma (p.ej.
  `sales.create`, `inventory.adjust`).
- **Pertenencia:** las `Permission` pertenecen al contexto de `Membership`, heredadas de los `Role`
  asignados a esa `Membership` (D-005).
- **Modelo:** `User → Membership → Business → Role → Permissions` (D-005).
- **Separación Role/Permission:** un `Role` agrupa `Permission`; una `Permission` es la unidad granular
  de autorización. La asignación directa de permisos (si llegara a aprobarse) permanece
  `IMPLEMENTATION DETAIL`.
- **Catálogo completo** de `Permission` (p.ej. `catalogo.gestionar`, `ventas.crear`,
  `inventario.ajustes`) = `OPEN DETAIL`, objeto de especificación posterior.

---

## 7. Customer (relación comercial, no identidad)

### 7.1 Concepto — `APPROVED` (D-002-bis, `OWNER-VERBATIM`)

> **"`Customer` NO se fusiona con `User`. `Customer` representa la relación comercial del
> comprador/cliente con un `Business`. Puede vincularse opcionalmente a un `User`, sin exigir uno.
> Pertenece al contexto de un `Business` y puede incluir compras, pedidos, historial, cuenta
> corriente/deuda cuando aplique, condiciones comerciales y demás datos de Commerce."** — D-002-bis

- `Customer` es una entidad **comercial separada** de la identidad de plataforma. **CON-010 CERRADA**
  (2026-09-28): la fusión `Usuario`+`Cliente` → `User` queda **refutada de forma permanente**.
- **Source / Authority (R1, nota aditiva):** OR-002-A (`04-DECISIONS/15-OR-002-A-OWNER-RULING.md`,
  `CLOSED` 2026-09-28) confirma la dirección conceptual; autoridad D-002 + D-002-bis. No autoriza
  implementación física.
- **Source / Authority (R3, nota aditiva):** OR-002-D (Owner, 2026-09-30; `04-DECISIONS/18-…`): `Cliente` pasa
  a `Customer`, independiente de `User`, con vínculo opcional. El criterio de vinculación (incluido "mismo
  email") **no** está decidido y sigue `OPEN`; no se define "mismo email = misma persona".
- **Vínculo opcional:** un `Customer` **puede** vincularse a un `User`, sin exigirlo. Compradores con
  y sin login son válidos — coherente con el alta minorista autoservicio de `Cliente`
  (`POST /auth/cliente/registro`) de `05-ASIS/07-ASIS-FLOWS.md:38-40`, que no requiere una identidad
  de `Usuario`.
- **Scoping:** pertenece al contexto de un `Business`.
- **Lifecycle** de `Customer` y modelado del vínculo con `User` = `OPEN DETAIL` (D-002-bis).

### 7.2 Distinción User ↔ Customer

| | **User** | **Customer** |
|---|---|---|
| Naturaleza | Identidad de plataforma | Relación comercial |
| Ámbito | Global | Por `Business` |
| ¿Accede al panel? | Sí (vía `Membership`) | No por definición; es un cliente del negocio |
| ¿Fusión? | — | **NO** se fusiona con `User` (D-002-bis) |
| Vínculo | — | Vínculo **opcional** a `User` |

---

## 8. Authorization

### 8.1 Flujo conceptual — dirección `DERIVED / RECONSTRUCTED`

El flujo siguiente es la construcción de la SPEC canónica (SPEC §6.1, `:117-126`), que es
`DRAFT — NOT APPROVED`. Los pasos 1–5 **corresponden a requisitos aprobados** (D-005, D-006); el paso
`Business Rule` no está respaldado por ninguna decisión.

`Request`
  `→ Authenticated User` (se verifica la identidad del User global)
  → `Business Context` (se establece el Business activo de la operación)
  → `Membership` (se resuelve la relación User ↔ Business, con su Role y Permissions)
  → `Role` (se identifican los Roles del User para el Business activo)
  → `Permission` (se verifican los Permissions asociados al Role en la Membership)
  → `Business Rule` (reglas de negocio adicionales — `TO-BE PROPOSED`, §8.3)
  → `Action` (la acción se autoriza o se rechaza)

### 8.2 Las cuatro validaciones obligatorias — `APPROVED` (D-006, `DERIVED`)

> "Todo acceso autenticado debe validarse mediante: (1) identidad global User; (2) Business objetivo;
> (3) Membership válido; (4) roles y permisos necesarios. **Un token válido por sí solo no autoriza**
> una operación sobre un Business." — D-006

Estas cuatro validaciones son **requisito aprobado**. Su mecanismo (tipos de token, guards,
middleware/interceptors, errores, sesión) es `IMPLEMENTATION DETAIL` / `OPEN`.

### 8.3 Principios de autorización

- **Autorización estructural:** basada en `User`, `Business`, `Membership`, `Role` y `Permission`
  (§8.1). Define quién puede hacer qué en un `Business`.
- **Autorización por regla de negocio:** `TO-BE PROPOSED` / `OPEN` — algunas operaciones podrían
  requerir aprobación adicional o condiciones específicas, incluso con el `Permission` base. El texto
  de D-009 es de gobernanza documental, no un proceso de aprobación por operación; **CON-018 OPEN**
  (SPEC §6.2, `:130`).
- **Autorización especial/aprobación:** ciertas operaciones críticas (p.ej., arqueo de caja con
  diferencia) pueden requerir aprobación explícita de otro `User` con el `Permission` adecuado, sin
  auto-autorización. Detalles = `OPEN DETAIL` (SPEC §6.2, `:131`).
- **No sobreinterpretación de permisos:** tener un `Permission` no autoriza automáticamente toda
  operación si una regla de negocio o una frontera de seguridad (§10) impone una restricción
  adicional.

---

## 9. Business Context

### 9.1 Determinación conceptual

El sistema debe determinar de forma segura el `Business` activo (**Business Context**) en cada
operación para un `Authenticated User`. Este contexto **se deriva siempre de la `Membership`** del
`User`.

### 9.2 Principios — `APPROVED` en dirección

- **No confiar en entrada del cliente:** el `tenantId` (o equivalente) enviado por el cliente **no**
  debe ser la única fuente del `Business Context`; siempre se valida contra la(s) `Membership` del
  `Authenticated User`.
- **Validar Membership:** el `User` debe tener una `Membership` **activa** con el `Business` al que
  intenta acceder.
- **Validar permisos:** los `Permission` de la `Membership` se aplican a las acciones dentro del
  contexto activo.
- **Aislar consultas y mutaciones:** toda operación de datos (lectura y escritura) está intrínsecamente
  ligada al `Business Context` activo, para prevenir acceso o modificación de datos de otros
  `Business` (`cross-tenant access`).
- **Impedir cross-Business access:** acceder a datos o funcionalidades de un `Business` distinto al
  activo está **estrictamente prohibido** salvo `Membership` explícita y `Permission` adecuados. El
  caso del `User` superadministrador de plataforma es `OPEN DETAIL / FUTURE`; el AS-IS no tiene
  superadmin.

---

## 10. Authentication, Session/Token y fronteras de seguridad

### 10.1 Authentication — `APPROVED` en dirección (D-006 `DERIVED`)

Autenticación = verificar la identidad del `User` global. Mecanismos: credenciales (email + contraseña)
y proveedores externos (p.ej. Google OAuth 2.0, ya soportado en AS-IS). Ciclo de vida: registro, login,
recuperación de contraseña, cierre de sesión. **2FA/MFA = `OPEN DETAIL` / FUTURE** (no aprobado).

### 10.2 Session/Token — dirección `APPROVED` (D-006 `DERIVED`), diseño `OPEN`

- **Identidad:** el token representa la identidad del `User` global (D-006).
- **Sesión:** gestionada a nivel de **plataforma**, no por `Business`.
- **Contexto Business:** el token debe incluir (o permitir derivar de forma segura) el `Business
  Context` activo y la `Membership` asociada, que a su vez contiene `Role` y `Permission` (D-006).
- **Claims mínimos:** los claims deben ser mínimos, seguros y necesarios para autenticación y
  resolución de contexto. **No** incluir todos los `Permission` explícitamente en el token; se
  resuelven dinámicamente en el backend.
- **No es un token por `Tenant`:** el token autentica al `User` y provee el contexto necesario para
  autorizar; no es conceptualmente un token independiente por cada `Business` (D-006).
- **Formato JWT** (o equivalente), diseño de claims, ciclo de vida y revocación = `OPEN DETAIL`.

### 10.3 Security Boundaries — `APPROVED` en dirección (D-001, D-002, D-004, D-005 `DERIVED`)

| Frontera | Regla |
|---|---|
| **User** | La identidad del `User` es propiedad de la plataforma y **única a nivel de plataforma** (`DEC-001:16`). *Nota:* la SPEC §10.1 lo formula como "p.ej. email … globalmente única (D-002)", pero el texto de D-002 **no** decide el mecanismo de unicidad (§3.1). Se conserva aquí solo la unicidad, que es lo aprobado; **cómo** se garantiza es `OPEN DETAIL`. |
| **Business** | Datos comerciales y configuración (`Brand`) son propiedad del `Business` y están aislados entre `Business` (D-001, D-004). |
| **Membership** | La autorización de un `User` dentro de un `Business` la determina **estrictamente** su `Membership` (Role + Permission). Sin `Membership` explícita no hay derechos (D-005). |
| **Domain** | Cada módulo/dominio debe validar el `Business Context` y la autorización antes de ejecutar cualquier operación (D-006). |

---

## 11. Tenant Isolation

**`Tenant` no es una entidad: es la función de aislamiento.** La entidad se llama `Business`
(D-001 `OWNER-VERBATIM`). Esta sección aísla el concepto para que aislamiento y entidad no se
confudan al leer el código o escribir los contratos de una fase posterior.

### 11.1 Principio — `APPROVED` (D-001, `OWNER-VERBATIM`)

> **"Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento
> multi-tenant."** — D-001

- El aislamiento es **multi-tenant por `Business`**: los datos y recursos comerciales de un `Business`
  (catálogo, ventas, inventario, `Customer`s, etc.) son **inaccesibles desde otros**.
- `Business` es propietario conceptual de sus datos comerciales y de su `Brand`.
- **Inventario:** pertenece exclusivamente a cada `Business`; no existe stock global compartido; no se
  permite transferencia de stock entre Business salvo especificación posterior explícita
  (D-014 `OWNER-RULED`).
- **Mecanismo de aislamiento: `IMPLEMENTATION DETAIL` / `OPEN`.** D-001 **no** decide si es *row-level
  security*, filtro obligatorio, esquema por `Business` u otro. Este es un `OPEN DETAIL` explícito.

### 11.2 Aislamiento de operaciones — dirección `DERIVED` (D-006)

- Toda lectura y toda mutación debe quedar **ligada al `Business Context` activo**, para prevenir
  `cross-tenant access` (SPEC §7.2).
- El `Business Context` **se deriva siempre de la `Membership`**, nunca del valor enviado por el
  cliente (SPEC §7.2, D-006).
- El acceso a un `Business` distinto al activo está **estrictamente prohibido** salvo `Membership`
  explícita y `Permission` adecuados. El caso del superadministrador de plataforma es
  `OPEN DETAIL / FUTURE`; el AS-IS **no tiene** superadmin.
- Cada dominio debe validar `Business Context` + autorización antes de ejecutar (frontera *Domain*,
  SPEC §10.1).

### 11.3 AS-IS del aislamiento — evidencia, no requisito

`EmpresaScopedPrismaService` + Prisma Client Extension inyectan/filtra `empresaId` para un conjunto
fijo de modelos. **Limitación documentada en el propio código**: `groupBy`, `upsert` y `$executeRaw`
**no pasan por la extensión** y deben manejarse a mano; ya se corrigieron al menos 2 gaps reales de
scope durante el desarrollo. Detalle en `05-ASIS/05-ASIS-AUTHORIZATION.md:17-25`.

Esto es **evidencia AS-IS**. No es el mecanismo TO-BE, y su limitación es **razón suficiente** para no
asumir que el aislamiento del TO-BE está resuelto aunque D-001 esté aprobada.

---

## 12. AS-IS → TO-BE → GAP → Decision → OPEN DETAIL

Cadena completa de reconciliación. Cada fila declara el hecho AS-IS verificado, el estado objetivo,
**el gap que separa ambos**, la decisión que gobierna la dirección, y el `OPEN DETAIL` que impide
cerrarlo.

| # | AS-IS (verificado) | TO-BE | GAP | Decision | OPEN DETAIL |
|---|---|---|---|---|---|
| 1 | `Empresa` = raíz de aislamiento con relación 1:N fija a `Usuario` | `Business` = unidad de aislamiento multi-tenant | El aislamiento real es por `Empresa`, no por `Business`; no hay `Tenant` | **D-001** `OWNER-VERBATIM` | Modelo físico de `Business`; `Empresa` → `Business` |
| 2 | `Usuario` acoplado 1:1 a `Empresa` (`empresaId` escalar obligatorio) | `User` global con `Membership` N:N | Una persona **no puede** operar en dos negocios: la pertenencia es fija | **D-002** `OWNER-VERBATIM` | Modelo físico de `Membership`; migración `Usuario`→`User` |
| 3 | `Usuario.email` `@unique` global | Unicidad de `User` a nivel de plataforma | Parcialmente compatible: la unicidad ya es global, la pertenencia no | **D-002** | Mecanismo de unicidad (email, ID, otro) |
| 4 | **Ausencia total** de `Business` / `Tenant` / `Membership` en el código | `Business` + `Membership` | Los tres conceptos **no existen**; doble lectura de código lo confirma (SRC-011 + propia) | **D-001**, **D-002** | Modelo físico de ambos; compatibilidad con código existente |
| 5 | `RolUsuario` = `enum` que **no autoriza**; solo determina qué legajo pedir | `Role` contextual de `Membership`, que autoriza vía `Permission` | El rol AS-IS es un dato administrativo, **no** un mecanismo de acceso | **D-005** `DERIVED` | Roles y permisos concretos; lifecycle; administración |
| 6 | `Permiso`/`UsuarioPermiso` granular, **independiente** del `RolUsuario` | `Permission` heredada del `Role` **dentro** de la `Membership` | Hoy los permisos no dependen de ningún contexto de negocio | **D-005** `DERIVED` | Roles y permisos concretos; lifecycle |
| 7 | Aislamiento por extensión Prisma con límites (`groupBy`/`upsert`/`$executeRaw` la evaden) | Aislamiento por `Business` en toda operación | El aislamiento **depende de que cada consulta use la extensión**; hay fugas | **D-001**, **D-006** | Tenant context técnico; mecanismo de aislamiento |
| 8 | Guards `JwtAuthGuard`, `PermissionsGuard`, `LegajoAprobadoGuard` | 4 validaciones: User + Business + Membership + Role/Permission | No hay validación de `Membership` ni de `Business Context` porque no existen | **D-006** `DERIVED` | Guards, middleware/interceptors, errores, sesión |
| 9 | JWT con campo `type` (`usuario`/`cliente`) discrimina dos identidades separadas | Identidad `User` global única | Dos identidades para la misma persona según el canal | **D-002**, **D-002-bis** | Token claims; formato; ciclo de vida; revocación |
| 10 | `Cliente` = entidad separada acoplada 1:1 a `Empresa` | `Customer` = relación comercial por `Business`, vínculo **opcional** a `User` | Hoy no hay forma de expresar "comprador sin cuenta" ni "comprador con dos negocios" | **D-002-bis** `OWNER-VERBATIM` | Vínculo `Customer` ↔ `User`; lifecycle de `Customer` |
| 11 | Autorización por excepción con login del autorizador, **nunca a sí mismo** | Posible requisito equivalente de no auto-autorización | El AS-IS lo resuelve en código para excepciones; el TO-BE no lo tiene decidido | **D-006** `DERIVED` (parcial); SPEC §6.2 | Reglas de aprobación por operación; **CON-018 OPEN** |
| 12 | Google OAuth auto-alta ligado a `GOOGLE_SIGNUP_EMPRESA_ID` fijo | Onboarding bajo `User` global con `Membership` | El alta automática asume **una** empresa fija por variable de entorno | **D-006** | Onboarding de `Business` y registro de `User` |
| 13 | Sin `Business Context`: el `empresaId` viene del modelo, no de un contexto de sesión | `Business Context` derivado **siempre** de la `Membership` | No existe el concepto de contexto activo | **D-006** `DERIVED` | Tenant context técnico; resolución y aislamiento de queries/mutaciones |
| 14 | No hay superadmin ni administración de negocios | `Business` como unidad gestionable | `Empresa` solo se crea por `seed.ts`, sin operaciones propias de Prisma | **D-001** | Rol de plataforma / superadministración transversal |

**Los 14 gaps quedan declarados. Ninguno se resuelve en este documento y ninguno recibe plan de
corrección.** Los gaps de D-010 (integridad transaccional del stock) viven en
`07-TOBE/00-TOBE-OVERVIEW.md` §8 y en la auditoría; no son gaps de identidad.

---

## 13. Open Details

Ninguno de estos está decidido; ninguno se resuelve en este documento.

| # | Open Detail | Autoridad / nota |
|---|---|---|
| 1 | **Modelo físico** de `Business` y `Membership` | D-001/D-002 `IMPLEMENTATION DETAIL`; DEC-001:55-57 lo excluye |
| 2 | **Mecanismo de unicidad** de `User` (email global, ID, otro) | `05-ASIS/04-ASIS-IDENTITY.md:68` |
| 3 | **Ciclo de vida** de `User` (estados: activo, inactivo, suspendido) | SPEC §1.1 `:54-55` |
| 4 | **Ciclo de vida y estados** de `Membership` (activa/pendiente/invitada/inactiva) | SPEC §3.1 `:87` |
| 5 | **Vínculo `Customer` ↔ `User`** (modelado y obligatoriedad) | D-002-bis `IMPLEMENTATION DETAIL` |
| 6 | **Lifecycle de `Customer`** | D-002-bis `IMPLEMENTATION DETAIL` |
| 7 | **Catálogo definitivo de `Role` y `Permission`**, lifecycle, administración | D-005 `IMPLEMENTATION DETAIL` |
| 8 | **Mecanismo de aislamiento** multi-tenant (RLS, filtro, esquema por Business) | D-001 `IMPLEMENTATION DETAIL` |
| 9 | **Diseño de token**: formato, claims, ciclo de vida, revocación | D-006 `IMPLEMENTATION DETAIL`; SPEC §9 `:165` |
| 10 | **Mecanismo de `Business Context`** (resolución, aislamiento de queries/mutaciones) | D-006 `IMPLEMENTATION DETAIL`; SPEC §7 |
| 11 | **Rol de plataforma / superadministración** transversal | `OPEN DETAIL / FUTURE`; SPEC §7.2 `:144` |
| 12 | **Estrategia de migración** `Empresa`→`Business`, `Usuario`→`User`+`Membership` | D-001/D-002 `OPEN`; dirección aprobada, plan no |
| 13 | **Reconciliación `Usuario`/`Cliente`** (sin fusión) — mecánica de separación | D-002-bis dirección; mecánica `OPEN` |
| 14 | **2FA/MFA** | `OPEN DETAIL / FUTURE`; SPEC §8.1 `:153` |
| 15 | **Reglas de aprobación por operación** (no auto-autorización, casos críticos) | `TO-BE PROPOSED` / `OPEN`; **CON-018 OPEN** |
| 16 | **Onboarding** de nuevos `Business` y registro de `User` | `OPEN DETAIL`; AS-IS usa variables de entorno fijas |
| 17 | **Otros servicios globales** de plataforma (Billing, Onboarding) | `OPEN DETAIL`; SPEC §10 `:195` |

---

## 14. Trazabilidad

| Afirmación | Origen |
|---|---|
| `Business` = Tenant; `Empresa`→`Business`; unidad de aislamiento | **D-001** `OWNER-VERBATIM` (`00-DECISION-REGISTER.md:97`) |
| `User` global; `Membership` N:N; roles/permisos en la Membership | **D-002** `OWNER-VERBATIM` (`:98`) |
| `Customer` no fusionado con `User`; vínculo opcional; scoping por `Business` | **D-002-bis** `OWNER-VERBATIM` (`:99`) |
| Roles/permisos pertenecen a la `Membership`; acceso por Membership activo | **D-005** `DERIVED` (`:102`) |
| Cuatro validaciones de acceso; el token solo no autoriza | **D-006** `DERIVED` (`:103`) |
| User global; roles contextuales; conversación como interfaz; IA en alcance | `DEC-001:16-25` |
| Modelo conceptual User↔Membership↔Business↔Role↔Permissions | SPEC §10 `:180-196` |
| Flujo de autorización (Request→User→Context→Membership→Role→Permission→Action) | SPEC §6.1 `:117-126` |
| Principios de Business Context (no confiar en cliente, aislar, impedir cross-tenant) | SPEC §7 `:136-144` |
| Fronteras de seguridad (User, Business, Membership, Domain) | SPEC §10.1 `:175-178` |
| Auth: credenciales + Google OAuth; 2FA abierto | SPEC §8 `:149-153` |
| Token: identidad User, sesión de plataforma, claims mínimos | SPEC §9 `:162-166`; D-006 |
| Ausencia de Business/Tenant/Membership; `Empresa` 1:N con `Usuario`; email global | `05-ASIS/04-ASIS-IDENTITY.md:6-22` — **evidencia AS-IS** |
| `RolUsuario` no autoriza; `Permiso`/`UsuarioPermiso` independientes | `05-ASIS/05-ASIS-AUTHORIZATION.md:7-9` — **evidencia AS-IS** |
| Aislamiento por `EmpresaScopedPrismaService` con límites documentados | `05-ASIS/05-ASIS-AUTHORIZATION.md:17-25` — **evidencia AS-IS** |
| Alta minorista autoservicio de `Cliente`, sin requerir identidad de `Usuario` | `05-ASIS/07-ASIS-FLOWS.md:38-40` |
| Tenant Isolation: aislamiento por `Business`; inventario sin stock global ni transferencia | **D-001**, **D-014** `OWNER-RULED` |
| Aislamiento de operaciones: contexto derivado de `Membership`; prohibido `cross-tenant` | **D-006** `DERIVED`; SPEC §7.2 `:140-144` |
| Cadena AS-IS → TO-BE → GAP → Decision → OPEN DETAIL (14 filas) | §12 de este documento; fuentes por fila |

**Contratos, invariantes y tests generados por este documento: 0.** Corresponden a fases posteriores.
