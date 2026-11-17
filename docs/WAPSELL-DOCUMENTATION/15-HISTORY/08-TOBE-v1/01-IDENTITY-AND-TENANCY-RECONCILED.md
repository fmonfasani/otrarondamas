# WAPSELL — IDENTITY & TENANCY
## TO-BE CONCEPTUAL — RECONCILED

**Estado:** DRAFT — TO-BE CONCEPTUAL / NOT APPROVED  
**Fecha:** 2026-10-01  
**Fase:** TO-BE  
**Dominio:** Identity & Tenancy  
**Autoridad:** Decision Register + Owner Rulings R2/R3 + Requirements & Gap Definition + Decision Reconciliation

> Este artefacto expresa el estado TO-BE conceptual después de la reconciliación de decisiones.
> No reemplaza ni modifica el `01-IDENTITY-AND-TENANCY.md` existente. Se crea como versión reconciliada
> para evitar sobrescribir silenciosamente un artefacto TO-BE previo.
>
> No define schema, contratos, invariantes, tests, migraciones ni implementación.

> ### POST-OR-B2 note (2026-10-03) — additive; no normative text of this document was changed
>
> - **Source / Authority:** Owner rulings `OR-B2-001 … OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`), texto verbatim en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`; registro en `03-DECISIONS/00-DECISION-REGISTER.md` §9; mapeo a conflictos en `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Precedencia ISS-08 (aprobada por OR-B2-023): Owner Ruling > Decision Register > SPEC canónica > TO-BE. Entre dos rulings prevalece el posterior.
> - **Cómo leer este documento ahora:** el texto original se conserva como evidencia histórica. Donde abajo se indica "superado", rige el OR-B2 citado **solo en ese alcance**. Los rótulos `DERIVED / RECONSTRUCTED`, `TO-BE PROPOSED` y `OPEN DETAIL` del texto se conservan como procedencia. El AS-IS citado describe el estado verificado en su momento; no se declara nada implementado.
>
> | Sección / tema de este documento | Efecto POST-OR-B2 | Autoridad |
> |---|---|---|
> | Customer / User / email | `Customer` y `User` son entidades diferentes; `Customer` puede existir sin `User`; vínculo `Customer → User` opcional (reafirma D-002-bis). Un email normalizado globalmente único identifica a un `User` (reafirma OR-002-C); reglas de normalización y mecanismo: `OPEN IMPLEMENTATION DETAIL`. Criterio de vinculación por "mismo email": `OPEN`. | OR-B2-004, 005 |
> | Transición Empresa → Business, Usuario → User/Membership | Transición incremental con coexistencia temporal y acotada (reafirma OR-001, OR-002-B/D). Coexistencia física, mecanismo, cutover y rollback: especificación técnica posterior (`OPEN`). | OR-B2-006 |
> | Modelo de autorización y 4 validaciones | Modelo conceptual del MVP: `Membership → Role → Permission` (no se adopta `Profile → Role → Capability → Overrides`). D-006 queda promovida a `OWNER-RULED` con **4 validaciones conceptuales** (`User` autenticado, `Business` objetivo, `Membership` válido, autorización por `Role`/`Permission`); un token válido no autoriza por sí mismo. La cláusula "4 vs. 2 validaciones" marcada `PENDING OWNER RULING` queda resuelta a favor de las 4 en ese alcance. Tipos de token, guards, middleware y enforcement: `IMPLEMENTATION DETAIL` / `OPEN`. | OR-B2-001, 002 |
> | Membership: lifecycle y Business activo | `Membership` tiene lifecycle conceptual `ACTIVE` / `INACTIVE`; una `Membership` `INACTIVE` no permite operar. Los demás estados mencionados en el texto no quedan decididos. Un `User` puede tener múltiples `Membership`s y seleccionar/cambiar el `Business` activo; mecanismo del Business Switch: `OPEN IMPLEMENTATION DETAIL`. | OR-B2-003, 007 |
> | Roles del MVP | Membership Roles del MVP: **Owner, Admin, Vendedor, Gestor de Stock** (nomenclatura oficial; "Operador de Stock" no es nombre normativo). `Owner` = propiedad/control máximo; `Admin` = administración delegada; son roles distintos. `Customer` y `Supplier` no son Membership Roles. `Repartidor`: fuera del MVP como Membership Role, `FUTURE / OPEN`. Catálogo de permisos y precedencia: `IMPLEMENTATION DETAIL`. El AS-IS (`RolUsuario`: `OWNER`, `ASISTENTE_LOCAL`, `PROVEEDOR`, `REPARTIDOR`) no tiene `Admin`. Nada se declara implementado. | OR-B2-008, 009 + aclaración del Owner |
> | §20 Open Detail Register | `OPEN-ID-001` (lifecycle de Membership): parcialmente decidido (`ACTIVE`/`INACTIVE`, OR-B2-003); `OPEN-ID-002` (catálogo de roles): catálogo conceptual del MVP decidido (OR-B2-008/009); `OPEN-ID-003` (catálogo de permisos): sigue `OPEN`; `OPEN-ID-007`/`008` (Business activo, switching): decisión conceptual (OR-B2-007), mecanismo `OPEN`; `OPEN-ID-014` (normalización de email): decisión conceptual (OR-B2-005), reglas `OPEN`; `OPEN-ID-016` (Customer ↔ User matching): `OPEN`; `OPEN-ID-017…020` (migración, compatibilidad, cutover, rollback): `OPEN`; `OPEN-ID-022`/`023` (administración SaaS, superadmin): `OPEN OWNER DECISION`; `OPEN-ID-024` (estados y suspensión): `OPEN`. El registro no se reescribe. | OR-B2-003, 005, 007, 008, 009 |
> | Gobernanza | Workshop 001–490 es fuente de discovery, no autoridad normativa (OR-B2-022). ISS-08 aprobada como regla de precedencia (OR-B2-023); los demás documentos de `00-GOVERNANCE` siguen `PROPOSED`. | OR-B2-022, 023 |
>
> - **Sigue `OPEN`:** ver `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md` §3 (`OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL`, `FUTURE / OPEN`).
> - **Estado:** este documento sigue `DRAFT — NOT APPROVED`. La distinción `APPROVED` / `OWNER-RULED` / `DERIVED` / `PROPOSED` / `OPEN` / `IMPLEMENTATION DETAIL` del texto original se conserva; esta nota no convierte ningún detalle técnico en decisión. `TECHNICAL SPECIFICATION = NOT APPROVED`. `IMPLEMENTATION = NOT AUTHORIZED`.

---

## 1. Objetivo

Definir el modelo conceptual objetivo de Identity & Tenancy de Wapsell a partir de:

`AS-IS → Requirements → Decisions → Decision Reconciliation → TO-BE`

El objetivo es establecer qué conceptos existen en el estado futuro, cómo se relacionan y cuáles son las fronteras conceptuales de autenticación, pertenencia, autorización y aislamiento.

---

## 2. Modelo conceptual canónico

El modelo TO-BE queda expresado así:

```text
WAPSELL PLATFORM
│
├── User
│   │
│   ├── Membership ──────────┐
│   │                         │
│   ├── Membership ───────┐   │
│   │                     │   │
│   └── ...               │   │
│                         ▼   ▼
│                     Business A
│                     Business B
│                     Business N
│
└── Platform Services
    ├── Authentication
    └── Platform Administration (OPEN DETAIL)

Business
│
├── Brand
├── Memberships
├── Customers
├── Catalog
├── Inventory
├── Purchases
├── Sales
├── Orders
├── Payments
├── Cash
├── Conversations
├── Audit
└── other Business-scoped resources
```

Este diagrama es conceptual. No implica tablas, foreign keys, identificadores ni estructura física.

---

## 3. Conceptos fundamentales

| Concepto | Naturaleza TO-BE | Regla |
|---|---|---|
| **User** | Identidad global | Una identidad puede relacionarse con múltiples Business |
| **Business** | Unidad comercial y de aislamiento | Los recursos comerciales pertenecen al Business correspondiente |
| **Membership** | Relación User ↔ Business | Es el contexto de pertenencia y autorización |
| **Role** | Agrupación contextual de permisos | No es global al User |
| **Permission** | Capacidad autorizable | Se aplica dentro del contexto de Membership |
| **Customer** | Relación comercial | Es independiente de User; puede existir sin login |
| **Business Context** | Contexto operativo actual | Determina sobre qué Business se está intentando operar |
| **Authentication** | Verificación de identidad | Resuelve la identidad global User |
| **Authorization** | Decisión de acceso | Evalúa Membership + autorización requerida |
| **Tenant isolation** | Frontera de datos | Impide acceso cruzado entre Business |

---

## 4. Business

### 4.1 Definición

`Business` es la entidad canónica que representa un negocio dentro de Wapsell.

`Tenant` describe su función como unidad de aislamiento multi-tenant; no reemplaza el término canónico `Business`.

### 4.2 Alcance

Los recursos comerciales del Business quedan conceptualmente bajo su frontera:

- Brand;
- Memberships;
- Customers;
- Catalog;
- Inventory;
- Purchases;
- Sales;
- Orders;
- Payments;
- Cash;
- Conversations;
- Audit;
- demás recursos definidos posteriormente.

### 4.3 Regla de aislamiento

Un recurso perteneciente a Business A no debe quedar disponible para operaciones autorizadas únicamente sobre Business B.

El mecanismo técnico de enforcement queda **OPEN DETAIL**.

---

## 5. User

### 5.1 Definición

`User` representa la identidad global de una persona en Wapsell.

La identidad es independiente del Business.

Un mismo User puede:

- pertenecer a Business A;
- pertenecer a Business B;
- no pertenecer a Business C;
- tener roles diferentes en A y B;
- actuar como cliente comercial mediante Customers independientes.

### 5.2 Identidad global

El Owner confirmó:

**User es una identidad global con email único a nivel global.**

Quedan abiertos como detalles técnicos:

- normalización del email;
- detección y resolución de duplicados existentes;
- constraint física;
- procedimiento de migración.

---

## 6. Membership

### 6.1 Definición

`Membership` representa la relación contextual entre un User y un Business.

Conceptualmente:

```text
User ─────< Membership >───── Business
```

La cardinalidad conceptual es N:N.

### 6.2 Responsabilidad

Membership representa:

- pertenencia del User al Business;
- contexto de autorización;
- roles asociados;
- permisos efectivos dentro del Business.

### 6.3 Lo que no se define todavía

Permanece OPEN:

- estados del Membership;
- lifecycle;
- invitación;
- aceptación;
- suspensión;
- revocación;
- reactivación;
- administración;
- modelo físico;
- mecanismo de resolución del Membership activo.

---

## 7. Role y Permission

### 7.1 Regla conceptual

Los roles y permisos pertenecen al contexto del Membership.

Por lo tanto:

```text
User
  ├── Membership A → Business A → Role/Permissions A
  └── Membership B → Business B → Role/Permissions B
```

No se debe interpretar un rol global del User como autoridad para todos los Business.

### 7.2 Catálogo

El catálogo definitivo de roles y permisos permanece **OPEN**.

Este artefacto no adopta como catálogo normativo ningún listado histórico o propuesta anterior.

---

## 8. Customer

### 8.1 Definición

`Customer` representa la relación comercial de un comprador/cliente con un Business.

No es sinónimo de User.

### 8.2 Independencia

Un Customer:

- puede existir sin User;
- pertenece al contexto comercial de un Business;
- puede tener historial comercial;
- puede vincularse opcionalmente a un User.

Conceptualmente:

```text
User ────────────────┐
                     │ optional
                     ▼
Business ─────── Customer
```

### 8.3 Customer ↔ User

El vínculo es opcional.

El criterio de matching automático por email **no está cerrado**.

Por lo tanto, este TO-BE no establece:

```text
same email ⇒ automatic link
```

El algoritmo o regla de vinculación permanece **OPEN DETAIL / OWNER DECISION OR SPEC REQUIRED**.

---

## 9. Authentication

Authentication y Authorization se mantienen conceptualmente separadas.

### Authentication

Responde:

> ¿Quién es este User?

Resultado conceptual:

```text
Credential / OAuth / Session
        ↓
Global User
```

Los mecanismos concretos de credenciales, tokens y claims permanecen abiertos.

---

## 10. Business Context

Una vez autenticado el User, una operación comercial requiere un contexto Business.

Flujo conceptual:

```text
Authentication
      ↓
Global User
      ↓
Business Context
      ↓
Membership
      ↓
Role / Permission
      ↓
Authorization
      ↓
Business Resource
```

### 10.1 Regla

No alcanza con que el User exista.

No alcanza con que el token sea válido.

Debe existir una relación válida entre el User autenticado y el Business objetivo mediante Membership y la autorización requerida.

### 10.2 Detalles abiertos

- cómo se selecciona el Business;
- Business activo;
- switching entre Business;
- persistencia del contexto;
- resolución del Business desde requests;
- representación en sesión/token;
- expiración;
- revocación.

---

## 11. Authorization

Authorization responde:

> ¿Puede este User realizar esta operación sobre este Business y este recurso?

Conceptualmente debe considerar:

```text
Global User
+
Target Business
+
Valid Membership
+
Required Authorization
```

El token por sí solo no constituye autorización sobre un Business.

### 11.1 Separación de responsabilidades

| Capa | Pregunta |
|---|---|
| Authentication | ¿Quién eres? |
| Membership | ¿Perteneces a este Business? |
| Authorization | ¿Puedes hacer esta operación? |
| Tenant isolation | ¿Puedes acceder a estos datos de este Business? |

Los mecanismos concretos de enforcement permanecen OPEN.

---

## 12. Tenant Isolation

Business constituye la frontera conceptual de aislamiento.

### Regla

Toda operación sobre un recurso Business-scoped debe operar dentro del Business Context autorizado.

Conceptualmente:

```text
Request
  ↓
Authenticated User
  ↓
Target Business
  ↓
Valid Membership
  ↓
Authorization
  ↓
Business-scoped Resource
```

La estrategia técnica puede resolverse posteriormente mediante mecanismos de aplicación, base de datos u otros controles apropiados.

Este documento no selecciona una estrategia física.

---

## 13. Legacy transition

La transformación desde el AS-IS no se interpreta como reemplazo instantáneo.

La dirección cerrada es:

```text
AS-IS
Empresa + Usuario + legacy sessions
          │
          │ transición incremental
          ▼
TO-BE
Business + User + Membership
```

Durante la transición:

- puede existir coexistencia temporal de ambos modelos;
- la coexistencia debe ser acotada;
- no es una coexistencia permanente;
- debe mantenerse continuidad operativa;
- las sesiones/tokens legacy son compatibles temporalmente;
- al finalizar la transición, las sesiones legacy se invalidan;
- se requiere nuevo login.

Los mecanismos de migración, compatibilidad, cutover y rollback permanecen OPEN.

---

## 14. Empresa → Business

El destino conceptual está cerrado:

```text
Empresa
   ↓
Business
```

Esto aplica también al modelo persistente como destino final.

No significa que el modelo físico actual deba modificarse inmediatamente.

### OPEN

- estrategia de migración;
- mapeo de registros;
- coexistencia;
- compatibilidad;
- dual-write;
- cutover;
- rollback;
- validaciones;
- despliegue;
- criterio de finalización.

---

## 15. Estados y lifecycles

No se inventan estados en esta fase.

| Concepto | Lifecycle |
|---|---|
| User | OPEN |
| Business | OPEN |
| Membership | OPEN |
| Customer | OPEN |
| Session | OPEN |
| Business Context | OPEN |

La ausencia de lifecycle definido no impide utilizar los conceptos en el modelo TO-BE.

---

## 16. Administración y onboarding

La plataforma necesitará mecanismos para administrar Business y Memberships, pero los detalles funcionales permanecen OPEN.

No se decide aquí:

- self-service onboarding;
- quién crea un Business;
- quién invita usuarios;
- quién acepta/rechaza invitaciones;
- administración SaaS;
- superadmin;
- suspensión de Business;
- recuperación;
- ownership transfer.

---

## 17. Fronteras del modelo

### Platform level

Responsabilidad conceptual:

- identidad global;
- authentication;
- servicios globales;
- administración de plataforma, pendiente de definición.

### Business level

Responsabilidad conceptual:

- operaciones comerciales;
- recursos de negocio;
- Brand;
- Customers;
- Membership context;
- autorización contextual;
- aislamiento.

### User level

Responsabilidad conceptual:

- identidad global;
- múltiples Memberships;
- autenticación.

### Customer level

Responsabilidad conceptual:

- relación comercial;
- historial;
- pedidos/ventas/deuda cuando corresponda;
- vínculo opcional con User.

---

## 18. AS-IS → TO-BE

| AS-IS | TO-BE |
|---|---|
| Empresa como raíz de aislamiento | Business como unidad canónica |
| Usuario ↔ Empresa 1:N | User ↔ Business N:N vía Membership |
| Rol/permisos asociados al modelo legacy | autorización contextual por Membership |
| Usuario y Cliente con modelos separados legacy | User y Customer conceptualmente separados |
| Cliente con identidad de acceso propia | Customer independiente; User opcional |
| Auth ligada al contexto Empresa | Authentication global + Business Context |
| Scoping basado en Empresa | Tenant isolation basado en Business |
| Sesiones legacy | compatibilidad temporal durante transición |
| Hard transition no definida | transición incremental y acotada |
| Empresa persistente | destino final Business |

---

## 19. Reglas conceptuales resultantes

### ITB-001
Business es la unidad canónica de tenancy.

### ITB-002
User es una identidad global.

### ITB-003
User puede tener múltiples Memberships.

### ITB-004
Membership contextualiza la relación User ↔ Business.

### ITB-005
Roles y permisos pertenecen al contexto Membership.

### ITB-006
Customer es independiente de User.

### ITB-007
Customer puede existir sin User.

### ITB-008
Customer puede vincularse opcionalmente a User.

### ITB-009
El acceso a un Business requiere una Membership válida y autorización correspondiente.

### ITB-010
Un token válido por sí solo no autoriza una operación sobre un Business.

### ITB-011
Business constituye la frontera conceptual de aislamiento.

### ITB-012
User tiene email único a nivel global.

### ITB-013
La transición Empresa → Business es incremental y temporalmente coexistente.

### ITB-014
Las sesiones/tokens legacy serán compatibles durante la transición y posteriormente invalidados.

### ITB-015
La implementación requiere especificación concreta aprobada previamente.

Estas reglas son **expresión conceptual de decisiones existentes**, no nuevos Owner Decisions ni contratos técnicos.

---

## 20. Open Detail Register

| ID | Open Detail |
|---|---|
| OPEN-ID-001 | lifecycle de Membership |
| OPEN-ID-002 | catálogo de roles |
| OPEN-ID-003 | catálogo de permisos |
| OPEN-ID-004 | lifecycle de User |
| OPEN-ID-005 | lifecycle de Business |
| OPEN-ID-006 | lifecycle de Customer |
| OPEN-ID-007 | Business activo |
| OPEN-ID-008 | switching entre Business |
| OPEN-ID-009 | resolución del Business Context |
| OPEN-ID-010 | token claims |
| OPEN-ID-011 | sesión y revocación |
| OPEN-ID-012 | enforcement de autorización |
| OPEN-ID-013 | mecanismo de tenant isolation |
| OPEN-ID-014 | normalización de email |
| OPEN-ID-015 | duplicados existentes |
| OPEN-ID-016 | Customer ↔ User matching |
| OPEN-ID-017 | migración Empresa → Business |
| OPEN-ID-018 | compatibilidad legacy |
| OPEN-ID-019 | cutover |
| OPEN-ID-020 | rollback |
| OPEN-ID-021 | onboarding de Business |
| OPEN-ID-022 | administración SaaS |
| OPEN-ID-023 | superadmin |
| OPEN-ID-024 | estados y suspensión |

---

## 21. Fuera de alcance

Este artefacto no define:

- Prisma schema;
- SQL schema;
- tablas;
- columnas;
- IDs;
- endpoints;
- DTOs;
- eventos;
- claims concretos;
- guards concretos;
- middleware;
- RLS;
- filtros Prisma;
- migraciones;
- dual-write;
- backfill;
- rollback operativo;
- infraestructura;
- código;
- Contracts;
- Invariants;
- Tests/Evals.

---

## 22. Gate de salida

El dominio Identity & Tenancy está conceptualmente preparado para pasar a:

```text
TO-BE
  ↓
TECHNICAL SPECIFICATION
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
```

Pero **no se salta directamente a implementación**.

Antes de Contracts deben resolverse o formalizarse, en el nivel correspondiente, los OPEN DETAIL que sean necesarios para que un contrato sea determinable.

---

## 23. Evidencia

| Afirmación | Evidencia |
|---|---|
| Empresa es raíz de aislamiento AS-IS | VERIFIED BY CODE |
| User ↔ Empresa 1:N AS-IS | VERIFIED BY CODE |
| No existe Membership AS-IS | VERIFIED BY CODE |
| Customer independiente en AS-IS | VERIFIED BY CODE |
| Business = Tenant | OWNER-VERBATIM |
| User global + Membership N:N | OWNER-VERBATIM |
| Customer independiente | OWNER-VERBATIM |
| User email globalmente único | OWNER-RULED |
| Empresa → Business persistente | OWNER-RULED |
| Transición incremental | OWNER-RULED |
| Legacy session compatibility | OWNER-RULED |
| Customer matching por mismo email | OPEN / NOT CONFIRMED |
| Modelo físico | OPEN |
| Implementación | NOT AUTHORIZED |

---

## 24. Estado final

**DRAFT — TO-BE CONCEPTUAL / NOT APPROVED**

**Decisiones nuevas creadas:** 0  
**Requisitos nuevos inventados:** 0  
**Schema creado:** 0  
**Contratos creados:** 0  
**Invariantes creadas:** 0  
**Tests creados:** 0  
**Código modificado:** 0  
**Migraciones ejecutadas:** 0  
**Implementación autorizada:** NO

Este artefacto constituye la expresión reconciliada del TO-BE conceptual de Identity & Tenancy y deja explícitamente separadas las decisiones cerradas de los detalles que todavía requieren resolución.

## 25. POST-OR-B3 — ESTADO RECONCILIADO

Los siguientes puntos dejan de ser `OPEN OWNER DECISION` en el TO-BE de Identity & Tenancy y pasan a `OWNER-RULED`: Customer/User matching híbrido y asociación controlada; SaaS Admin fuera del MVP operativo; Location genérica con MAIN mínimo y múltiples permitidas; Product global + BusinessProduct; roles MVP Owner/Admin/Vendedor/Gestor de Stock; MFA/2FA obligatorio para Owner/Admin.

El mecanismo físico, enforcement técnico, contratos, invariantes, tests y migración continúan abiertos salvo cuando otra decisión explícita los haya cerrado.

`Customer matching by same email` deja de ser `OPEN / NOT CONFIRMED` y pasa a **OWNER-RULED — matching híbrido controlado**.

**Estado final:** DRAFT — TO-BE CONCEPTUAL / NOT APPROVED.
