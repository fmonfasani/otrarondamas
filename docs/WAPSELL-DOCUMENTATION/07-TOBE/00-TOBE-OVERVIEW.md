# Wapsell — TO-BE Overview
**Fase:** 6.0 — TO-BE Foundation · **Creado:** 2026-09-28 · **Estado:** DRAFT — NOT APPROVED

> ## Reglas de gobierno que gobiernan este documento
>
> D-009 (`APPROVED — DERIVED / RECONSTRUCTED`) establece que *la SPEC es la fuente de verdad*, que
> las propuestas deben distinguirse de los requisitos aprobados, y que toda implementación debe poder
> trazarse hasta su requisito, decisión o especificación. Por eso **toda afirmación normativa de este
> documento lleva su grado de evidencia explícito**:
>
> | Grado | Significado |
> |---|---|
> | `APPROVED — OWNER-VERBATIM` | Texto del Owner. Citable como aprobado. |
> | `APPROVED — OWNER-RULED` | El Owner resolvió un punto que estaba abierto; dirección fijada. |
> | `APPROVED — DERIVED / RECONSTRUCTED` | Dirección aprobada, redacción reconstruida. Usable como requisito; **no** citable como texto aprobado. |
> | `APPROVED DIRECTION (DEC-001)` | La única decisión redactada originalmente. Dirección de producto únicamente. |
> | `TO-BE PROPOSED` | Propuesta de autor. **No** es un requisito. |
> | `OPEN DETAIL` | Deliberadamente indeterminado. No es una omisión. |
> | `IMPLEMENTATION DETAIL` | Dirección decidida cuyo mecanismo no está definido. |
>
> Tres conversiones están prohibidas y se aplican en este documento:
>
> 1. **AS-IS no es TO-BE.** Nada de `05-ASIS/` se promueve a estado objetivo.
> 2. **PROPOSED no es APPROVED.** Todo módulo, dominio o ítem de navegación propuesto va etiquetado.
> 3. **IMPLEMENTATION GAP no es IMPLEMENTATION PLAN.** Los gaps D-010/D-014 se nombran como gaps. No
>    se especifica ninguna corrección.
>
> **Este documento no crea requisitos.** Cada afirmación trazable a `DEC-001` o a D-001…D-018.
> **Decisiones creadas: 0.** **Módulos inventados: 0.** **Dominios inventados: 0.**
>
> Cadena de autoridad respetada: `REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS →
> TESTS → PLAN → IMPLEMENTATION`. Este documento es **TO-BE**: no produce contracts, ni invariantes,
> ni tests, ni plan.

---

## 1. Qué es Wapsell

**`Wapsell = Platform`.** Wapsell no es una aplicación vertical para un solo negocio; es la
infraestructura que aloja múltiples negocios.
— **`APPROVED DIRECTION (DEC-001)`** `04-DECISIONS/02-MULTITENANCY.md:11-12`

Plataforma SaaS multi-tenant de comercio conversacional y gestión comercial, donde múltiples
unidades de negocio (`Business`) operan de forma independiente, gestionando sus clientes, catálogo,
ventas, inventario, compras y cumplimiento, con la interacción conversacional como interfaz principal.
— `00-WAPSELL-SPEC-GENERAL.md` §1-§2 (dirección); el detalle funcional es `TO-BE PROPOSED`

`Otra Ronda Más` pasa a ser el **primer Business/tenant** de Wapsell, no una aplicación independiente
con su propio dominio de código separado.
— **`APPROVED DIRECTION (DEC-001)`** `:26-27`

---

## 2. Separación de conceptos: Platform / Business / Brand / Commerce / Messaging / Authorization

Estas seis cosas se confunden con frecuencia. No son intercambiables y esta tabla fija qué es cada
una y qué **no** es.

| Capa | Concepto | Autoridad | Qué **es** | Qué **NO** es |
|---|---|---|---|---|
| **Platform** | Wapsell como plataforma SaaS que aloja negocios | `DEC-001:11-12` — `APPROVED DIRECTION` | La infraestructura compartida, la identidad global y el alojamiento de múltiples negocios | No es un negocio. No es el `Brand` de nadie. |
| **Business** | Unidad canónica de negocio y de aislamiento multi-tenant | **D-001 `OWNER-VERBATIM`**; `DEC-001:13-14` | La unidad de aislamiento: datos, configuración y Brand propios | **`Tenant` no es el nombre de la entidad** (ver §3). No es un módulo. No es un `User`. |
| **Brand** | Identidad comercial visible del Business ante sus clientes | `DEC-001:15` — `APPROVED DIRECTION`; **D-004 `DERIVED`** | Lo que el cliente final ve e identifica como el negocio | No es el design system de la plataforma. No es la `Brand` de Wapsell. |
| **Commerce** | Motor operativo: catálogo, pedidos, ventas, pagos, compras, cuentas, entregas | `DEC-001:21-22` — `APPROVED DIRECTION`; **D-007…D-015 `DERIVED`** | La operación que ocurre **detrás** de la conversación | No es la interfaz de trabajo del usuario (eso es Messaging). |
| **Messaging** | Interfaz comercial central: conversaciones y mensajes | `DEC-001:20` — `APPROVED DIRECTION`; **D-003 `DERIVED`** | La superficie por la que el negocio conversa con su cliente | **No es un canal secundario ni un módulo aparte** (DEC-001:20, textual). No es el motor de Commerce. |
| **Authorization** | Capa transversal de roles y permisos por Membership | **D-005, D-006 `DERIVED`** | Quién puede hacer qué dentro de cada Business | No es autenticación (ver `01-IDENTITY-AND-TENANCY.md` §10.1). No es un dominio de negocio. No es un ítem de navegación por sí mismo. |

Sobre la tensión **Platform vs. Brand**, D-004 (`DERIVED / RECONSTRUCTED`) lo resuelve en dirección:
Wapsell tendrá un **design system canónico común**, cada Business configura su `Brand` sobre ese
sistema, y la experiencia del cliente debe identificarse **principalmente con la marca del Business**
mientras Wapsell permanece como plataforma subyacente. El modelo de configuración de tokens, los
assets y los límites de personalización son `IMPLEMENTATION DETAIL`.

---

## 3. Business / Tenant — terminología resuelta

**`Business` es el término canónico de entidad. `Tenant` nombra la función de aislamiento
multi-tenant, no la entidad.**

> *"**Business = Tenant.** Empresa se transforma en Business y pasa a ser la unidad de aislamiento
> multi-tenant."* — **D-001, `APPROVED — OWNER-VERBATIM`** (`00-DECISION-REGISTER.md` §4 fila D-001)

Consecuencias:
- `Empresa` (AS-IS) se transforma en `Business` (TO-BE) — **dirección aprobada**.
- La estrategia de migración y el modelo físico son `IMPLEMENTATION DETAIL` / `OPEN`.
- **CON-009 cerrada** (2026-09-28) en el plano terminológico.
- Las ocurrencias de `Tenant` en otros documentos que lo usan como nombre de entidad son
  **herencia no normativa** a corregir en la pasada de reconciliación D-001, señalada en
  `01-IDENTITY-AND-TENANCY-SPEC.md` (bloque *Terminology authority*). No se han reescrito mecánicamente
  para no convertir `Tenant` en otro significado sin revisión del Owner.

---

## 4. Conceptos de identidad y tenencia

La definición normativa completa de estos seis conceptos vive en **`07-TOBE/01-IDENTITY-AND-TENANCY.md`**.
Resumen con su autoridad:

| Concepto | Definición mínima | Autoridad |
|---|---|---|
| **User** | Identidad **global** de una persona en la plataforma, independiente de cuántos negocios la vinculen | **D-002 `OWNER-VERBATIM`**; `DEC-001:16` |
| **Business** | Unidad de aislamiento multi-tenant | **D-001 `OWNER-VERBATIM`** |
| **Membership** | Relación **N:N** entre `User` y `Business`; porta el rol y los permisos de esa relación | **D-002 `OWNER-VERBATIM`**; `DEC-001:18-19` |
| **Role** | Conjunto de permisos asignado a un `User` **dentro de una Membership**, nunca global | **D-005 `DERIVED`**; `DEC-001:18-19` |
| **Permission** | Capacidad atómica autorizable, heredada del `Role` dentro de la Membership | **D-005 `DERIVED`** |
| **Customer** | Relación **comercial** del comprador/cliente con un `Business`. **No** es un `User` ni se fusiona con él. Puede vincularse opcionalmente a un `User`, sin exigirlo | **D-002-bis `OWNER-VERBATIM`** (Owner, resolución posterior) |

`Brand` se trata en §2. El detalle de `User`, `Business`, `Membership`, `Role`, `Permission` y
`Customer` —incluidos ciclos de vida, modelo conceptual y flujo de autorización— está en
`01-IDENTITY-AND-TENANCY.md`.

---

## 5. NAVIGATION MODULE vs. BUSINESS DOMAIN vs. ENTITY

Esta distinción es la que más fácilmente se pierde al pasar de AS-IS a TO-BE, y es la causa de que en
el código actual un mismo nombre designe tres cosas distintas.

| | **NAVIGATION MODULE** | **BUSINESS DOMAIN** | **ENTITY** |
|---|---|---|---|
| **Qué es** | Una entrada de primer nivel del shell de la aplicación | Un área acotada de responsabilidad de negocio | Un concepto persistente con datos propios |
| **Responde a** | "¿Dónde trabaja el usuario?" | "¿Qué reglas y qué datos pertenecen juntos?" | "¿Qué cosa se guarda?" |
| **Decide** | Agrupación de pantallas y orden de la interfaz | Propiedad de datos, reglas de negocio, límite del modular monolith | Forma, campos, relaciones, restricciones |
| **Cambiarlo obliga a** | Reordenar la UI | Rediseñar reglas y/o mover datos | Migración de datos |
| **Autoridad de la lista concreta** | `00-WAPSELL-SPEC-GENERAL.md` §25 — **`TO-BE PROPOSED`** | `00-WAPSELL-SPEC-GENERAL.md` §24 — **`TO-BE PROPOSED`** | `02-CANONICAL-SPEC/*` + decisiones de dominio |

**Las tres definiciones son conceptuales y no dependen de ninguna decisión.** Lo que **no** está
decidido son las listas concretas: el mapa de 22 dominios (§5.2) y la navegación de 8 ítems (§5.1) son
propuestas de autor sin decisión detrás.

### 5.1. NAVIGATION MODULE — `TO-BE PROPOSED`

Fuente: `00-WAPSELL-SPEC-GENERAL.md` §25, completa y **literalmente**; ninguna decisión la cubre.

1. Inicio · 2. Mensajería · 3. Caja · 4. Compras · 5. Stock · 6. Reportes · 7. Usuarios y permisos ·
8. Configuración · Perfil (capacidad transversal)

Ancla AS-IS: `05-ASIS/09-ASIS-UI.md` verifica rutas reales de `pos-admin` (`/ventas`, `/orders`,
`/inventory`, `/compras`, `/precios`, `/customers`, `/fidelizacion`, `/cash`, `/profile`) y marca
`/reports` y `/settings` como placeholders sin funcionalidad. Esa superficie es **AS-IS**, no una
referencia de aprobación.

### 5.2. BUSINESS DOMAIN — `TO-BE PROPOSED`

Fuente: `00-WAPSELL-SPEC-GENERAL.md` §24, completa y **literalmente**; ninguna decisión la cubre.

| Dominio | Dominio | Dominio | Dominio |
|---|---|---|---|
| D01 Identity | D02 Tenancy | D03 Authorization | D04 Branding |
| D05 Customers | D06 Catalog | D07 Pricing | D08 Messaging |
| D09 Orders | D10 Sales | D11 Payments | D12 Cash |
| D13 Inventory | D14 Purchases | D15 Suppliers | D16 Accounts Receivable |
| D17 Accounts Payable | D18 Fulfillment | D19 Notifications | D20 Reports |
| D21 Audit | D22 Platform | | |

**Ninguno de estos 22 dominios es un requisito aprobado.** Se incluyen porque tienen respaldo
documental como *propuesta*, y esa es su única categoría aquí. Los dominios con dirección aprobada
son: Identity/Tenancy/Authorization (D-001, D-002, D-005, D-006), Branding (D-004), Messaging
(DEC-001:20, D-003), Orders/Sales (D-007, D-008), Payments (D-011), Cash (D-013),
Inventory (D-010, D-014), Purchases/Suppliers/AP (D-015), AR (D-012), Fulfillment (D-016),
CI/CD (D-018), arquitectura (D-017).

Ancla AS-IS: `05-ASIS/06-ASIS-MODULES.md` verifica **17 carpetas de módulo** reales bajo
`apps/api/src/` y declara explícitamente ausentes `entregas`, `notificaciones` y cualquier concepto
`business` / `tenant` / `membership` / `conversacion` / `mensaje` / `asistente`.

### 5.3. ENTITY

Una entidad es un concepto persistente, no una pantalla ni un dominio. Ejemplos con autoridad:

| Entidad | Autoridad |
|---|---|
| `Order` (intención comercial) y `Sale` (operación económica confirmada) — **conceptualmente distintas** | **D-007, D-008 `DERIVED`** |
| `Customer` como relación comercial con un `Business` | **D-002-bis `OWNER-VERBATIM`** |
| `Lote` y `MovimientoStock` ligados al `Business` propietario | **D-014 `OWNER-RULED / VERIFIED BY CODE`** |

**El modelo de datos concreto no está decidido.** DEC-001:55-57 excluye explícitamente el modelo de
datos. Ninguna entidad de este documento se convierte en `schema.prisma` aquí.

---

## 7. Relación Messaging ↔ Commerce

> *"**La conversación es la interfaz comercial central**, no un canal secundario ni un módulo aparte.
> El ERP/comercio (catálogo, ventas, pagos, inventario, compras, entregas) es el motor operativo
> detrás de esa conversación."* — **`APPROVED DIRECTION (DEC-001)`** `:20-22`

- **Messaging es la superficie**; **Commerce es el motor**. La relación es de interfaz↔motor, no de
  equivalencia.
- **D-003** (`APPROVED — DERIVED / RECONSTRUCTED`): Messaging estará **activo** en el MVP inicial como
  sistema de mensajería **propio de Wapsell**; el MVP inicial **no depende de WhatsApp** como canal.
- **Estado de los asistentes de IA** — `IN PRODUCT SCOPE, INACTIVE IN FIRST ITERATION`:
  - `DEC-001:23-25` — *"Asistentes de IA son parte del producto, no un descarte del MVP"*
    (**`APPROVED DIRECTION`**), lo que revierte explícitamente el criterio de Fase 1.
  - **D-003** los mantiene *"preparados técnicamente para incorporarse posteriormente, pero
    inactivos durante el MVP inicial"* (**`DERIVED`**).
  - Estas dos afirmaciones **son compatibles, no contradictorias**: una es alcance de producto, la otra
    estado de activación por iteración. No es una exclusión de producto.
- **Estado del Messaging:** la SPEC de Messaging (`02-CANONICAL-SPEC/04-MESSAGING-SPEC.md`) es un
  **placeholder**: no define reglas, canales ni modelo de mensajes. El SPEC general §9 sí *enumera* el
  alcance nominal (`Conversations`, `Participants`, `Messages`, `Historial`, leído/no leído, `Adjuntos`,
  `Contexto Comercial`, tiempo real, `Notificaciones`), pero **no define ninguno de ellos**. Lo que
  permanece `OPEN DETAIL` es la definición de cada uno y, según GRF-01, tres sub-ítems concretos:
  **canales soportados**, **qué hace un asistente de IA concretamente** y **límites de automatización vs.
  intervención humana** (`DEC-001:61-65`). **CON-011 permanece OPEN únicamente por esos sub-ítems**, no
  por la existencia del Messaging en el MVP.
- **Relación con Commerce:** el *contexto comercial* de una conversación (referencias a `Customer`,
  `Order`, `Sale`) está en `TO-BE PROPOSED` — `00-WAPSELL-SPEC-GENERAL.md` §9 lo lista como alcance del
  MVP, y `DEC-001:20-22` aprueba el principio, no el detalle.

---

## 8. Aislamiento por Business

- El aislamiento es **multi-tenant por `Business`**. Los datos y recursos comerciales de un `Business`
  son inaccesibles desde otros. — **D-001 `OWNER-VERBATIM`**
- `Business` es propietario conceptual de sus datos comerciales y de su `Brand`. — `DEC-001:13-15`
- **Inventario:** pertenece exclusivamente a cada `Business`; **no existe stock global compartido**; **no
  se permite transferencia de stock entre Business** salvo que una operación inter-Business se defina y
  autorice explícitamente en una especificación posterior. — **D-014 `OWNER-RULED`**. El estado de
  implementación es `VERIFIED BY CODE` (`AUD-D014-C01`…`C10`), y la prohibición se cumple **por ausencia
  del feature** (`AUD-D014-N01`…`N03`), con riesgos latentes `AUD-D014-G01`…`G02`: cumplimiento real y frágil.
- **Mecanismo de aislamiento: `IMPLEMENTATION DETAIL` / `OPEN`.** D-001 no decide si es *row-level
  security*, filtro obligatorio, esquema por `Business` u otro. El AS-IS usa una Prisma Client
  Extension que inyecta/filtra `empresaId` (`05-ASIS/05-ASIS-AUTHORIZATION.md`, `05-ASIS/03-ASIS-DATA.md`),
  con una limitación documentada en el propio código: `groupBy`, `upsert` y `$executeRaw` no pasan por
  la extensión.
- **Integridad del stock:** D-010 es requisito aprobado y su implementación está en
  `IMPLEMENTATION NON-COMPLIANT / GAP` (`AUD-D010-C01`…`C06` parcial, `AUD-D010-G01`…`G10` brechas
  verificadas). **GAP declarado, no plan de corrección.**

---

## 9. Arquitectura: Modular Monolith

> *"Wapsell se implementará inicialmente como un **monolito modular**. Debe separar claramente
> dominios y responsabilidades y permitir evolucionar componentes individualmente **sin requerir una
> migración inicial a microservicios**."* — **D-017 `APPROVED — DERIVED / RECONSTRUCTED`**

- **Aprobado:** la dirección *monolito modular* con límites de dominio claros y evolución por
  componentes sin migración inicial a microservicios.
- **Abierto:** topología física, infraestructura, comunicación entre servicios y seguridad adicional
  (`IMPLEMENTATION DETAIL` de D-017).
- **No aprobado / `TO-BE PROPOSED`:** el stack concreto (NestJS, PostgreSQL, Docker, VPS) que aparece
  en `00-WAPSELL-SPEC-GENERAL.md` §20. D-017 aprueba la *forma* monolito modular, **no** el stack.
  **CON-002 y CON-026** (simple vs. enterprise) permanecen **OPEN**.
- **Fuera de la arquitectura inicial** (`TO-BE PROPOSED`): microservicios, Kubernetes, GraphQL.
- **CI/CD:** D-018 (`DERIVED`) aprueba un pipeline automatizado incorporado **progresivamente**, donde
  los cambios que no superen las validaciones obligatorias no avanzan de entorno. Frecuencia de
  despliegue y nivel de automatización de pruebas: `OPEN DETAIL`. **CON-027 OPEN**. El AS-IS no
  registra CI/CD alguno.

---

## 10. Principios de evolución

1. **Monolito modular primero.** Los límites de dominio habilitan la extracción a servicios si los
   requisitos de escalabilidad o de equipo lo demandan. No se migra proactivamente.
   — `D-017`; `00-WAPSELL-SPEC-GENERAL.md` §23
2. **Granularidad de inventario por ubicación después.** El MVP no introduce ubicaciones físicas
   (depósito/local); la arquitectura **debe evitar bloquear** esa extensión futura.
   — `TO-BE PROPOSED`; `05-INVENTORY.md` *Still not decided*
3. **Extensibilidad de integraciones.** El diseño admite futuras pasarelas de pago, canales de
   mensajería y servicios externos. — `TO-BE PROPOSED`
4. **IA por activación, no por adopción.** Los asistentes de IA están en alcance de producto desde
   hoy; su activación es iteración a iteración. — `DEC-001:23-25` + **D-003**
5. **El `Business` es la frontera de crecimiento.** Añadir negocios no requiere reescribir el
   núcleo: el modelo ya es multi-tenant. Esto **no** implica que el aislamiento esté resuelto —
   ver §8.
6. **Gobernanza documental como principio operativo.** Ninguna funcionalidad se considera requisito
   aprobado sin definición y aprobación documental, y toda implementación se traza hasta su
   requisito. — **D-009 `DERIVED`**

---

## 11. Estado de cobertura documental del TO-BE

| SPEC de dominio | Estado | Dominios que debe cubrir |
|---|---|---|
| `00-WAPSELL-SPEC-GENERAL.md` | Sustancia real, **`DRAFT — NOT APPROVED`** | Todos |
| `01-IDENTITY-AND-TENANCY-SPEC.md` | Sustancia real, **`DRAFT — NOT APPROVED`** | Identity, Tenancy, Membership, Authorization |
| `02-COMMERCE-SPEC.md` | Sustancia real, **`DRAFT — NOT APPROVED`** | Customers, Catalog, Pricing, Orders, Sales, Payments, AR |
| `03-OPERATIONS-SPEC.md` | **Placeholder** | Inventory, Cash, Purchases, Fulfillment |
| `04-MESSAGING-SPEC.md` | **Placeholder** | Messaging |
| `05-PLATFORM-AND-GOVERNANCE-SPEC.md` | **Placeholder** | Platform, Audit, Notifications, Reports, Security, Observability |
| `06-BRANDING-AND-EXPERIENCE-SPEC.md` | **Placeholder** | Branding, Design System, UX |

`07-TOBE/03-DATA.md`, `06-MODULES.md`, `11-NFR.md` y los demás TO-BE son **stubs** sin contenido y
**no** se rellenan en esta fase.

---

## 12. Trazabilidad de este documento

| Afirmación | Origen |
|---|---|
| Wapsell = Platform; Otra Ronda Más = primer Business | `DEC-001:11-12`, `:26-27` |
| Business = Tenant; `Empresa` → `Business`; unidad de aislamiento | **D-001** `OWNER-VERBATIM`; `DEC-001:13-14` |
| User = identidad global; Membership N:N | **D-002** `OWNER-VERBATIM`; `DEC-001:16-19` |
| Customer no fusionado con User; vínculo opcional a User; scoping por Business | **D-002-bis** `OWNER-VERBATIM` |
| Brand = identidad comercial del Business; design system canónico | `DEC-001:15`; **D-004** `DERIVED` |
| Roles y permisos pertenecen a la Membership | **D-005** `DERIVED`; `DEC-001:18-19` |
| Cuatro validaciones de acceso; el token solo no autoriza | **D-006** `DERIVED` |
| Conversación = interfaz comercial central; IA en alcance de producto | `DEC-001:20-25` |
| Messaging activo en MVP, IA inactiva, sin dependencia de WhatsApp | **D-003** `DERIVED` |
| Order ≠ Sale; ciclo de vida de Sale; no se elimina una Sale confirmada | **D-007, D-008** `DERIVED` |
| Integridad transaccional del stock | **D-010** `APPROVED / IMPLEMENTATION NON-COMPLIANT — GAP` |
| Inventario por Business; sin transferencia inter-Business | **D-014** `APPROVED — OWNER-RULED` / `VERIFIED BY CODE` |
| Pasarelas de pago; Mercado Pago prioritario, abstraído | **D-011** `DERIVED` |
| Cuentas por Cobrar por Business, asociadas al `Customer` | **D-012** `DERIVED` |
| Cajas por Business; caja cerrada no se modifica directamente | **D-013** `DERIVED` |
| Compras y Cuentas por Pagar por Business | **D-015** `DERIVED` |
| Fulfillment en el dominio de Pedidos | **D-016** `DERIVED` |
| Monolito modular; sin migración inicial a microservicios | **D-017** `DERIVED` |
| CI/CD automatizado e incremental | **D-018** `DERIVED` |
| La SPEC es la fuente de verdad; propuestas ≠ requisitos aprobados | **D-009** `DERIVED` |
| Mapa de 22 dominios | `00-WAPSELL-SPEC-GENERAL.md` §24 — **`TO-BE PROPOSED`** |
| Navegación de 8 ítems | `00-WAPSELL-SPEC-GENERAL.md` §25 — **`TO-BE PROPOSED`** |
| 17 módulos, 12 rutas, `entregas`/`notificaciones` ausentes | `05-ASIS/06-ASIS-MODULES.md`, `05-ASIS/09-ASIS-UI.md` — **evidencia AS-IS, no requisito** |
| Gaps de integridad de stock y verificación de aislamiento | `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` — **evidencia, no plan** |

**Contratos, invariantes y tests generados por este documento: 0.** Corresponden a fases posteriores.

---

## 13. Open Details de este documento

Recogidos aquí; el detalle de Identity/Tenancy está en `01-IDENTITY-AND-TENANCY.md` §10.

| # | Open Detail | Por qué está abierto |
|---|---|---|
| 1 | Lista definitiva de dominios funcionales | §24 es `PROPOSED`; ninguna decisión la cubre |
| 2 | Lista definitiva de módulos de navegación | §25 es `PROPOSED`; ninguna decisión la cubre |
| 3 | Correspondencia dominio ↔ módulo de código ↔ carpeta | No decidida; el AS-IS tiene 17 carpetas que no son dominios TO-BE |
| 4 | Stack technology concreto | D-017 aprueba la forma, no el stack (§9) |
| 5 | Mecanismo de aislamiento multi-tenant | `IMPLEMENTATION DETAIL` de D-001 (§8) |
| 6 | Límite entre "módulo de navegación" y "módulo de código" | No decidido; el AS-IS no las separa |
| 7 | Alcance funcional de los asistentes de IA | `DEC-001:61-65` no lo decide; **CON-011 OPEN** |
| 8 | Canales de Messaging soportados, modelo de mensajes, realtime | `04-MESSAGING-SPEC.md` es placeholder; **CON-011 OPEN** |
| 9 | Contenido del contexto comercial de una conversación | `TO-BE PROPOSED` |
| 10 | Relación formal entre `Brand` y design system | `IMPLEMENTATION DETAIL` de D-004 |
| 11 | Modelo de datos de cualquier entidad | DEC-001:55-57 lo excluye explícitamente |
| 12 | Granularidad de inventario por ubicación | Fuera del MVP; extensión futura |
| 13 | Reglas de negocio adicionales de autorización por operación | `TO-BE PROPOSED`; **CON-018 OPEN**; el texto de D-009 es gobernanza documental, no un proceso de aprobación |
| 14 | Rol de plataforma / superadministración transversal | `01-IDENTITY-AND-TENANCY-SPEC.md` §7.2 lo marca `OPEN DETAIL / FUTURE`; el AS-IS no tiene superadmin |

---

## 14. Cadena de fase

Este documento es el **primer escalón TO-BE** de la cadena
`REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS → PLAN → IMPLEMENTATION`.

- **Completado en esta fase:** `07-TOBE/00-TOBE-OVERVIEW.md` (este documento) y
  `07-TOBE/01-IDENTITY-AND-TENANCY.md`.
- **No producido, por fase:** contracts, invariantes, tests, plan, implementación.
- **Prohibido en este documento:** convertir AS-IS en TO-BE, convertir PROPOSED en APPROVED, convertir
  un GAP de implementación en un plan, o crear una decisión.
