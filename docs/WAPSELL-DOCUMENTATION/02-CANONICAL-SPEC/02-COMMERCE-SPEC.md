# Wapsell — Commerce Specification
**Version:** 0.2 | **Status:** DRAFT — NOT APPROVED · **Reconciled:** 2026-09-28

> ## Normative basis (read before using this document)
>
> The previous header claimed `APPROVED — COHERENT WITH DECISIONS D-001..D-018`. **That was
> unsupported** and is withdrawn. The *reason* originally given — *"the repository contains no
> decision text"* — was itself **wrong** (an inventory error, retracted 2026-09-28). Reconstructed text
> for all of D-001…D-018 exists; see `04-DECISIONS/00-DECISION-REGISTER.md` §4:
> - **D-001, D-002, D-002-bis → `APPROVED — OWNER-VERBATIM`** (quotable).
> - **D-003…D-018 → `APPROVED — DERIVED / RECONSTRUCTED`** (usable as requirements, not quotable as
>   approved text until the Owner confirms wording).
>
> **This matters most for this spec**, whose domains (D-007…D-012, D-015) now have reconstructed
> text that was previously invisible. Sections below that said *"D-0xx has no decision text"* are
> **superseded**: text now exists, but the claims those sections made are still **not** established
> by it unless they match the reconstructed wording. `IMPLEMENTATION DETAIL` remains `OPEN`.
> **DEC-001** (`04-DECISIONS/02-MULTITENANCY.md`) remains the only **originally authored** decision,
> deciding **product direction only** (`:55-57`).
>
> **This spec had zero DEC-001 corroboration for its functional content.** Every D-0xx claim below
> is therefore demoted to `TO-BE PROPOSED` / `NOT DETERMINABLE`. Corrections made:
>
> | §  | Problem found | Correction |
> |---|---|---|
> | 1  | **`Customer` = `User`** ignored the anonymous-customer case in AS-IS | **RESOLVED 2026-09-28 by D-002-bis**: `Customer` is a separate commercial entity, NOT a `User`; optional `User` link; CON-010 closed. Lifecycle remains `OPEN` |
> | 2–3 | AS-IS attributes and behaviours presented as TO-BE facts | Relabelled `AS-IS → TO-BE`; the transformation is `OPEN` |
> | 4  | **Invented `Order` states** `BORRADOR`/`PENDIENTE`/`CONFIRMADO`/`CANCELADO` — no source; AS-IS `EstadoPedido` has 10 unenumerated values | §4.1 states removed and replaced with the evidence gap |
> | 5  | `Sale` lifecycle attributed to D-008, which has no text | Demoted to `NOT DETERMINABLE` |
> | 5  | AS-IS fields (`idempotencyKey`, `numero`, `total`) inside a TO-BE section | Moved to the AS-IS subsection |
> | 6  | `Payment` mixed customer payment with **supplier payment**; no link to AR | §6.1 split; AP explicitly out of scope here |
> | 4,6,7 | *"Esto es resuelto por D-011/D-012"* — false closure | Replaced with the real OPEN status |
> | — | **No tenant isolation or authorization anywhere** | §8.1 added: `OPEN` |
>
> See `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md`.

## 1. CUSTOMERS

### 1.1. Customer (Concepto Canónico TO-BE) — `APPROVED` (D-002-bis) + `PROPOSED` (detalles)

> **RESOLVED 2026-09-28 by Owner decision D-002-bis (`OWNER-VERBATIM`).** This section previously read
> *"No decision covers this section… D-002/D-006 have no text"* and left identity, linkage and
> transformation `OPEN`. **That is no longer true.** The Owner resolved the `Customer`/`User`
> question directly. CON-010 is closed. Only implementation details remain open.

- **Concepto — `APPROVED DECISION` (D-002-bis):** **`Customer` NO se fusiona con `User`.**
  `Customer` representa **la relación comercial del comprador/cliente con un `Business`**. No es un
  tipo de `User` ni una projeção de `User`.
  ~~Es un `User` que interactúa con un `Tenant` en roles de compra.~~ **Retirado permanentemente.**
- **Vínculo con `User` — `APPROVED DECISION` (D-002-bis):** un `Customer` **puede** vincularse a un
  `User`, pero **no está obligado** a hacerlo. Ambos casos son válidos: un comprador con login y un
  comprador sin login.
  - Esto confirma la evidencia AS-IS: la tienda online admite **compradores anónimos sin
    `Usuario`** (`05-ASIS/07-ASIS-FLOWS.md:39`: "Cliente anónimo navega"). La ecuación
    `Customer = User` era contradictoria con la evidencia **y** con la decisión.
- **Business scoping — `APPROVED DECISION` (D-002-bis):** el `Customer` **pertenece al contexto de un
  `Business`** y su información comercial no es accesible desde otros `Business`. Coherente con
  D-001 (unidad de aislamiento multi-tenant) y con DEC-001:11-14.
  - El **mecanismo** de aislamiento es `IMPLEMENTATION DETAIL` / `OPEN` — la decisión no define
    esquema, clave de partición ni consulta.
- **Datos de Commerce que puede reunir** â€” `APPROVED DECISION` (D-002-bis): el `Customer` puede
  incluir **compras, pedidos, historial, cuenta corriente/deuda cuando aplique, condiciones
  comerciales y demás datos de Commerce.**
  - **Consecuencia directa:** D-012 sitúa la Cuenta por Cobrar *"asociada al cliente"*, es decir
    asociada al **`Customer`**, **no** al `User`. Cualquier modelo de AR indexado por `User`
    contradice D-002-bis. (Ver §7.)
- **Lifecycle de `Customer` — `OPEN DETAIL`.** No decidido: ciclo de vida, estados, bajas,
  deduplicación, y modelado concreto del vínculo opcional con `User`.
- **Tipos de cliente — `PROPOSED`.** Soportar tipos (e.g., minorista, mayorista) que puedan influir
  en `Pricing`. **No aprobado por decisión**; el Owner no se pronunció sobre esto.
  - **AS-IS Context:** El AS-IS distingue `Cliente` como identidad separada, con soporte para
    minorista y mayorista. (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/03-ASIS-DATA.md`).
- **Transformación desde AS-IS — `OPEN`.** Cómo se migran `Cliente`/`Usuario` AS-IS hacia
  `Customer` + `User` + `Membership` **no está decidido** (D-002 deja el modelo de datos explícitamente
  abierto). La dirección está aprobada; la migración no.


## 2. CATALOG

### 2.1. Product (Concepto Canónico TO-BE) — TO-BE PROPOSED
- **Concepto:** **PROPOSED** — un `Product` representa un bien o servicio ofrecido por un `Tenant`.
- **Atributos — PROPOSED:** nombre, descripción, imágenes, SKU, `Pricing`, stock mínimo.
- **Jerarquía — VERIFICADO EN AS-IS, PROPOSED EN TO-BE:** el catálogo soporta una jerarquía de hasta
  4 niveles (Familia → Subfamilia → Tipo → Subtipo). (Evidencia AS-IS: `05-ASIS/01-ASIS-PRODUCT.md`).
  Que el TO-BE mantenga 4 niveles es `PROPOSED`, no una decisión registrada.
- **Unicidad — VERIFICADO EN AS-IS:** `[Tenant ID, codigoInterno]`, corregido respecto a SRC-011.
  (Evidencia AS-IS: `05-ASIS/03-ASIS-DATA.md`). Conservar esta clave en TO-BE es `PROPOSED` /
  `OPEN`. Nótese que el propio AS-IS usa `Empresa` donde el TO-BE usaría `Tenant`
  (DEC-001:13 — la equivalencia es de dirección, el mapeo de campos es `OPEN`).

## 3. PRICING

### 3.1. Pricing (Concepto Canónico TO-BE) — TO-BE PROPOSED
> No decision covers Pricing. D-007/D-008 have no text. The bullets below mix verified AS-IS
> behaviour with undecided TO-BE intent; the labels now say which is which.

- **Concepto:** **PROPOSED** — el `Pricing` define el valor monetario de un `Product` de un `Tenant`.
- **Tipos de precios — AS-IS:** `precioUnitario` y `precioMayorista`. (Evidencia:
  `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/03-ASIS-DATA.md`). Que ambos se conserven en TO-BE es
  `PROPOSED`.
- **Descuentos — AS-IS:** `descuentoPorcentaje` a nivel de `Product` y `Reglas de Fidelización`.
  (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/03-ASIS-DATA.md`).
  ~~Los descuentos se combinan, no se reemplazan.~~ **Retirado:** esta regla de combinación es una
  **aserción normativa sin fuente citable** en el material disponible. Es `OPEN DETAIL` /
  `PROPOSED`, no un hecho verificado.
- **Fidelización — AS-IS:** `NivelFidelidad` calculado dinámicamente (`NUEVO`/`FRECUENTE`/`VIP`).
  (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/03-ASIS-DATA.md`). Conservarlo en TO-BE es
  `PROPOSED`; los umbrales de cálculo son `OPEN DETAIL`.

## 4. ORDERS

### 4.1. Order (Concepto Canónico TO-BE) — TO-BE PROPOSED
> **D-007 has no decision text** (`03-DECISION-WORKSHOP/D-007-orders-sales.md`: estado original
> `PENDING`, `## Decision: PENDING`). Its own Open Questions still ask for the Order/Sale state
> model. Therefore **no Order lifecycle is decided.** CON-016 OPEN.

- **Concepto:** **PROPOSED** — un `Order` representa una intención/operación comercial iniciada por
  un `Customer` (e.g., a través de la tienda online), previa a una `Sale` confirmada. La distinción
  `Order` ≠ `Sale` es **plausible pero no verificada**: el único apoyo es la existencia de
  `Pedido`/`PedidoItem` y `Venta`/`VentaItem` como modelos separados en el AS-IS
  (`05-ASIS/03-ASIS-DATA.md`), lo cual **no prueba** que esa sea la decisión TO-BE. *(D-007 —
  NO DETERMINABLE.)*
- **Ciclo de vida — CORREGIDO:** ~~Incluye estados como `BORRADOR` (carrito), `PENDIENTE` (checkout
  completado, no pagado), `CONFIRMADO`, `CANCELADO`.~~ **REMOVIDO — invención.** Ninguna fuente
  documentada respalda esos cuatro estados ni sus transiciones. La evidencia AS-IS
  (`05-ASIS/03-ASIS-DATA.md`) registra que `Pedido.estado` referencia `EstadoPedido`, un enum con
  **10 valores no enumerados en la documentación**; el flujo AS-IS solo menciona
  `PATCH /pedidos/:id/estado` con confirmar/cancelar (`05-ASIS/07-ASIS-FLOWS.md:39`). Reutilizar
  esos nombres habría sido inventar una decisión. El ciclo de vida del `Order` es
  **`OPEN DETAIL` — NO DETERMINABLE**. CON-016 OPEN.
- **Contexto comercial — PROPOSED:** contiene referencia a `Customer`, `Tenant`, productos,
  cantidades y precios congelados. El congelamiento de precios **está verificado en AS-IS**
  (`05-ASIS/07-ASIS-FLOWS.md:39`); que el TO-BE lo mantenga es `PROPOSED`.
- **Relación con Sale — PROPOSED:** que un `Order` evolucione a una `Sale` al confirmarse la
  operación económica **no está decidido**. *(D-007 — NO DETERMINABLE.)*

### 4.2. AS-IS Orders Context
- **Modelo AS-IS:** `Pedido`/`PedidoItem` con `clienteId` obligatorio, `usuarioId` opcional. (Evidencia: `05-ASIS/03-ASIS-DATA.md`).
- **Enum sin enumerar:** `Pedido.estado` → `EstadoPedido` con **10 valores no documentados**. (Evidencia: `05-ASIS/03-ASIS-DATA.md`). **Este es el hallazgo que invalida los estados inventados de §4.1.**
- **Flujo AS-IS:** Cliente anónimo navega → `POST /tienda/pedidos` (crea/reusa `Cliente`, congela precios) → vendedor gestiona (`GET /pedidos`) → confirma/cancela (`PATCH /pedidos/:id/estado`, descuenta stock SOLO al confirmar). (Evidencia: `05-ASIS/07-ASIS-FLOWS.md`).
- **Transformación:** **OPEN.** ~~La definición canónica (D-007) clarifica la distinción y relación entre `Order` y `Sale` para el TO-BE.~~ **Retirado:** no existe "definición canónica" D-007 disponible. CON-016 OPEN.

## 5. SALES

### 5.1. Sale (Concepto Canónico TO-BE) — TO-BE PROPOSED
> **D-007 and D-008 have no decision text.** Their fichas (`D-007-orders-sales.md`,
> `D-008-sales-lifecycle-returns.md`) retain `Status: PENDING` and unanswered Open Questions.
> CON-016 and CON-017 OPEN.

- **Concepto:** **PROPOSED** — una `Sale` es una operación económica confirmada que genera efectos
  transaccionales. *(D-007 — NO DETERMINABLE.)*
- **Ciclo de vida — CORREGIDO:** ~~El estado canónico es `CONFIRMADA → ANULADA`. La anulación debe
  realizarse mediante movimientos compensatorios, sin eliminar físicamente una Sale confirmada.
  (D-008)~~ **DEGRADADO a NO DETERMINABLE.** Que `CONFIRMADA`/`ANULADA` sean los estados canónicos
  del TO-BE, y que la anulación sea por movimientos compensatorios en lugar de borrado físico,
  **no tiene respaldo disponible**. Evidencia: el enum AS-IS `Venta.estado` es
  `CONFIRMADA`/`ANULADA` (`05-ASIS/03-ASIS-DATA.md:51`) — eso describe el AS-IS, no la decisión
  TO-BE. La regla de "no borrar una Sale confirmada" es una buena práctica **PROPOSED**, no una
  decisión registrada. *(D-008 — NO DETERMINABLE.)* CON-017 OPEN.
- **Efectos transaccionales — PROPOSED:** que la confirmación de una `Sale` afecte `Stock`,
  `Pagos`, `Caja`, `Cuentas por Cobrar`, `Contabilidad`, `Impuestos` y `Reportes` **no está
  decidido**. Nota: el propio AS-IS **no implementa** `Cuentas por Cobrar` (RF-10 no implementado)
  ni `Contabilidad`/`Impuestos` (fuera de alcance, CON-003), por lo que enumerarlos como efectos
  TO-BE afirma más de lo que la evidencia sostiene. *(D-008 — NO DETERMINABLE.)*
- **Atributos — MOVIDO:** `idempotencyKey`, `numero` correlativo por `Tenant`, `total`,
  `descuento`, `precioUnitario` congelado y los dos campos de descuento separados (manual y
  fidelización) son **atributos AS-IS verificados**, no atributos TO-BE decididos. Ver §5.2. Si el
  TO-BE los conserva, es `PROPOSED` / `OPEN`.

### 5.2. AS-IS Sales Context
- **Modelo AS-IS:** `Venta`/`VentaItem` con `estado` tipado enum (`CONFIRMADA`/`ANULADA`), `idempotencyKey @unique`, `numero Int?` correlativo por empresa. (Evidencia: `05-ASIS/03-ASIS-DATA.md`).
- **Atributos AS-IS:** `idempotencyKey`, `numero` correlativo por empresa, `total`, `descuento`, `precioUnitario` congelado, dos campos de descuento separados (manual y fidelización). (Evidencia: `05-ASIS/03-ASIS-DATA.md`).
- **Flujo AS-IS:** Venta presencial (cotización opcional, `POST /ventas`, cobro `POST /ventas/:id/pagos`). (Evidencia: `05-ASIS/07-ASIS-FLOWS.md`).
- **Gap AS-IS:** `EstadoVenta.ANULADA` existe en el enum pero sin flujo ni lógica que lo produzca. `CuentaCorriente` y cobro de deudas (RF-10) no implementados. (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`).
- **Transformación — CORREGIDA:** ~~Estos gaps son abordados por la decisión D-008.~~ **Retirado:**
  no puede afirmarse que una decisión D-008 con texto unknown "aborde" los gaps. Lo honesto es:
  **los gaps están documentados y siguen `OPEN`; su resolución depende de texto de decisión que no
  existe en el repositorio.** CON-017, CON-021 OPEN.

## 6. PAYMENTS

### 6.1. Payment (Concepto Canónico TO-BE) — TO-BE PROPOSED
> **D-011 has no decision text.** CON-020 OPEN. The previous version of this section silently mixed
> **customer collections** with **supplier payments**, which belong to Accounts Payable (D-015), and
> gave no relationship to Accounts Receivable. Corrected below.

- **Concepto:** **PROPOSED** — un `Payment` registra una transacción monetization de un `Tenant`.
  **Scope corregido:** en esta spec, `Payment` cubre el **cobro al cliente** por una `Sale`/`Order`.
  El **pago a proveedor** pertenece a `Accounts Payable` / `Purchases` (§ no aplica aquí; D-015 —
  NO DETERMINABLE) y **no debe modelizarse con la misma entidad sin una decisión explícita**.
- **Relación con Accounts Receivable — CORREGIDA:** antes no existía ninguna. **PROPOSED / OPEN:**
  cómo un cobro se aplica a una `CuentaCorriente`/`Deuda` es `OPEN DETAIL` (ver §7). No se puede
  afirmar que un `Payment` "es" un cobro de AR: son responsabilidades distintas
  (**cobrar** vs. **imputar el cobro a una deuda**) y unificar sin decisión sería inventar.
- **Mecanismos:** **PROPOSED** — pagos manuales (efectivo, transferencia, QR) e integración con
  `Mercado Pago`. *(D-011 — NO DETERMINABLE.)* CON-020 OPEN.
- **Atributos — MOVIDO:** `montoRecibido`, `vuelto` (solo efectivo), `referencia` (para
  transferencia/QR) y `comision` (default 0) son **atributos AS-IS verificados**. Ver §6.2. Que el
  TO-BE los conserve es `PROPOSED` / `OPEN`.

### 6.2. AS-IS Payments Context
- **Modelo AS-IS:** `Pago` con `montoRecibido`/`vuelto` solo efectivo, `referencia` para transferencia/QR, `comision` default 0. (Evidencia: `05-ASIS/03-ASIS-DATA.md`).
- **Ausencia AS-IS:** Mercado Pago explícitamente rechazado en el DTO. (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/08-ASIS-INTEGRATIONS.md`).
- **Transformación — CORREGIDA:** ~~Esto es resuelto por D-011.~~ **Retirado:** no hay texto D-011
  disponible para afirmar que está "resuelto". El rechazo AS-IS de Mercado Pago es un **hecho
  documentado**; su reversión en TO-BE es `OPEN`. CON-020 OPEN.

## 7. ACCOUNTS RECEIVABLE

### 7.1. Accounts Receivable (Concepto Canónico TO-BE) — TO-BE PROPOSED
> **D-012 has no decision text.** CON-021 OPEN.

- **Concepto:** **PROPOSED** — `Accounts Receivable` (Cuentas por Cobrar) gestiona el crédito de un
  `Tenant` con sus `Customer`s y el cobro de deudas. *(D-012 — NO DETERMINABLE.)*
- **Alcance conceptual — PROPOSED:** `saldo`, `deuda`, `crédito`, `cobros`, `aplicación de pagos`
  e `historial` de movimientos de cuenta corriente. *(D-012 — NO DETERMINABLE.)*
  **Distinguir:** *cobrar un `Payment`* (§6) ≠ *imputarlo a una `Deuda`* (aquí). La relación entre
  ambos es `OPEN DETAIL`.
- **Detalles financieros — OPEN:** **no existe una `Finance/AR SPEC`** en `02-CANONICAL-SPEC/`
  (solo `00`–`06`, y ninguna es de Finance/AR). El texto original remitía a un documento que **no
  existe en el repositorio**; esa referencia se retira. Requisitos funcionales y financieros:
  `OPEN DETAIL`. *(D-012 — NO DETERMINABLE.)*

### 7.2. AS-IS Accounts Receivable Context
- **Modelo AS-IS:** Modelos como `CuentaCorriente`, `Deuda`, `AplicacionPago` existen en el esquema, pero sin servicios ni flujos que los utilicen (RF-10 no implementado). (Evidencia: `05-ASIS/01-ASIS-PRODUCT.md`, `05-ASIS/03-ASIS-DATA.md`, `05-ASIS/07-ASIS-FLOWS.md`).
- **Transformación — CORREGIDA:** ~~Esto es resuelto por D-012.~~ **Retirado:** no existe texto D-012
  para afirmarlo. El gap (modelos huérfanos sin servicio) **sigue abierto**. CON-021 OPEN.

## 8. OPEN DETAIL (Commerce)

### 8.1 Tenant isolation and authorization — MISSING, now recorded
> **Finding (new).** The previous version of this spec had **no section at all** on tenant
> isolation, `Tenant Context` or authorization, while it was the only canonical spec claiming
> `APPROVED`. Any Commerce resource in TO-BE needs a `Tenant` reference plus a permission check
> bound to the active `Membership`. This is `PROPOSED`, consistent with DEC-001:11-14 and
> DEC-001:16-19 (isolation and Membership-scoped authorization as *direction*); the concrete
> enforcement mechanism is `OPEN DETAIL` and is **excluded** from DEC-001 (`:55-57`).
> See CON-010, and `01-IDENTITY-AND-TENANCY-SPEC.md` §7 and §9.

### 8.2 Undetermined by evidence
- Ciclo de vida completo de `Order`: estados y transiciones. **NO DETERMINABLE** (D-007). El enum
  AS-IS `EstadoPedido` tiene 10 valores no enumerados — una fuente futura podría reconstruirlos.
- Estados y transiciones de `Sale`, y la regla de anulación. **NO DETERMINABLE** (D-008).
- Reglas de pricing específicas (mayoristas, promociones complejas) y si los descuentos se combinan
  o se reemplazan. `OPEN`.
- Estrategia de integración detallada para Mercado Pago (credenciales, webhooks, estados
  definitivos, contratos externos, idempotencia específica). **NO DETERMINABLE** (D-011).
- Si `Payment` cubre pago a proveedor o solo cobro al cliente, y si es la misma entidad. `OPEN`.
- Relación `Payment` ↔ `CuentaCorriente`/`Deuda` (aplicación de pagos). `OPEN`.
- Requisitos funcionales y financieros detallados para `Accounts Receivable`. **NO DETERMINABLE**
  (D-012). **La `Finance/AR SPEC` que el texto original citaba no existe** en `02-CANONICAL-SPEC/`.
- Cómo se aplican las reglas de fidelización (detalles de cálculo, umbrales). `OPEN`.
- Proceso de devoluciones y reembolsos. `OPEN` (D-008 lo cubre parcialmente, sin texto).
- ~~Si `Customer` requiere identidad `User` o admite clientes anónimos. `OPEN`. CON-010.~~ **RESOLVED by D-002-bis**: admite ambos casos; el vínculo con `User` es opcional. *Lifecycle y modelo de datos siguen `OPEN`.*
- Transformación concreta de `Cliente`/`Usuario`/`Pedido`/`Venta`/`Pago` AS-IS → TO-BE. `OPEN`.
  DEC-001:55-57 excluye explícitamente el plan de migración.
- Enforcement del aislamiento por `Tenant`: row-level security, filtro obligatorio, esquema
  separado. `OPEN`.

