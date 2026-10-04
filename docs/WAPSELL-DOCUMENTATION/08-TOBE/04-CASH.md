# Wapsell — Cash (TO-BE)
**Fase:** 6.5 — TO-BE Cash · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> - **D-013 → `APPROVED — DERIVED / RECONSTRUCTED`** (`04-DECISIONS/00-DECISION-REGISTER.md` §4).
>   Es la **autoridad principal** de este documento. Su texto **no es citable como redacción
>   aprobada** hasta que el Owner confirme el wording; se usa **como requisito**, conforme a la
>   regla del registro (*"may be used as requirements, not as quotable approved text"*).
> - **La cláusula en disputa de D-013 sigue `OPEN DETAIL — PENDING OWNER RULING`**
>   (registro §4.3.2, punto 6): *"Las operaciones sensibles están sujetas a permisos del
>   `Membership`"* existe **solo en v1.0**. **No se convierte en requisito aprobado en este
>   documento.**
> - **D-001, D-002 → `APPROVED — OWNER-VERBATIM`.** Se citan **únicamente** como frontera de
>   tenancy: `Business` es la unidad de aislamiento, `Membership` la relación `User ↔ Business`.
> - **D-005, D-006 → `APPROVED — DERIVED / RECONSTRUCTED`.** Se citan **solo** como frontera de
>   autorización. El catálogo de roles y permisos de D-005 es `OPEN`, y la cláusula de 4 vs. 2
>   validaciones de D-006 sigue `OPEN DETAIL — PENDING OWNER RULING` (§4.3.2, punto 2).
> - **D-008 → `APPROVED — DERIVED / RECONSTRUCTED`.** Se cita **únicamente** donde nombra un
>   efecto sobre caja. Su cláusula en disputa —si la anulación de una `Sale` debe revertir
>   explícitamente stock, caja, pagos y AR— sigue `OPEN DETAIL — PENDING OWNER RULING`
>   (§4.3.2, punto 3).
> - **DEC-001 → `APPROVED DIRECTION`.** Excluye explícitamente el modelo de datos concreto, el
>   plan de migración y el diseño de token (`04-DECISIONS/02-MULTITENANCY.md:55-57`).
> - **`IMPLEMENTATION DETAIL` = `OPEN` en todo el documento.** Ninguna entidad, campo, tabla, FK,
>   enum, constraint, índice, API, endpoint, evento, permiso, umbral, migración o test es
>   producido aquí.
> - `10-AUDIT/20-G5-PRODUCTION-DATABASE-AUDIT-2026-09-29.md` es **evidencia read-only,
>   `DERIVED / AUDIT`, NO normativa**. Su hallazgo P-02 se cita en §6 **solo como evidencia
>   AS-IS/GAP**, verificada de forma independiente contra el repositorio, y **no** se convierte
>   en decisión ni en solución técnica.
>
> Este documento es **TO-BE conceptual**. No produce schema, contratos, invariantes, tests ni plan.
> Es el escalón TO-BE de `REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS →
> PLAN → IMPLEMENTATION`, y la fase se detiene aquí.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Estados inventados: 0. IDs inventados: 0.
> Entidades físicas definidas: 0. Permisos definidos: 0. Umbrales definidos: 0.
> Conflictos resueltos: 0.**

> ### POST-OR-B2 note (2026-10-03) — additive; no normative text of this document was changed
>
> - **Source / Authority:** Owner rulings `OR-B2-001 … OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`), texto verbatim en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`; registro en `03-DECISIONS/00-DECISION-REGISTER.md` §9; mapeo a conflictos en `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Precedencia ISS-08 (aprobada por OR-B2-023): Owner Ruling > Decision Register > SPEC canónica > TO-BE. Entre dos rulings prevalece el posterior.
> - **Cómo leer este documento ahora:** el texto original se conserva como evidencia histórica. Donde abajo se indica "superado", rige el OR-B2 citado **solo en ese alcance**. Los rótulos `DERIVED / RECONSTRUCTED`, `TO-BE PROPOSED` y `OPEN DETAIL` del texto se conservan como procedencia. El AS-IS citado describe el estado verificado en su momento; no se declara nada implementado.
>
> | Sección / tema de este documento | Efecto POST-OR-B2 | Autoridad |
> |---|---|---|
> | Autoridad y gobierno — D-013 y *"4 vs. 2 validaciones"* | La cláusula "4 vs. 2 validaciones" de D-006 queda resuelta en el alcance conceptual (OR-B2-002: 4 validaciones). **La cláusula en disputa de D-013** (*"Las operaciones sensibles están sujetas a permisos del `Membership`"*) **no fue tratada por OR-B2**: sigue `OPEN OWNER DECISION` (C-05) y no se convierte en requisito aprobado. | OR-B2-002 |
> | Catálogo de roles y permisos (D-005) | Roles del MVP: **Owner, Admin, Vendedor, Gestor de Stock**. Permisos por rol (incluidos los de Cash): `IMPLEMENTATION DETAIL` / `OPEN`. Este documento no asigna permisos de Cash a ningún rol. | OR-B2-008, 009 |
> | Gobernanza | Workshop 001–490 es fuente de discovery, no autoridad normativa (OR-B2-022). ISS-08 aprobada como regla de precedencia (OR-B2-023); los demás documentos de `00-GOVERNANCE` siguen `PROPOSED`. | OR-B2-022, 023 |
>
> - **Sigue `OPEN`:** ver `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md` §3 (`OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL`, `FUTURE / OPEN`).
> - **Estado:** este documento sigue `DRAFT — NOT APPROVED`. La distinción `APPROVED` / `OWNER-RULED` / `DERIVED` / `PROPOSED` / `OPEN` / `IMPLEMENTATION DETAIL` del texto original se conserva; esta nota no convierte ningún detalle técnico en decisión. `TECHNICAL SPECIFICATION = NOT APPROVED`. `IMPLEMENTATION = NOT AUTHORIZED`.

---

## 0. Correcciones de partida

### 0.1 El Payments TO-BE referenciado no existe

El encargo de esta fase indica usar *"el Payments TO-BE existente en el workspace local como
frontera Payments ↔ Cash"*. **Ese documento no existe.** Verificado sobre el directorio real y
sobre el historial de todas las ramas:

- `07-TOBE/` contiene 15 archivos; **ninguno** es de Payments (los presentes son `00-TOBE-OVERVIEW`,
  `01-IDENTITY-AND-TENANCY`, `01-PRODUCT`, `02-ARCHITECTURE`, `02-COMMERCE`, `03-DATA`,
  `03-INVENTORY`, `04-IDENTITY`, `05-ROLES-PERMISSIONS`, `06-MODULES`, `07-FLOWS`, `08-UI-UX`,
  `09-BRANDING`, `10-INTEGRATIONS`, `11-NFR`).
- `git log --all` no registra ningún archivo de Payments bajo `07-TOBE/` en ninguna rama.
- Lo único existente es **`04-DECISIONS/06-PAYMENTS.md`**, y está marcado
  **`RECONCILED 2026-09-28 — EMPTY`**, con el texto: *"No content has ever existed here.
  Payment decisions D-011 (Mercado Pago strategy) and D-012 (Accounts Receivable scope) were
  approved by the Owner; their texts do not exist in the repository."*

**Consecuencia:** la frontera Payments ↔ Cash **no puede apoyarse en un TO-BE de Payments**.
Se declara en §5 como frontera **abierta**, sobre la base de lo que D-011/D-012 tienen de
`APPROVED` en el registro canónico, sin inventar el lado Payments.

`VERIFICADO POR CÓDIGO` (inspección de directorio e historial).

### 0.2 No existe una SPEC canónica de Cash con ese nombre

La capa canónica no tiene `02-CANONICAL-SPEC/…-CASH-SPEC.md`. Los archivos presentes son
`00-WAPSELL-SPEC-GENERAL`, `01-IDENTITY-AND-TENANCY-SPEC`, `02-COMMERCE-SPEC`,
`03-OPERATIONS-SPEC`, `04-MESSAGING-SPEC`, `05-PLATFORM-AND-GOVERNANCE-SPEC` y
`06-BRANDING-AND-EXPERIENCE-SPEC`.

Cash cae conceptualmente bajo `03-OPERATIONS-SPEC.md`. **No se crea una SPEC nueva** ni se asume
que Cash tenga una propia.

### 0.3 Numeración de este archivo

Se usa `04-CASH.md`. El prefijo `04-` ya existe en `04-IDENTITY.md`, siguiendo el patrón de
numeración duplicada que la carpeta ya presenta (`01-`, `02-` y `03-` duplicados). **No se
renumera nada existente**, conforme a `00-GOVERNANCE/05-NAMING-CONVENTIONS.md`
(*"Do not replace existing approved IDs"*).

---

## 1. Qué decide D-013, y qué no

### 1.1 Texto de D-013 en el registro canónico

`00-DECISION-REGISTER.md` §4, celda de decisión (`DERIVED / RECONSTRUCTED`):

> Cada Business gestiona **sus propias cajas**. Ciclo:
> `Apertura → Operaciones/Movimientos → Arqueo → Cierre`. Los movimientos deben registrar
> Business, origen, importe, medio de pago y usuario responsable. Las operaciones sensibles están
> sujetas a permisos del Membership. Una **caja cerrada no se modifica directamente**; las
> correcciones se realizan mediante operación compensatoria o mecanismo de ajuste autorizado.

`IMPLEMENTATION DETAIL` de la misma fila: `OPEN — estados, autorizaciones, ajustes, conciliación`.

### 1.2 Lo que D-013 fija como dirección

| # | Contenido | Estado |
|---|---|---|
| C.1 | Cada `Business` gestiona **sus propias cajas** | Dirección aprobada |
| C.2 | El ciclo es `Apertura → Operaciones/Movimientos → Arqueo → Cierre` | Dirección aprobada |
| C.3 | Los movimientos registran: `Business`, origen, importe, medio de pago y usuario responsable | Dirección aprobada |
| C.4 | Una **caja cerrada no se modifica directamente** | Dirección aprobada |
| C.5 | Las correcciones se hacen por **operación compensatoria o mecanismo de ajuste autorizado** | Dirección aprobada |

### 1.3 Lo que D-013 NO decide

`IMPLEMENTATION DETAIL` es explícito: **estados, autorizaciones, ajustes y conciliación** quedan
`OPEN`. Además, de la propia ficha del workshop (`03-DECISION-WORKSHOP/D-013-…`):

- Las tres alternativas que lista —adoptar el AS-IS tal cual, mejorar para multi-tenancy,
  o simplificar a un mínimo viable— están marcadas **`(ALTERNATIVES NOT DOCUMENTED, inferido)`**.
  **Ninguna fue adoptada.** No se elige entre ellas acá.
- La ficha declara: *"This ficha must not be cited as normative authority until its decision text
  is reconstructed."*

### 1.4 La cláusula que permanece ABIERTA

`00-DECISION-REGISTER.md` §4.3.2, punto 6:

| Cláusula | Presente en | Estado |
|---|---|---|
*"Las operaciones sensibles están sujetas a permisos del `Membership`."* | **v1.0 únicamente** | **`OPEN DETAIL — PENDING OWNER RULING`** |

**Este documento no la promueve a requisito.** Queda registrada como abierta en §4.2 y §8.

---

## 2. Frontera de tenancy

De D-001 y D-002 (`OWNER-VERBATIM`), citados **solo** como frontera:

- `Business` es la unidad de aislamiento multi-tenant.
- `Membership` es la relación `User ↔ Business`, N:N.

**Lo que esto implica para Cash, sin producir modelo:** C.1 de D-013 (*"cada Business gestiona
sus propias cajas"*) es coherente con `Business` como unidad de aislamiento. La caja pertenece al
ámbito de un `Business`.

**Lo que NO se define acá:** cuántas cajas puede tener un `Business`, cómo se identifican, ni
cómo se expresa físicamente la pertenencia. Todo eso es `IMPLEMENTATION DETAIL` / `OPEN`.

**Nota de estado AS-IS**, `VERIFICADO POR CÓDIGO` vía `05-ASIS/03-ASIS-DATA.md`: el modelo actual
tiene `Caja` con `@@unique([empresaId])`, es decir **una caja por empresa**. D-013 dice *"sus
propias cajas"*, en plural. **La diferencia entre singular y plural no se resuelve acá**: es
`IMPLEMENTATION DETAIL` y queda registrada como gap en §6.3.

---

## 3. Frontera de autorización

De D-005 y D-006 (`DERIVED / RECONSTRUCTED`), citados **solo** como frontera:

- D-005: roles y permisos pertenecen al `Membership`. **Su catálogo es `OPEN`.**
- D-006: un token válido por sí solo no autoriza una operación sobre un `Business`.
  **Su formulación normativa —4 vs. 2 validaciones— sigue `OPEN DETAIL — PENDING OWNER RULING`.**

**Consecuencia para Cash:** la autorización de operaciones de caja depende de dos cosas que
todavía no existen —el catálogo de D-005 y la formulación de D-006— más la cláusula propia de
D-013 que también está abierta.

**No se definen permisos de caja en este documento.** Ni sus nombres, ni su granularidad, ni qué
operación exige cuál.

---

## 4. Ciclo de vida conceptual

### 4.1 Lo que D-013 sustenta

```text
Apertura  →  Operaciones / Movimientos  →  Arqueo  →  Cierre
```

Cuatro etapas, en ese orden, según C.2. Cada movimiento registra `Business`, origen, importe,
medio de pago y usuario responsable (C.3).

Tras el cierre, la caja **no se modifica directamente** (C.4); una corrección requiere una
**operación compensatoria o un mecanismo de ajuste autorizado** (C.5).

### 4.2 Lo que NO está definido

| # | Elemento | Por qué queda abierto |
|---|---|---|
| 4.2.1 | **Estados formales** de la caja y sus transiciones | `IMPLEMENTATION DETAIL` de D-013: *"estados"* `OPEN`. **No se declaran estados** |
| 4.2.2 | **Reglas de autorización** por operación | `IMPLEMENTATION DETAIL`: *"autorizaciones"* `OPEN`; además depende de D-005 (catálogo) y D-006 (formulación) |
| 4.2.3 | Si las operaciones sensibles dependen de permisos del `Membership` | **`OPEN DETAIL — PENDING OWNER RULING`** (§4.3.2 #6). **No se asume** |
| 4.2.4 | **Mecanismo de ajuste** y forma de la operación compensatoria | `IMPLEMENTATION DETAIL`: *"ajustes"* `OPEN` |
| 4.2.5 | **Conciliación** | `IMPLEMENTATION DETAIL`: *"conciliación"* `OPEN` |
| 4.2.6 | Qué constituye una **operación sensible** | No definido en ninguna fuente |
| 4.2.7 | Umbrales de diferencia en el arqueo | No definido en el TO-BE. El AS-IS tiene un umbral (§6.2), pero **el AS-IS no es TO-BE** |
| 4.2.8 | Cardinalidad caja ↔ `Business` | Ver §2 |
| 4.2.9 | Medios de pago admitidos y su enumeración | C.3 exige registrar *"medio de pago"*; **qué medios existen no se define** |
| 4.2.10 | Qué ocurre con una caja abierta si la `Membership` del responsable cambia o se revoca | No cubierto por ninguna decisión |

**Diez elementos abiertos. Ninguno se resuelve en este documento.**

---

## 5. Frontera Payments ↔ Cash — ABIERTA

Como se estableció en §0.1, **no existe un Payments TO-BE** sobre el que apoyar esta frontera.
Lo que sí consta en el registro canónico:

| Decisión | Estado | Alcance declarado |
|---|---|---|
**D-011** | `APPROVED — DERIVED / RECONSTRUCTED` | Pasarelas externas soportadas; Mercado Pago prioritario; abstracción de proveedor. `IMPLEMENTATION DETAIL`: `OPEN` — *"API, checkout, webhooks, credenciales, idempotencia, conciliación"* |
**D-012** | `APPROVED — DERIVED / RECONSTRUCTED` | Cuentas por Cobrar por `Business`. `IMPLEMENTATION DETAIL`: `OPEN` — *"modelo de deuda, aplicación de cobros, estados, reglas de crédito"* |

### 5.1 Lo único que D-013 dice sobre el cruce

C.3 exige que un movimiento de caja registre **medio de pago**. Eso es el único punto de contacto
declarado entre Cash y Payments en el texto de D-013.

### 5.2 Lo que queda abierto en la frontera

| # | Pregunta de frontera | Estado |
|---|---|---|
| 5.2.1 | ¿Un pago por pasarela externa (D-011) genera movimiento de caja? | **No decidido en ninguna fuente** |
| 5.2.2 | ¿Un cobro sobre cuenta corriente (D-012) genera movimiento de caja? | **No decidido** |
| 5.2.3 | ¿La conciliación de D-011 y la conciliación de caja de D-013 son el mismo proceso? | **No decidido.** Ambas decisiones usan la palabra *"conciliación"* con `IMPLEMENTATION DETAIL` `OPEN` |
| 5.2.4 | ¿La anulación de una `Sale` revierte caja? | **`OPEN DETAIL — PENDING OWNER RULING`** (D-008, §4.3.2 #3) |

**No se resuelve ninguna.** `CON-020` (ausencia de Mercado Pago) y `CON-021` (ausencia de Cuentas
por Cobrar) siguen **`OPEN`** en el registro de conflictos.

`04-DECISIONS/06-PAYMENTS.md` es explícito sobre por qué esta frontera no puede cerrarse:
*"Whether the TO-BE integrates it, and how, is undecided."*

---

## 6. Evidencia AS-IS / GAP

Esta sección es **evidencia**, no requisito. Ningún ítem se promueve a decisión ni recibe solución
técnica.

### 6.1 Qué existe hoy — `VERIFICADO POR CÓDIGO`

De `05-ASIS/01-ASIS-PRODUCT.md` y `05-ASIS/03-ASIS-DATA.md`:

> Caja: apertura, movimientos, arqueo con **doble confirmación** (usuario saliente + entrante),
> autorización por excepción si la diferencia supera el umbral, cierre.

Modelos presentes: `Caja` (`@@unique([empresaId])`), `AperturaCaja`, `MovimientoCaja`,
`ArqueoCaja` (con `usuarioId` saliente y `usuarioEntranteId` obligatorio y distinto — doble
confirmación real), `CierreCaja`.

`05-ASIS/07-ASIS-FLOWS.md` documenta el flujo `Apertura → venta → arqueo → cierre`
(`VERIFICADO POR EJECUCIÓN` en su origen).

**El AS-IS de Cash es funcionalmente rico.** D-013 no lo contradice: C.2 coincide con el ciclo ya
implementado.

### 6.2 Un rasgo del AS-IS que ninguna decisión TO-BE cubre

La **doble confirmación del arqueo** (usuario saliente + entrante obligatoriamente distintos) y la
**autorización por excepción ante diferencia sobre umbral** existen en el AS-IS y **no aparecen en
el texto de D-013**.

`07-TOBE/01-IDENTITY-AND-TENANCY.md` §12 gap #11 ya lo registra:

> Autorización por excepción con login del autorizador, **nunca a sí mismo** → Posible requisito
> equivalente de no auto-autorización. *"El AS-IS lo resuelve en código para excepciones; el TO-BE
> no lo tiene decidido."*

**Este documento no decide si esos rasgos se conservan, se modifican o se descartan.** Registrado
como gap.

### 6.3 GAP-CASH-01 — cardinalidad caja ↔ `Business`

| AS-IS | D-013 |
|---|---|
`Caja` con `@@unique([empresaId])` — **una** caja por empresa | *"cada Business gestiona **sus propias cajas**"* — plural |

`VERIFICADO POR CÓDIGO`. No resuelto: `IMPLEMENTATION DETAIL` / `OPEN`.

### 6.4 GAP-CASH-02 — P-02: endpoints de caja sin `@RequierePermiso`

Incorporado **solo como evidencia AS-IS/GAP**, conforme al alcance de esta fase, y **verificado de
forma independiente** contra el repositorio en esta fase (no heredado sin comprobar).

Lectura directa de `apps/api/src/caja/caja.controller.ts`:

| Endpoint | Línea | `@RequierePermiso` |
|---|---|---|
`@Get('estado')` | :41 | **ausente** |
`@Post('apertura')` | :46 | **ausente** |
`@Post('movimientos')` | :58 | presente — `caja.gastos` (:57) |
`@Get('movimientos')` | :63 | **ausente** |
`@Post('arqueo')` | :68 | **ausente** |
`@Patch('arqueo/:id/autorizar')` | :76 | **ausente por decisión explícita** — comentario en :73-75: *"D-06: sin @RequierePermiso propio — la restricción real está en…"* |
`@Post('cierre')` | :89 | presente — `caja.gastos` (:88) |

`VERIFICADO POR CÓDIGO` (2026-09-29).

El código de `apps/api/src/auth/auth.google.service.ts` documenta el riesgo en su propio TODO de
seguridad:

> *"caja.controller.ts expone `estado`, `apertura`, `listarMovimientos`, `arqueo` y `cierre` sin
> @RequierePermiso, solo exige estar logueado. Un usuario recién creado por Google (permisos = [])
> puede abrir/cerrar caja real hoy mismo."*

La auditoría de producción (`10-AUDIT/20-…`, hallazgo P-02) verificó por ejecución que existen
**2 usuarios `OWNER` con 0 permisos** en producción, creados por alta automática de Google.

**Relevancia para el TO-BE de Cash:** la brecha es de **autorización**, y la autorización de Cash
depende de tres elementos abiertos —el catálogo de D-005, la formulación de D-006, y la cláusula
`PENDING OWNER RULING` de D-013 (§4.2.3)—. **Este documento no propone corrección, no define
permisos y no crea decisión alguna.** El hallazgo queda como evidencia de que la definición de
autorización de Cash tiene consecuencias verificadas en el sistema en operación.

Concuerda con `TD-007` del registro de deuda técnica. La corrección corresponde a **OD-P2**, una
decisión del Owner registrada en la auditoría de producción, **fuera del alcance de esta fase**.

### 6.5 Estado de `CON-022`

`CON-022` (*"Ciclo de Vida de Gestión de Caja sin Definición TO-BE Explícita"*) figura como
**`OPEN`** en `03-CONFLICTS/00-CONFLICT-REGISTER.md`.

**Este documento aporta la definición TO-BE conceptual que el conflicto señalaba como ausente,
pero NO lo cierra:** el `IMPLEMENTATION DETAIL` de D-013 sigue `OPEN` en sus cinco componentes
(estados, autorizaciones, ajustes, conciliación) y la cláusula de permisos del `Membership` sigue
`PENDING OWNER RULING`. Cerrar `CON-022` requiere una decisión del Owner, no un documento TO-BE.

---

## 7. Relación con otros TO-BE

| Documento | Frontera |
|---|---|
`07-TOBE/01-IDENTITY-AND-TENANCY.md` | Aporta la frontera de tenancy y autorización (§2, §3). Su gap #11 cubre la no-auto-autorización (§6.2) |
`07-TOBE/03-INVENTORY.md` | Frontera Cash ↔ Inventory: no declarada en D-013. Una venta afecta stock y caja, pero **cómo se coordinan es `IMPLEMENTATION DETAIL`** de D-008, cuya cláusula está `PENDING OWNER RULING` |
`07-TOBE/02-COMMERCE.md` | Frontera Sale ↔ Cash: ver §5.2.4 |
**Payments TO-BE** | **No existe** — ver §0.1 y §5 |

---

## 8. Open Details de este dominio

Consolidado. Ninguno se resuelve acá.

| # | Open Detail | Autoridad |
|---|---|---|
| 1 | Estados formales de la caja y transiciones | D-013 `IMPLEMENTATION DETAIL` |
| 2 | Reglas de autorización por operación de caja | D-013 `IMPLEMENTATION DETAIL` + D-005 + D-006 |
| 3 | **Si las operaciones sensibles dependen de permisos del `Membership`** | **`OPEN DETAIL — PENDING OWNER RULING`** (§4.3.2 #6) |
| 4 | Mecanismo de ajuste / operación compensatoria | D-013 `IMPLEMENTATION DETAIL` |
| 5 | Conciliación de caja | D-013 `IMPLEMENTATION DETAIL` |
| 6 | Definición de *"operación sensible"* | Sin fuente |
| 7 | Umbral de diferencia en el arqueo | Sin fuente TO-BE |
| 8 | Cardinalidad caja ↔ `Business` (GAP-CASH-01) | D-013 vs. AS-IS |
| 9 | Enumeración de medios de pago | C.3 lo exige; no lo define |
| 10 | Caja abierta ante cambio o revocación de `Membership` | Sin fuente |
| 11 | Destino de la doble confirmación del arqueo en el TO-BE | AS-IS sin cobertura TO-BE (§6.2) |
| 12 | Destino de la autorización por excepción sobre umbral | AS-IS sin cobertura TO-BE (§6.2) |
| 13 | Frontera Payments ↔ Cash (4 preguntas) | §5.2 — sin Payments TO-BE |
| 14 | Frontera Cash ↔ Inventory en la anulación de `Sale` | D-008 `PENDING OWNER RULING` |
| 15 | Confirmación de la redacción de D-013 por el Owner | `DERIVED / RECONSTRUCTED` |

---

## 9. Clasificación de evidencia

| Conclusión | Clasificación |
|---|---|
Texto y estado de D-013; `IMPLEMENTATION DETAIL` `OPEN` | **DOCUMENTADO** |
Cláusula de permisos del `Membership` en `PENDING OWNER RULING` | **DOCUMENTADO** (§4.3.2 #6) |
Las 3 alternativas de D-013 están marcadas *"inferido"* | **DOCUMENTADO** |
No existe Payments TO-BE en ninguna rama | **VERIFICADO POR CÓDIGO** |
`04-DECISIONS/06-PAYMENTS.md` está vacío por reconciliación | **DOCUMENTADO** |
No existe SPEC canónica de Cash | **VERIFICADO POR CÓDIGO** |
Modelos AS-IS de caja y doble confirmación del arqueo | **DOCUMENTADO** (`VERIFICADO POR CÓDIGO` en origen) |
`Caja` con `@@unique([empresaId])` — una por empresa | **DOCUMENTADO** (`VERIFICADO POR CÓDIGO` en origen) |
Endpoints de caja sin `@RequierePermiso` (GAP-CASH-02) | **VERIFICADO POR CÓDIGO** (lectura directa, 2026-09-29) |
2 usuarios `OWNER` sin permisos en producción | **DOCUMENTADO** — `10-AUDIT/20-…`, `VERIFICADO POR EJECUCIÓN` en origen |
`CON-020`, `CON-021`, `CON-022` `OPEN` | **DOCUMENTADO** |
Si la caja debe ser una o varias por `Business` | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |
Si un pago externo o un cobro de AR genera movimiento de caja | **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE** |

**Sin evidencia `VERIFICADO POR TEST`:** el repositorio no tiene tests (`TD-001`).

---

## 10. Cierre de fase

**Fase 6.5 — TO-BE Cash: completada.**

Este documento produce el **TO-BE conceptual de Cash** apoyado en D-013 como autoridad principal,
con D-001/D-002 como frontera de tenancy y D-005/D-006 como frontera de autorización.

**Lo que NO se hizo, por diseño:**

- No se resolvió la cláusula `PENDING OWNER RULING` de D-013.
- No se definieron permisos, estados, entidades, umbrales ni mecanismos técnicos.
- No se eligió entre las tres alternativas inferidas de D-013.
- No se cerró `CON-022`, `CON-020` ni `CON-021`.
- No se inventó la frontera Payments ↔ Cash ante la ausencia de un Payments TO-BE.
- No se convirtió P-02 en decisión ni en solución técnica.
- **No se comenzó Messaging.**

**La fase se detiene aquí**, conforme al escalón TO-BE de la cadena de gobernanza.

## POST-OR-B3 — OWNER RULINGS PROPAGATED

OR-B3-010 cierra el principio de autorización: las operaciones sensibles de Cash se gobiernan mediante Permissions específicas. El catálogo concreto de permisos, matriz operación→permiso, estados y enforcement técnico permanecen abiertos.

Esto supersede cualquier formulación histórica que presente como abierta la elección entre Owner-only, Owner+Admin o Permissions específicas.

---

## R4 — RECONCILIACIÓN CANÓNICA POST-OR-B3

**Fecha:** 2026-10-03  
**Estado:** RECONCILED — CURRENT CONCEPTUAL BASELINE  
**Autoridad:** OR-B2 + OR-B3 + 26-R4-TOBE-AUDIT-INVENTORY-CASH-MESSAGING-2026-10-03.md  
**Alcance:** reconciliación documental conceptual. No produce schema, contracts, invariants, tests ni implementación.

### R4-CASH-CURRENT-01 — Business scope

Cash es una capacidad contextualizada al Business. Las operaciones de caja no se consideran globales entre Businesses.

**Evidencia:** DOCUMENTADO — frontera de tenancy de D-001/OR-B2.

### R4-CASH-CURRENT-02 — Operaciones sensibles

Las operaciones sensibles de Cash requieren Permissions específicas.

Este ruling no fija nombres concretos de permisos, roles que los reciben, umbrales, flujos de aprobación ni mecanismos técnicos.

**Evidencia:** DOCUMENTADO — OR-B3-010.

### R4-CASH-CURRENT-03 — Fronteras con Payment y Accounts Receivable

Payment y Accounts Receivable son dominios relacionados, pero el material reconciliado no cierra todavía sus límites físicos con Cash.

Por tanto permanecen abiertos:

- relación exacta Payment ↔ Cash;
- efectos sobre caja de operaciones económicas;
- relación con AR/Cuentas Corrientes;
- estados y lifecycle técnicos;
- compensaciones y ajustes.

No se inventa un modelo de Payment para completar el hueco documental detectado.

### R4-CASH-CURRENT-04 — Estados y correcciones

No existe una decisión vigente que cierre un state machine físico de Cash ni un mecanismo técnico concreto para ajustes, anulaciones o compensaciones.

Estos puntos permanecen OPEN IMPLEMENTATION DETAIL.

### R4-CASH-CURRENT-05 — AS-IS vs TO-BE

La evidencia histórica de doble confirmación, umbrales u otras reglas observadas en AS-IS no se convierte automáticamente en TO-BE.

La brecha AS-IS se conserva como evidencia y deberá reconciliarse en una especificación posterior cuando corresponda.

### R4-CASH-CURRENT-06 — Fronteras abiertas

Permanecen OPEN:

- catálogo exacto de Permissions sensibles de Cash;
- asignación de Permissions a Membership Roles;
- estados/lifecycle de Cash;
- reglas de ajuste/compensación;
- Payment ↔ Cash;
- Cash ↔ AR;
- contratos, invariantes y tests;
- enforcement técnico.

**Conclusión:** Cash queda reconciliado a nivel conceptual sin cerrar detalles que todavía requieren especificación especializada o decisión del Owner.
