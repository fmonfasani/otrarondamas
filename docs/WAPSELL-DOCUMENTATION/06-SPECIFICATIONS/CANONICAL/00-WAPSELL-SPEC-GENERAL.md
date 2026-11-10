# Wapsell — General Specification

**Version:** 0.5 | **Status:** APPROVED — OWNER RULING OR-B4 | **Date:** 2026-11-10



> Este documento responde una sola pregunta: **¿qué debe ser y qué debe hacer Wapsell?** No responde cómo se implementa. Todo lo que no está decidido está marcado `OPEN`; ninguna regla ha sido inventada para cerrar un hueco.

>

> ```text

> SPEC STATUS = APPROVED (OR-B4, 2026-11-10)

> TECHNICAL SPECIFICATION = NOT APPROVED (por dominio, en specs especializadas)

> IMPLEMENTATION = AUTHORIZED INCREMENTALLY (OR-B4-001)

> ```



---



## 0. Metadata



| Campo | Valor |

|---|---|

| **Nombre** | Wapsell General SPEC |

| **Propósito** | Consolidar en un único documento canónico, trazable y revisable por el Owner, qué debe ser y qué debe hacer Wapsell, a partir de las decisiones del Owner (DEC-001, D-001…D-018, OR-001, OR-002, OR-B2-001…026), los Requirements reconciliados y los TO-BE. |

| **Estado** | `APPROVED` por Owner Ruling **OR-B4** (2026-11-10, `03-DECISIONS/54-OR-B4-SPEC-GENERAL-APPROVAL-2026-11-10.md`), con el alcance de OR-B4-001: la implementación existente se reconoce como AS-IS aceptado, las brechas son backlog (§21) y la implementación está autorizada de forma incremental. Los ítems `OPEN` siguen `OPEN`. |

| **Versión** | **0.5** — Integra OR-B3, las decisiones R8 (2026-10-03/04), AUTH-01…12 (2026-11-04) y OR-B4 (2026-11-10). Versión anterior: 0.4 (`DRAFT — FOR OWNER REVIEW`, 2026-10-03). Historia: 0.3 — consolidación post OR-B2. Reemplaza al v0.2 (`DRAFT — NOT APPROVED`, 2026-09-28); el v0.2 no se reutiliza en silencio: se conserva en el historial de git y el §18 registra qué se retiró de él. |

| **Fecha** | 2026-11-10 (v0.4: 2026-10-03) |

| **Autoridad** | Nivel 3 de ISS-08 (SPEC canónica), aprobada su regla de precedencia por OR-B2-023. Esta SPEC **no** tiene autoridad sobre un Owner Ruling ni sobre el Decision Register. Mientras sea `DRAFT`, cada regla vale **solo** por la autoridad que cita (§3); el documento no agrega autoridad propia. |

| **Fuentes consolidadas** | `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md` (verbatim OR-B2); `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`; `03-DECISIONS/00-DECISION-REGISTER.md` (§4 D-001…D-018, §8 OR-001/OR-002, §9 OR-B2); `05-REQUIREMENTS/00-WAPSELL-REQUIREMENTS-RECONCILED-001-490.md`; `06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md` y `02-COMMERCE-SPEC.md`; `08-TOBE/*` (Overview, Identity & Tenancy, Commerce, Inventory, Cash, Messaging); `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`; `12-DOMAIN-WORK/MESSAGING/00-FUNCTIONAL-OWNER-DECISION-REGISTER-G001-G105.md` y `…/01-FUNCTIONAL-SPEC/WAPSELL-MESSAGING-MVP-SPEC-v0.1.md`; decisiones R8 (`03-DECISIONS/32…43-R8-*`); `53-AUTH-ARCHITECTURE-OWNER-APPROVAL-2026-11-04.md` (AUTH-01…12); `54-OR-B4-SPEC-GENERAL-APPROVAL-2026-11-10.md` (OR-B4-001…023). |

| **Dependencia de Owner Decisions** | Cada regla depende de la decisión que cita. Las áreas sin decisión del Owner figuran en §15 con el formato `OPEN / Reason / Affected Domain / Blocking \| Non-blocking / Owner required?`. El Owner debe revisar §15 antes de cualquier aprobación de esta SPEC. |

| **Autoriza / no autoriza** | Autoriza la implementación incremental contra esta SPEC mediante PRs con CI y tests (OR-B4-001). **No** autoriza sin decisión explícita del Owner: migraciones destructivas, borrado de datos, cut-overs que retiren identidad o permisos legacy, cambios que contradigan un Owner Ruling ni alcance fuera del MVP (ver §17). |



---



## 1. Purpose & Scope



### 1.1 Propósito



Wapsell es una plataforma SaaS multi-tenant de comercio conversacional y gestión comercial. Permite que múltiples negocios operen de forma independiente, con la conversación como interfaz comercial central. `[DEC-001]`



### 1.2 Separación de conceptos



| Concepto | Qué es | Qué no es | Autoridad |

|---|---|---|---|

| **Wapsell** | La **Platform**: infraestructura compartida, identidad global y alojamiento de múltiples negocios. | No es un negocio. No es la marca de ningún negocio. | `DEC-001` |

| **Business** | El **Tenant**: la unidad de negocio y de aislamiento. `Empresa` se transforma en `Business`. | No es un módulo ni un `User`. | `D-001` (OWNER-VERBATIM); `OR-B2-006` |

| **Brand** | La **identidad comercial visible** de un Business hacia sus clientes. | No es el design system de la plataforma. | `DEC-001`; `D-004` (DERIVED) |

| **Otra Ronda Más** | El **primer Business** de Wapsell. No es una aplicación independiente. | No es la plataforma. | `DEC-001` |



`Business` es el término canónico de entidad; `Tenant` nombra la función de aislamiento. El nombre `Wapsell` designa la plataforma, no la implementación actual: el código existente es el sistema de un solo negocio y **no redefine esta SPEC** (§2).



### 1.3 Alcance del MVP

Estado de cada ítem. `Fuente` indica la autoridad; ningún ítem `OPEN` describe una aprobación inexistente.

| Ítem | Estado en el alcance | Fuente |
|---|---|---|
| Plataforma multi-tenant (aislamiento por Business) | **En alcance** | `DEC-001`, `D-001` |
| `User` global, `Membership` N:N, múltiples Memberships, cambio de Business activo (conceptual) | **En alcance** | `OR-B2-003`, `OR-B2-007` |
| Autorización `Membership → Role → Permission` y 4 validaciones conceptuales | **En alcance** | `OR-B2-001`, `OR-B2-002` |
| Membership Roles: Owner, Admin, Vendedor, Gestor de Stock | **En alcance** | `OR-B2-008`, `OR-B2-009` |
| `Customer` independiente de `User` | **En alcance** | `OR-B2-004` |
| `Brand` configurable por Business | **En alcance** | `DEC-001`, `OR-B2-019` |
| Messaging propio de Wapsell, conversation-centric | **En alcance** | `OR-B2-019`, `OR-B2-021`, `DEC-001` |
| `Product` global + `BusinessProduct`; `Cart`; `Order`; `Sale` | **En alcance** | `OR-B2-010`…`013`, `OR-B2-015` |
| `Inventory` por Business: reserva, FEFO/FIFO, sin stock negativo, Locations mínimas | **En alcance** | `OR-B2-014`, `016`, `017`, `018`; `D-010`, `D-014` |
| Pricing, Promotions, Returns, Refunds | **Dirección funcional del MVP / TO-BE; reglas especializadas pendientes** | `OR-B2-025`, `OR-B2-026` |
| Payments | **En alcance**; reglas especializadas pendientes | `D-011` + decisiones funcionales de esta revisión |
| Cash | **En alcance**; reglas especializadas pendientes | `D-013` + decisiones funcionales de esta revisión |
| Accounts Receivable / Cuentas Corrientes | **En alcance MVP** | Owner Review 2026-10-03 |
| Purchases / Accounts Payable | **Fuera del MVP inicial**; permanece en TO-BE | `D-015` |
| Fulfillment | **En alcance como subdominio de Orders**, no como módulo principal independiente | `D-016` + Owner Review 2026-10-03 |
| Reports, Audit, Notifications | `OPEN DETAIL` | Especificaciones especializadas |

**Fuera del alcance del MVP o no activo:**

| Ítem | Estado | Fuente |
|---|---|---|
| Asistentes de IA operando | **Inactivos durante el MVP inicial**; forman parte de la dirección de producto | `OR-B2-020`, `DEC-001` |
| Dependencia de WhatsApp | **No requerida en MVP** | `OR-B2-020`, `D-003` |
| `Repartidor` como Membership Role | **FUTURE / OPEN; fuera del MVP de Membership Roles** | `OR-B2-008` + Owner clarification |
| Stock global compartido entre Business | **Excluido** | `D-014` |
| Transferencia de stock entre Business | **No disponible en el modelo actual; solo mediante futura especificación explícita** | `D-014` |
| SaaS Admin / rol de plataforma | Existe conceptualmente a nivel plataforma, pero está fuera del MVP operativo; implementación y modelo de permisos no aprobados | `OR-B3-003` |
| Contabilidad financiera completa y facturación fiscal electrónica | `OPEN / no determinada` | CON-003 |
| Kubernetes | `OPEN` | Architecture |

---



## 2. Normative Authority



Regla de precedencia ISS-08, aprobada por `OR-B2-023`:



```text

OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP / PREPARATION > HISTORICAL

```



1\. **Las Owner Decisions son normativas.** Entre dos rulings del Owner prevalece el posterior.

2\. **El Workshop 001–490 no es normativo.** Es fuente de discovery y produce requisitos candidatos; una respuesta del Workshop no se vuelve decisión aprobada por sí sola. `[OR-B2-022]`

3\. **El AS-IS es evidencia**, no decisión. Describe lo que existe; nunca define lo que debe existir.

4\. **El TO-BE no puede contradecir un Owner Ruling.** Si lo contradice, se registra como conflicto; no se resuelve en silencio.

5\. **La implementación actual no redefine esta SPEC.** El código existente es evidencia del estado de hecho.

6\. **Un documento posterior que use una decisión no prueba su aprobación.** Los documentos derivados no adquieren autoridad por existir. `[OR-B2-023]`

7\. **El registro G001–G105 no sustituye a las OR-B2.** Se usa como fuente funcional de Messaging; su nivel en ISS-08 no está definido (§15, `G-N6`).

8\. **Aprobado no es implementado, y aprobado no es autorizado a implementar.** Una decisión del Owner nunca declara implementada una funcionalidad.

9\. **`OPEN` no es decisión.** Un detalle sin ruling se declara `OPEN` y no se rellena.



Ubicación de Requirements, Specialized Specs, Contracts y AS-IS dentro de ISS-08: `OPEN OWNER DECISION` (C-22). Los 7 documentos de `00-GOVERNANCE` siguen `PROPOSED`.



---



## 3. Convenciones de esta SPEC



### 3.1 Referencias de autoridad



Cada regla cita su fuente entre corchetes. Los textos verbatim de las OR-B2 **no** se recopian aquí: están en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`.



| Rótulo | Significado |

|---|---|

| `[OR-B2-0xx]` | Owner Ruling de la sesión `OR-B2-SESSION-2026-10-03`. Nivel conceptual. |

| `[D-001]`, `[D-002]`, `[D-002-bis]` | Decisión del Owner, texto `OWNER-VERBATIM`. |

| `[D-010]`, `[D-014]` | `OWNER-RULED` (2026-09-28); texto `DERIVED / RECONSTRUCTED`. |

| `[D-003]`…`[D-018]` (resto) | `DERIVED / RECONSTRUCTED`: dirección aprobada por el Owner, redacción no confirmada. Usable como requisito, no citable como texto aprobado. |

| `[OR-001]`, `[OR-002-x]` | Rulings del Owner anteriores a OR-B2 (Registro §8). |

| `[DEC-001]` | Decisión de dirección de producto (2026-09-25). |

| `[G-n]` | Decisión funcional del registro G001–G105 de Messaging (§2.7). |

| `OPEN` | No decidido. Incluye `OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL` y `FUTURE / OPEN`. |

| `PROPOSED` | Propuesta de autor. No es requisito. |



`OPEN OWNER DECISION` es un rótulo de trabajo de la documentación OR-B2 (`03-DECISIONS/21-…`): significa que falta una decisión del Owner. `OPEN IMPLEMENTATION DETAIL` significa que el concepto está decidido y falta el mecanismo, que pertenece a Architecture / Technical Spec.



### 3.2 Etiquetas de evidencia



Cuando este documento cita el estado de la implementación, usa:



`VERIFICADO POR CÓDIGO` · `VERIFICADO POR TEST` · `VERIFICADO POR EJECUCIÓN` · `DOCUMENTADO` · `NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE`



Una decisión del Owner **no** es funcionalidad implementada. Esta pasada no ejecutó código ni tests; toda cita de evidencia AS-IS procede de los documentos de auditoría ya existentes y se rotula con el grado que ese documento declara.



---



## 4. Platform Model (conceptual)



Modelo conceptual de capas. **No son módulos físicos** ni una decomposición de código.



| Capa conceptual | Responsabilidad | Autoridad |

|---|---|---|

| **Business / Tenancy** | Unidad de negocio y de aislamiento; datos, configuración y Brand propios. | `D-001`, `DEC-001` |

| **Identity** | `User` global; email normalizado único. | `D-002`, `OR-B2-005` |

| **Membership / Authorization** | Relación User ↔ Business, Role y Permission; quién puede hacer qué en cada Business. | `D-002`, `OR-B2-001`…`003` |

| **Brand** | Identidad comercial visible del Business. | `DEC-001`, `D-004` |

| **Messaging** | Interfaz comercial central: conversaciones y mensajes. | `DEC-001`, `OR-B2-019` |

| **Commerce / ERP** | Customer, Catalog, Cart, Order, Sale, Inventory y las demás operaciones comerciales. | `DEC-001`, `OR-B2-010`…`018` |



La Authorization es una capa transversal, no un dominio de negocio ni un ítem de navegación. El mapa de 22 dominios y la navegación de 8 ítems del v0.2 (§24–§25) siguen siendo `TO-BE PROPOSED` (ver `08-TOBE/00-TOBE-OVERVIEW\.md` §5) y **no** se promueven aquí.



---



## 5. Identity & Tenancy



### 5.1 User



\- `User` es una identidad **global única** de la plataforma, independiente de cuántos Business la vinculen. `[D-002]`

\- Un email **normalizado** globalmente único identifica a un `User`; no puede haber dos `User` con el mismo email normalizado. `[OR-B2-005]` (reafirma `OR-002-C`). El algoritmo de normalización es `OPEN IMPLEMENTATION DETAIL`.

\- No se crean identidades administrativas separadas de `User`. `Customer` **no** es un `User` (§8).



### 5.2 Business



\- `Business = Tenant`: es la unidad de aislamiento. `Empresa` se transforma en `Business`. `[D-001]`

\- Cada Business opera con sus propios datos, configuración y Brand. `[D-001, DEC-001]`

\- La transformación `Empresa → Business` y `Usuario → User/Membership` es **incremental**, con coexistencia **temporal y acotada**. La coexistencia física, el mecanismo de migración, el cutover y el rollback quedan para la especificación técnica posterior. `[OR-B2-006]` (reafirma `OR-002-B`, `OR-001`). Para esa transformación rige `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN`. `[OR-001 P5-B, OR-002-F]`

\- `Empresa` se conserva como representación física de `Business` durante la transición; `Usuario→Empresa` deja de ser progresivamente la relación de autorización canónica. `[R8-ID-002, R8-ID-003]`

\- La convivencia termina por **criterios**, no por fecha: ninguna ruta autoriza por `Usuario`/`Usuario.empresaId`; paridad probada del mapeo `Usuario.id → User.id`; permisos legacy mapeados. `[OR-B4-010, AUTH-07, AUTH-11]`



### 5.3 Membership



\- La relación `User` ↔ `Business` es N:N y se expresa mediante `Membership`. Un `User` puede tener **múltiples** Memberships. `[D-002, OR-B2-007]`

\- Cada Membership tiene un Role. Los roles y permisos pertenecen a la Membership, no al `User` global. `[D-002, DEC-001]`

\- Una Membership tiene un lifecycle conceptual de tres estados: **`ACTIVE`**; **`SUSPENDED`** (temporal, lo decide un administrador autorizado, reversible); **`INACTIVE`** (baja definitiva). **Solo `ACTIVE` permite operar** sobre el Business. `[OR-B2-003, R8-ID-002, OR-B4-008]`

\- Transiciones, quién activa o desactiva, reactivación y efecto sobre sesiones: `OPEN IMPLEMENTATION DETAIL`.



### 5.4 Business Switch (conceptual)



Un `User` con múltiples Memberships puede seleccionar y cambiar el Business activo. `[OR-B2-007]`



\- El **mecanismo** del Business Switch está `OPEN IMPLEMENTATION DETAIL`.

\- No está decidido que el cambio se haga "sin volver a autenticarse" (condición candidata de `REQ-ID-005`).

\- Cualquiera sea el mecanismo, el Business objetivo debe validarse contra una Membership válida (§6.2).



---



## 6. Authorization



### 6.1 Modelo del MVP



El modelo de autorización del MVP es **`Membership → Role → Permission`**. `[OR-B2-001]`



`Profile → Role → Capability → Overrides` **no** se adopta para el MVP: no hay Profile, Capability ni overrides individuales. No se descarta como posible evolución futura.

\- La `Membership` es la única autoridad del rol efectivo. `[AUTH-02]`

\- Existe **un único catálogo canónico de Permissions**; "Capability" no es un vocabulario paralelo. `[AUTH-03, R8-AUTH-001]`

\- La asignación es una **matriz fija `Role → Permission`**; sin grants ni denials por Membership en el MVP. `[AUTH-04]`

\- Un único motor de autorización; las políticas desconocidas **fallan cerrado**. `[AUTH-08, AUTH-10]`

\- El catálogo atómico y las filas de la matriz se definen en la Authorization SPEC especializada; permisos clave ya nombrados: `ORDER_CONFIRM`, `CASH_OPEN`, `CASH_CLOSE`, `CASH_ADJUST`, `CASH_WITHDRAW`. `[OR-B4-007]`



### 6.2 Un token no autoriza por sí solo



Un token válido **no** autoriza por sí mismo una operación protegida. `[OR-B2-002]` (promueve `D-006`). Toda operación protegida valida, conceptualmente, **cuatro controles**:



1\. `User` autenticado;

2\. `Business` objetivo;

3\. `Membership` válida (activa, §5.3);

4\. autorización por `Role` / `Permission`.



Cadena conceptual:



```text

Authenticated User → Target Business → Valid Membership → Role → Permission → Authorization

```



Los controles son conceptuales. Tipos de token, guards, middleware, errores y enforcement: `OPEN IMPLEMENTATION DETAIL`. La autenticación establece la identidad global del User; el proveedor de identidad y los mecanismos técnicos siguen `OPEN`. **MFA/2FA es obligatorio para Owner y Admin**; enrollment, método, recovery y enforcement técnico permanecen `OPEN IMPLEMENTATION DETAIL`. `[OR-B3-014]` Debe estar activo **antes de incorporar un segundo Business**, y ya para la cuenta Owner de Otra Ronda Más. `[OR-B4-009]` Que el AS-IS soporte determinados mecanismos es evidencia, no decisión.



### 6.3 Aislamiento



Los datos y la configuración de un Business están aislados de los de otro. El acceso a un Business distinto del activo exige una Membership válida y el Permission correspondiente. Ningún dominio opera sobre un Business sin validar el contexto de autorización. `[DEC-001, D-006]`



---



## 7. Membership Roles



Catálogo de Membership Roles del MVP `[OR-B2-008]`:



| Role | Estado |

|---|---|

| **Owner** | Propiedad / control máximo del Business. `[OR-B2-009]` |

| **Admin** | Administración delegada. `[OR-B2-009]` |

| **Vendedor** | Membership Role del MVP. |

| **Gestor de Stock** | Membership Role del MVP. Es el **único** nombre normativo. |



Reglas:



\- **Owner ≠ Admin.** Son roles distintos. `[OR-B2-009]`

\- **`Customer` no es un Membership Role.** `[OR-B2-008]`

\- **`Supplier` no es un Membership Role.** `[OR-B2-008]`

\- **`Repartidor` queda fuera del MVP como Membership Role: `FUTURE / OPEN`.** No se elimina del producto futuro. `[OR-B2-008]`

\- **Gestor de Stock** es el nombre normativo. Las denominaciones anteriores no son normativas.

\- Permisos concretos de Owner, de Admin y de cada rol: Authorization SPEC especializada (`OR-B4-007`).

\- Transición con fecha límite: `ASISTENTE_LOCAL → VENDEDOR`; `PROVEEDOR` y `REPARTIDOR` dejan de ser Membership Roles. `[AUTH-01, OR-B4-006]`

\- **SaaS Admin / rol de plataforma:** la formulación histórica `OPEN OWNER DECISION` (C-11) queda superada en su alcance conceptual por `OR-B3-003`: existe conceptualmente a nivel plataforma y está fuera del MVP operativo. Su implementación y modelo de permisos no están aprobados. No figura entre los Membership Roles del MVP. El `PlatformAdminModule` existente se conserva **solo para uso interno del Owner**, no expuesto como producto; sus permisos se definen en la Authorization SPEC. `[OR-B4-020]`



Brecha AS-IS / TO-BE (evidencia, no decisión; `DOCUMENTADO` en `08-TOBE/00-TOBE-OVERVIEW\.md`): el AS-IS tiene `enum RolUsuario { OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR }`, no tiene `Admin` y `PROVEEDOR` es un rol de `Usuario`. Esta brecha no está implementada ni autorizada.



---



## 8. Customer



\- `Customer` y `User` son **entidades diferentes**. `[OR-B2-004, D-002-bis]`

\- Un `Customer` **puede existir sin `User`**.

\- El vínculo `Customer → User` es **opcional**.

\- `Customer` es una entidad **comercial**: representa la relación comercial del comprador con un Business (compras, pedidos, historial, cuenta corriente cuando aplique, condiciones comerciales). `[D-002-bis]`

\- `Customer` **no** es una `Membership` ni un Membership Role. `[OR-B2-008]`

\- Criterio para vincular un `Customer` con un `User` (p. ej. "mismo email"): **`OPEN`**. No está confirmado por el Owner y no se define aquí ningún algoritmo de matching.

\- Lifecycle de `Customer` y modelo físico del vínculo: `OPEN IMPLEMENTATION DETAIL`.



---



## 9. Business & Brand



\- La `Brand` es la identidad comercial visible del Business y le pertenece. `[DEC-001]`

\- La experiencia de cara al cliente la protagoniza la Brand del Business; **Wapsell permanece discreto** como plataforma subyacente. `[D-004, DERIVED]`

\- Cada Business puede configurar su Brand sobre un Design System canónico común. `[D-004, DERIVED]`

\- Modelo de configuración, tokens, assets y límites de personalización: `OPEN IMPLEMENTATION DETAIL`. Esta SPEC no define ninguna implementación de branding.



---



## 10. Commerce

Flujo conceptual: `Customer → Cart → Order → confirmación comercial → Sale`.

### 10.1 Product / Catalog
- `Product` es **global**. Los datos comerciales específicos de un Business viven conceptualmente en `BusinessProduct`. `[OR-B2-010]`
- `Product` no contiene stock ni precio específicos del Business.
- La identidad y atributos canónicos/globales pertenecen a `Product`; los atributos comerciales del Business pertenecen a `BusinessProduct`.
- **SKU, precio, visibilidad comercial y configuración comercial del Business** son gobernados por `BusinessProduct`.
- Un Business puede desactivar su `BusinessProduct` sin eliminar el `Product` global.
- `BusinessProduct` puede definir un nombre/display comercial propio sin alterar la identidad canónica global.
- Modelo físico: `OPEN IMPLEMENTATION DETAIL`. Dirección física aprobada: `Product (identidad global) → BusinessProduct (configuración comercial)` sin migración destructiva inmediata. `[R8-COM-003]`
- **Por etapas:** el `Producto` actual opera como `BusinessProduct`; el `Product` global se introduce cuando un segundo Business o un catálogo compartido lo requiera. `[OR-B4-011]`

### 10.2 Cart
- El `Cart` pertenece al `Customer` cuando éste existe, con vínculo opcional al `User`. `[OR-B2-011]`
- Un `Cart` **puede existir sin Customer**; el mecanismo técnico de titularidad/contexto queda para Architecture.
- Un `Customer` puede existir sin `User`.
- Para una operación comercial confirmada debe existir una identidad comercial; el MVP soportará el Customer genérico **Consumidor Final** para ventas sin identificación nominal. `[OR-B4-022]`
- El Cart anónimo es un estado de interacción previo al Order; se requiere Customer antes de crear el Order. `[R8-COM-004]`
- Orden de implementación en el MVP: primero **Consumidor Final**, después el **Cart anónimo**. `[OR-B4-014]`

### 10.3 Order
- `Order` = intención / proceso comercial. **`Order ≠ Sale`**. `[OR-B2-012]`
- Un `Order` puede ser confirmado por cualquier Membership cuyo conjunto de Permissions incluya la capacidad de **confirmar órdenes**. No se acopla esta capacidad rígidamente a un Role.
- La confirmación comercial del `Order` genera la `Sale`. `[OR-B2-013]`
- Estados: el vocabulario AS-IS de Order es el lifecycle de partida, con reconciliación semántica: `RECIBIDO`, `CONFIRMADO`, `EN_PREPARACION`, `LISTO`, `ASIGNADO`, `EN_CAMINO`, `ENTREGADO`, `PARCIALMENTE_ENTREGADO`, `ENTREGA_FALLIDA`, `CANCELADO`. `[R8-ORD-002 A1/E1, OR-B4-013]` Los estados conceptuales `DRAFT → PENDING_CONFIRMATION → CONFIRMED / CANCELLED` son una **agrupación** de ese vocabulario, no un reemplazo. Order y Sale tienen ciclos de vida separados; el Payment no determina el estado de la Sale. `[R8-ORD-002 I1/J1]` Los contratos técnicos completos pertenecen a la Commerce/Orders SPEC.
- La confirmación es una operación autorizada del Business gobernada por `ORDER_CONFIRM`. `[R8-COM-004]`
- Cancelar antes de la salida física libera la reserva aplicable sin inventar una salida de stock. `[R8-ORD-002 D1]`
- Fulfillment pertenece al dominio de Orders y no constituye un módulo principal independiente.

### 10.4 Sale
- `Sale` = operación económica **confirmada**. `[OR-B2-012]`
- La `Sale` nace en la confirmación comercial del `Order`, no en la entrega. `[OR-B2-013]`
- Una `Sale` confirmada es **inmutable**. Las correcciones se realizan mediante cancelación, reversión o refund, con trazabilidad. `[OR-B2-015]`
- `Payment` es un dominio separado; el estado financiero del cobro no se incorpora como estado propio de `Sale`.
- Estados conceptuales mínimos: `CONFIRMED`, `CANCELLED`.

### 10.5 Payments
- `Payment` es una entidad/dominio separado de `Sale`; una `Sale` puede tener uno o varios Payments.
- Estados conceptuales mínimos: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`.
- Integraciones externas, conciliación, webhooks, idempotencia y estados adicionales pertenecen a la Payment SPEC. El vocabulario AS-IS de Payment es el punto de partida; `Payment ≠ aplicación a AR`; un Payment aprobado puede producir un efecto en Cash según el medio. `[R8-PAY-002, R8-PAY-003]`
- MVP: integración real con **Mercado Pago**; Stripe solo cuando haya Businesses fuera de LatAm. `[OR-B4-016]`

### 10.6 Commerce extensions
| Capacidad | Alcance | Regla pendiente |
|---|---|---|
| Pricing | **MVP / TO-BE** | Specialized Spec |
| Promotions | **MVP / TO-BE** | Specialized Spec |
| Returns | **MVP / TO-BE** | Specialized Spec |
| Refunds | **MVP / TO-BE** | Specialized Spec |

Una Refund no modifica retroactivamente una `Sale` confirmada; registra una operación compensatoria trazable.

### 10.7 Accounts Receivable
- **Accounts Receivable / Cuentas Corrientes forma parte del MVP.** `[OR-B4-021]`
- AR pertenece al Business y se asocia al `Customer`, no al `User`.
- Modelo conceptual: `Customer → CustomerAccount → Receivable → Payment → Settlement`.
- Una `Sale` puede generar una `Receivable`; un Payment puede aplicarse total o parcialmente a una cuenta por cobrar.
- El saldo pendiente se deriva de las operaciones registradas y no de una edición manual de la `Sale`.
- Estados financieros, límites de crédito, aplicación de cobros y conciliación pertenecen a la Finance/AR SPEC.

### 10.8 Purchases / Accounts Payable
- **Purchases / Accounts Payable quedan fuera del MVP funcional inicial.** El código existente se conserva fuera del alcance del MVP, sin compromiso de soporte ni evolución. `[D-015, OR-B4-017]`
- Permanecen dentro del TO-BE de Commerce/ERP para una etapa posterior.
- `Supplier` continúa siendo una entidad comercial y no un Membership Role.

### 10.9 Cash
- `Cash` pertenece al Business.
- Ciclo conceptual: `APERTURA → MOVIMIENTOS → ARQUEO → CIERRE`.
- Las operaciones sensibles requieren Permissions específicos; no se autorizan por inferencia de Role. `[OR-B4-023]`
- Ejemplos conceptuales: `CASH_OPEN`, `CASH_CLOSE`, `CASH_ADJUST`, `CASH_WITHDRAW`. El catálogo definitivo pertenece a la especificación de Authorization/Cash.

### 10.10 Returns / stock
- Una devolución no implica automáticamente que el producto vuelva a estar disponible.
- Conceptualmente, el resultado puede ser `RESTOCK`, `DAMAGED` o `DISPOSED`; el catálogo y los efectos técnicos pertenecen a Returns/Inventory SPEC.


## 11. Inventory

- El inventario pertenece **exclusivamente a cada Business**. No existe stock global compartido.
- El MVP soporta **una o más Locations**, con al menos una ubicación principal `MAIN` por Business. `Location` es un concepto genérico que pertenece a un único Business; `MAIN` es un rol de la Location, no un tipo de entidad. `[R8-INV-003]` Se implementa ya una `MAIN` por Business con los lotes asociados. `[OR-B4-015]` La asociación física Location↔Inventory queda para Inventory SPEC.
- Las transferencias inter-Business no forman parte del modelo actual y solo podrán existir mediante una operación explícitamente especificada y autorizada en el futuro.
- Al confirmar un `Order`, el stock requerido queda **reservado**; `disponible = existente − reservado`, y se rechaza la confirmación si no se puede reservar. `[OR-B2-014, R8-INV-002]` Se implementa en el MVP. `[OR-B4-012]`
- El **decremento físico** ocurre cuando el producto sale efectivamente de la custodia del Business mediante fulfillment/entrega/retiro; reserva y salida física son operaciones distintas.
- No se permite stock negativo. `[OR-B2-018]`
- Con vencimiento se aplica **FEFO**; sin vencimiento, **FIFO**. `[OR-B2-016]`
- La integridad del inventario requiere operaciones atómicas, concurrentemente seguras y consistentes entre movimientos y existencias resultantes. `[D-010]`
- Los mecanismos físicos, límites transaccionales y controles concretos pertenecen a Inventory SPEC.


## 12. Messaging

- Messaging es un **dominio funcional de primera clase** con UX **conversation-centric**. Primera clase no implica un módulo visual independiente. `[OR-B2-019, DEC-001]`
- Cada `Conversation` pertenece exactamente a **un Business**. `[OR-B2-021]`
- Participan conceptualmente `Users` y `Customers`; un `Customer` puede participar sin disponer de un `User` global.
- El MVP prioriza conversaciones **1:1**. Grupos, voz y otras capacidades avanzadas quedan sujetas a la reconciliación completa de G001–G105 y sus conflictos.
- La conversación puede asociarse a `Customer`, `Order` y `Sale`.
- Real-time, estados de lectura, adjuntos y notificaciones forman parte de la dirección funcional; contratos y mecanismos concretos pertenecen a specs especializadas.
- Wapsell Messaging **no depende de WhatsApp** en el MVP.
- Los asistentes de IA son parte de la dirección de producto, pero permanecen **inactivos durante el MVP inicial**.
- G001–G105 es **fuente funcional secundaria**, subordinada a ISS-08; no sustituye Owner Rulings, Decision Register ni Canonical SPEC.
- Messaging se aprueba tal como está definido aquí; la reconciliación completa de G001–G105 queda para después. `[OR-B4-018]`


## 13. Architecture

- La dirección arquitectónica aprobada es **Modular Monolith**. `[OR-B2-024]`
- La elección concreta de framework, base de datos, contenedores, infraestructura, API style, GraphQL/REST, Kubernetes y deployment **no queda aprobada por esta SPEC**.
- **REST** para el MVP (AS-IS). GraphQL o una combinación quedan `OPEN` para Architecture. `[OR-B4-019]`
- Kubernetes permanece `OPEN` y no constituye requisito de implementación.
- Los límites de dominio deben permitir evolución futura, pero esta SPEC no autoriza microservicios ni una infraestructura específica.


## 14. Security (alcance conceptual)

- Security se basa conceptualmente en identidad global, aislamiento por Business, Membership/Role/Permission y trazabilidad.
- **MFA es obligatorio para Owner y Admin; opcional para Vendedor y Gestor de Stock.** La política concreta, enrollment y enforcement pertenecen a Security/Architecture.
- Las operaciones críticas deben contar con auditabilidad.
- PCI DSS, mecanismos concretos de autenticación, token enforcement, retención de auditoría y NFRs permanecen `OPEN DETAIL`.


## 15. Open Areas

Las decisiones funcionales principales de la revisión posterior a v0.3 fueron incorporadas. Permanecen abiertos los asuntos que requieren definición técnica, recuperación de fuentes documentales o una nueva Owner Decision. **Ninguno bloquea la aprobación** de esta SPEC: se resuelven en sus specs especializadas. `[OR-B4-002]`

### 15.1 Owner / documentary items still open

| OPEN | Reason | Affected Domain | Status |
|---|---|---|---|
| D-011 — conciliación, integración, credenciales, idempotencia y vocabulario completo de Payment | Dirección derivada; reglas especializadas no cerradas | Payments | OPEN |
| D-013 — detalle completo de Cash | La autorización conceptual ya fue resuelta mediante Permissions; faltan lifecycle, ajustes y conciliación | Cash | OPEN |
| D-015 — Purchases/AP | Fuera del MVP, pero requiere especificación posterior | Purchases / AP | OPEN |
| D-016 — Fulfillment | Reglas de responsables, tracking, zonas, tarifas y evidencia | Fulfillment | OPEN |
| C-20 — nomenclatura R1/R2/R3 | Ambigüedad documental | Governance | OPEN |
| CON-011 — alcance funcional de IA | Canales, comportamiento y límites de automatización no decididos | Messaging / AI | OPEN |
| GRF-02 — namespaces históricos | Equivalencia documental no determinable | Governance | OPEN |
| OR-003 / OR-005 | Referencias sin definición suficiente | Governance | OPEN |
| CON-008 | Requiere resolver fuente e impacto técnico | Business / Identity | OPEN |
| G-N6 y demás conflictos Messaging | Reconciliación completa G001–G105 pendiente | Messaging | OPEN |
| C-22 — placement normativo dentro de ISS-08 | La precedencia está resuelta; la ubicación documental exacta no | Governance | OPEN |
| G001–G105 — nivel dentro de ISS-08 | No sustituye la autoridad canónica hasta cerrar la reconciliación | Messaging / Governance | OPEN |

### 15.2 Technical / Architecture open

| OPEN | Affected Domain | Status |
|---|---|---|
| Mecanismo del Business Switch | Identity | OPEN — Architecture |
| Enforcement de las cuatro validaciones de autorización | Authorization | OPEN — Architecture |
| Catálogo de Permissions | Authorization | OPEN — Specialized/Technical Spec |
| Transiciones técnicas de Membership ACTIVE/INACTIVE | Identity | OPEN — Technical Spec |
| Normalización concreta de email | Identity | OPEN — Technical Spec |
| Migración/cutover/rollback Empresa → Business y Usuario → User/Membership | Identity / Platform | OPEN — Transformation/Technical Spec |
| Estados completos y contratos de Order/Sale | Commerce | OPEN — Specialized Spec |
| Modelo físico Product/BusinessProduct/Location | Commerce / Inventory | OPEN — Architecture |
| Mecanismos de reserva, decremento físico y no-stock-negativo | Inventory | OPEN — Inventory Spec |
| Contratos de Messaging, real-time, adjuntos y read states | Messaging | OPEN — Messaging Spec |
| Reports, Audit, Notifications | Platform | OPEN — Specialized Specs |
| Token enforcement, autenticación concreta, PCI DSS | Security | OPEN — Security Spec |
| API style REST/GraphQL/híbrida | Architecture | OPEN — Architecture |
| Kubernetes | Architecture | OPEN |
| NFRs y CI/CD | Platform | OPEN — Architecture / Technical Spec |


## 16. Traceability

### 16.0 Owner confirmation basis for v0.4

Esta versión incorpora las recomendaciones funcionales aceptadas por el Owner durante la revisión del 2026-10-03. Entre ellas: **Accounts Receivable / Cuentas Corrientes dentro del MVP**, Purchases/AP fuera del MVP inicial, reserva de stock al confirmar Order, decremento físico al salir la mercadería, Cart sin Customer, Customer genérico para ventas sin identificación nominal, Product/BusinessProduct governance, Cash mediante Permissions, Messaging con Customer sin User, y **MFA obligatorio para Owner/Admin y opcional para Vendedor/Gestor de Stock**.

Los identificadores formales del nuevo bloque de Owner Decisions deben formalizarse en el Decision Register; esta SPEC no inventa IDs nuevos para esas decisiones.





### 16.1 Cadena



```text

Requirement  →  SPEC rule (sección de este documento)  →  OR-B2 / decisión

```



Esta SPEC **no** crea IDs nuevos de requisito ni de regla: cita secciones (`§n`), `REQ-*` ya existentes en `05-REQUIREMENTS/00-WAPSELL-REQUIREMENTS-RECONCILED-001-490.md` y decisiones ya existentes. Los `REQ-*` siguen siendo requisitos candidatos (OR-B2-022).



### 16.2 OR-B2 → SPEC



| OR-B2 | Sección de esta SPEC | Requirement candidato asociado (existente) |

|---|---|---|

| 001 | §6.1, §3.1 | REQ-ID-002, REQ-ID-006, REQ-AUTHZ-001, REQ-AUTHZ-002 |

| 002 | §6.2 | REQ-ID-002 |

| 003 | §5.3 | REQ-ID-003 |

| 004 | §8, §10.2 | REQ-CUST-001 |

| 005 | §5.1 | REQ-ID-001 |

| 006 | §5.2 | — |

| 007 | §5.3, §5.4 | REQ-ID-005 |

| 008 | §7 | REQ-ID-006, REQ-SAAS-001, REQ-FUL-003 |

| 009 | §7 | REQ-ID-006 |

| 010 | §10.1 | REQ-CAT-002, REQ-ID-004 |

| 011 | §10.2 | REQ-CART-001 |

| 012 | §10.3, §10.4 | REQ-ORD-001 |

| 013 | §10.3, §10.4 | REQ-ORD-002 |

| 014 | §11 | REQ-ORD-003 |

| 015 | §10.4 | REQ-SALE-001, REQ-SALE-002 |

| 016 | §11 | REQ-INV-005 |

| 017 | §11 | REQ-INV-006, REQ-BIZ-004 |

| 018 | §11 | REQ-INV-003 |

| 019 | §12 | REQ-MSG-001 |

| 020 | §1.3, §12 | REQ-MSG-001 |

| 021 | §12 | REQ-MSG-003 |

| 022 | §2 | — |

| 023 | §2 | — |

| 024 | §13 | — |

| 025 | §10.5 | REQ-RET-001, REQ-REF-001 |

| 026 | §10.5 | REQ-PRICE-001, REQ-PROMO-001 |



### 16.3 Estado de las 26 OR-B2 en esta SPEC



Las 26 OR-B2 están incorporadas, cada una en la sección indicada en §16.2, **a nivel conceptual**. Incorporación no significa implementación ni autorización de implementar.



---



## 17. Evidencia, estado de implementación y límites de esta fase



\- **Decisión ≠ implementación.** Esta SPEC no afirma que ninguna regla esté implementada. Las citas AS-IS (§7, §11) llevan su etiqueta de evidencia y proceden de auditorías anteriores no reverificadas en esta pasada. El AS-IS actual descuenta stock al confirmar el pedido (`DOCUMENTADO`); eso describe el sistema existente, no define el TO-BE (§10.3, §11).

\- **Esta SPEC no produce** (y no debe producirse en esta fase): contratos de API, esquema final de base de datos, cambios de Prisma, endpoints, catálogo de eventos, IDs técnicos de permisos, tareas de implementación, plan definitivo, scripts de migración ni código.

\- Cadena de avance, sin saltear etapas:



```text

REQUIREMENTS → CANONICAL SPEC → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → PLAN → IMPLEMENTATION

```



\- `TECHNICAL SPECIFICATION = NOT APPROVED` como documento único: cada dominio la cierra en su spec especializada.

\- `IMPLEMENTATION = AUTHORIZED INCREMENTALLY` (OR-B4-001): mediante PRs que pasen los checks obligatorios (Lint and Type Check, B3, B4, Jest), mantengan el aislamiento por Business e incluyan tests del comportamiento que cambian. Siguen requiriendo decisión explícita del Owner las migraciones destructivas, el borrado de datos, los cut-overs de identidad o permisos legacy (OR-B4-010), los cambios que contradigan un Owner Ruling y el alcance fuera del MVP. Los deploys a producción mantienen la aprobación manual del environment `production`.



---



## 18. Contenido retirado o superado respecto del v0.2



El v0.2 se conserva en el historial de git. Esta v0.4 no reescribe el historial en silencio:



| v0.2 | Tratamiento en v0.4 | Autoridad |

|---|---|---|

| §3 / §5: "todo converge en `User`" (Customer = User) | Superado: `Customer ≠ User`. | `OR-B2-004`, `D-002-bis` |

| §7 y §22: el v0.2 no definía el catálogo de roles | Reemplazado por el catálogo de §7. | `OR-B2-008`, `009` |

| §7 y §21: "el tipo de token debe validarse" | Reemplazado por los 4 controles conceptuales. | `OR-B2-002` |

| §13 y §23: el MVP no introduce ubicaciones físicas | Superado: Locations/Warehouses mínimos. | `OR-B2-017` |

| §13 y §22: rotación FIFO | Superado: FEFO con vencimiento, FIFO sin vencimiento. | `OR-B2-016` |

| §20: "El stack base incluye NestJS, PostgreSQL, Docker… VPS" | Retirado como decisión: solo el Modular Monolith está aprobado como dirección. | `OR-B2-024` |

| §20 y §22: "no se implementarán microservicios ni Kubernetes ni GraphQL" | Sin ruling propio: `OPEN`. | `OR-B2-024` |

| §9 y §20: "Messaging es un módulo de primera clase" | Precisado: dominio funcional de primera clase; no implica módulo visual independiente. | `OR-B2-019` |

| §22 IN SCOPE: Payments, Cash, AR, Purchases, Fulfillment como "en alcance" | Conservado como dirección `DERIVED` sin corte MVP (§1.3, §10.6). | `D-011`…`D-016` |

| Bloque de procedencia del encabezado del v0.2 (tabla DEC-001) y notas POST-OR-B2 | Absorbidos en §0, §2 y §3; el contenido normativo se re-expresa con su autoridad citada. | `OR-B2-023` |

| §24 Domain Map, §25 Navigation MVP, §26 First Implementation Vertical | No se trasladan: son `PROPOSED`; la secuencia de implementación pertenece al Plan, no a la SPEC. | — |

| Referencias a documentos inexistentes (Cash SPEC, Fulfillment SPEC, etc.) | No se replican; la ausencia de esas especificaciones se declara en §10.6. | — |



---



## 19. Contradicciones y conflictos registrados (sin resolver en silencio)

Los conflictos resueltos por la Owner Review posterior a v0.3 se conservan como trazabilidad histórica y no permanecen como `OPEN`.

| # | Conflicto | Tratamiento v0.4 |
|---|---|---|
| 1 | `REQ-ORD-002` vs `OR-B2-013` sobre quién confirma el Order | **Resuelto.** La confirmación requiere el Permission de confirmar órdenes; no queda acoplada a un Role concreto. |
| 2 | `REQ-CART-001` vs `OR-B2-011` sobre titularidad del Cart | **Resuelto.** Cart puede existir sin Customer; el mecanismo técnico queda para Architecture. |
| 3 | `REQ-MSG-003` vs `OR-B2-021` sobre pertenencia de Conversation | **Resuelto.** Cada Conversation pertenece exactamente a un Business. |
| 4 | `G67` vs `OR-B2-009` sobre Owner/Admin | **Resuelto.** Owner y Admin son roles distintos. |
| 5 | Specialized Identity spec conserva roles históricos de ejemplo | **No normativo.** Rigen los roles de §7; el documento especializado requiere reconciliación posterior. |
| 6 | Specialized Identity spec contiene codificación dañada | **Defecto documental pendiente.** No altera la autoridad de esta SPEC. |
| 7 | `R1/R2/R3` mantiene doble significado | **OPEN — C-20.** |
| 8 | Specialized specs conservan texto previo a OR-B2 | **Pendiente de propagación especializada.** Esta SPEC general prevalece donde existe Owner Ruling aplicable. |


## 20. Change History

| Versión | Fecha | Resumen |
|---|---|---|
| v0.2 | 2026-09-28 | Reconciliación previa contra DEC-001 y D-001…D-018. |
| v0.3 | 2026-10-03 | Consolidación post OR-B2; incorporación de OR-B2-001…026; delimitación de autoridad y OPEN areas. |
| **v0.4** | **2026-10-03** | **Incorporación de las decisiones funcionales aceptadas en la Owner Review posterior a v0.3. Se cierra Commerce básico, AR dentro del MVP, Purchases fuera del MVP, Inventory reservation/decrement semantics, Product/BusinessProduct governance, Messaging boundary, Cash permissions, MFA por rol y límites Architecture/Technical. Se preservan como OPEN los asuntos que requieren fuente o especificación especializada. No se autoriza implementación.** |
| **v0.5** | **2026-11-10** | **APPROVED (OR-B4).** Integra OR-B3, las decisiones R8 (ID-002/003, COM-003/004, AUTH-001, INV-002/003, ORD-002, PAY-002/003), AUTH-01…12 y OR-B4-001…023. Estados de Order según R8-ORD-002; Membership con tres estados; autorización con catálogo único y matriz fija; reserva de stock y Location MAIN en el MVP; Consumidor Final y Cart anónimo; Mercado Pago; REST. Se agrega §21 (brechas AS-IS → SPEC como backlog). |

### Cambios principales de v0.4

- `Order` puede ser confirmado mediante Permission `ORDER_CONFIRM`.
- `Order` y `Sale` mantienen separación conceptual; la Sale nace con la confirmación comercial.
- Se fijan estados conceptuales mínimos de Order y Sale sin convertirlos en contratos técnicos.
- `Payment` queda separado de `Sale`.
- `Cart` puede existir sin Customer.
- Se reconoce Customer genérico `Consumidor Final` para ventas sin identificación nominal.
- Pricing, Promotions, Returns y Refunds quedan dentro de la dirección funcional del MVP/TO-BE; sus reglas detalladas siguen en specs especializadas.
- Returns/Refunds no modifican retroactivamente una Sale confirmada.
- **Accounts Receivable / Cuentas Corrientes entra en MVP.**
- Purchases/AP quedan fuera del MVP inicial.
- Cash pertenece al Business y utiliza Permissions específicos para operaciones sensibles.
- Inventory admite una o más Locations, con una principal mínima; reserva al confirmar Order y decremento físico al salir la mercadería.
- FEFO con vencimiento y FIFO sin vencimiento.
- Product global + BusinessProduct; SKU/precio/visibilidad comercial son Business-specific.
- Messaging sigue siendo first-class y conversation-centric; Customer puede participar sin User.
- G001–G105 permanece como fuente funcional secundaria.
- Modular Monolith se mantiene como dirección; GraphQL/REST y Kubernetes se mantienen como decisiones de Architecture/OPEN.
- **MFA: obligatorio para Owner/Admin; opcional para Vendedor/Gestor de Stock.**
- Se preserva la separación entre SPEC funcional, Architecture, Technical Specification e Implementation.

### Estado

```text
SPEC STATUS = APPROVED (OR-B4, 2026-11-10)
TECHNICAL SPECIFICATION = NOT APPROVED (por dominio)
IMPLEMENTATION = AUTHORIZED INCREMENTALLY (OR-B4-001)
```

## POST-OR-B3 — OWNER RULINGS PROPAGATED

Las decisiones OR-B3-001…OR-B3-014 quedan incorporadas como rulings posteriores a v0.4. Por ISS-08, cualquier referencia histórica a estos puntos como `OPEN OWNER DECISION` queda superseded.

- Customer/User: matching híbrido controlado; asociación opcional y controlada.
- SaaS Admin: conceptual, fuera del MVP operativo.
- Locations: concepto genérico; MAIN mínimo; múltiples permitidas.
- Product: identidad global + BusinessProduct para configuración comercial por Business.
- Order: la confirmación comercial es una acción del Business autorizada por `ORDER_CONFIRM`; la confirmación del Customer representa intención/aceptación, no autorización del Business.
- Cart: puede existir sin Customer; Customer requerido antes de crear Order.
- Messaging: Customer puede participar sin User.
- Inventory: la reserva ocurre al confirmar Order; el decremento físico ocurre mediante movimiento de salida que representa la salida real.
- Cash: operaciones sensibles se gobiernan mediante Permissions específicas.
- Fulfillment: incluido en MVP bajo Orders; Repartidor sigue fuera de Membership Roles MVP.
- G001–G105: fuente funcional secundaria.
- MFA/2FA: obligatorio para Owner/Admin; mecanismo técnico pendiente.
- Kubernetes/GraphQL: permanecen OPEN como decisiones técnicas; no están prohibidos ni aprobados.

Estos rulings no convierten la SPEC en Technical Specification aprobada. La autorización de implementar la da OR-B4-001 (v0.5).

---

## 21. Brechas AS-IS → SPEC (backlog)

Con la aprobación (OR-B4-001), la implementación existente es el AS-IS aceptado y cada diferencia con esta SPEC es trabajo
pendiente rastreado. Evidencia: código de `main` al 2026-11-10 (`VERIFICADO POR CÓDIGO`); los tests citados corren en B4.

| Área | SPEC | AS-IS | Decisión | Backlog |
|---|---|---|---|---|
| Roles | OWNER / ADMIN / VENDEDOR / GESTOR_DE_STOCK | OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR | AUTH-01, OR-B4-006 | #160 |
| Autorización | Catálogo único, matriz fija, motor único | UsuarioPermiso + RoleTemplate/Capability/Grant | AUTH-02…10, OR-B4-007 | #161 |
| Membership | ACTIVE / SUSPENDED / INACTIVE | ACTIVE / SUSPENDED | R8-ID-002, OR-B4-008 | #162 |
| MFA | Obligatorio Owner/Admin | No existe | OR-B3-014, OR-B4-009 | #163 |
| Convivencia legacy | Cut-over por criterios | Usuario/Empresa conviven con User/Membership | R8-ID-003, OR-B4-010 | #164 |
| Stock | Reserva al confirmar, decremento en la salida | Descuenta al confirmar | R8-INV-002, OR-B4-012 | #165 |
| Locations | MAIN por Business | No existe | R8-INV-003, OR-B4-015 | #166 |
| Cart / Customer | Consumidor Final; Cart anónimo | Cart exige Customer | R8-COM-004, OR-B4-014 | #167 |
| Order | 10 estados reconciliados; `ORDER_CONFIRM` | Solo RECIBIDO→CONFIRMADO/CANCELADO; `pedidos.gestionar` | R8-ORD-002, OR-B4-013 | #168 |
| Catálogo | Product global + BusinessProduct (por etapas) | Producto por Empresa | R8-COM-003, OR-B4-011 | #169 |
| Pagos | Mercado Pago real | Proveedores simulados | OR-B4-016 | #158 |
| POS / Tienda (Remix) | Sobre la API, sin acceso directo a la base | Diseño de #100 no portable | OR-B4-001 | #157 |
| Dashboard (Remix) | Páginas sobre la API con `requireAuth` | Diseño de #100 no portable | OR-B4-001 | #159 |
| Specs especializadas | Subordinadas y reconciliadas | Identity/Commerce previas a OR-B2/R8 | OR-B4-005 | #170 |
| Estado del proyecto | Documento actualizado | Fechado 2026-10-03 | — | #171 |

Ya alineado con la SPEC (evidencia `VERIFICADO POR TEST` en B4): aislamiento por Business (§6.3), `Customer ≠ User` (§8),
Messaging por Business con Customer sin User (§12), Sale `CONFIRMADA/ANULADA` (§10.4), ciclo de Cash (§10.9), stock nunca
negativo (§11), Modular Monolith con REST (§13).
