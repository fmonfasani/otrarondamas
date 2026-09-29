# Wapsell — Commerce (TO-BE)
**Fase:** 6.1 — TO-BE Commerce · **Creado:** 2026-09-28 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> - **D-007, D-008, D-011, D-012, D-015, D-016 → `APPROVED — DERIVED / RECONSTRUCTED`.** Texto
>   canónico en `04-DECISIONS/00-DECISION-REGISTER.md` §4. Usables como requisito; **no** citable como
>   texto aprobado hasta que el Owner confirme la redacción.
> - **D-001, D-002, D-002-bis → `APPROVED — OWNER-VERBATIM`.** Citable.
> - **D-005, D-006 → `APPROVED — DERIVED / RECONSTRUCTED`.**
> - **D-010, D-014 → `APPROVED — OWNER-RULED 2026-09-28`** (§4.3.1: v1.0 prevalece), **texto**
>   `DERIVED / RECONSTRUCTED`. Se citan solo como frontera para Commerce (§12).
> - **DEC-001 → `APPROVED DIRECTION`.** Excluye explícitamente el modelo de datos, el plan de
>   migración y el diseño de token (`04-DECISIONS/02-MULTITENANCY.md:55-57`).
> - **`IMPLEMENTATION DETAIL` = `OPEN` en todo el documento.**
>
> Este documento es **TO-BE conceptual**. No produce schema, contratos, invariantes, tests ni plan. Es el
> escalón TO-BE de `REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS → PLAN →
> IMPLEMENTATION`, y la fase se detiene aquí.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Estados inventados: 0. IDs inventados: 0.
> Conflictos resueltos: 0.**

---

## 0. Corrección de partida: el cuerpo de `02-COMMERCE-SPEC.md` está desactualizado

Esto condiciona todo el documento y debe leerse antes que nada.

El encabezado *Normative basis* de `02-CANONICAL-SPEC/02-COMMERCE-SPEC.md` (`:4-35`) **ya fue
reconciliado** y afirma que el texto reconstruido de D-001…D-018 existe. Sin embargo, **el cuerpo de
ese mismo documento conserva el error**: §4.1 (`:113`), §5.1 (`:146-147`), §6.1 (`:183`), §7.1
(`:211`) y §8.2 (`:241-253`) siguen declarando, de forma repetida, que *"D-007 has no decision
text"*, *"D-007 and D-008 have no decision text"*, *"D-011 has no decision text"*, *"D-012 has no
decision text"* y degradan el contenido funcional a `TO-BE PROPOSED` / `NOT DETERMINABLE`.

**Esa afirmación del cuerpo es incorrecta.** El registro canónico §4 **sí contiene texto reconstruido**
para las seis decisiones de Commerce, y ese texto es exactamente el que las secciones citadas degradan
como `NOT DETERMINABLE`. Es la repetición del error de inventario ya retractado como **GRF-09**
(`00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md:198,221`; `04-DECISIONS/00-DECISION-REGISTER.md:185`):

> ~~GRF-09 — 18 approved decisions have no text.~~ **RETRACTED — FALSE.** Reconstructed text for all
> D-001…D-018 exists at root level.

El propio encabezado de la SPEC lo anticipa y se refiere a sus propios dominios:

> *"This matters most for this spec, whose domains (D-007…D-012, D-015) now have reconstructed text
> that was previously invisible. Sections below that said 'D-0xx has no decision text' are
> **superseded**."* — `02-CANONICAL-SPEC/02-COMMERCE-SPEC.md:14-17`

| Decisión | Estado real en el registro §4 | Consecuencia para este TO-BE |
|---|---|---|
| D-007 Order/Sale | `APPROVED — DERIVED / RECONSTRUCTED` (`:104`) | La distinción `Order` ≠ `Sale` **está decidida en dirección**; sus condiciones y estados concretos siguen `OPEN` |
| D-008 Sale lifecycle | `APPROVED — DERIVED / RECONSTRUCTED` (`:105`) | El ciclo explícito, la no eliminación y la anulación operativa **están decididos en dirección**; los estados exactos siguen `OPEN` |
| D-011 Payments | `APPROVED — DERIVED / RECONSTRUCTED` (`:108`) | Pasarelas externas, Mercado Pago prioritario y abstracción de proveedor **están decididos**; el contrato técnico sigue `OPEN` |
| D-012 Accounts Receivable | `APPROVED — DERIVED / RECONSTRUCTED` (`:109`) | AR por `Business`, deuda asociada al cliente y cadena de cobros **están decididos**; el modelo contable sigue `OPEN` |
| D-015 Purchases/AP | `APPROVED — DERIVED / RECONSTRUCTED` (`:112`) | Compra a `Proveedor`, AP asociada y aplicación de pagos **están decididos**; el ciclo completo sigue `OPEN` |
| D-016 Fulfillment | `APPROVED — DERIVED / RECONSTRUCTED` (`:113`) | Fulfillment en el dominio de Pedidos y el recorrido de entrega **están decididos**; asignación y estados finos siguen `OPEN` |

**Efecto sobre los conflictos.** `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md` mantiene CON-016,
CON-017, CON-020, CON-021, CON-024 y CON-025 en `OPEN`, con la fórmula ya correcta: *"Decision text
exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap."* **Este documento
respeta ese estado**: la dirección existe, el gap AS-IS no queda resuelto por ella, y ningún conflicto
se cierra aquí.

**Fuentes stale adicionales detectadas** (no se modifican en esta fase):
- `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:53-54,57-58,61-62` marca D-007, D-008, D-011, D-012,
  D-015 y D-016 como `NOT DOCUMENTED` / `NOT DETERMINABLE`. (Las filas de D-010 `:56` y D-014 `:60`
  sí están actualizadas con la evidencia de auditoría.)
- `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:80-86` deriva `Pedido`→`Order`, `Venta`→`Sale`,
  `Pago`→`Payment` y AR como `NOT DETERMINABLE (D-007/D-011/D-012)`.
- `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:77` afirma que para `Cliente`→`Customer` la decisión es
  *"NOT DECIDED — separate entity, a `User`, or both"*, cuando D-002-bis ya lo decidió
  (`OWNER-VERBATIM`): entidad separada, vínculo opcional.
- `02-COMMERCE-SPEC.md:146-147` cita las fichas `D-007-orders-sales.md` y
  `D-008-sales-lifecycle-returns.md`; los nombres reales son `D-007-sale-order-definition.md` y
  `D-008-sale-lifecycle.md` (`03-DECISION-WORKSHOP/`).
- `02-COMMERCE-SPEC.md` sigue usando `Tenant` como nombre de entidad. El término canónico es
  **`Business`** (D-001, `OWNER-VERBATIM`; CON-009 `RESOLVED`).

---

## 1. Alcance y perímetro de Commerce

### 1.1 Dentro de alcance

`Customer`, `Catalog`/`Product`, `Pricing`, `Order`, `Sale`, `Payment`, `Accounts Receivable`, y las
relaciones con `Purchases`/`Accounts Payable` y `Fulfillment` **cuando corresponda**. El SPEC general
§10 (`:139`) delimita Commerce así:

> *"El dominio de Comercio abarca: `Order` (intención/operación comercial), `Sale` (operación económica
> confirmada), `Customer`, `Catalog` y `Pricing`."*

`Purchases`/`Accounts Payable` y `Fulfillment` entran en este documento **solo** donde una decisión de
Commerce las invoca: D-008 nombra caja, stock, pagos y cuentas por cobrar; D-015 y D-016 son dominios
propios, resumidos aquí en §10 y §11 sin desarrollarlos.

### 1.2 Fuera de alcance

`Cash` (D-013, CON-022), `Inventory` (D-010/D-014, CON-023), `Messaging` (D-003), `Branding` (D-004),
`Reports` (dominio `D20` en §24; SPEC general §17), `Audit` (dominio `D21` en §24; SPEC general §18) y la
arquitectura (D-017; SPEC general §9). Se mencionan **únicamente** donde una decisión de Commerce las
invoca como efecto o frontera; **no** se desarrollan.

### 1.3 Distinción obligatoria: NAVIGATION MODULE ≠ BUSINESS DOMAIN ≠ ENTITY

Esta distinción es la causa de que el AS-IS use un mismo nombre para tres cosas. Se define en
`07-TOBE/00-TOBE-OVERVIEW.md` §5 y se aplica aquí sin modificarla.

| | **NAVIGATION MODULE** | **BUSINESS DOMAIN** | **ENTITY** |
|---|---|---|---|
| Qué es | Entrada de primer nivel del shell | Área acotada de responsabilidad | Concepto persistente con datos |
| Responde a | ¿Dónde trabaja el usuario? | ¿Qué reglas y datos van juntos? | ¿Qué se guarda? |
| Cambiarlo obliga a | Reordenar la UI | Rediseñar reglas o mover datos | Migración de datos |
| Autoridad de la lista | SPEC general §25 — `TO-BE PROPOSED` | §24 — `TO-BE PROPOSED` | SPEC + decisiones de dominio |

**Aplicación a Commerce** (dominios según §24; navegación según §25):

| Concepto | ¿Entidad? | ¿Business Domain? | ¿Navigation Module? |
|---|---|---|---|
| `Customer` | Sí (D-002-bis) | D05 Customers — `TO-BE PROPOSED` | **No**. Ningún ítem de §25 lo nombra |
| `Product` / `Catalog` | Sí | D06 Catalog — `TO-BE PROPOSED` | **No** |
| `Pricing` | **No es entidad** en ninguna decisión: es el valor monetario de un `Product` | D07 Pricing — `TO-BE PROPOSED` | **No** |
| `Order` | Sí (D-007) | D09 Orders — `TO-BE PROPOSED` | **No** |
| `Sale` | Sí (D-007/D-008) | D10 Sales — `TO-BE PROPOSED` | **No** |
| `Payment` (cobro al cliente) | Sí (D-011) | D11 Payments — `TO-BE PROPOSED` | **No** |
| `Purchase` / `Supplier` | Sí (D-015) | D14 Purchases / D15 Suppliers | **Sí**, "4. Compras" |
| `Accounts Payable` | **No es entidad decidida**: es una responsabilidad | D17 — `TO-BE PROPOSED` | **No** |
| `Accounts Receivable` | **No es entidad decidida**: es una responsabilidad | D16 — `TO-BE PROPOSED` | **No** |
| Fulfillment | **No es entidad** en D-016 | D18 Fulfillment — `TO-BE PROPOSED` (§24), pero **D-016 lo ubica dentro del dominio de Pedidos** | **No** — D-016: *"no constituye necesariamente un módulo principal independiente de navegación"* |
| `Cash` | Fuera de alcance | D12 Cash | **Sí**, "3. Caja" |

**Tres observaciones, sin resolver:**
1. **`Customer` no tiene ítem de navegación en §25**, pese a ser dominio del §24 y el actor central de
   Commerce. Dónde se ubica en la navegación es `OPEN DETAIL` (§15, punto 57).
2. **Caja y Compras son módulos de navegación y también dominios**, mientras que `Orders`, `Sales` y
   `Payments` son dominios sin módulo de navegación propio. El desajuste está documentado, no resuelto.
3. **Fulfillment aparece como dominio propio (D18) en §24**, pero D-016 —posterior y más específico—
   lo sitúa en el dominio de Pedidos. El documento cita ambas fuentes sin elegir.

**Evidencia AS-IS de la fricción (no es propuesta).** El panel `pos-admin` tiene rutas reales para
`/orders`, `/ventas`, `/customers`, `/fidelizacion`, `/precios`, `/compras`, `/inventory` y `/cash`
(`05-ASIS/09-ASIS-UI.md:6-10`), es decir **más** entradas que las 8 del MVP propuesto en §25. La
navegación existente es evidencia AS-IS, no una lista aprobada.

---

## 2. Modelo conceptual vs. modelo físico

**CONCEPTUAL TO-BE ≠ PHYSICAL IMPLEMENTATION.** La lista conceptual de Commerce es:

`Business` · `Customer` · `Product` · `Order` · `Sale` · `Payment` · `Purchase` · `Supplier` ·
deuda/saldo (AR) · obligación/saldo (AP) · responsabilidad de Fulfillment.

**Esto NO significa, y no habilita:** `model` de Prisma · `FK` · `UUID` · `enum` · `index` ·
`@@unique` · `@@index` · tabla · trigger · `CHECK` · constraint física · nombre de campo · tipo.

| | `CONCEPTUAL TO-BE` | `PHYSICAL IMPLEMENTATION` |
|---|---|---|
| Estado | Definido en este documento, con autoridad | **`OPEN` en su totalidad** |
| Autoridad | D-007, D-008, D-011, D-012, D-015, D-016 | Ninguna decisión autoriza un schema. DEC-001:55-57 lo excluye |
| Fase | 6.1 (este documento) | Fase posterior, con decisión propia |
| Ejemplo | "Una `Sale` confirmada no se elimina" | `model Venta { estado SaleEstado @default(...) }` |

`Pricing`, `Accounts Receivable` y `Accounts Payable` son **responsabilidades de negocio**, no
entidades. Su modelado físico no está decidido ni aquí ni en ninguna fuente.

---

## 3. Customer

### 3.1 Concepto — `APPROVED` (D-002-bis, `OWNER-VERBATIM`)

> **"`Customer` NO se fusiona con `User`. `Customer` representa la relación comercial del
> comprador/cliente con un `Business`. Puede vincularse opcionalmente a un `User`, sin exigir uno.
> Pertenece al contexto de un `Business` y puede incluir compras, pedidos, historial, cuenta
> corriente/deuda cuando aplique, condiciones comerciales y demás datos de Commerce."** — D-002-bis
> (`04-DECISIONS/00-DECISION-REGISTER.md:99`)

Cuatro propiedades **aprobadas**:

1. **No es `User`.** No es un tipo de `User` ni una proyección de `User`. La fusión queda **refutada
   de forma permanente**; CON-010 **CERRADA** (`10-CONFLICT-RESOLUTION-MAPPING.md:69`).
2. **Pertenece a un `Business`.** Su información comercial no es accesible desde otros `Business`.
   Coherente con D-001 (unidad de aislamiento) y DEC-001:13-14. El **mecanismo** es
   `IMPLEMENTATION DETAIL` / `OPEN`.
3. **Puede existir sin `User`.** Comprador con login y comprador sin login son ambos válidos. Evidencia
   AS-IS que lo respalda: la tienda online admite comprador sin `Usuario` (`05-ASIS/07-ASIS-FLOWS.md:33-35`
   — *"Cliente anónimo navega catálogo público"* → `POST /tienda/pedidos` *"crea o reusa `Cliente`"*).
4. **Vínculo con `User` opcional.** Un `User` puede ser `Customer` de múltiples `Business`, y un mismo
   `Business` puede tener muchos `Customer`. *(Derivado de D-002-bis: `User` es identidad global con
   `Membership` N:N, y `Customer` pertenece a un `Business`; el modelado del vínculo es `OPEN`.)*

**Consecuencia directa y normativa:** D-012 sitúa la Cuenta por Cobrar *"asociada al cliente"* — es
decir, asociada al **`Customer`**, **no** al `User`. Cualquier modelo de AR indexado por `User`
contradiría D-002-bis. Ver §9.

**Límite de lo aprobado:** el texto de D-002-bis **no enumera qué datos debe tener** el `Customer`. Nombra
*categorías* —compras, pedidos, historial, cuenta corriente/deuda, condiciones comerciales y demás datos
de Commerce—, no campos, no obligatoriedad, no tipos, no ciclo de vida. D-002-bis tampoco dice nada sobre
**roles de cliente**: no existe tal concepto en ninguna decisión. El AS-IS tiene `Cliente.esMayorista`
(minorista/mayorista) y el enum `RolUsuario.ASISTENTE_LOCAL` (`05-ASIS/03-ASIS-DATA.md:12,31`), pero el
primero es un atributo de negocio y el segundo un rol de empleado humano del comercio; ninguno es un rol
de `Customer`, y ninguno está respaldado por decisión. **El TO-BE no los adopta.** Los roles de cliente y
los atributos del `Customer` son `OPEN DETAIL` (§15, puntos 5 y 6).

### 3.2 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS (`05-ASIS/03`, `05-ASIS/07`) | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Identidad de cliente | `Cliente` = identidad de tienda online, **separada** de `Usuario`, con login/registro propios; mismo patrón `passwordHash`/`googleId` | Ninguno en identidad: el AS-IS ya separa. El gap es que la separación es **por tipo de identidad**, no por relación comercial | **D-002-bis** | `Customer` = relación comercial con un `Business`; **no** un `User` | Modelo físico; cardinalidades; identificadores; constraints |
| Comprador sin cuenta | El flujo crea o **reusa** `Cliente` desde la tienda pública (`05-ASIS/07:33-35`) | Ninguno. El AS-IS admite comprador sin `Usuario` y la decisión lo confirma | **D-002-bis** | Ambos casos válidos; vínculo `Customer`↔`User` **opcional** | Estrategia de linking; deduplicación |
| Scoping multi-Business | `Cliente` con `@@unique([empresaId, email])` y FK a `Empresa` (`05-ASIS/03:31`) | `Empresa` no es `Business`; no hay `Business`/`Membership` | **D-001**, **D-002-bis** | Pertenece al contexto de un `Business` | Modelo físico; clave de partición; aislamiento |
| Un `User`, varios negocios | No expresable: `Usuario.empresaId` es escalar obligatorio (1:1) | **Bloqueante**: una persona no puede operar en dos negocios (GAP-001, `BLOCKING`) | **D-002** | `User` global + `Membership` N:N | Modelo físico de `Membership` |
| Tipos de cliente | `Cliente.esMayorista` (minorista / mayorista) | El AS-IS tiene una distinción que **ninguna decisión** respalda | **Ninguna** | No definido | Tipos de cliente y su efecto sobre `Pricing`: `OPEN` — ver §5 |
| Ciclo de vida | Sin estados de `Cliente` en el schema | Ninguna fuente define ciclo de vida | **Ninguna** | No definido | Ciclo de vida; bajas; deduplicación: `OPEN` |
| Migración `Cliente` → `Customer` | — | — | **Ninguna** | Dirección aprobada por D-002-bis | Estrategia de migración: `OPEN` (DEC-001:55-57 excluye el plan) |

---

## 4. Catalog / Product

### 4.1 Concepto — `TO-BE PROPOSED`

`Product` representa un bien o servicio **ofrecido por un `Business`**. La SPEC de Commerce lo declara
`PROPOSED` y lista como atributos `PROPOSED`: nombre, descripción, imágenes, SKU, `Pricing` y stock
mínimo (`02-COMMERCE-SPEC.md:80-82`).

**Ninguna decisión D-001…D-018 trata la estructura del catálogo.** Por lo tanto:

| Elemento | AS-IS (evidencia) | Categoría AS-IS | Categoría TO-BE |
|---|---|---|---|
| Jerarquía de 4 niveles: `Familia → Subfamilia → Tipo → Subtipo`, cada uno con `prefijo String @db.Char(3)` para el SKU | `VERIFIED BY CODE` (`05-ASIS/03:24-25`; `05-ASIS/01:19`) | Comportamiento AS-IS | **`TO-BE PROPOSED`** — no hay decisión (`02-COMMERCE-SPEC.md:83-85`) |
| Unicidad de nombre/prefijo **dentro del padre**, no global | `VERIFIED BY CODE` (`05-ASIS/03:25-26`) | Comportamiento AS-IS | **`TO-BE PROPOSED`** (`02-COMMERCE-SPEC.md:86-89`) |
| `@@unique([empresaId, codigoInterno])` en `Producto` | `VERIFIED BY CODE` (`05-ASIS/03:26`; `AUD-D014-C09`) | Comportamiento AS-IS | Conserva el aislamiento de SKU entre Business; modelado TO-BE `PROPOSED` / `OPEN` |
| `Presentacion` como entidad | `VERIFIED BY CODE` (`05-ASIS/03:28-29`) | Comportamiento AS-IS | `TO-BE PROPOSED` / `OPEN` |
| `ProductoProveedor` (N:N con `Proveedor`) | `VERIFIED BY CODE` (`05-ASIS/03:29`) | Comportamiento AS-IS | `TO-BE PROPOSED` / `OPEN` |
| `precioMayorista` nullable, "por D-01 sin definir" | `VERIFIED BY CODE` (`05-ASIS/03:27-28`; `05-ASIS/01:49-50`) | Comportamiento AS-IS | `OPEN` — **D-01 no existe en el registro**; el AS-IS lo referencia como pendiente |

**D-014 alcanza a `Product` indirectamente:** el inventario pertenece exclusivamente a cada `Business`,
sin stock global compartido, estado `VERIFIED BY CODE` (`AUD-D014-C01`…`C10`; `05-ASIS/03:69-96`). La
*dirección* de aislamiento del catálogo se apoya en D-001; su modelado no está decidido.

**Nota terminológica:** la SPEC de Commerce usa `Tenant` donde el TO-BE usa **`Business`**
(D-001, `OWNER-VERBATIM`). Este documento traduce el término sin alterar el estado `PROPOSED`.

### 4.2 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Estructura de catálogo | Jerarquía fija de 4 niveles con prefijo de 3 caracteres | **No existe decisión** que fije la jerarquía TO-BE | **Ninguna** | No definido | Nº de niveles; nomenclatura; si el prefijo se conserva |
| Unicidad | Nombre/prefijo únicos dentro del padre; `codigoInterno` único por empresa | Mapeo `Empresa`→`Business` no decidido | **D-001** (dirección) | No definido | Claves, constraints, si la unicidad de SKU por `Business` se mantiene |
| Atributos | Nombre, descripción, imágenes, SKU, precio, stock mínimo | **No existe decisión** | **Ninguna** | `TO-BE PROPOSED` | Cuáles sobreviven; obligatoriedad; unidades de medida |
| Presentaciones | `Presentacion` existe | Sin definición TO-BE | **Ninguna** | `TO-BE PROPOSED` | Si es entidad; relación con `Product` |
| Producto–Supplier | `ProductoProveedor` N:N | Sin definición TO-BE | **Ninguna** | `TO-BE PROPOSED` | Relación con `Purchase` (D-015, §10) |

---

## 5. Product ↔ Pricing

### 5.1 Concepto — `TO-BE PROPOSED`

`Pricing` define el **valor monetario** de un `Product` de un `Business`. La SPEC lo marca `PROPOSED` y
advierte que mezcla comportamiento AS-IS verificado con intención TO-BE no decidida
(`02-COMMERCE-SPEC.md:93-95`).

**No existe ninguna decisión D-001…D-018 sobre `Pricing`.** Conforme a la instrucción de no inventar:
**no hay dirección aprobada de `Pricing` que documentar.**

| Elemento | AS-IS (evidencia) | Categoría AS-IS | Categoría TO-BE |
|---|---|---|---|
| `precioUnitario` | `VERIFIED BY CODE` (`05-ASIS/03:38`) | Comportamiento AS-IS | `TO-BE PROPOSED` |
| `precioMayorista` (nullable, "D-01 sin definir") | `VERIFIED BY CODE` (`05-ASIS/03:27-28`; `05-ASIS/01:49-50`) | Comportamiento AS-IS | `TO-BE PROPOSED` |
| `descuentoPorcentaje` a nivel de `Producto` | `VERIFIED BY CODE` (`05-ASIS/03:28`) | Comportamiento AS-IS | `TO-BE PROPOSED` |
| `ReglaFidelizacion` (nivel mínimo + % descuento + alcance opcional, independientes entre sí) | `VERIFIED BY CODE` (`05-ASIS/03:33-34`) | Comportamiento AS-IS | `TO-BE PROPOSED` |
| `NivelFidelidad` `NUEVO`/`FRECUENTE`/`VIP` calculado al vuelo, nunca persistido | `VERIFIED BY CODE` (`05-ASIS/03:11-12`; `05-ASIS/01:30-31`) | Comportamiento AS-IS | `TO-BE PROPOSED` |
| Descuento de fidelización **combinado** (no reemplazado) con el de producto en tienda online | **`VERIFIED BY EXECUTION`** (`05-ASIS/07:44-49`; SRC-004 §33: *"descuento aplicado por ítem, combinado (no reemplazado)"*) | Comportamiento AS-IS verificado | **`OPEN` / `PROPOSED`** — la SPEC de Commerce **retiró** esta regla: *"es una **aserción normativa sin fuente citable**"* (`02-COMMERCE-SPEC.md:103-105`). El AS-IS lo verifica; el TO-BE no lo decide |

**Retirada expresa que este documento respeta:** la SPEC de Commerce eliminó la regla de combinación de
descuentos por carecer de fuente citable en el material normativo, pese a que el AS-IS la verifica por
ejecución. **No se restaura por inferencia desde el comportamiento AS-IS.**

### 5.2 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Modelo de precios | `precioUnitario` + `precioMayorista` | **No existe decisión** | **Ninguna** | No definido | Cuántas listas de precio; vigencia; moneda |
| Descuentos | `descuentoPorcentaje` en `Producto` | **No existe decisión** | **Ninguna** | No definido | Prioridad entre descuentos; combinación vs. reemplazo |
| Fidelización | `ReglaFidelizacion` + `NivelFidelidad` calculado | **No existe decisión**; el AS-IS verifica una combinación que la SPEC retiró | **Ninguna** | No definido | Umbrales de nivel; alcance del descuento; si la combinación se mantiene |
| Minorista vs. mayorista | `Cliente.esMayorista`; `precioMayorista` sin lógica | **No existe decisión**; D-01 no está en el registro | **Ninguna** | No definido | Reglas mayorista/minorista; elegibilidad; validación |
| Promociones | Sin evidencia | — | **Ninguna** | No definido | Promociones, campañas, cupones |
| Redondeo e impuestos | Sin evidencia en las fuentes de Commerce | — | **Ninguna** | No definido | Redondeo; impuestos; precios con impuestos incluidos |

---

## 6. Order vs. Sale

### 6.1 Aplicación estricta de D-007

D-007 (`04-DECISIONS/00-DECISION-REGISTER.md:104`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"`Order` y `Sale` son entidades conceptualmente diferentes. `Order` = solicitud/intención de compra y
> su preparación/confirmación. `Sale` = operación comercial efectivamente confirmada. Una `Order` puede
> originar una `Sale` cuando se cumplen las condiciones definidas. No toda `Order` constituye
> necesariamente una `Sale`. Una venta presencial/POS puede originar una `Sale` directamente."**

Cuatro correlatos **aprobados**, y ninguno más:

1. `Order` ≠ `Sale`. Conceptualmente distintas. **La SPEC de Commerce daba esto por "plausible pero no
   verificada" (`02-COMMERCE-SPEC.md:119-122`); D-007 lo decide.**
2. `Order` = solicitud/intención de compra y su preparación/confirmación.
3. `Sale` = operación comercial efectivamente confirmada.
4. Conversión `Order → Sale` **posible** (no obligatoria) y condicionada; **y** una `Sale` de venta
   presencial/POS puede originarse **sin** `Order` previa. La última cláusula es la fuente que
   autoriza el caso de venta directa.

**No se asume `Order` = `Sale`. No se enumeran estados de `Order`. No se definen las condiciones de
conversión.** D-007 deja los estados completos y las condiciones de conversión como
`IMPLEMENTATION DETAIL` / `OPEN` (`:104`, columna final).

### 6.2 Estados de `Order` — `OPEN DETAIL`

**Ningún estado de `Order` se declara TO-BE en este documento.**

La SPEC de Commerce **eliminó** los cuatro estados inventados `BORRADOR`/`PENDIENTE`/`CONFIRMADO`/
`CANCELADO` y dejó constancia: *"**REMOVIDO — invención.** Ninguna fuente documentada respalda esos
cuatro estados ni sus transiciones"* (`02-COMMERCE-SPEC.md:123-130`). Esa eliminación **se mantiene**.

Evidencia AS-IS que impide reconstruirlos: `Pedido.estado` referencia `EstadoPedido`, un enum con
**10 valores no enumerados en la documentación** (`05-ASIS/03:9`). El flujo AS-IS solo menciona
`PATCH /pedidos/:id/estado` con confirmar/cancelar (`05-ASIS/07:32-36`). Reutilizar esos nombres sería
inventar. **CON-016 permanece `OPEN`** (`10-CONFLICT-RESOLUTION-MAPPING.md:75`).

### 6.3 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Distinción Order/Sale | `Pedido`/`PedidoItem` y `Venta`/`VentaItem` como modelos separados; el AS-IS los usa para online vs. presencial | El AS-IS los separa por **canal**, no por ciclo comercial. El TO-BE no definía la relación | **D-007** | Conceptualmente distintas; `Order` = intención, `Sale` = confirmación | Ninguno en dirección |
| Origen de `Sale` | Venta presencial: `POST /ventas` directo, **sin** `Pedido` | — | **D-007** (textual) | Una `Sale` puede originarse **sin** `Order` | Condiciones de origen |
| Conversión `Order`→`Sale` | `PATCH /pedidos/:id/estado` confirma; el AS-IS **no crea `Venta`** al confirmar | El AS-IS no implementa la conversión que D-007 describe | **D-007** | Conversión **posible** cuando se cumplan las condiciones | **Condiciones de conversión: `OPEN`** |
| Estados de `Order` | `EstadoPedido`, 10 valores no enumerados | Ninguna fuente documentada | **Ninguna** | No definido | Estados y transiciones: `OPEN` — CON-016 |
| Estados de `Sale` | `EstadoVenta` = `CONFIRMADA`/`ANULADA` | El enum AS-IS no es decisión TO-BE | **D-008** (dirección) | Ciclo explícito; confirmación y anulación como operaciones | Estados exactos: `OPEN` — ver §7 |
| Contexto comercial | `VentaItem.precioUnitario` congelado del catálogo, nunca del cliente HTTP (`05-ASIS/03:38-39`) | Ninguna decisión | **Ninguna** | No definido | Si el congelamiento de precio se mantiene |
| Referencia a `Customer` | `Pedido.clienteId` obligatorio, `usuarioId` opcional (`05-ASIS/03:39-40`) | — | **D-002-bis** | `Order` referencia a un `Customer` | Cardinalidad física; obligatoriedad |

---

## 7. Sale lifecycle (D-008)

### 7.1 Aplicación estricta de D-008

D-008 (`04-DECISIONS/00-DECISION-REGISTER.md:105`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"Una `Sale` atraviesa un ciclo de vida explícito. La confirmación es el momento en que se aplican
> sus efectos comerciales, operativos y económicos. Una `Sale` confirmada no se elimina; su anulación
> es una operación explícita que genera reversiones o ajustes sobre stock, caja, pagos y cuentas por
> cobrar según corresponda. Los efectos deben ejecutarse de manera transaccional y consistente, evitando
> estados parcialmente aplicados."**

Cinco propiedades **aprobadas**:

1. **Ciclo de vida explícito.** La `Sale` no es un registro estático.
2. **La confirmación es el punto de aplicación de efectos**: comerciales, operativos y económicos se
   aplican en ese momento.
3. **Una `Sale` confirmada NO se elimina.** *(La SPEC de Commerce degradó esto a `NOT DETERMINABLE` y lo
   llamó "buena práctica PROPOSED" (`02-COMMERCE-SPEC.md:152-159`); D-008 lo **decide**.)*
4. **La anulación es una operación explícita** que produce **reversiones o ajustes** sobre stock, caja,
   pagos y cuentas por cobrar **según corresponda**.
5. **Consistencia transaccional:** los efectos se ejecutan transaccionalmente, **evitando estados
   parcialmente aplicados**.

**No se declara ningún estado TO-BE de `Sale`.** D-008 no enumera estados; su `IMPLEMENTATION DETAIL`
abierto es precisamente *"estados completos, autorizaciones, efectos por dominio"*. Los valores
`CONFIRMADA`/`ANULADA` del enum AS-IS **no se adoptan** como estados TO-BE: describen el AS-IS, como
dice la propia SPEC (`02-COMMERCE-SPEC.md:156-157`).

### 7.2 Efectos al confirmar y al anular — qué está decidido y qué no

D-008 nombra la **categoría** de efectos al confirmar (comerciales, operativos, económicos) y, al anular,
los **ámbitos concretos** (stock, caja, pagos y cuentas por cobrar). Eso es dirección, no un catálogo
cerrado.

| Ámbito | Mencionado en D-008 | Estado TO-BE |
|---|---|---|
| Efectos comerciales | Sí, en la confirmación (categoría) | **Sí, en dirección** |
| Efectos operativos | Sí, en la confirmación (categoría) | **Sí, en dirección** |
| Efectos económicos | Sí, en la confirmación (categoría) | **Sí, en dirección** |
| Stock | Nombrado explícitamente en la anulación | **Sí, en dirección** |
| Caja | Nombrado explícitamente en la anulación | **Sí, en dirección** (mecanismo Cash: fuera de alcance, D-013/CON-022) |
| Pagos | Nombrado explícitamente en la anulación | **Sí, en dirección** |
| Cuentas por Cobrar | Nombrado explícitamente en la anulación | **Sí, en dirección** — ver §9 |
| Contabilidad, Impuestos | **No** nombrados en D-008 | **No definidos.** El AS-IS **no implementa** `Contabilidad`/`Impuestos` (fuera de alcance, CON-003); enumerarlos afirmaría más de lo que la evidencia sostiene (`02-COMMERCE-SPEC.md:160-164`) |
| Reportes | No nombrado | `OPEN` |

### 7.3 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Ciclo de vida | `EstadoVenta` = `CONFIRMADA`/`ANULADA` | El enum **no** es decisión TO-BE; D-008 no enumera estados | **D-008** | Ciclo explícito | **Estados exactos: `OPEN`** — CON-017 |
| No eliminación | `DELETE /ventas/:id` confirmado **inexistente** por ejecución (`05-ASIS/07:18`) | El AS-IS ya no borra, pero **por ausencia de endpoint**, no por regla | **D-008** | Una `Sale` confirmada **no se elimina** | Mecanismo técnico de la prohibición |
| Anulación | `EstadoVenta.ANULADA` existe en el enum, **sin ningún endpoint que lo produzca** (`05-ASIS/01:54-55`; `05-ASIS/07:53-54`) | **El gap central**: el estado existe pero es inalcanzable | **D-008** | Anulación = **operación explícita** con reversiones/ajustes | Comando; permisos; efectos exactos por ámbito: `OPEN` — CON-017 |
| Efectos en la anulación | No implementados | Ningún flujo produce `ANULADA`, luego ningún efecto se verifica | **D-008** | Reversiones/ajustes sobre stock, caja, pagos y AR **según corresponda** | Cuál efecto en qué condición: `OPEN` |
| Consistencia transaccional | Venta presencial: atomicidad confirmada por ejecución (`05-ASIS/07:15-18`) | Verificado **solo** en el camino de venta; no en anulación (no existe) | **D-008** | Efectos transaccionales, sin estados parciales | Mecanismo: `OPEN` |
| Atributos de `Sale` | `idempotencyKey @unique`, `numero Int?` correlativo por empresa, `total`/`descuento` `Decimal(14,2)`, dos campos de descuento separados | **Atributos AS-IS verificados**, no atributos TO-BE decididos (`02-COMMERCE-SPEC.md:165-168`) | **Ninguna** | No definido | Conservación de cada atributo: `OPEN` |
| Devoluciones y reembolsos | Sin flujo AS-IS | — | **Ninguna** explícita | No definido | Proceso completo: `OPEN` |

---

## 8. Payments (D-011)

### 8.1 Aplicación estricta de D-011

D-011 (`04-DECISIONS/00-DECISION-REGISTER.md:108`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"Wapsell debe soportar integración con pasarelas de pago externas. Mercado Pago es la integración
> prioritaria. La integración se desacoplará mediante una abstracción de proveedor. Los pagos externos
> mantendrán estados y trazabilidad de: autorización, aprobación, rechazo, cancelación y
> conciliación, cuando corresponda."**

Cuatro propiedades **aprobadas**:

1. **Soporte de pasarelas externas.**
2. **Mercado Pago es la integración prioritaria.**
3. **Abstracción de proveedor:** la integración se desacopla, de modo que el núcleo comercial **no**
   queda acoplado a Mercado Pago.
4. **Estados y trazabilidad** de cinco eventos: **autorización, aprobación, rechazo, cancelación y
   conciliación**, "cuando corresponda".

### 8.2 Eventos de pago externo — lo único que esta fase declara TO-BE en materia de estados

D-011 nombra explícitamente cinco eventos del ciclo de pago externo. Conforme a la regla de estados de
esta fase, **se documentan como estados TO-BE porque están nombrados por un requisito aprobado**; se
registran como **eventos**, no como valores de un enum:

| Evento | Categoría |
|---|---|
| Autorización | `APPROVED` en dirección (D-011) |
| Aprobación | `APPROVED` en dirección (D-011) |
| Rechazo | `APPROVED` en dirección (D-011) |
| Cancelación | `APPROVED` en dirección (D-011) |
| Conciliación | `APPROVED` en dirección (D-011) |

**Esto no define** la codificación interna, la máquina de estados, las transiciones, el enum ni los
estados internos adicionales. D-011 deja abierto: *"API, checkout, webhooks, credenciales, idempotencia,
conciliación"* (`:108`, columna final).

### 8.3 Alcance de `Payment` — cobro al cliente, no pago a proveedor

`Payment` en este documento cubre el **cobro al cliente** asociado a una `Sale`/`Order`. El **pago a
proveedor** pertenece a `Accounts Payable` / `Purchases` (§10) y **no debe modelizarse con la misma
entidad sin una decisión explícita** (`02-COMMERCE-SPEC.md:188-190`).

**Dos responsabilidades distintas** (corrección explícita de la SPEC, `:191-194`):
- **Cobrar** un `Payment` (esta sección) ≠ **imputar** el cobro a una deuda (§9).
- No puede afirmarse que un `Payment` "es" un cobro de AR. Unificar sin decisión sería inventar.

### 8.4 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Pasarelas externas | **Rechazo explícito**: el DTO de pagos rechaza el string `"Mercado Pago"` con **400**; ni un stub de llamada saliente (`05-ASIS/01:40-41`) | **Contradicción directa** entre el AS-IS y la dirección TO-BE | **D-011** | Soporte de pasarelas externas; **Mercado Pago prioritario** | API, checkout, webhooks, credenciales, idempotencia |
| Abstracción de proveedor | No existe | Ninguna implementación | **D-011** (textual) | **Desacoplar** el núcleo comercial del proveedor | Interfaz de la abstracción; proveedores soportados |
| Estados externos | `EstadoPago` (7 valores) en el enum; no formalizados | El enum AS-IS no es la decisión TO-BE | **D-011** | Autorización, aprobación, rechazo, cancelación, conciliación | Codificación; transiciones; estados internos |
| Medios manuales | Efectivo, transferencia, QR; `montoRecibido`/`vuelto` (solo efectivo), `referencia` (transferencia/QR), `comision` default 0 sin cálculo real (`05-ASIS/03:42-43`) | Comportamiento AS-IS verificado | **Ninguna** | No definido | Conservación de atributos; medios soportados |
| Cobro vs. imputación | Sin `CuentaCorriente` en uso: RF-10 sin implementar (`05-ASIS/03:43-44`; `05-ASIS/07:55`) | No hay flujo que impute un cobro a una deuda | **D-012** (dirección) | Responsabilidades separadas | Relación `Payment` ↔ deuda: `OPEN` |
| Pago a proveedor | `PagoProveedor` existe en el schema (`05-ASIS/03:51`) | Entidad AS-IS separada de `Pago` | **D-015** | Pertenece a AP (§10) | Si comparte entidad con `Payment`: `OPEN` |

**CON-020 permanece `OPEN`** (`10-CONFLICT-RESOLUTION-MAPPING.md:79`).

---

## 9. Accounts Receivable (D-012)

### 9.1 Aplicación estricta de D-012

D-012 (`04-DECISIONS/00-DECISION-REGISTER.md:109`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"Wapsell debe soportar Cuentas por Cobrar por Business. Una venta parcialmente o no cancelada puede
> generar una cuenta por cobrar asociada al cliente. El sistema debe permitir consultar saldos
> pendientes, registrar cobros posteriores, aplicarlos a deudas, mantener trazabilidad y consultar el
> saldo del cliente."**

Cuatro propiedades **aprobadas**:

1. **AR por `Business`** — no global.
2. **Origen:** una venta **parcialmente o no cancelada** puede generar una cuenta por cobrar.
3. **La cuenta por cobrar está asociada al cliente** — al **`Customer`** (D-002-bis), **no** al `User`.
4. **Cadena de operaciones:** consultar saldos pendientes → registrar cobros posteriores → aplicarlos a
   deudas → mantener trazabilidad → consultar el saldo del cliente.

### 9.2 Cadena conceptual

```
Sale (parcialmente o no cancelada)
  → deuda / cuenta por cobrar        [asociada al Customer, dentro del Business]
  → saldo pendiente
  → cobros posteriores
  → aplicación de cobros
  → saldo resultante
  → trazabilidad
```

**Cadena conceptual, no flujo de datos ni modelo de estados.** No hay estados TO-BE de AR: D-012 no
los define.

### 9.3 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Alcance funcional | RF-10 **no implementado**: `CuentaCorriente`, `Deuda`, `AplicacionPago` existen en el schema **sin ningún service que los use** (`05-ASIS/03:43-44`; `05-ASIS/01:42-43`; `05-ASIS/07:55`) | **GAP + MISSING_DECISION.** Modelos huérfanos | **D-012** | AR por `Business`, con la cadena de §9.2 | Requisitos funcionales y financieros detallados |
| Asociación | `AplicacionPago` existe, sin uso | Sin flujo | **D-012** + **D-002-bis** | La deuda se asocia al **`Customer`**, no al `User` | Modelo físico; índices |
| Generadores de la deuda | — | — | **D-012** | Venta parcialmente o no cancelada | Definición operativa de "parcialmente o no cancelada"; umbrales |
| Funcionalidad financiera | Ninguna | — | **Ninguna** | **No existe** `Finance/AR SPEC` en `02-CANONICAL-SPEC/`; la referencia original a ese documento se retira (`02-COMMERCE-SPEC.md:219-222`) | Contabilidad; asientos; documentos; aging; intereses; vencimientos; límites de crédito; workflow de cobranza: todo `OPEN` |

**CON-021 permanece `OPEN`** (`10-CONFLICT-RESOLUTION-MAPPING.md:80`).

---

## 10. Purchases / Accounts Payable (D-015)

Alcance acotado a donde la decisión realmente llega. **No se desarrolla un módulo financiero completo.**

### 10.1 Aplicación estricta de D-015

D-015 (`04-DECISIONS/00-DECISION-REGISTER.md:112`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"Las Compras pertenecen al Business. Una Compra representa una adquisición a un Proveedor y puede
> registrar productos, cantidades, precios, condiciones de pago y recepción. Con importe pendiente se
> genera una Cuenta por Pagar asociada al Business y al Proveedor. Los pagos posteriores deben
> registrarse y aplicarse a las obligaciones, manteniendo trazabilidad y conciliación de saldos."**

Cuatro propiedades **aprobadas**:

1. **Las Compras pertenecen al `Business`.**
2. **Una `Purchase` es una adquisición a un `Supplier`** y puede registrar productos, cantidades,
   precios, condiciones de pago y recepción.
3. **Con importe pendiente** se genera una **Cuenta por Pagar asociada al `Business` y al `Supplier`**.
4. **Los pagos posteriores se registran y aplican a las obligaciones**, con trazabilidad y conciliación
   de saldos.

### 10.2 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Scoping | `Proveedor` con `@@unique([empresaId, nombre])`; `Compra` ligada a empresa (`05-ASIS/03:50`) | `Empresa` ≠ `Business` | **D-015**, **D-001** | La `Purchase` ocurre **dentro** de un `Business` | Modelo físico |
| Ciclo de compra | `BORRADOR → EMITIDA`; recepción parcial o total genera `Lote` + `MovimientoStock` (`05-ASIS/07:26-30`, `VERIFIED BY EXECUTION`) | Estados AS-IS, no decisión TO-BE | **Ninguna** sobre estados | No definido | Estados y transiciones: `OPEN` — CON-024 |
| Condiciones de pago | Sin evidencia AS-IS de condiciones | — | **D-015** (puede registrar) | Registro de condiciones de pago | Reglas de vencimiento, crédito, anticipos: `OPEN` |
| Cuenta por Pagar | `Compra.totalPagado`/`saldo` recalculados en service, nunca editados a mano (`05-ASIS/03:50-51`) | Sin flujo de conciliación documentado | **D-015** | Obligación asociada al `Business` **y** al `Supplier` | Modelo; documentos; asientos: `OPEN` |
| Pagos a proveedor | `PagoProveedor` + `DevolucionProveedor` existen (`05-ASIS/03:51-52`) | Sin conciliación de saldos | **D-015** | Pagos posteriores se registran y aplican a obligaciones | Relación con `Payment` (§8.3): `OPEN` |
| Recepción | `RecepcionCompra`; recepción parcial validada contra pendiente real (`05-ASIS/07:28-30`) | — | **D-015** (registra recepción) | La `Purchase` registra recepción | Reglas; estados: `OPEN` |
| Conciliación de saldos | No implementada | — | **D-015** (dirección) | Mantener trazabilidad y conciliación | Bancaria, fiscal, contable: `OPEN` |
| Workflow de aprobación | Sin evidencia | — | **Ninguna** | No definido | `OPEN` |

**CON-024 permanece `OPEN`** (`10-CONFLICT-RESOLUTION-MAPPING.md:83`).

---

## 11. Fulfillment (D-016)

### 11.1 Aplicación estricta de D-016

D-016 (`04-DECISIONS/00-DECISION-REGISTER.md:113`), `APPROVED — DERIVED / RECONSTRUCTED`:

> **"Fulfillment pertenece al dominio de Pedidos. Un pedido puede pasar por `Preparación → Asignación
> de entrega → Entrega`, con estados explícitos, trazabilidad, gestión de repartidores, zonas, tarifas,
> seguimiento y evidencia de entrega. Fulfillment no constituye necesariamente un módulo principal
> independiente de navegación."**

Cuatro propiedades **aprobadas**:

1. **Fulfillment pertenece al dominio de Pedidos** — no es un dominio independiente.
2. **Recorrido:** `Preparación → Asignación de entrega → Entrega`, con estados explícitos y
   trazabilidad.
3. **El `Business` gestiona:** repartidores, zonas, tarifas, seguimiento y **evidencia de entrega**.
4. **No es necesariamente un módulo principal de navegación** — por lo tanto **no** se propone como
   `NAVIGATION MODULE`.

### 11.2 Recorrido y evidencia de entrega

| Fuente | Recorrido declarado | Categoría |
|---|---|---|
| **D-016** (registro §4, `:113`) | `Preparación → Asignación de entrega → Entrega` | `APPROVED — DERIVED / RECONSTRUCTED` |
| SPEC general §16 (`:190`) | `ORDER → PREPARACIÓN → RETIRO / ENTREGA → EVIDENCIA DE ENTREGA`, con soporte de `pickup` y `delivery` | `APPROVED — DERIVED / RECONSTRUCTED` |

**Variación de nomenclatura, no resuelta:** D-016 nombra *"Asignación de entrega"*; el SPEC general §16
nombra *"RETIRO / ENTREGA"* y añade *"EVIDENCIA DE ENTREGA"* como paso propio. Ambas fuentes son
`DERIVED` y ninguna tiene prioridad sobre la otra en el registro. **La unificación de la nomenclatura
es `OPEN DETAIL`**; este documento cita ambas sin elegir.

Lo que **sí** es dirección aprobada: preparación, asignación o retiro, entrega, y **evidencia de
entrega** como última etapa. El soporte de `pickup` y `delivery` proviene del SPEC general §16.

### 11.3 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Ubicación del dominio | `Entrega` 1:1 con `Pedido`, campos `preparadorId`/`repartidorId` (`05-ASIS/03:56-57`) | Ninguna decisión AS-IS | **D-016** | Fulfillment **dentro** del dominio de Pedidos | Estructura de código: `OPEN` |
| Módulo funcional | Modelo existe, **sin carpeta `entregas/`** en `apps/api/src`; sin controller ni service; RF-13 no implementado (`05-ASIS/01:44-46`; `05-ASIS/03:56-58`; `05-ASIS/07:56`) | **GAP + MISSING_DECISION** | **D-016** | Recorrido de entrega en el dominio de Pedidos | Servicios, comandos, endpoints: `OPEN` |
| Recorrido | Sin flujo | — | **D-016** | Preparación → Asignación → Entrega | Transiciones exactas: `OPEN` |
| Repartidores | `RolUsuario.REPARTIDOR` existe como enum (`05-ASIS/03:12`) | Sin gestión de repartidores | **D-016** | El `Business` gestiona repartidores | Modelo de repartidor; asignación: `OPEN` |
| Zonas y tarifas | Sin evidencia AS-IS | — | **D-016** (dirección); la ficha del workshop deja la pregunta sin responder | El `Business` gestiona zonas y tarifas | Reglas de zona; cálculo de tarifa: `OPEN` |
| Seguimiento | Sin evidencia AS-IS | — | **D-016** | El `Business` gestiona seguimiento | Tracking; comunicación al cliente: `OPEN` |
| Evidencia de entrega | Sin evidencia AS-IS | — | **D-016** + SPEC general §16 | **Evidencia de entrega** como etapa | Tipo de evidencia; captura; validación: `OPEN` |
| Modelo de entrega | — | — | **Ninguna** | No definido | Flota propia / 3PL / híbrido: `OPEN` (pregunta abierta de la ficha D-016, sin responder) |
| Navegación | — | — | **D-016** (textual) | **No** es módulo principal de navegación | — |

**CON-025 permanece `OPEN`** (`10-CONFLICT-RESOLUTION-MAPPING.md:84`).

---

## 12. Contexto de identidad, tenancy y autorización en Commerce

Commerce opera **dentro** de un `Business`. No introduce conceptos de identidad propios.

| Requirement | TO-BE aplicado en Commerce | Autoridad |
|---|---|---|
| Todos los recursos comerciales de un `Business` son inaccesibles desde otros | `Customer`, `Product`, `Order`, `Sale`, `Payment`, `Purchase`, AR y AP son de alcance por `Business` | **D-001** `OWNER-VERBATIM`; `07-TOBE/01-IDENTITY-AND-TENANCY.md` §11 |
| Toda lectura y mutación se liga al `Business Context` activo | Ninguna operación de Commerce puede omitir el contexto | **D-006** `DERIVED`; Identity §9, §11.2 |
| El contexto se deriva **siempre** de la `Membership` | El `Business` de una venta, un cobro o una deuda no lo elige el cliente | **D-006** `DERIVED`; Identity §9.2 |
| 4 validaciones en todo acceso autenticado | User + Business + Membership + Role/Permission antes de operar sobre Commerce | **D-006** `DERIVED`; Identity §8.2 |
| `User` es identidad **global** | Una misma persona opera Commerce en varios `Business` con permisos distintos | **D-002** `OWNER-VERBATIM` |
| Roles y permisos pertenecen a la `Membership` | `catalogo.gestionar`, `ventas.crear`, `inventario.ajustes` son ejemplos de la SPEC de Identity, **no catálogo aprobado** | **D-005** `DERIVED`; Identity §6.1; `01-IDENTITY-AND-TENANCY-SPEC.md:112` |
| AR asociada al `Customer`, no al `User` | §9.3 | **D-002-bis** + **D-012** |
| Aislamiento de inventario por `Business`, sin transferencia | Afecta `Product`, `Lote`, `MovimientoStock`; `VERIFIED BY CODE` | **D-014** `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`); `AUD-D014-C01`…`C10` |
| Integridad transaccional del stock | Afecta los efectos de `Sale` y `Purchase` sobre stock | **D-010** `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`); implementación `IMPLEMENTATION NON-COMPLIANT / GAP` |
| Conversación = interfaz comercial central; Commerce = motor | Commerce **es** el motor; la conversación es la superficie | **DEC-001:20-22** |

**Sobre la falta de aislamiento en la SPEC de Commerce:** §8.1 de `02-COMMERCE-SPEC.md` registra un
hallazgo propio — la SPEC no tenía sección de aislamiento ni autorización — y lo marca `PROPOSED`,
coherente con DEC-001:11-14 y :16-19, con el mecanismo `OPEN`. Este documento **lo cubre** sin inventar
mecanismo, remitiendo a `01-IDENTITY-AND-TENANCY.md` §11.

**Sobre el catálogo de permisos:** la SPEC de Identity menciona `catalogo.gestionar`, `ventas.crear`,
`inventario.ajustes` como **ejemplos** (`01-IDENTITY-AND-TENANCY-SPEC.md:112`) y declara el catálogo
completo `OPEN DETAIL`. **No** son un catálogo aprobado. D-005 deja el catálogo definitivo como
`OPEN DETAIL`. Este documento **no propone permisos de Commerce**.

---

## 13. Clasificación de evidencia AS-IS

Categorías empleadas, según la convención del repositorio. **Nada se llama "implementado" si solo está
documentado, ni "verificado" si solo está propuesto.**

| Hecho AS-IS | Categoría | Fuente |
|---|---|---|
| Jerarquía de catálogo de 4 niveles con prefijo de 3 caracteres | `VERIFIED BY CODE` | `05-ASIS/03:24-25`; `05-ASIS/01:19` |
| `Producto @@unique([empresaId, codigoInterno])` | `VERIFIED BY CODE` | `05-ASIS/03:26`; `AUD-D014-C09` |
| `Venta.estado` = enum `CONFIRMADA`/`ANULADA`; `ANULADA` sin flujo que la produzca | `VERIFIED BY CODE` | `05-ASIS/03:10`; `05-ASIS/07:53-54` |
| `DELETE /ventas/:id` inexistente | `VERIFIED BY EXECUTION` | `05-ASIS/07:18` |
| Venta presencial: total exacto, stock descontado exactamente, atomicidad, aislamiento entre empresas con 404 | `VERIFIED BY EXECUTION` | `05-ASIS/07:15-18` |
| Pedido online: confirma/cancela; descuenta stock **solo** al confirmar | `VERIFIED BY EXECUTION` | `05-ASIS/07:32-36` |
| Fidelización: descuento combinado con el de producto, cálculo numérico verificado | `VERIFIED BY EXECUTION` | `05-ASIS/07:44-49` (SRC-004 §33) |
| Compra: recepción parcial validada contra pendiente real | `VERIFIED BY EXECUTION` | `05-ASIS/07:26-30` |
| Rutas del panel: `/orders`, `/ventas`, `/customers`, `/compras`, `/cash`, `/inventory` | `VERIFIED BY CODE` (lectura de rutas) | `05-ASIS/09:6-10` |
| Mercado Pago rechazado con 400; ni stub de llamada saliente | `VERIFIED BY CODE` | `05-ASIS/01:40-41` |
| RF-10 (AR) y RF-13 (Entrega) como requisitos funcionales no implementados | `DOCUMENTED` | `05-ASIS/01:42-46` |
| **Tests: cero archivos**; verificación por HTTP directo, no navegador real | `VERIFIED BY CODE` (búsqueda exhaustiva) + `DOCUMENTED` (limitación del método) | `05-ASIS/11:4-8`; `05-ASIS/07:60-65` |
| `EstadoPedido` con 10 valores | `VERIFIED BY CODE` (existencia del enum); valores `NOT DETERMINABLE` | `05-ASIS/03:9` |
| D-010 integridad de stock: controles parciales y brechas | `VERIFIED BY CODE` | `AUD-D010-C01`…`C06`, `AUD-D010-G01`…`G10` |
| D-014 aislamiento de inventario | `VERIFIED BY CODE` | `AUD-D014-C01`…`C10` |
| Estados y transiciones de `Order` en TO-BE | `NOT DETERMINABLE` | `02-COMMERCE-SPEC.md:123-130` |
| Estados exactos de `Sale` en TO-BE | `NOT DETERMINABLE` | `02-COMMERCE-SPEC.md:152-159` |

**No existe evidencia `VERIFIED BY TEST`**: el repositorio no contiene archivos de test, pese a que la
infraestructura de testing está configurada y sin usar (`05-ASIS/11:4-15`).

---

## 14. Trazabilidad

**No se inventan IDs.** Donde no existe un identificador formal, se cita la referencia documental real
(`path:line`). No se crean `REQ-XXX`.

| Requirement | Decisión | Fuente | TO-BE § | Estado |
|---|---|---|---|---|
| `Customer` no fusionado con `User`; vínculo opcional; scoping por `Business` | **D-002-bis** | `00-DECISION-REGISTER.md:99` | §3.1 | `APPROVED — OWNER-VERBATIM` |
| AR asociada al `Customer`, no al `User` | **D-002-bis** + **D-012** | `:99`, `:109` | §3.1, §9.3 | `APPROVED` (D-002-bis) + `APPROVED — DERIVED / RECONSTRUCTED` (D-012) |
| Aislamiento por `Business` de todos los recursos comerciales | **D-001** | `:97` | §12 | `APPROVED — OWNER-VERBATIM` |
| `User` global, `Membership` N:N | **D-002** | `:98` | §12 | `APPROVED — OWNER-VERBATIM` |
| Roles y permisos en la `Membership` | **D-005** | `:102` | §12 | `APPROVED — DERIVED / RECONSTRUCTED` |
| 4 validaciones de acceso; el token solo no autoriza | **D-006** | `:103` | §12 | `APPROVED — DERIVED / RECONSTRUCTED` |
| `Order` ≠ `Sale`; `Order` = intención; `Sale` = confirmada | **D-007** | `:104` | §6.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Conversión `Order`→`Sale` posible, no obligatoria | **D-007** | `:104` | §6.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Venta presencial/POS origina `Sale` sin `Order` | **D-007** | `:104` | §6.1, §6.3 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Estados y transiciones de `Order` | **Ninguna** | `02-COMMERCE-SPEC.md:123-130`; CON-016 | §6.2 | `NOT DETERMINABLE` |
| `Sale` con ciclo de vida explícito | **D-008** | `:105` | §7.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| La confirmación aplica efectos comerciales, operativos, económicos | **D-008** | `:105` | §7.1, §7.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| `Sale` confirmada **no se elimina** | **D-008** | `:105` | §7.1, §7.3 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Anulación = operación explícita con reversiones/ajustes sobre stock, caja, pagos, AR | **D-008** | `:105` | §7.1, §7.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Efectos transaccionales, sin estados parciales | **D-008** | `:105` | §7.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Estados exactos de `Sale` | **Ninguna** (D-008 no enumera) | `:105` col. `IMPLEMENTATION DETAIL` | §7.1, §7.3 | `OPEN` |
| Pasarelas de pago externas | **D-011** | `:108` | §8.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Mercado Pago prioritario | **D-011** | `:108` | §8.1, §8.4 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Abstracción de proveedor; núcleo no acoplado | **D-011** | `:108` | §8.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Estados de autorización, aprobación, rechazo, cancelación, conciliación | **D-011** | `:108` | §8.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| API, webhooks, credenciales, idempotencia | **Ninguna** (D-011 lo deja `OPEN`) | `:108` col. `IMPLEMENTATION DETAIL` | §8.4 | `OPEN` |
| AR por `Business` | **D-012** | `:109` | §9.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Venta parcialmente o no cancelada genera cuenta por cobrar | **D-012** | `:109` | §9.1, §9.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Saldos, cobros, aplicación, trazabilidad, saldo del cliente | **D-012** | `:109` | §9.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Requisitos financieros de AR (aging, intereses, vencimientos, límites) | **Ninguna** | `02-COMMERCE-SPEC.md:219-222` | §9.3 | `OPEN` |
| Compras pertenecen al `Business` | **D-015** | `:112` | §10.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| `Purchase` = adquisición a `Proveedor`; registra productos, cantidades, precios, condiciones, recepción | **D-015** | `:112` | §10.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Importe pendiente genera AP asociada a `Business` y `Proveedor` | **D-015** | `:112` | §10.1, §10.2 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Pagos posteriores aplicados a obligaciones, con trazabilidad y conciliación | **D-015** | `:112` | §10.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Estados y transiciones de `Purchase` | **Ninguna** | `03-CONFLICTS/04-STATE-CONFLICTS.md:8`; CON-024 | §10.2 | `OPEN` |
| Fulfillment pertenece al dominio de Pedidos | **D-016** | `:113` | §11.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Recorrido preparación → asignación → entrega | **D-016** | `:113` | §11.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Repartidores, zonas, tarifas, seguimiento, evidencia de entrega | **D-016** | `:113` | §11.1, §11.3 | `APPROVED — DERIVED / RECONSTRUCTED` |
| No es necesariamente módulo principal de navegación | **D-016** | `:113` | §11.1 | `APPROVED — DERIVED / RECONSTRUCTED` |
| Estados y transiciones de Fulfillment y Entrega | **Ninguna** | `03-CONFLICTS/04-STATE-CONFLICTS.md:9`; CON-025 | §11.3 | `OPEN` |
| Inventario por `Business`; sin transferencia | **D-014** | `:111` | §12 | `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`) + `VERIFIED BY CODE` |
| Integridad transaccional del stock | **D-010** | `:107` | §12 | `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`) + `IMPLEMENTATION NON-COMPLIANT / GAP` |
| Conversación = interfaz comercial; Commerce = motor | **DEC-001** | `02-MULTITENANCY.md:20-22` | §12 | `APPROVED DIRECTION` |
| Modelo de datos y plan de migración excluidos | **DEC-001** | `:55-57` | §2, §3.2 | `APPROVED DIRECTION` |

**Conflictos que este documento declara y NO cierra:** CON-016, CON-017, CON-020, CON-021, CON-024,
CON-025, todos `OPEN` (`10-CONFLICT-RESOLUTION-MAPPING.md`).

**Gaps AS-IS→TO-BE referenciados:** GAP-001 (multi-tenancy, `BLOCKING`,
`03-CONFLICTS/06-ASIS-TOBE-GAPS.md:3`).

---

## 15. OPEN DETAIL

Agrupados por área. **Ninguno se resuelve en esta fase.**

### Customer
1. Modelo físico de `Customer`; cardinalidades; identificadores; constraints.
2. Ciclo de vida de `Customer`: estados, bajas, deduplicación.
3. Estrategia de linking `Customer` ↔ `User` (cómo se detecta un comprador ya registrado).
4. Migración desde `Cliente` AS-IS.
5. Tipos de cliente (minorista / mayorista) y su efecto sobre `Pricing`. Sin decisión.
6. Atributos que el `Customer` **debe** tener: D-002-bis nombra categorías (compras, pedidos,
   historial, cuenta corriente/deuda, condiciones comerciales), no campos. Los roles de cliente no
   existen como concepto en ninguna decisión.

### Catalog
7. Si el TO-BE mantiene la jerarquía de 4 niveles; nº de niveles; nomenclatura.
8. Conservación del `prefijo` de 3 caracteres para el SKU.
9. Claves de unicidad: nombre/prefijo dentro del padre; `codigoInterno` por `Business`.
10. Qué atributos de `Producto` sobreviven y cuáles son obligatorios; unidades de medida.
11. Si `Presentacion` es entidad y cómo se relaciona con `Product`.
12. Relación `Product` ↔ `Proveedor` (`ProductoProveedor` N:N).

### Pricing
13. Número de listas de precio; vigencia; moneda.
14. Prioridad entre descuentos; **combinación vs. reemplazo** (regla retirada por la SPEC; el AS-IS la
    verifica por ejecución pero el TO-BE no la decide).
15. Fidelización: umbrales de `NUEVO`/`FRECUENTE`/`VIP`; alcance del descuento; cálculo.
16. Reglas mayorista/minorista: elegibilidad, validación, efectos.
17. Promociones, campañas, cupones.
18. Redondeo; impuestos; si los precios incluyen impuestos.
19. Congelamiento de precio en el ítem de `Order`/`Sale` (el AS-IS lo hace; ninguna decisión lo exige).

### Order
20. **Estados y transiciones de `Order`.** `NOT DETERMINABLE`; `EstadoPedido` tiene 10 valores no
    enumerados. CON-016.
21. **Condiciones de conversión `Order` → `Sale`** (D-007 dice "cuando se cumplan las condiciones
    definidas"; las condiciones no están definidas).
22. Si la venta presencial genera un `Order` intermedio o una `Sale` directa (D-007 permite ambos; no
    decide).
23. Cardinalidad de `Order` ↔ `Customer`; obligatoriedad.

### Sale
24. **Estados exactos y transiciones del ciclo de vida.** D-008 exige ciclo explícito pero no enumera.
    CON-017.
25. **Permisos y autorizaciones** para confirmar y para anular.
26. **Comando/mecanismo** de anulación; detalle de las reversiones por ámbito.
27. Cuáles de stock, caja, pagos y AR se revierten en cada condición.
28. Conservación de los atributos AS-IS: `idempotencyKey`, `numero` correlativo, `total`, `descuento`,
    descuentos separados.
29. Proceso de devoluciones y reembolsos.
30. Efectos sobre `Contabilidad` e `Impuestos`: **no definidos** y no nombrados en D-008.

### Payment
31. API, checkout, webhooks, credenciales, idempotencia, conciliación (todos `OPEN` en D-011).
32. Codificación interna de los cinco eventos; transiciones; estados internos adicionales.
33. Interfaz de la abstracción de proveedor; qué proveedores se soportan además de Mercado Pago.
34. Medios de pago manuales que se conservan; atributos (`montoRecibido`, `vuelto`, `referencia`,
    `comision`).
35. Relación `Payment` ↔ deuda AR (imputación de cobros).
36. Si el pago a proveedor comparte entidad con `Payment` o permanece separado.

### Accounts Receivable
37. Requisitos funcionales y financieros detallados. **No existe `Finance/AR SPEC`**.
38. Modelo de deuda; estados; aplicación de cobros; reglas de crédito.
39. Definición operativa de "venta parcialmente o no cancelada" que genera la cuenta por cobrar.
40. Documentos contables; asientos; aging; intereses; vencimientos; límites de crédito.
41. Workflow de cobranza; morosidad.

### Purchase
42. Estados y transiciones del ciclo de compra (AS-IS: `BORRADOR`/`EMITIDA`; TO-BE: `OPEN`). CON-024.
43. Reglas de recepción; estados de recepción.
44. Condiciones de pago: vencimiento, crédito, anticipos.
45. Workflow de aprobación de compras.

### Accounts Payable
46. Modelo de la obligación; documentos; asientos; conciliación.
47. Relación entre `PagoProveedor` (AS-IS) y el modelo conceptual de AP decidido por D-015.
48. Reglas de aplicación de pagos a obligaciones; saldos.

### Fulfillment
49. **Nomenclatura del recorrido:** D-016 "Asignación de entrega" vs. SPEC general §16 "RETIRO /
    ENTREGA"; y si "EVIDENCIA DE ENTREGA" es etapa propia del recorrido.
50. Estados y transiciones exactos de cada etapa. CON-025.
51. Modelo de repartidor; algoritmo de asignación (ninguna fuente lo define).
52. Reglas de zonas y cálculo de tarifas (pregunta abierta de la ficha D-016, sin responder).
53. Seguimiento: tracking; comunicación del estado al cliente (ficha D-016, sin responder).
54. Tipo de evidencia de entrega; captura; validación.
55. Modelo de entrega: flota propia, 3PL o híbrido (pregunta abierta de la ficha D-016, sin responder).
56. `pickup` vs. `delivery`: reglas de distinción (SPEC general §16 los soporta; no define cuándo aplica
    cada uno).

### Transversal
57. **Dónde vive `Customer` en la navegación:** §25 no incluye un ítem de clientes; §24 sí incluye el
    dominio D05.
58. Catálogo definitivo de roles y permisos de Commerce (D-005 `OPEN`; no se propone ninguno aquí).
59. Mecanismo de aislamiento por `Business` en Commerce (D-001 `OPEN`).
60. Correspondencia dominio ↔ módulo de código ↔ carpeta para Commerce.

---

## 16. Cadena de fase

Este documento es el **escalón TO-BE** de
`REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS → PLAN → IMPLEMENTATION`.

- **Producido en 6.1:** este documento únicamente.
- **No producido, por fase:** contracts, invariantes, tests, plan de implementación, Prisma/schema,
  migrations, refactors, cambios de API, cambios de UI.
- **Conflicto no cerrado:** ninguno de CON-016, CON-017, CON-020, CON-021, CON-024, CON-025.
- **Decisión creada:** 0. **Requisito inventado:** 0. **Estado inventado:** 0. **ID inventado:** 0.
