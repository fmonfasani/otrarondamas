# Wapsell — Inventory (TO-BE)
**Fase:** 6.2 — TO-BE Inventory · **Creado:** 2026-09-28 · **Estado:** DRAFT — NOT APPROVED

> ## Autoridad y gobierno
>
> - **D-010 → `APPROVED — OWNER-RULED 2026-09-28`** (`04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1:
>   v1.0 prevalece), **texto** `DERIVED / RECONSTRUCTED`. Estado de implementación:
>   **`IMPLEMENTATION NON-COMPLIANT / GAP`**.
> - **D-014 → `APPROVED — OWNER-RULED 2026-09-28`** (misma sección), **texto**
>   `DERIVED / RECONSTRUCTED`. Estado de implementación: **`VERIFIED BY CODE`**, con una
>   calificación obligatoria (cumplimiento por ausencia del feature, §3.3).
> - **D-001, D-002, D-005, D-006 → `APPROVED`** (D-001/D-002 `OWNER-VERBATIM`; D-005/D-006 `DERIVED`).
>   Se citan solo como frontera de tenancy y autorización. La cláusula de 4 vs. 2 validaciones de
>   D-006 sigue `OPEN DETAIL — PENDING OWNER RULING` (registro §4.3.2, punto 2).
> - **D-008, D-015, D-016 → `APPROVED — DERIVED / RECONSTRUCTED`.** Se citan **únicamente** donde
>   nombran un efecto sobre stock. La cláusula en disputa de D-008 (si la anulación debe revertir
>   explícitamente stock, caja, pagos y AR) sigue `OPEN DETAIL — PENDING OWNER RULING` (§4.3.2, punto 3).
> - **DEC-001 → `APPROVED DIRECTION`.** Excluye explícitamente el modelo de datos, el plan de
>   migración y el diseño de token (`04-DECISIONS/02-MULTITENANCY.md:55-57`).
> - **`IMPLEMENTATION DETAIL` = `OPEN` en todo el documento.** Ninguna Entidad, campo, tabla, FK,
>   enum, constraint, índice, API, endpoint, evento, permiso, migración o test es producido aquí.
> - `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` es **evidencia read-only, `DERIVED / AUDIT`,
>   NO normativa** (`:6`, `:10-27`). Sus hallazgos `AUD-*` son **locales a esa auditoría** y sus
>   observaciones P1–P8 son `PROPOSED / OPEN`: **no se propagan como requisitos**.
>
> Este documento es **TO-BE conceptual**. No produce schema, contratos, invariantes, tests ni plan.
> Es el escalón TO-BE de `REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS →
> PLAN → IMPLEMENTATION`, y la fase se detiene aquí.
>
> **Decisiones creadas: 0. Requisitos inventados: 0. Estados inventados: 0. IDs inventados: 0.
> Entidades físicas definidas: 0. Conflictos resueltos: 0.**

> ### POST-OR-B2 note (2026-10-03) — additive; no normative text of this document was changed
>
> - **Source / Authority:** Owner rulings `OR-B2-001 … OR-B2-026` (sesión `OR-B2-SESSION-2026-10-03`), texto verbatim en `03-DECISIONS/20-OR-B2-OWNER-DECISIONS-2026-10-03.md`; registro en `03-DECISIONS/00-DECISION-REGISTER.md` §9; mapeo a conflictos en `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Precedencia ISS-08 (aprobada por OR-B2-023): Owner Ruling > Decision Register > SPEC canónica > TO-BE. Entre dos rulings prevalece el posterior.
> - **Cómo leer este documento ahora:** el texto original se conserva como evidencia histórica. Donde abajo se indica "superado", rige el OR-B2 citado **solo en ese alcance**. Los rótulos `DERIVED / RECONSTRUCTED`, `TO-BE PROPOSED` y `OPEN DETAIL` del texto se conservan como procedencia. El AS-IS citado describe el estado verificado en su momento; no se declara nada implementado.
>
> | Sección / tema de este documento | Efecto POST-OR-B2 | Autoridad |
> |---|---|---|
> | Inventario | El stock se reserva al confirmar el `Order`; el descuento físico queda sujeto al flujo transaccional de la especificación especializada (momento de descuento: `OPEN OWNER DECISION`; no se inventan estados técnicos ni transaction boundaries). Rotación: con vencimiento → FEFO, sin vencimiento → FIFO. Stock negativo no permitido. El MVP contempla Locations/Warehouses de forma mínima con una ubicación principal/default conceptual (cantidad de branches/warehouses: `OPEN OWNER DECISION`; sin modelo físico). D-010 sigue `NON-COMPLIANT / GAP` en el AS-IS (`AUD-D010-G01…G10`): OR-B2 no la altera ni declara nada implementado. | OR-B2-014, 016, 017, 018 |
> | § ubicaciones (*"El MVP NO introduce ubicaciones físicas"*, SPEC general `:149` / `:244`) | **Superado en ese punto** por OR-B2-017. La calificación original (OPEN DETAIL) se conserva como historia. | OR-B2-017 |
> | § FIFO / lotes / vencimientos (*"FIFO como política de consumo — `OPEN DETAIL`"*) | Política de rotación decidida a nivel conceptual: FEFO / FIFO. Existencia y modelado de lotes, tratamiento de vencimientos y mecanismo: `OPEN IMPLEMENTATION DETAIL`. | OR-B2-016 |
> | §8 Reservas y disponibilidad — *"Existencia de reservas en el TO-BE: `OPEN DETAIL`"* | La existencia de la reserva queda decidida a nivel conceptual (se reserva al confirmar el `Order`). Mecanismo de reserva (retención, expiración, conversión) y momento del descuento físico: `OPEN`. | OR-B2-014 |
> | §9 Stock insuficiente, oversell y existencias negativas | Stock negativo no permitido (decisión conceptual). Es coherente con D-010. El AS-IS tiene brechas verificadas (`AUD-D010-G02` devolución a proveedor sin guarda): `NON-COMPLIANT / GAP`; no se declara corregido. | OR-B2-018 |
> | Autoridad y gobierno — *"4 vs. 2 validaciones de D-006 sigue `OPEN DETAIL`"* | Resuelta en el alcance conceptual: 4 validaciones (D-006 promovida a `OWNER-RULED`). | OR-B2-002 |
> | Roles del MVP | Membership Roles del MVP: **Owner, Admin, Vendedor, Gestor de Stock** (nomenclatura oficial; "Operador de Stock" no es nombre normativo). `Owner` = propiedad/control máximo; `Admin` = administración delegada; son roles distintos. `Customer` y `Supplier` no son Membership Roles. `Repartidor`: fuera del MVP como Membership Role, `FUTURE / OPEN`. Catálogo de permisos y precedencia: `IMPLEMENTATION DETAIL`. El AS-IS (`RolUsuario`: `OWNER`, `ASISTENTE_LOCAL`, `PROVEEDOR`, `REPARTIDOR`) no tiene `Admin`. Nada se declara implementado. | OR-B2-008, 009 + aclaración del Owner |
> | Gobernanza | Workshop 001–490 es fuente de discovery, no autoridad normativa (OR-B2-022). ISS-08 aprobada como regla de precedencia (OR-B2-023); los demás documentos de `00-GOVERNANCE` siguen `PROPOSED`. | OR-B2-022, 023 |
>
> - **Sigue `OPEN`:** ver `03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md` §3 (`OPEN OWNER DECISION`, `OPEN IMPLEMENTATION DETAIL`, `FUTURE / OPEN`).
> - **Estado:** este documento sigue `DRAFT — NOT APPROVED`. La distinción `APPROVED` / `OWNER-RULED` / `DERIVED` / `PROPOSED` / `OPEN` / `IMPLEMENTATION DETAIL` del texto original se conserva; esta nota no convierte ningún detalle técnico en decisión. `TECHNICAL SPECIFICATION = NOT APPROVED`. `IMPLEMENTATION = NOT AUTHORIZED`.

---

## 0. Corrección de partida: la SPEC canónica de Inventory no existe con ese nombre

El encargo de esta fase nombra `02-CANONICAL-SPEC/03-INVENTORY-SPEC.md`. **Ese archivo no existe.**
Verificado sobre el directorio real de la capa canónica: los archivos presentes son
`00-WAPSELL-SPEC-GENERAL.md`, `01-IDENTITY-AND-TENANCY-SPEC.md`, `02-COMMERCE-SPEC.md`,
`03-OPERATIONS-SPEC.md`, `04-MESSAGING-SPEC.md`, `05-PLATFORM-AND-GOVERNANCE-SPEC.md` y
`06-BRANDING-AND-EXPERIENCE-SPEC.md`.

El archivo que realmente cubre Inventory es `02-CANONICAL-SPEC/03-OPERATIONS-SPEC.md`, y su estado
es el siguiente:

> **Status:** `DRAFT - NOT APPROVED` · **Reconciled:** 2026-09-28
>
> *"This file is a **placeholder**: a title, a status line and one sentence. It contains no rules, no
> AS-IS evidence and no `OPEN DETAIL` list, so it cannot be audited for coherence."* — `03-OPERATIONS-SPEC.md:6-7`

| Lo que el placeholder afirma | Consecuencia para este documento |
|---|---|
| Su materia mapea a D-009, **D-010 (inventory source of truth)**, D-013, **D-014**, D-015 y D-016 (`:9-10`) | El alcance de Inventory es D-010 + D-014, con D-015/D-016 como dominios vecinos |
| *"All of those are `APPROVED — DERIVED / RECONSTRUCTED` — reconstructed text now exists …, but it does not yet specify rules, so none can be written here without inventing it"* (`:10-12`) | El texto canónico **existe** y se aplica (§3, §4); lo que no existe son las **reglas derivadas**, que este documento deja `OPEN DETAIL` en vez de inventar |
| *"Conflicts: CON-002, CON-006, CON-007, CON-019, CON-022, CON-023, CON-024, CON-025 — all OPEN"* (`:15`) | Este documento declara y **no cierra** ninguno; los que le tocan son CON-007, CON-019 y CON-023 (§15) |
| *"Full content of this spec is **unwritten**. Everything remains `OPEN DETAIL`"* (`:22`) | Este documento **no rellena** esa SPEC: solo la sustituye como fuente de autoridad del TO-BE conceptual |
| *"See `00-WAPSELL-SPEC-GENERAL.md` §12–§16, which carries the same content as `TO-BE PROPOSED`"* (`:12-13`) | El §13 del SPEC general se trata en §2 y §11 con esa calificación explícita |

**No se creó, no se renombró y no se modificó ninguna SPEC canónica en esta fase.** La discrepancia
de nombre se reporta aquí y en el informe final; corregir el nombre del artefacto canónico es una
acción de gobernanza documental fuera del alcance autorizado.

**Divergencia interna del SPEC general, reportada sin resolver.** El mismo documento afirma dos
cosas distintas sobre las ubicaciones físicas:

| Ubicación del SPEC general | Afirmación | Calificación |
|---|---|---|
| §13, `:149` | *"El MVP **NO** introduce ubicaciones físicas (`Depósito`, `Local`) para la gestión de stock; la granularidad por ubicación podrá incorporarse posteriormente, y la arquitectura debe evitar bloquear esa futura evolución."* | Marcada `[DECISION TEXT: DERIVED / RECONSTRUCTED]` |
| §22 `OUT OF SCOPE`, `:244` | *"Granularidad de inventario por ubicación física (depítulos/locales) en el MVP. **OPEN DETAIL**"* | `OUT OF SCOPE` es `TO-BE PROPOSED` como sección (`:234`) |

El texto canónico de **D-014 no menciona ubicaciones** (§4.3.1, citado literal en §3.1). Ninguna
decisión cubre el punto, y `04-DECISIONS/05-INVENTORY.md:24` lo lista explícitamente entre lo *"Still
not decided"*. Por tanto §11 trata el punto como `OPEN DETAIL` y **no elige** entre las dos
afirmaciones. Lo mismo aplica a `07-TOBE/00-TOBE-OVERVIEW.md:261-263`, que lo etiqueta `TO-BE PROPOSED`.

---

## 1. Alcance y perímetro de Inventory

### 1.1 Dentro de alcance

Propiedad y aislamiento del inventario, integridad transaccional del stock, y los conceptos que
esas dos decisiones nombran: stock, movimientos, existencias, ajustes, lotes y vencimientos. La
frontera del dominio la fija el SPEC general §13 (`:147-184`) y la capa de navegación/dominio de
`07-TOBE/00-TOBE-OVERVIEW.md` §5.

Este documento cubre, con autoridad declarada en cada caso:

1. **Propiedad del inventario y aislamiento por `Business`** — D-014, `OWNER-RULED` (§3).
2. **Prohibición de transferencia de stock entre `Business`** — D-014, `OWNER-RULED` (§3.3).
3. **Integridad transaccional del stock** — D-010, `OWNER-RULED` (§4).
4. **Estado real de la implementación** de ambas — evidencia `VERIFIED BY CODE` (§3.2, §4.3, §4.4).
5. **Los conceptos del dominio** y qué se sabe de cada uno, sin definir entidades físicas (§5).
6. **Ciclo de vida de los movimientos** y sus orígenes, en la medida en que D-014 los nombra (§6).
7. **Lotes, vencimientos y su trazabilidad** (§7).
8. **Reservas y disponibilidad** (§8).
9. **Stock insuficiente, oversell y existencias negativas** (§9).
10. **Relación con `Purchases`, `Sale`/`Order` y `Fulfillment`** (§10).

### 1.2 Fuera de alcance

`Cash` (D-013, CON-022), `Purchases`/`Suppliers`/`Accounts Payable` (D-015, CON-024), `Fulfillment`
(D-016, CON-025), `Payments` (D-011, CON-020), `Accounts Receivable` (D-012, CON-021), `Messaging`
(D-003, CON-011), `Reports` (SPEC §17), `Audit` (SPEC §18), `Notifications` (SPEC §19), `Branding`
(D-004) y arquitectura (D-017, CON-026). Se mencionan **únicamente** donde una decisión de Inventory
las invoca como frontera (§10.4) o donde el SPEC general las nombra; **no se desarrollan**.

Fuera de alcance por fase, aunque sean temáticamente vecinos: `Contract`, `Invariant`, `Test`,
plan de implementación, migraciones y cualquier artefacto de schema.

### 1.3 Distinción obligatoria: NAVIGATION MODULE ≠ BUSINESS DOMAIN ≠ ENTITY

Se define en `07-TOBE/00-TOBE-OVERVIEW.md` §5 y se aplica aquí sin modificarla.

| | **NAVIGATION MODULE** | **BUSINESS DOMAIN** | **ENTITY** |
|---|---|---|---|
| Qué es | Entrada de primer nivel del shell | Área acotada de responsabilidad | Concepto persistente con datos |
| Responde a | ¿Dónde trabaja el usuario? | ¿Qué reglas y qué datos van juntos? | ¿Qué cosa se guarda? |
| Cambiarlo obliga a | Reordenar la UI | Rediseñar reglas o mover datos | Migración de datos |
| Autoridad de la lista | SPEC general §25 — `TO-BE PROPOSED` | §24 — `TO-BE PROPOSED` | SPEC + decisiones de dominio |

**Aplicación a Inventory** (dominios según §24; navegación según §25):

| Concepto | ¿Entidad? | ¿Business Domain? | ¿Navigation Module? |
|---|---|---|---|
| `Inventory` | **No es entidad en ninguna decisión**: es un área de responsabilidad | D13 Inventory — `TO-BE PROPOSED` | **Sí**: §25 ítem **"5. Stock"** |
| `Stock` | **No hay entidad `Stock` en ninguna decisión** (ver §5.2) | D13 Inventory | **No** por nombre propio |
| `Lote` | **No figura en el texto canónico de D-010 ni de D-014** (§5.3) | D13 Inventory | **No** |
| `MovimientoStock` | **No figura en el texto canónico de D-010 ni de D-014**; D-014 dice *"movimientos"*, no el nombre AS-IS (§5.2) | D13 Inventory | **No** |
| `Producto` / `Product` | Sí, en el dominio Catalog (D06) | D06 Catalog — `TO-BE PROPOSED` | **No** |

**Tres observaciones, sin resolver:**

1. **El ítem de navegación se llama "Stock" y el dominio se llama "Inventory".** Son dos listas
   distintas, ambas `TO-BE PROPOSED`, y ninguna decisión las vincula. El nombre canónico del ítem de
   navegación, su relación con el dominio D13 y si `Stock` debe ser también el nombre del dominio son
   `OPEN DETAIL` (§17, punto 1).
2. **`Inventory` no es módulo, no es pantalla y no es ruta.** Declararlo cualquiera de esas tres
   cosas sería inventar una decisión que no existe. La correspondencia dominio ↔ módulo de código ↔
   carpeta es `OPEN DETAIL` en `07-TOBE/00-TOBE-OVERVIEW.md` §13, punto 3, y se mantiene abierta.
3. **Sobre-attribución detectada en `07-TOBE/00-TOBE-OVERVIEW.md` §5.3** (`:176`): la tabla de
   ejemplos de entidad cita "`Lote` y `MovimientoStock` ligados al `Business` propietario" con
   autoridad **D-014**. El texto canónico de D-014 (§3.1) **no nombra ninguna de las dos entidades**;
   nombra *"Compras, ventas, ajustes y movimientos"*. `Lote` y `MovimientoStock` son nombres AS-IS
   (`05-ASIS/03-ASIS-DATA.md:28,54-56`). Este documento **no modifica** `00-TOBE-OVERVIEW.md`: lo
   registra como divergencia a corregir en la pasada de reconciliación correspondiente.

**Evidencia AS-IS de la fricción (no es propuesta).** El panel `pos-admin` tiene una ruta real
`/inventory` (`05-ASIS/09-ASIS-UI.md:9`) y el backend tiene un módulo `inventario` con 5 endpoints
reales (`05-ASIS/06-ASIS-MODULES.md:19`). Esa superficie es **AS-IS**: no es una lista aprobada de
módulos TO-BE y no habilita por sí sola ningún ítem de navegación.

---

## 2. Modelo conceptual vs. modelo físico

`DEC-001:55-57` **excluye explícitamente** el modelo de datos. Este documento respeta esa exclusión.

| Nivel | Qué se afirma aquí | Autoridad |
|---|---|---|
| **Conceptual** | Existe una relación de dependencia entre `Business`, inventario, producto, existencias y movimientos | D-010 + D-014 (`OWNER-RULED`) |
| **Físico** | **Nada.** Ninguna tabla, columna, tipo, FK, índice, enum, constraint o migración | DEC-001 (exclusión explícita) |
| **Mecanismo de aislamiento** | **Nada.** D-001 no decide si es row-level security, filtro obligatorio, esquema por `Business` u otro | `IMPLEMENTATION DETAIL` / `OPEN` |

**Sobre la nomenclatura `Empresa` → `Business`.** D-001 (`OWNER-VERBATIM`) decide que `Empresa` se
transforma en `Business` y que `Business` es la unidad canónica de aislamiento. Aplicado a
Inventory: la clave de aislamiento que hoy se llama `empresaId` pasa a ser el `Business` propietario
(§3.1). La **estrategia de migración** y el **modelo físico** de esa transformación son
`IMPLEMENTATION DETAIL` / `OPEN` (`00-TOBE-OVERVIEW.md` §3, `:85-86`). **No se propone aquí ninguna
migración.**

**Sobre "stock único por Business".** El SPEC general §13 (`:149`) lo formula como modelo de stock
TO-BE y el §22 `IN SCOPE` (`:223`) lo lista junto con *"FIFO, lotes, integridad"*, pero **§22 es
`TO-BE PROPOSED` como sección** (`:210-213`) y la línea lleva el marcador
`[DECISION TEXT: DERIVED / RECONSTRUCTED]`. La parte que **sí** tiene decisión canónica es la de
D-014: el inventario pertenece exclusivamente a cada `Business` y no hay stock global compartido
(§3.1). Las partes de "stock único", "FIFO" y "lotes" **no** están en el texto canónico de D-010 ni
de D-014 y se tratan en §5 y §7 como `OPEN DETAIL`, no como requisito.

---

## 3. Propiedad del inventario (D-014)

### 3.1 Aplicación estricta de D-014

Texto canónico y vinculante, `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1, con
`Status: APPROVED — OWNER-RULED 2026-09-28` y **texto `DERIVED / RECONSTRUCTED`** (§4 fila D-010/D-014
y §4.3.1; `OWNER: fmonfasani`; `DATE: 2026-09-28`):

> **"El inventario pertenece exclusivamente a cada Business. No existe stock global compartido entre
> Business. Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente.
> No se permite transferencia de stock entre Business salvo que una operación inter-Business sea
> definida y autorizada explícitamente en una especificación posterior."**

Cuatro propiedades **aprobadas**:

1. **Propiedad exclusiva por `Business`.** El inventario pertenece a un `Business`; la pertenencia no
   es compartida ni repartida entre negocios.
2. **No existe stock global compartido.** No hay un pool de inventario común entre `Business`.
3. **Registro dentro del `Business` correspondiente.** Compras, ventas, ajustes y movimientos se
   registran en el `Business` al que pertenecen. Esta cláusula nombra las **cuatro** familias de
   operación que el texto considera registradas dentro del `Business`.
4. **Prohibición de transferencia inter-`Business`, con cláusula de escape nombrada.** No se permite
   transferir stock entre `Business`; la excepción exige una **operación inter-`Business` definida y
   autorizada explícitamente en una especificación posterior**.

**Consecuencia registrada por el propio Owner** (§4.3.1, columna *Consequence*):

> *"Cross-Business stock transfer is **prohibited**, not `OPEN`. Yields a **cross-entity verifiable
> invariant**: no code path may move stock between Business. The v1.1 demotion of "transferencias" to
> `OPEN DETAIL` is **REJECTED**."*

Dos lecturas obligatorias de esa consecuencia:

- La transferencia **no** es `OPEN DETAIL`: es una **prohibición vigente**. Lo que está abierto es
  únicamente su **cláusula de escape** —qué operación inter-`Business` se definiría y autorizará, si
  alguna (§3.3, §17, punto 9).
- El registro characterize la prohibición como candidata a un invariante verificable
  cross-entity. **Ese invariante no se crea aquí**: la capa `INVARIANTS` pertenece a una fase
  posterior y este documento no produce invariantes. Consta como `OPEN DETAIL` de la cadena de fase
  (§19).

**Lo que D-014 NO decide** (y por tanto no se afirma aquí): el modelo de datos; el mecanismo técnico
de aislamiento; la existencia de ubicaciones físicas; las reservas de stock; los informes de
inventario; y si existen almacenes compartidos o compras centralizadas entre negocios —esta última es
una pregunta abierta de la ficha D-014 que sigue **sin responder**
(`03-DECISION-WORKSHOP/D-014-inventory-ownership.md:49`).

### 3.2 Aislamiento verificado por código

Estado de implementación de D-014: **`VERIFIED BY CODE`**. Fuente:
`05-ASIS/03-ASIS-DATA.md:69-117` y `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` §7 (2026-09-28,
HEAD `066bb91`, lectura estática). **Estos son hechos verificados sobre el AS-IS, no requisitos.**

| ID | Control verificado | Ubicación |
|---|---|---|
| `AUD-D014-C01` | El aislamiento es una Prisma Client Extension creada **por request** con el `empresaId` de la sesión, no un middleware en el que cada service confía | `empresa-scope.extension.ts:102-171` |
| `AUD-D014-C02` | `create`/`createMany` sobrescriben el `empresaId` entrante: un cliente no declara en qué `Business` escribe | `empresa-scope.extension.ts:118-129` |
| `AUD-D014-C03` | Filtro inyectado en `where` para `findFirst`, `findFirstOrThrow`, `findMany`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate` | `empresa-scope.extension.ts:82-92, 131-134` |
| `AUD-D014-C04` | `findUnique` no admite `empresaId` sin compound unique: la extensión ejecuta y **verifica después**; fila de otra empresa devuelve `null` o lanza `P2025` | `empresa-scope.extension.ts:136-159` |
| `AUD-D014-C05` | **Fail-closed**: `upsert` y toda operación no contemplada lanza excepción en vez de pasar sin scope | `empresa-scope.extension.ts:161-166` |
| `AUD-D014-C06` | `Producto`, `Lote` y `MovimientoStock` están los tres en `MODELOS_CON_EMPRESA_ID`: cobertura directa, sin herencia por relación | `empresa-scope.extension.ts:38, 45, 56` |
| `AUD-D014-C07` | El `empresaId` proviene siempre de `request.user` vía `@CurrentUser()`, nunca de body, query ni params | `current-user.decorator.ts`, `inventario.controller.ts:43-54` |
| `AUD-D014-C08` | La única ocurrencia de SQL crudo en `apps/api/src` incluye `"empresaId" = $3` en su `WHERE` | `inventario.service.ts:266-270` |
| `AUD-D014-C09` | SKU y lote únicos por `Business`: `@@unique([empresaId, codigoInterno])` y `@@unique([productoId, numeroLote, empresaId])` | `schema.prisma:431, 464` |
| `AUD-D014-C10` | La superficie HTTP de inventario no permite elegir el `Business`: los 5 endpoints toman el `Business` del usuario autenticado | `inventario.controller.ts:43, 58, 74, 95, 105` |

**Riesgos latentes, no corregidos** (`05-ASIS/03-ASIS-DATA.md:116-117`,
`10-AUDIT/…:553-577`):

| ID | Riesgo verificado | Detalle |
|---|---|---|
| `AUD-D014-G01` | `empresaId` desnormalizado sin consistencia garantizada a nivel DB | `Lote` lleva dos claves redundantes (`empresaId`, `productoId`) y `MovimientoStock` tres (`empresaId`, `productoId`, `loteId`), sin FK, `CHECK` ni trigger que exija la coincidencia cruzada. **Ninguna vía explotada** en el código auditado |
| `AUD-D014-G02` | Frontera sin scope no forzada por tooling | `PrismaService` (sin scope) se inyecta en `auth/*`, `invitaciones/*`, `legajo/*`. Se verificó que ninguno toca `Lote`, `MovimientoStock` ni `Producto` hoy |

`05-ASIS/03-ASIS-DATA.md:119-120` lo dice sin ambigüedad: **no existe ninguna corrección aprobada para
estas limitaciones.** La auditoría las registra como `PROPOSED / OPEN` y **no** forman parte del
AS-IS ni de ningún requisito.

**Modelos que heredan scope por relación** (`AUD-D014-N03`): `VentaItem`→`Venta`,
`AplicacionPago`→`Pago`, `AperturaCaja`/`MovimientoCaja`/`ArqueoCaja`/`CierreCaja`→`Caja`,
`CompraItem`→`Compra`, `Legajo`/`DocumentoLegajo`. La auditoría confirma que **`Lote` y
`MovimientoStock` no están en esa lista**: el dominio Inventory tiene cobertura directa (§3.2,
`AUD-D014-C06`).

### 3.3 La transferencia inter-`Business`: prohibida, no abierta

Este punto es donde el artefacto canónico fue corregido explícitamente y donde una lectura
relajada reintroduce el error.

| Fuente | Afirmación | Estado |
|---|---|---|
| `00-DECISION-REGISTER.md` §4.3.1 | *"No se permite transferencia de stock entre Business"* | **Vigente, `OWNER-RULED`** |
| `00-DECISION-REGISTER.md` §4.3.1 | La reducción v1.1 que degradaba "transferencias" a `OPEN DETAIL` está **REJECTED** | **Vigente** |
| `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:23` | *"Capacidades de transferencia entre negocios"* figura entre las **alternativas** del workshop | **No normativa.** Una alternativa no aprobada no es una vía disponible |
| `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:46` | *"Desarrollo de nuevas APIs y UI para gestionar transferencias entre negocios"* figura en *Implementation Impact* del registro histórico | **No normativa.** Es impacto del taller, anterior al ruling |
| `00-DECISION-WORKSHOP/D-014-inventory-ownership.md:11` (pregunta) y `:15` | La pregunta de D-014 nombra "movimientos y transferencias entre negocios" | **No normativa.** La pregunta del taller no es el texto de la decisión |

**Lo que este documento sostiene, y por qué:**

1. **La transferencia inter-`Business` está prohibida.** No es una funcionalidad pendiente, no es una
   decisión tomada "a medias" y no aparece como pendiente de nada en ningún artefacto canónico.
2. **La cláusula de escape está nombrada pero no ejercida.** Una operación inter-`Business` solo podría
   existir si fuera *"definida y autorizada explícitamente en una especificación posterior"*. **No
   existe tal especificación** en el repositorio. Por tanto **no hay ninguna operación inter-`Business`
   autorizada**, y este documento no propone ninguna.
3. **Ninguna entidad, endpoint, servicio, comando, job o cron de transferencia se diseña aquí.** Su
   entidad, estados, transiciones, workflow, permisos, auditorías, mecanismo de consistencia entre
   dos negocios y condiciones de autorización son `OPEN DETAIL` (§17, punto 9) — yagged como
   `FUTURE DETAIL` porque **dependen** de esa especificación posterior.
4. **Inventario compartido o pool global: excluidos.** El SPEC general §22 `OUT OF SCOPE` (`:243`)
   lista *"Stock global o compartido entre Business"* como fuera de alcance, y esa sección es
   `TO-BE PROPOSED`. La exclusión, en cambio, **sí** está en el texto canónico de D-014: *"No existe
   stock global compartido entre Business"*. Este documento se apoya en la decisión, no en la
   propuesta.

**Estado verificado de la prohibición** (`05-ASIS/03-ASIS-DATA.md:98-110`,
`10-AUDIT/…:504-551`):

| ID | Hecho verificado | Detalle |
|---|---|---|
| `AUD-D014-N01` | **No existe ninguna capacidad de transferencia de stock** | 8 ocurrencias de `transfer`/`transferencia` en `apps/api/src`, **todas `medioPago`** (efectivo/transferencia/QR). No existe entidad, modelo ni enum de transferencia de stock; no hay endpoint, service, command, job ni cron que mueva stock entre negocios; no hay segundo `empresaId` en Inventario por el que un stock pudiera cambiar de propietario |
| `AUD-D014-N02` | **Cumplimiento por ausencia, no por control** | *"La prohibición se cumple porque el feature no existe, no porque exista un control que lo haga cumplir. Si mañana se implementara una transferencia, nada en el código actual la impediría salvo que se respetase el scope por `empresaId` ya existente"* |
| `AUD-D014-G01`, `G02` | Riesgos latentes ya listados en §3.2 | Sin vía explotada en el código auditado |

**Calificación obligatoria del estado de D-014.** `VERIFIED BY CODE` significa que **la
implementación actual es compatible con el aislamiento requerido**; no significa que exista un
control que haga cumplir la prohibición. `05-ASIS/03-ASIS-DATA.md:106-110` lo formula como
*"un cumplimiento real pero frágil: no queda todavía un invariante verificable que lo proteja el día
en que el feature se implemente"*. La auditoría registra esa invariante solo como `PROPOSED / OPEN`
(observación P8), **no** como requisito aprobado, y este documento no la crea (§19).

### 3.4 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Propiedad del inventario | `Empresa` es la raíz de aislamiento; `Lote` y `MovimientoStock` con `empresaId` directo (`05-ASIS/03:18,28,54-56`) | El código es multi-`Empresa` 1:1, no multi-`Business` con `Membership` (GAP-001, `BLOCKING`) | **D-014** (texto `DERIVED`, no verbatim del Owner) | Inventario **exclusivo de cada `Business`** | Modelo físico de la transformación `Empresa`→`Business` (`IMPLEMENTATION DETAIL`) |
| Stock global compartido | No existe: cada `Empresa` suma sus lotes | Ninguno | **D-014** | **No existe stock global compartido** | — |
| Alcance del aislamiento | Extensión por request, `empresaId` forzado, fail-closed, 3 modelos cubiertos (`AUD-D014-C01`…`C10`) | `groupBy`, `upsert` y `$executeRaw` no pasan por la extensión, con ≥2 gaps reales ya corregidos (`05-ASIS/05:19-25`); `PrismaService` sin scope en `auth`/`invitaciones`/`legajo` (`AUD-D014-G02`) | **D-014** (requisito), mecanismo no decidido | Aislamiento exigido; **mecanismo no definido** | Mecanismo de aislamiento: RLS vs. filtro vs. esquema; comportamiento de la extensión dentro de `$transaction` (`AUD-E04`, `NOT DETERMINABLE`) |
| Transferencia inter-`Business` | **No existe** el feature (`AUD-D014-N01`) | Cumplimiento **por ausencia**, no por control (`AUD-D014-N02`); nada impediría una implementación futura | **D-014** — prohibición `OWNER-RULED` | **Prohibida.** La v1.1 que la degradaba a `OPEN DETAIL` está **REJECTED** | **Solo** la cláusula de escape: qué operación inter-`Business` se definiría y autorizaría, si alguna. `FUTURE DETAIL` |
| Consistencia cruzada de claves | `Lote`/`MovimientoStock` con claves redundantes y sin constraint cruzado (`AUD-D014-G01`) | Riesgo latente, sin vía explotada | **Ninguna** | No definido | Keys compuestas, constraints de coincidencia, deriva de `empresaId` |
| Compras, ventas, ajustes y movimientos | Registrados con `empresaId` en los 3 modelos de stock | — | **D-014** (texto vinculante) | Se registran **dentro del `Business` correspondiente** | Cardinalidades; si un movimiento puede originarse fuera del `Business` que lo ejecuta |

---

## 4. Integridad transaccional del stock (D-010)

### 4.1 Aplicación estricta de D-010

Texto canónico y vinculante, `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1,
`Status: APPROVED — OWNER-RULED 2026-09-28`, **texto `DERIVED / RECONSTRUCTED`**:

> **"Wapsell debe garantizar integridad transaccional del stock mediante controles de base de datos
> y/o transacción. Las operaciones de movimiento deben ser atómicas, concurrentemente seguras,
> resistentes a cantidades inválidas y consistentes entre movimientos y existencias resultantes. Los
> controles de integridad existentes deberán verificarse y mantenerse como requisito obligatorio del
> dominio de Inventario."**

Seis propiedades **aprobadas**:

1. **Integridad transaccional del stock mediante "controles de base de datos y/o transacción".**
   El requisito **sí** fija la familia de mecanismo admisible —base de datos **o** transacción— con
   una disyunción explícita.
2. **Atomicidad** de las operaciones de movimiento.
3. **Seguridad bajo concurrencia** de las operaciones de movimiento.
4. **Resistencia a cantidades inválidas.**
5. **Consistencia entre movimientos y existencias resultantes.**
6. **Verificar y mantener los controles de integridad existentes es un requisito obligatorio** del
   dominio de Inventory — no una auditoría opcional.

**Consecuencia registrada por el propio Owner** (§4.3.1, columna *Consequence*):

> *"Verification of existing stock controls is a requirement of the decision, not an optional audit.
> Invalid quantities are rejected with **no per-Business exception** — the v1.1 carve-out ("salvo una
> regla explícitamente definida por negocio") is **REJECTED**. Triggers read-only code verification of
> the Inventory domain."*

Lecturas obligatorias:

- **La verificación de controles es parte del requisito.** No es un proyecto de mejora ni un
  ejercicio de auditoría discretionary: está en el texto vinculante.
- **No existe excepción por `Business` para aceptar cantidades inválidas.** La cláusula v1.1 que
  permitía *"salvo una regla explícitamente definida por negocio"* está **REJECTED**. Esto convive
  —sin contradicción— con D-014: el stock es **exclusivo** por `Business`, pero la **rigidez** de la
  validación de cantidades es **uniforme**.
- La consecuencia nombra la verificación read-only del dominio Inventory, ya ejecutada en
  `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`. Esa ejecución **satisface la parte de verificación
  del requisito** y **no** sus partes de diseño e implementación, que siguen `OPEN`.

### 4.2 Lo que D-010 decide y lo que deja abierto

La distinción es delicate y este documento no la borra.

| D-010 **sí** fija (aprobado) | D-010 **no** fija (abierto / `IMPLEMENTATION DETAIL`) |
|---|---|
| La **familia** de mecanismo: controles de base de datos **y/o** de transacción | **Cuál** de los dos se usa, o si ambos |
| Las **propiedades** exigidas: atómica, concurrentemente segura, resistente a cantidades inválidas, consistente entre movimientos y existencias | El **cómo**: `CHECK`, `TRIGGER`, clave foránea compuesta, `UPDATE` condicional, bloqueo optimista, bloqueo pesimista, nivel de aislamiento, `SELECT ... FOR UPDATE`, clave de versión, procedure |
| La **obligación** de verificar y mantener los controles existentes | Los **valores exactos** de umbrales, tolerancias y límites; qué cantidad se considera "válida" |
| La **ausencia de excepción** por `Business` para cantidades inválidas | El **esquema**, la **API**, el **código de error**, la **estrategia de reintento**, el **aislamiento de transacción** |
| La **consistencia** entre el asiento de movimiento y la existencia resultante | La **granularidad** del movimiento; la **codificación** de los tipos de movimiento; el **formato** de la cantidad y su precisión decimal |

**Consecuencia de método.** Enumerar mecanismos concretos —`CHECK (cantidad >= 0)`, trigger, FK
compuesta, `SERIALIZABLE`, locking— como si fueran parte del requisito sería **inventar**. No lo
son: aparecen en la auditoría (§4.7) como observaciones `PROPOSED / OPEN` y en la ficha de taller
D-010 como *Open Questions* sin responder
(`03-DECISION-WORKSHOP/D-010-stock-integrity-controls.md:44-46`). En este documento viven en §17.

**Un caso especial que sí es requisito, no mecánica:** el AS-IS ya tiene un patrón correcto
(`aplicarAjusteAtomico`, `AUD-D010-C01`) aplicado al ajuste manual. Su **existencia verificada** es
AS-IS; su **reutilización** en el camino de venta es la observación P2 de la auditoría
(`PROPOSED / OPEN`) y **no** se convierte aquí en requisito ni en plan.

### 4.3 Controles verificados por código — `VERIFIED BY CODE`

Estado: parcial. Fuente `05-ASIS/11-ASIS-QUALITY.md:72-81` y `10-AUDIT/…` §5.

| ID | Control verificado | Ubicación |
|---|---|---|
| `AUD-D010-C01` | `UPDATE` condicional atómico: `WHERE "id" = $2 AND "empresaId" = $3 AND "cantidad" + $1 >= 0`, evaluado en la base de datos. **Única** guarda de no-negatividad de `Lote.cantidad` en todo el repositorio | `inventario.service.ts:266-270` |
| `AUD-D010-C02` | Ajuste manual: `UPDATE` del lote y `movimientoStock.create` en la misma `db.$transaction`; si el `UPDATE` condicional afecta 0 filas se aborta con `BadRequestException` | `inventario.service.ts:225-249` |
| `AUD-D010-C03` | Validación de cantidad en el borde: `@IsPositive()` / `@Min(1)` / `@NotEquals(0)` en venta, pedido, recepción y devolución a proveedor. Ninguna cantidad negativa o cero entra por HTTP | DTOs de `ventas`, `pedidos`, `compras` |
| `AUD-D010-C04` | Atomicidad de la venta: `db.$transaction` envuelve `venta.create`, `auditLog.create` y el bucle de `descontarStock`, que recibe `tx` y no un cliente nuevo | `ventas.service.ts:153-228`, `pedidos.service.ts:98-99` |
| `AUD-D010-C05` | Stock insuficiente: `BadRequestException`, **sin mecanismo de excepción ni autorización por `Business`** | `inventario.service.ts:315-319` |
| `AUD-D010-C06` | `loteVencidoAlMomento` se calcula una sola vez al emitir el movimiento y no se rederiva después | `schema.prisma:991-997`, `inventario.service.ts:347` |

**C01 y C05 juntos son la evidencia de la cláusula "no per-Business exception"**: la no-negatividad se
evalúa en la base de datos con el `empresaId` incluido, y el rechazo por stock insuficiente es duro y
no admite excepción ni autorización por negocio. Eso es **AS-IS verificado** y **consistente** con el
requisito Owner-ruled, no su cumplimiento completo (§4.4).

### 4.4 Brechas verificadas por código — `VERIFIED BY CODE`

Estado: **`IMPLEMENTATION NON-COMPLIANT / GAP`**. Fuente `05-ASIS/11-ASIS-QUALITY.md:83-113` y
`10-AUDIT/…` §6. **`05-ASIS/11:68-70` es explícito: la implementación actual no satisface D-010 por
completo.**

| ID | Brecha | Condición verificada | Severidad |
|---|---|---|---|
| `AUD-D010-G01` | **Oversell concurrente** en `descontarStock` | La disponibilidad se decide **en memoria de la aplicación** sobre una lectura previa y el `decrement` es incondicional, sin guarda `gte` ni condición de versión | CRÍTICA |
| `AUD-D010-G02` | **Devolución a proveedor sin guarda** | `decrement` sin `gte`, sin consulta previa ni validación de existencia. Una sola request puede dejar `Lote.cantidad` negativo, **sin necesidad de concurrencia** | CRÍTICA |
| `AUD-D010-G03` | **Ledger sin movimiento de balance** | `loteId` es `@IsOptional()`; si viene vacío se registra la Salida en el ledger y `Lote.cantidad` **nunca** se modifica. Movimiento y existencia quedan inconsistentes entre sí | CRÍTICA |
| `AUD-D010-G04` | **Sin defensa bajo la capa de aplicación** | 0 `CHECK` y 0 `TRIGGER` en las 17 migraciones; sin `@db.Decimal` en `Lote.cantidad` ni en `MovimientoStock.cantidad`; sin `@@index` en `MovimientoStock` | CRÍTICA |
| `AUD-D010-G05` | **Aislamiento de transactions en `READ COMMITTED`** | Todas las transacciones del API corren en el nivel por defecto de PostgreSQL; 0 coincidencias de `isolationLevel` / `SERIALIZABLE`. Es la condición que hace explotable G01, G06 y G07 | ALTA |
| `AUD-D010-G06` | **Race de sobre-recepción** | El chequeo `cantidadRecibida > pendiente` usa un objeto `compra` leído **fuera** de la transacción, que se abre después del chequeo | ALTA |
| `AUD-D010-G07` | **Numeración de venta sin garantía de unicidad** | `SELECT MAX(numero) + 1` sin `isolationLevel`; `Venta.numero` no tiene `@@unique` (el único unique de `Venta` es `idempotencyKey`), así que dos ventas concurrentes pueden recibir el mismo número | ALTA |
| `AUD-D010-G08` | **Ausencia total de tests** | 0 archivos `*.spec.ts`, `*.test.ts` o `*e2e-spec*`; Jest configurado e instalado pero sin usar; `test` vacío en `pos-admin` y `tienda-online`. Ningún control C01–C06 está protegido contra regresión y ninguna brecha es demostrable por ejecución | ALTA |
| `AUD-D010-G09` | **`tipoMovimiento` es `String` libre, no enum** | El conjunto real de valores no está acotado por el esquema. **`Ajuste` nunca se escribe**: los ajustes manuales emiten `Entrada` o `Salida` | MEDIA |
| `AUD-D010-G10` | **Consolidación de stock siempre en memoria** | `Producto` no tiene columna de stock: la cantidad real vive en `Lote.cantidad` y **cada lector suma lotes por su cuenta**. Decisión documentada en el propio código, registrada como diseño consciente y no como defecto | MEDIA |

**Tres de estas brechas contradicen propiedades aprobadas de D-010 de forma directa**, y por eso se
nombran aquí con esa precisión y no como "mejoras pendientes":

| Propiedad aprobada | Brecha que la incumple | Mecanismo |
|---|---|---|
| *Atomicidad* y *consistencia entre movimientos y existencias resultantes* | `AUD-D010-G03` | El asiento del ledger y la existencia quedan **desalineados** por diseño: es la(property) de consistencia la que falla, no la transacción |
| *Concurrentemente seguras* | `AUD-D010-G01`, `AUD-D010-G05`, `AUD-D010-G06` | La concurrencia se resuelve en memoria de la aplicación, y el nivel de aislamiento por defecto permite lost updates |
| *Resistentes a cantidades inválidas* | `AUD-D010-G02` | Un decremento sin guarda **persiste** una cantidad negativa sin necesidad de concurrencia |

`10-AUDIT/…:581-611` y `05-ASIS/11:105-109` dejan constancia del punto conceptual que sostiene
esta lectura:

> *"El comentario del propio código que afirma que "la concurrencia [está] protegida por la misma
> atomicidad" es incorrecto: la atomicidad evita escrituras parciales, no lost updates."*

### 4.5 La cláusula "y/o" y la ausencia de defensa en base de datos

Este punto requiere precisión porque es donde una lectura superficial convierte evidencia técnica en
requisito.

- **Lo aprobado:** *"controles de base de datos y/o transacción"*, con las cuatro propiedades de §4.1.
- **Lo verificado:** la mitad transaccional está satisfecha **parcialmente**; la mitad de base de
  datos no está satisfecha en ninguna de las 17 migraciones (`AUD-D010-G04`).
- **Lo que el Owner estableció explícitamente:** D-010 **no** exige un `CHECK` concreto. Exige
  *"controles de base de datos y/o transacción"*. `05-ASIS/11-ASIS-QUALITY.md:98-103` y
  `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:130-133` lo dicen en los mismos términos.
- **Conclusión de estado:** la disyunción está satisfecha **solo en su mitad transaccional**. Existen
  controles transaccionales en algunos caminos, pero **no cubren todos los caminos que modifican
  stock**. Por eso el veredicto es `IMPLEMENTATION NON-COMPLIANT / GAP` y **no** "parcialmente
  conforme".

**Matiz que este documento respeta y no borra:** la ausencia de `CHECK`/`TRIGGER` es **evidencia
técnica relevante, no una decisión de diseño independiente**. La auditoría registra un `CHECK
(cantidad >= 0)` como una de varias soluciones posibles (P1), **no** como requisito aprobado. En este
documento, "no hay `CHECK`" es un hecho verificado; "debe haber `CHECK`" sería un requisito
inventado.

**Sobre `Lote.cantidad` negativo como estado invalido.** `10-AUDIT/…:130-133` (trazabilidad) afirma
que los incumplimientos actuales permiten persistir un estado inválido (`Lote.cantidad` negativo) y
que **D-010 no está satisfecha por completo**. Ese texto **no** deriva un requisito de schema: D-010
exige *"resistentes a cantidades inválidas"*, y la persistencia de una cantidad negativa documentada
en `AUD-D010-G02` es la evidencia de que esa propiedad se incumple. La forma de impedirlo es
`IMPLEMENTATION DETAIL`.

### 4.6 Contradicciones documentadas en el propio código — `DOCUMENTED`

Seis contradicciones entre lo que el código **dice** y lo que **hace**. Relevantes porque impiden
usar comentarios como fuente de autoridad.

| ID | Contradicción | Efecto para este documento |
|---|---|---|
| `AUD-X01` | Comentario que afirma protección transaccional "serializable" inexistente | No se puede derivar requisito de un comentario |
| `AUD-X02` | Atomicidad de transacción ≠ protección de concurrencia | Separa dos propiedades que D-010 exige **por separado** |
| `AUD-X03` | El invariante declarado es cierto, pero **su inverso se rompe** | Un invariante unidireccional no documenta la garantía de D-010 |
| `AUD-X04` | Rigor de concurrencia **desigual** entre dos caminos del mismo módulo | La cobertura de D-010 es por camino, no por módulo |
| `AUD-X05` | Enum documentado que el código **nunca escribe** (`Ajuste`, `AUD-D010-G09`) | Un valor documentado no es un valor emitido |
| `AUD-X06` | Estado del Conflict Register que la auditoría resuelve (CON-007/CON-019 `NOT DETERMINABLE` → `EVIDENCE DETERMINED`) | La auditoría puede determinar evidencia, pero **no** cerrar el conflicto (§15) |

> **Observación de integridad documental, reportada sin modificar la fuente.** El encabezado
> `AUD-X02` del artefacto de auditoría contiene caracteres corruptos: se lee
> *"Atomicidad de transacción" seguido de dos ideogramas CJK donde debería haber un signo `=`, y luego*
> *"protección de concurrencia"* (`10-AUDIT/…:600`). El sentido es
> inequívoco por el ID y por `05-ASIS/11:107-109`, pero la sustitución literal de dos ideogramas por
> un signo `=` es un defecto de codificación. `10-AUDIT/` es read-only para esta fase: **no se corrige
> aquí**; se reporta para la pasada de gobernanza documental.

### 4.7 El gap es un gap, no un plan

`05-ASIS/11:111-113` y `10-AUDIT/…:795-816` son inequívocos:

> *"**No existe ninguna corrección aprobada para estas brechas.** La auditoría registra observaciones
> de arreglo con estado `PROPOSED / OPEN` que no forman parte de este AS-IS y no están aprobadas por
> ninguna decisión."*

Las ocho observaciones de la auditoría —P1 `CHECK (cantidad >= 0)`; P2 llevar
`aplicarAjusteAtomico` a `descontarStock` y a la devolución; P3 resolver el `loteId` ausente; P4
mover el chequeo de `pendiente` dentro de la transacción y discutir unicidad de `Venta.numero`; P5
corregir comentarios; P6 evaluar `tipoMovimiento` como enum; P7 escribir los primeros tests; P8
registrar D-014 como invariante verificable— están **todas** en `PROPOSED / OPEN` y ninguna se
promueve aquí.

| Lo que este documento hace | Lo que este documento **no** hace |
|---|---|
| Nombra las brechas con su severidad y su propiedad aprobada afectada | No las convierte en plan de corrección |
| Declara `IMPLEMENTATION NON-COMPLIANT / GAP` como **estado** | No dice cómo se cierra el gap |
| Registra los mecanismos posibles como `OPEN DETAIL` | No elige `CHECK` ni trigger ni locking ni nivel de aislamiento |
| Registra que 0 tests existen | No crea un test, ni un plan de tests, ni un `TEST-*` |
| Nombra la observación P8 (invariante D-014) como `PROPOSED / OPEN` | No crea el invariante |

**Dónde vive cada hueco futuro.** §4.4 nombra el gap; el **mecanismo** que lo cerraría pertenece a la
fase `INVARIANTS`/`PLAN` de la cadena (§19), que esta fase **no** produce.

### 4.8 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Familia de mecanismo | Transacción con `UPDATE` condicional; 0 `CHECK`/0 `TRIGGER` en 17 migraciones | La mitad de la disyunción no está satisfecha | **D-010** | *"Controles de base de datos y/o transacción"* | Cuál de los dos, o ambos; y la combinación concreta |
| Atomicidad | Ajustes y venta atómicos (`C02`, `C04`); venta confirmada por ejecución (`05-ASIS/07:15-18`) | Verificada en 2 caminos; no en devolución ni recepción | **D-010** | Operaciones de movimiento **atómicas** | Mecanismo y perímetro de aplicación |
| Seguridad bajo concurrencia | `descontarStock` decide en memoria; `READ COMMITTED` por defecto (`G01`, `G05`) | **CRÍTICA** en el camino de mayor volumen | **D-010** | Movimientos **concurrentemente seguros** | Locking, versión, aislamiento, serialización; ninguna está decidida |
| Resistencia a cantidades inválidas | Validación en DTO (`C03`); `UPDATE` condicional con `empresaId` (`C01`); sin excepción por negocio (`C05`) | La devolución a proveedor persiste cantidades negativas (`G02`) | **D-010** + cláusula *"no per-Business exception"* (v1.1 **REJECTED**) | **Resistentes a cantidades inválidas**, sin excepción por `Business` | Definición de "cantidad inválida"; umbrales; códigos de rechazo |
| Consistencia movimiento ↔ existencia | El ledger es el mecanismo único de trazabilidad (`05-ASIS/03:54-56`) | `loteId` opcional rompe el par movimiento/existencia (`G03`) | **D-010** | **Consistentes entre movimientos y existencias resultantes** |Si `loteId` es obligatorio, o el movimiento se condiciona (P3, `PROPOSED`) |
| Verificar y mantener controles | 6 controles verificados; 10 brechas | Verificación **ya ejecutada** y completa; mantenimiento no | **D-010** —Owner-ruled | La verificación de controles existentes es **requisito**, no auditoría opcional | Criterios de "mantener" y de aceptación |
| Stock insuficiente | Rechazo duro `BadRequestException` (`C05`) | Ninguna vía permite excepción ni autorización por `Business` | **D-010** | Rechazo sin excepción por `Business` | Si el TO-BE admite alguna forma de stock negativo (backorder, sobreventa): no decidido |
| Tipos de movimiento | `tipoMovimiento` es `String` libre; ajustes emiten `Entrada`/`Salida`; `Ajuste` nunca se escribe (`G09`) | Conjunto de valores no acotado por el esquema | **Ninguna** | No definido | Taxonomía de tipos de movimiento; si es enum; qué escribe qué |
| Numeración correlativa de venta | `SELECT MAX(numero) + 1`; `Venta.numero` sin `@@unique` (`G07`) | Dos ventas concurrentes pueden obtener el mismo número | **Ninguna** de Inventory | No definido | Corresponde a Sales; laPkýí de unicidad es `OPEN` (P4, `PROPOSED`) |
| Pruebas | 0 archivos; Jest instalado sin usar (`G08`) | Ningún control protegido contra regresión | **Ninguna** de Inventory | No definido | Estrategia de tests: `PROPOSED / OPEN` (P7) y pertenece a la fase `TESTS` |

---

## 5. Conceptos del dominio: qué es entidad y qué no

Esta sección separa lo que el **texto canónico** nombra de lo que el **AS-IS** implementa. La
confusión entre ambos es la fuente de casi todos los errores que esta fase evita.

### 5.1 Principio rector

`DEC-001:55-57` excluye el modelo de datos, y D-010/D-014 no definen ninguna entidad. Por tanto:

| Lo que este documento **puede** afirmar | Lo que este documento **no** puede** afirmar |
|---|---|
| Qué conceptos son **referidos** por el texto canónico (stock, movimientos, existencias, ajustes, compras, ventas) | Cuáles son **tablas** o **modelos** |
| Qué **propiedades** se exigen sobre ellos (consistencia, atomicidad, concurrencia, aislamiento) | Cuáles son sus **campos**, tipos o relaciones |
| Qué **comportamiento** está prohibido (transferencia inter-`Business`) | Cómo se **implementa** ese comportamiento |
| Qué **no está decidido**, con la fuente que lo declara abierto | Que algo esté "pendiente de implementar" como si fuera requisito |

### 5.2 `Stock` y movimiento de stock

| Concepto | Texto canónico | AS-IS verificado | Estado TO-BE |
|---|---|---|---|
| **Stock / existencia** | D-014: *"El inventario pertenece exclusivamente a cada Business"*; D-010: *"consistentes entre movimientos y existencias resultantes"* — nombra las **existencias resultantes**, no una entidad | La cantidad real vive en `Lote.cantidad`; `Producto` **no** tiene columna de stock; cada lector suma lotes por su cuenta (`AUD-D010-G10`, decisión documentada en el propio código) | **Existencia** es un concepto exigido por D-010 en relación con los movimientos. **No hay entidad `Stock` decidida.** Cómo se representa una existencia es `IMPLEMENTATION DETAIL` |
| **Movimiento** | D-014: *"Compras, ventas, ajustes y movimientos se registran dentro del Business correspondiente"* — nombra "movimientos" como categoría; D-010: *"Las operaciones de movimiento deben ser atómicas…"* | `MovimientoStock` es el **mecanismo único** de trazabilidad de stock, reusado por Ventas/Compras/Ajustes/Pedidos confirmados (`05-ASIS/03:54-56`) | **Existe el concepto de movimiento**, exigido por D-010 (propiedades) y D-014 (registro dentro del `Business`). **El nombre `MovimientoStock` es AS-IS**; el texto canónico no lo nombra. Si el TO-BE mantiene **un** movimiento único de trazabilidad o varios es `OPEN DETAIL` |
| **Ajuste** | D-014 lo nombra entre las operaciones que se registran dentro del `Business` | Ajustes manuales atómicos con `$executeRaw`; emiten `Entrada` o `Salida`, **nunca** el valor `Ajuste` (`AUD-D010-G09`, `AUD-X05`) | **El ajuste es una operación aprobada en dirección** (D-014). Su **codificación** y sus **estados** no están decididos |
| **Lote** | **No nombrado** en el texto de D-010 ni de D-014 | `Lote` con `@@unique([productoId, numeroLote, empresaId])`, `empresaId` directo, cubierto por la extensión (`05-ASIS/03:28`, `AUD-D014-C06`, `C09`) | **No hay entidad `Lote` decidida.** Que el TO-BE tenga lotes es `OPEN DETAIL` (§7) |
| **Producto** | No nombrado por D-010 ni D-014; es entidad del dominio Catalog | `Producto` con `@@unique([empresaId, codigoInterno])`, cubierto por la extensión (`AUD-D014-C06`, `C09`) | Entidad de Catalog; en Inventory aparece solo como **referencia** de existencias y movimientos |

**Sobre el nombre "stock único por Business" del SPEC §13.** Fijada en §2: la parte con decisión
canónica es la de D-014 (propiedad exclusiva, sin stock global compartido). La formulación de
*"stock único"* como **modelo** no está en el texto de D-014 y no se adopta como requisito aquí.

### 5.3 Cadena de dependencia conceptual

Dependencia **lógica**, leída de los textos canónicos, no un grafo de entidades:

```
Business  ── pertenece ──▶  Inventory        (D-014: propiedad exclusiva)
Business  ── registra ───▶  movimientos      (D-014: compras, ventas, ajustes, movimientos)
movimiento ── debe ser ──▶  consistente con ──▶  existencia resultante   (D-010)
movimiento ── debe ser ──▶  atómico · concurrentemente seguro · resistente a cantidades inválidas   (D-010)
existencia ── no se ──────▶  transfiere entre Business                    (D-014: prohibido)
```

- El **verificador** de la cadena (`Business` → movimientos → existencia) es la aislamiento de D-014;
  su **mecanismo** es `OPEN`.
- La **flecha de prohibición** entre existencias de negocios distintos es la única arista negativa
  del diagrama y es la única que el texto canónico prohíbe **por nombre**.
- **`Producto` y `Lote` no aparecen en la cadena del texto canónico.** Aparecen en el AS-IS. Su
  pertenencia al TO-BE es `OPEN DETAIL` salvo que otra decisión los nombre, y ninguna lo hace.

### 5.4 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Concepto | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Existencia | `Lote.cantidad`; sin columna de stock en `Producto`; consolidación en memoria por lector (`G10`) | La "existencia" es derivada y recalculada por cada consumidor | **D-010** (exige que exista y sea consistente) | La **existencia resultante** debe ser consistente con el movimiento | Modelo de existencia; si hay una entidad de stock; caché/precálculo |
| Movimiento | `MovimientoStock` único, reusado por 4 dominios | Ningunoverified | **D-010** + **D-014** | Movimientos atómicos, seguros, consistentes y registrados en su `Business` | Número de flujos de movimiento; codificación; granularidad |
| Ajuste | Ajustes manuales atómicos; emiten `Entrada`/`Salida` | El valor `Ajuste` nunca se escribe (`G09`, `X05`) | **D-014** (operación nombrada) | El ajuste se registra dentro del `Business` | Codificación del ajuste; quién puede ajustarlo (§12) |
| Lote | Lotes FIFO, `numeroLote` único por producto y `empresaId` | N/A | **Ninguna** | No decidido | Si el TO-BE tiene lotes; cómo se degradan; relación con vencimientos |
| Producto | Referenciado por `Lote` y `MovimientoStock`; único por `(empresaId, codigoInterno)` | — | **Ninguna** de Inventory | Referencia de existencias | Cardinalidad negocio↔producto en Inventory |

---

## 6. Ciclo de vida de los movimientos

### 6.1 Lo que el texto canónico nombra

D-014 nombra **cuatro** operaciones que se registran dentro del `Business` correspondiente, y D-010
exige que las **operaciones de movimiento** sean atómicas, concurrentemente seguras, resistentes a
cantidades inválidas y consistentes con las existencias resultantes.

| Operación nombrada por el texto canónico | Quién la origina | Relación con el movimiento de stock |
|---|---|---|
| **Compras** | D-015 (dominio vecino) | El AS-IS genera `Lote` + `MovimientoStock` en la recepción (`05-ASIS/07:26-28`); D-014 exige que se registre dentro del `Business` |
| **Ventas** | D-008 (dominio vecino) | El AS-IS descuenta stock al crear la venta (`05-ASIS/07:12-18`); D-008 y D-014 exigen que el efecto se registre en el `Business` |
| **Ajustes** | D-014 | El AS-IS tiene ajuste manual atómico (`AUD-D010-C02`) |
| **Movimientos** | D-010 | Categoría genérica: toda operación que mueve stock debe ser atómica, segura, resistente y consistente |

**Lo que el texto canónico NO nombra**, y por tanto este documento no define:

- **No hay estados de movimiento.** Ni `Pendiente`, ni `Aplicado`, ni `Revertido`, ni ningún otro.
  D-010 exige propiedades de las operaciones, no una máquina de estados.
- **No hay una taxonomía `Entrada`/`Salida`/`Ajuste`/`Transferencia` en el TO-BE.** Esos valores son
  del AS-IS y uno de ellos ni siquiera se escribe (`G09`, `X05`).
- **No hay una noción de movimiento "pendiente de aplicar" ni de compensación diferida.** D-010 exige
  atomicidad, lo que **excluye** un estado parcialmente aplicado, pero no nombra un estado
  intermedio. La anulación de `Sale` (D-008) produce *"reversiones o ajustes"*; su forma concreta es
  `OPEN`.
- **No hay un ciclo de vida del movimiento** de más de un paso. El texto solo describe la operación.

### 6.2 Categorías de entrada y salida: estado del conocimiento

| Pregunta | Respuesta verificable | Fuente |
|---|---|---|
| ¿Existe una distinción entrada/salida en el AS-IS? | **Sí, como texto libre**: `tipoMovimiento` es `String`, y los ajustes manuales emiten `Entrada` o `Salida` | `AUD-D010-G09`; `05-ASIS/03:54-56` |
| ¿El conjunto de valores está acotado por el esquema? | **No.** No es enum; el conjunto real no está acotado | `AUD-D010-G09` |
| ¿`Ajuste` es un tipo de movimiento emitido? | **No.** Existe en la documentación pero el código nunca lo escribe | `AUD-X05` |
| ¿Hay un tipo de movimiento para transferencia inter-`Business`? | **No existe ninguno**, y no debe existir mientras D-014 la prohíba | `AUD-D014-N01`; §3.3 |
| ¿El TO-BE define entradas, salidas y ajustes? | **No.** Ninguna decisión define la taxonomía. D-014 nombra "ajustes" como operación; no nombra "entradas" ni "salidas" | Registro §4, §4.3.1 |

**Conclusión:** la distinción entrada/salida es **AS-IS verificada** y **TO-BE no decidida**. Este
documento no la adopta como requisito ni la descarta.

### 6.3 Orígenes de los movimientos fuera de D-014

Dos orígenes adicionales existen en el AS-IS y **no** aparecen en el texto de D-014:

| Origen | AS-IS verificado | ¿Lo nombra el texto canónico? |
|---|---|---|
| **Pedido de tienda online confirmado** | El pedido **descuenta stock solo al confirmar** (`05-ASIS/07:32-36`) | **No.** D-014 nombra "compras, ventas, ajustes y movimientos". Un `Order` confirmado no es una `Sale` hasta que la conversión se decide (D-007; condiciones `OPEN` en `07-TOBE/02-COMMERCE.md` §6.2) |
| **Devolución a proveedor** | Decrementa sin guarda de cantidad (`AUD-D010-G02`) | **No** como categoría; es un efecto sobre stock, alcanzable por la propiedad de resistencia a cantidades inválidas de D-010 |

**Ambas entran en el perímetro de D-010** por sus propiedades (si mueven stock, deben ser atómicas,
seguras, resistentes y consistentes), aunque no estén **nombradas** por D-014. Es una inferencia
**del texto de D-010**, no una extensión de D-014: se declara aquí como tal y su codificación queda
`OPEN DETAIL` (§17, punto 5).

### 6.4 Efectos desde Commerce: qué se afirma y qué no

D-008 (`APPROVED — DERIVED / RECONSTRUCTED`, `07-TOBE/02-COMMERCE.md` §7) se usa aquí **solo** en su
mención de stock:

| Afirmación | Autoridad | Límite |
|---|---|---|
| La confirmación de una `Sale` es el momento en que se aplican sus efectos, entre ellos los operativos | **D-008** | D-008 no enumera el efecto sobre stock como lista; lo nombra en la anulación |
| La anulación de una `Sale` es una operación explícita que genera **reversiones o ajustes sobre stock** entre otros ámbitos | **D-008** | *"según corresponda"*: **no** se afirma que siempre revierta stock |
| Los efectos se ejecutan de manera **transaccional y consistente, evitando estados parcialmente aplicados** | **D-008** | Refuerza, no reemplaza, D-010 |
| Si la anulación debe revertir **explícitamente** stock, caja, pagos y AR | **`OPEN DETAIL — PENDING OWNER RULING`** (registro §4.3.2, punto 3) | La cláusula en disputa de D-008 **no es normativa** |
| Los estados del ciclo de `Sale` | **`OPEN`** — CON-017 | Ver `07-TOBE/02-COMMERCE.md` §7.3 |
| El AS-IS tiene `EstadoVenta.ANULADA` **sin ningún endpoint que lo produzca** | Evidencia AS-IS (`05-ASIS/01:54-55`; `05-ASIS/07:53-54`) | **No** es un estado TO-BE |

**Punto clave para Inventory:** la reversión de stock por anulación **no** tiene mecánica definida. D-008
dice que la anulación es explícita y que produce "reversiones o ajustes … según corresponda"; D-010
exige que cualquier movimiento sea atómico, seguro y consistente. **Cómo** se reconcilian ambos —si la
reversión es un movimiento compensatorio, un ajuste, o una reconstrucción de existencias— es
`OPEN DETAIL` (§17, punto 6). **No** se declara que la anulación deba reversing stock siempre.

### 6.5 AS-IS → GAP → DECISION → TO-BE → OPEN DETAIL

| Área | AS-IS | GAP | Decisión | TO-BE | OPEN DETAIL |
|---|---|---|---|---|---|
| Operaciones nombradas | Compras, ventas, ajustes, pedidos confirmados, devoluciones a proveedor | Dos de ellas no están nombradas en D-014 (§6.3) | **D-014** | Compras, ventas, ajustes y movimientos se registran en su `Business` | Si `Order` confirmado y devolución a proveedor son categorías propias |
| Entrada / Salida | `String` libre; ajustes emiten `Entrada`/`Salida` | No acotado por esquema; `Ajuste` nunca emitido | **Ninguna** | No decidido | Taxonomía y codificación de tipos de movimiento |
| Estados del movimiento | Ninguno | — | **Ninguna** | No decidido | Si existe un estado de movimiento; qué representa un movimiento revertido |
| Anulación de `Sale` | `ANULADA` en enum, inalcanzable | El gap central está en Commerce (CON-017) | **D-008** (texto `DERIVED`) | Anulación explícita con reversiones/ajustes *"según corresponda"* | Reversión de stock: forma, condición, momento; y si la cláusula en disputa se resuelve |
| Recepción de compra | Parcial o total, valida contra pendiente real; genera `Lote` + movimiento | Race de sobre-recepción (`G06`) | **D-015** (compras) + **D-010** (propiedades) | Registrada en el `Business`; atómica y segura | Reglas de recepción; estados de recepción; si la recepción parcial es TO-BE |

---

## 7. Lotes y vencimientos

### 7.1 Lo verificado en el AS-IS

| Hecho | Detalle | Fuente |
|---|---|---|
| `Lote` es un modelo con `empresaId` directo | Cubierto por la extensión de scope; no hereda por relación | `05-ASIS/03:28`; `AUD-D014-C06` |
| Unicidad por negocio | `@@unique([productoId, numeroLote, empresaId])` | `05-ASIS/03:28`; `AUD-D014-C09` |
| Venta de lote vencido permitida y auditada | `loteVencidoAlMomento` se calcula una sola vez al emitir el movimiento; verificado insertando un lote vencido a mano | `AUD-D010-C06`; `05-ASIS/12-ASIS-EVIDENCE.md:54-56` |
| Descuento **FIFO por lote** en la venta presencial | Verificado por ejecución contra base de datos real | `05-ASIS/01:20-21`; `05-ASIS/07:12-18` |
| Alertas de vencimiento configurables | Configuradas por variable de entorno | `05-ASIS/01:27`; `05-ASIS/12:12-ASIS-EVIDENCE.md:42-46` |
| Estados implícitos de lote | El registro de conflictos anota *"estados implícitos: Disponible, Vencido, Vendido, etc."* — **atribución del propio registro**, no enum verificado | `03-CONFLICTS/04-STATE-CONFLICTS.md:7` |

### 7.2 Lo que el texto canónico dice — y lo que no

- **D-010 no nombra lotes.** Nada en su texto obliga a que exista un lote.
- **D-014 no nombra lotes.** Su texto habla de *"Compras, ventas, ajustes y movimientos"*.
- El SPEC general §13 (`:149`) y §22 `IN SCOPE` (`:223`) nombran *"lotes"*, pero §22 es
  `TO-BE PROPOSED` como sección y §13 no tiene decisión de D-010/D-014 que lo respalde como requisito.
- `04-DECISIONS/05-INVENTORY.md:33-36` describe el modelo FIFO/lote como **baseline AS-IS** y
  remite a §13 del SPEC general.

**Conclusión:** la existencia de lotes, la política **FIFO** y el tratamiento de vencimientos son
**AS-IS verificados** y **TO-BE no decididos**. Este documento los registra como `OPEN DETAIL` y no
los adopta. En particular:

| Elemento | Estado TO-BE | Motivo |
|---|---|---|
| Que exista el concepto de lote | **`OPEN DETAIL`** | Ninguna decisión lo nombra |
| FIFO como política de consumo | **`OPEN DETAIL`** | AS-IS verificado; §22 es `TO-BE PROPOSED`; D-010 no lo menciona |
| Vender un lote vencido | **`OPEN DETAIL`** | El AS-IS lo permite y lo marca; ninguna decisión lo exige ni lo prohíbe |
| Estados de lote | **`OPEN DETAIL`** — CON-023 | El registro de conflictos marca el ciclo de vida del lote como `GAP + MISSING_DECISION`; los "estados implícitos" son del registro, no verificados |
| Umbral y configuración de la alerta de vencimiento | **`OPEN DETAIL`** | AS-IS por variable de entorno; el TO-BE no lo nombra |

**Riesgo de sobre-declaración, evitado:** enumerar "Disponible / Vencido / Vendido" como estados TO-BE
sería tomar una atribución informal del registro de conflictos y promoverla a requisito. No se hace.

### 7.3 Relación con la propiedad de consistencia de D-010

Un punto sí conecta lotes con un requisito aprobado, y por eso no es `OPEN`:

> D-010 exige que los movimientos sean *"consistentes entre movimientos y existencias resultantes"*.

`AUD-D010-G03` documenta el caso donde `loteId` es opcional: el ledger registra una Salida y
`Lote.cantidad` **nunca** se modifica. Cualquiera que sea la política TO-BE sobre `loteId`
—obligatorio, opcional, o movimiento condicionado—, el requisito de consistencia se aplica igual. La
**política** es `OPEN DETAIL`; el **requisito de consistencia** no lo es.

---

## 8. Reservas y disponibilidad

### 8.1 Lo que existe

| Nivel | Afirmación | Fuente |
|---|---|---|
| **AS-IS verificado** | **No existe concepto de reserva.** No hay entidad, modelo ni flujo de reserva de stock. El stock se descuenta al crear la venta y el pedido online descuenta **solo al confirmar** | `05-ASIS/03-ASIS-DATA.md` (inventario de 42 modelos, ninguno de reserva); `05-ASIS/07:32-36` |
| **Pregunta abierta del taller** | *"¿Cómo funcionarán las reservas de stock en un entorno multi-tenant (e.g., para pedidos online)?"* | `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:50` — **sin responder** |
| **Mención en la ficha** | La pregunta de D-014 menciona *"la disponibilidad de stock, las reservas y los informes"* como implicaciones a aclarar | `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:11` — **pregunta del taller, no texto normativo** |
| **Mencionado en el texto canónico** | **No.** D-014 y D-010 no nombran reservas ni disponibilidad | Registro §4, §4.3.1 |
| **Conflictos** | CON-023 cubre *"la propiedad, la gestión entre negocios o los **timings de movimiento**"* en contexto multi-tenant | `03-CONFLICTS/00-CONFLICT-REGISTER.md:69` |

### 8.2 Estado

| Elemento | Estado | Fundamento |
|---|---|---|
| Existencia de reservas en el TO-BE | **`OPEN DETAIL`** | Ninguna decisión lo nombra; el taller lo dejó abierto |
| Mecanismo de reserva (retención, expiración, conversión) | **`OPEN DETAIL`** | Sin fuente |
| Disponibilidad como concepto distinto de existencia | **`OPEN DETAIL`** | D-010 exige consistencia entre movimiento y existencia **resultante**; no define "disponibilidad" |
| Si un pedido online debe reservar stock antes de confirmar | **`OPEN DETAIL`** | El AS-IS no reserva; ninguna decisión lo exige |
| Efecto de una reserva sobre la lectura de existencias | **`OPEN DETAIL`** | — |
| **Timings de movimiento en multi-tenant** | **`OPEN DETAIL`** — dentro de CON-023 | `03-CONFLICTS/00-CONFLICT-REGISTER.md:69` |

**Lo que sí se afirma:** el AS-IS no tiene reservas, y el TO-BE **no ha decidido** si las tendrá.
Cualquier documento que afirme "las reservas son parte del MVP" para Inventory excedería la evidencia.

---

## 9. Stock insuficiente, oversell y existencias negativas

Esta sección une tres hallazgos críticos con las propiedades aprobadas de D-010, sin proponer
correcciones.

### 9.1 Los tres hechos verificados

| Hecho | Verificación | Propiedad aprobada afectada |
|---|---|---|
| **Oversell concurrente** (`G01`) | La disponibilidad se decide en memoria de la aplicación sobre una lectura previa; el `decrement` es incondicional, sin guarda `gte` ni condición de versión | *Concurrentemente seguras* |
| **Existencia negativa sin concurrencia** (`G02`) | Devolución a proveedor: `decrement` sin `gte`, sin consulta previa ni validación de existencia. Una sola request basta | *Resistentes a cantidades inválidas* |
| **Desalineación movimiento/existencia** (`G03`) | `loteId` opcional: se registra la Salida en el ledger y `Lote.cantidad` nunca se modifica | *Consistentes entre movimientos y existencias resultantes* |

### 9.2 El control que sí existe, y su alcance

`AUD-D010-C05`: el stock insuficiente produce `BadRequestException` — **rechazo duro, sin mecanismo de
excepción ni autorización por `Business`**. `AUD-D010-C01`: la no-negatividad se evalúa en la base de
datos con `WHERE ... AND "cantidad" + $1 >= 0` y el `empresaId` incluido.

Eso significa que el AS-IS **sí** rechaza stock insuficiente en el camino de venta, y que el rechazo
**no** admite excepción por negocio — lo que **coincide** con la cláusula *"no per-Business
exception"* que el Owner Established para D-010 (§4.1).

### 9.3 La distinción que este documento mantiene

| Pregunta | Estado | Nota |
|---|---|---|
| ¿El TO-BE debe rechazar una salida sin existencias suficientes? | **Consistente con el requisito**, en la forma verificada por C05; la **política** exacta (umbrales, tolerancias, casos de backorder) es `OPEN DETAIL` | D-010 exige resistencia a cantidades inválidas |
| ¿El TO-BE puede **permitir** stock negativo en algún caso? | **No decidido.** Ninguna decisión lo prohíbe explícitamente como política; D-010 exige *resistencia a cantidades inválidas* y *consistencia* | Afirmar "el stock negativo está prohibido en el TO-BE" sería añadir una regla que no está escrita |
| ¿Existe un override autorizado por `Business` para stock insuficiente? | **No.** La v1.1 que lo permitía está **REJECTED** por el Owner | §4.1 |
| ¿Debe haber una defensa a nivel de base de datos además de la de aplicación? | **La disyunción está en el texto aprobado** (*"y/o"*), pero **cuál** se usa es `IMPLEMENTATION DETAIL`. El AS-IS solo tiene la de aplicación/consulta | §4.5 |
| ¿Existe hoy stock negativo real en producción? | **`NOT DETERMINABLE`** — `AUD-E02`: *"No se sabe si ya existen `Lote.cantidad < 0` reales ni su magnitud"*; se cerraría con una consulta de solo lectura sobre producción | `10-AUDIT/…:709` |

**Lo que este documento no hace:** no declara que el oversell esté "arreglado", no elige entre
`CHECK`, trigger, locking o nivel de aislamiento, no define códigos de error, no crea un test de
concurrencia, y no convierte `AUD-E02` en un hallazgo. `AUD-E01` (test de concurrencia) está
registrada como **acción de verificación pendiente**, y es la única vía documentada para que algún
hallazgo alcance `VERIFIED BY TEST` o `VERIFIED BY EXECUTION` — nivel que **hoy no alcanza ningún
hallazgo del inventario** (`10-AUDIT/…:722-724`).

---

## 10. Relaciones con Commerce

### 10.1 `Purchases` y recepción

| Afirmación | Autoridad | Límite |
|---|---|---|
| Las compras se registran dentro del `Business` correspondiente | **D-014** (texto vinculante) | — |
| `Purchase` = adquisición a `Proveedor`; registra productos, cantidades, precios, condiciones, recepción | **D-015** `DERIVED` | `07-TOBE/02-COMMERCE.md` §10 |
| La recepción genera existencias y movimiento en el `Business` receptor | **D-014** + **D-010** (propiedades del movimiento) | La mecánica de recepción es `OPEN` |
| Recepción parcial o total, validada contra el pendiente real | **AS-IS verificado por ejecución** (`05-ASIS/07:26-30`; `05-ASIS/12:48-49`) | El TO-BE no lo exige: D-015 deja el ciclo completo `OPEN` |
| La sobre-recepción es una brecha de integridad (`G06`) | Evidencia `VERIFIED BY CODE` | La corrección es `PROPOSED / OPEN` |
| Estados y transiciones de `Purchase` | **`OPEN`** — CON-024 | Fuera de alcance de este documento |
| Cuentas por Pagar y pagos a proveedores | **D-015** | Fuera de alcance; no afecta al modelo de inventario |

### 10.2 `Sale` y `Order`

| Afirmación | Autoridad | Límite |
|---|---|---|
| Las ventas se registran dentro del `Business` correspondiente | **D-014** | — |
| La confirmación de `Sale` aplica sus efectos; entre ellos los operativos | **D-008** `DERIVED` | D-008 no enumera el efecto de stock en la confirmación |
| La anulación produce reversiones/ajustes sobre stock *"según corresponda"* | **D-008** `DERIVED` | Condición no definida; cláusula en disputa `OPEN DETAIL — PENDING OWNER RULING` |
| Los efectos se aplican transaccionalmente, sin estados parcialmente aplicados | **D-008** + **D-010** | — |
| `Order` y `Sale` son conceptualmente distintos; la conversión tiene "condiciones definidas" | **D-007** `DERIVED` | Las condiciones **no** están definidas: `OPEN` |
| `Order` confirmado de tienda online descuenta stock | **AS-IS verificado por ejecución** (`05-ASIS/07:32-36`) | El TO-BE no lo exige; y no es una `Sale` hasta la conversión |
| `EstadoVenta.ANULADA` existe sin ningún endpoint que lo produzca | **AS-IS verificado** | No es un estado TO-BE |
| Estados del ciclo de `Sale` | **`OPEN`** — CON-017 | Fuera de alcance |
| Numeración correlativa de venta sin unicidad garantizada (`G07`) | Evidencia `VERIFIED BY CODE` | Corresponde a Sales; se reporta por integridad del camino de stock, no es requisito de Inventory |

### 10.3 `Fulfillment`

| Afirmación | Autoridad | Límite |
|---|---|---|
| Fulfillment pertenece al dominio de Pedidos; el recorrido es preparación → asignación → entrega | **D-016** `DERIVED` | Fuera de alcance |
| Fulfillment **no** constituye necesariamente un módulo principal de navegación | **D-016** | Contrasta con el ítem "5. Stock" (§1.3) |
| El AS-IS tiene `Entrega` (1:1 con `Pedido`, `preparadorId`/`repartidorId`) **sin módulo funcional** | **AS-IS verificado** (`05-ASIS/01:44-46`; `05-ASIS/06:34-40`) | RF-13 sin implementar |
| Estados y transiciones de Fulfillment y Entrega | **`OPEN`** — CON-025 | Fuera de alcance |
| **Relación de Fulfillment con el stock** | **Ninguna decisión la nombra.** No se afirma que preparar, asignar o entregar mueva stock | Afirmarlo sería inventar una regla |

**Punto explícito:** la relación de **Fulfillment con el inventario no está decidida**. D-016 no la
menciona; D-010 y D-014 tampoco. Si el TO-BE distint la preparación de una entrega como un movimiento
de stock, esa es una decisión nueva y **no** se crea aquí.

### 10.4 Fronteras nombradas: `Cash`, `Accounts Receivable`, `Notifications`, `Reports`, `Audit`

Se mencionan **solo** como frontera. No se desarrollan.

| Frontera | Mención verificable | Autoridad | Estado |
|---|---|---|---|
| `Cash` | D-008 nombra caja entre los ámbitos revertidos en la anulación | **D-008** | D-013 `DERIVED`; CON-022 `OPEN`; **fuera de alcance** |
| `Accounts Receivable` | D-008 nombra cuentas por cobrar entre los ámbitos revertidos | **D-008** | D-012 `DERIVED`; CON-021 `OPEN`; **fuera de alcance** |
| `Audit` / trazabilidad | D-008/D-010 exigen consistencia transaccional; el SPEC general §18 pide trazabilidad de operaciones críticas | **SPEC §18** `OPEN DETAIL` | Fuera de alcance. La auditoría de movimientos de stock es `OPEN DETAIL` (§12) |
| `Notifications` | El SPEC general §19 menciona *"alertas de stock"* entre las notificaciones | **SPEC §19** `OPEN DETAIL` | Fuera de alcance. Las alertas de stock del AS-IS existen; el TO-BE no las decide (§13) |
| `Reports` | El SPEC general §17 incluye inventario entre los informes conceptuales | **SPEC §17** `OPEN DETAIL` | Fuera de alcance. La pregunta de informes multi-negocio del taller D-014 sigue sin responder (`D-014-inventory-ownership.md:51`) |

---

## 11. Ubicaciones físicas

### 11.1 Estado: `OPEN DETAIL`, con divergencia de fuentes reportada

| Fuente | Afirmación | Calificación |
|---|---|---|
| `00-WAPSELL-SPEC-GENERAL.md` §13, `:149` | *"El MVP **NO** introduce ubicaciones físicas (`Depósito`, `Local`) para la gestión de stock; la granularidad por ubicación podrá incorporarse posteriormente, y la arquitectura debe evitar bloquear esa futura evolución."* | Marcador `[DECISION TEXT: DERIVED / RECONSTRUCTED]` |
| `00-WAPSELL-SPEC-GENERAL.md` §22 `OUT OF SCOPE`, `:244` | *"Granularidad de inventario por ubicación física (depósitos/locales) en el MVP. **OPEN DETAIL**"* | `OUT OF SCOPE` es `TO-BE PROPOSED` como sección (`:234`) |
| `00-DECISION-REGISTER.md` §4.3.1 (**texto de D-014**) | **No menciona ubicaciones** | Canónico |
| `04-DECISIONS/05-INVENTORY.md:24` | *"whether locations exist in the MVP at all"* figura entre lo **"Still not decided"** | Reconciliado, estado explícito |
| `07-TOBE/00-TOBE-OVERVIEW.md:261-263` | *"Granularidad de inventario por ubicación después. El MVP no introduce ubicaciones físicas (depósito/local); la arquitectura **debe evitar bloquear** esa extensión futura."* | `TO-BE PROPOSED` |
| `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:49` | *"¿Existen escenarios para almacenes físicos compartidos o compras centralizadas entre negocios?"* | Pregunta **sin responder** |
| `10-AUDIT/…:714` | *"almacenes compartidos"* aparece dentro de las implicaciones que D-014 declara por aclarar | Ficha de taller, no normativa |

### 11.2 Lo que este documento decide — y lo que no

**No decide nada sobre ubicaciones.** Ninguna decisión canónica las nombra, y dos fuentes
canónicas se contradicen sobre su carácter. Este documento:

1. **No adopta** "el MVP no introduce ubicaciones" como requisito, porque la fuente que lo afirma
   (`TO-BE PROPOSED`) y la fuente que lo clasifica `OPEN DETAIL` están en el mismo documento.
2. **No descarta** las ubicaciones, porque ninguna decisión lo dice.
3. **Registra** la exigencia de "no bloquear la futura evolución por ubicación" como una
   **preocupación de diseño** documentada en el SPEC general, sin convertirla en requisito de
   arquitectura.
4. Clasifica el punto como `OPEN DETAIL` (§17, punto 2) y lo deja visible.

**Sobre la tensión con D-014:** un almacén compartido entre negocios es conceptualmente distinto de
un stock global compartido. D-014 prohíbe el stock global compartido y la transferencia entre
`Business`; **no** habla de almacenes físicos. Por tanto **no** se deriva de D-014 ninguna regla sobre
almacenes compartidos, y **tampoco** se deriva ninguna prohibición. La pregunta del taller sigue
abierta.

---

## 12. Aislamiento, autorización y Business Context

### 12.1 Lo que se hereda de Identity/Tenancy

| Concepto | Autoridad | Aplicación a Inventory |
|---|---|---|
| `Business` es la unidad canónica de aislamiento | **D-001** `OWNER-VERBATIM` | El inventario pertenece a un `Business` (D-014) |
| El aislamiento es multi-tenant por `Business`; los datos de un `Business` son inaccesibles desde otros | **D-001** `OWNER-VERBATIM` | Se aplica a existencias, movimientos y lotes |
| `User` es identidad global; `Membership` es la relación N:N que porta rol y permisos | **D-002** `OWNER-VERBATIM` | Quién opera sobre el inventario |
| `Role` y `Permission` pertenecen a la `Membership`, nunca globales | **D-005** `DERIVED` | **No existe** un catálogo de permisos de Inventory en ninguna decisión |
| Cuatro validaciones de acceso obligatorias (o dos, según la variante) | **D-006** `DERIVED`; **cláusula `OPEN DETAIL — PENDING OWNER RULING`** (§4.3.2, punto 2) | Se aplica a cualquier operación de inventario |
| `Business Context` se determina desde la identidad autenticada | `07-TOBE/01-IDENTITY-AND-TENANCY.md` §9 | El `Business` efectivo de una operación de inventario |
| Mecanismo de aislamiento | **`IMPLEMENTATION DETAIL` / `OPEN`** | D-001 no decide si es RLS, filtro obligatorio, esquema por `Business` u otro |

### 12.2 Autorización de las operaciones de inventario

**Ninguna decisión nombra un permiso de Inventory.** El catálogo de roles y permisos es `OPEN`
en D-005 y en `07-TOBE/00-TOBE-OVERVIEW.md` §13, punto 13. El AS-IS verificado es:

| Hecho AS-IS | Detalle | Fuente |
|---|---|---|
| Existencia de un permiso granular `inventario.ajustes` | Requerido para `POST /ajustes` | `05-ASIS/06-ASIS-MODULES.md:19` |
| Lecturas de inventario **abiertas** a cualquier logueado con legajo aprobado | `GET /stock`, `GET /productos/:id/lotes`, `GET /productos/:id/movimientos`, `GET /alertas` | `05-ASIS/06-ASIS-MODULES.md:19` |
| `LegajoAprobadoGuard` bloquea con 403 si el legajo está pendiente | Aplicado explícitamente a inventario | `05-ASIS/05-ASIS-AUTHORIZATION.md:10-15` |
| Autorización por excepción (D-06) disponible en la plataforma | Login del autorizador, nunca auto-autorización | `05-ASIS/05-ASIS-AUTHORIZATION.md:43-49` |

**Estado TO-BE:** qué puede hacer cada rol sobre el inventario —leer existencias, ajustar, recibir,
consultar movimientos, ver alertas de vencimiento— es **`OPEN DETAIL`** (§17, punto 7). No se propone
ningún permiso. La existencia del permiso AS-IC `inventario.ajustes` **no** se adopta como catálogo
TO-BE.

### 12.3 Autorización y D-010

Un punto que este documento deja explícito: la cláusula *"Invalid quantities are rejected with **no
per-Business exception**"* (D-010, §4.1) **excluye** la autorización por excepción en el camino de
cantidades inválidas, y es coherente con el AS-IS (`AUD-D010-C05`, §4.3). La autorización por
excepción de D-006 sigue siendo un mecanismo general de la plataforma, pero **su aplicabilidad a
validaciones de stock no está decidida** y no se afirma en ninguna dirección.

---

## 13. Alertas

| Afirmación | Autoridad | Estado |
|---|---|---|
| El AS-IS tiene **alertas de bajo stock y de vencimiento configurables** | `VERIFIED BY CODE` — `05-ASIS/01:27`; `05-ASIS/12-ASIS-EVIDENCE.md:42-46` | **AS-IS verificado** |
| La configuración del AS-IS es por **variable de entorno** | `VERIFIED BY CODE` | AS-IS; no es un modelo TO-BE |
| El endpoint `GET /inventario/alertas` es **abierto** a cualquier logueado con legajo aprobado | `VERIFIED BY CODE` — `05-ASIS/06-ASIS-MODULES.md:19` | AS-IS |
| El TO-BE **no nombra** alertas de stock | Ninguna decisión | **`OPEN DETAIL`** |
| Las notificaciones incluyen *"alertas de stock"* | **SPEC general §19** `:199` — `OPEN DETAIL` | Fuera de alcance (Notifications) |
| `Notificacion` existe en el schema sin service activo | `05-ASIS/01:51-53`; `05-ASIS/06:34-40` | AS-IS; RF-13/notificaciones sin implementar |

**Qué queda abierto:** si el TO-BE tiene alertas de bajo stock o de vencimiento; quién las recibe; por
qué canal; con qué umbral; si son configurables por `Business`; y si son o no parte de Notifications.
Nada de eso lo decide D-010, D-014 ni el SPEC general de forma vinculante. §17, punto 8.

---

## 14. Clasificación de evidencia

Todo lo afirmado en este documento lleva grado explícito, según el esquema de
`07-TOBE/00-TOBE-OVERVIEW.md` y `07-TOBE/02-COMMERCE.md`.

### 14.1 Contenido normativo aplicado

| Grado | Elementos en este documento |
|---|---|
| `APPROVED — OWNER-VERBATIM` | D-001 (`Business` como unidad de aislamiento). **No** hay texto de D-010 ni D-014 en este grado |
| `APPROVED — OWNER-RULED 2026-09-28` | **D-010** y **D-014** (§3.1, §4.1) |
| `APPROVED — DERIVED / RECONSTRUCTED` | D-002, D-005, D-006 (frontera), D-007, D-008, D-015, D-016 (solo menciones), DEC-001 (dirección) |
| `IMPLEMENTATION DETAIL` = `OPEN` | Modelo de datos, mecanismo de aislamiento, familia concreta de control de D-010, codificación de movimientos, autorización, ubicaciones, alertas |
| `OPEN DETAIL` | Todo lo enumerado en §17 |
| `TO-BE PROPOSED` | Navegación §25, dominios §24, "stock único por Business" como modelo, "FIFO, lotes" en §22, ubicaciones en §13/§10.2 del overview |
| `NOT DETERMINABLE` | `AUD-E02`, `E03`, `E04`, `E05`, `E06` |

### 14.2 Evidencia AS-IS citada, y su categoría

| Categoría | Hallazgos / documentos | Nota |
|---|---|---|
| `VERIFIED BY CODE` | `AUD-D010-C01`…`C06` (6), `AUD-D010-G01`…`G10` (10), `AUD-D014-C01`…`C10` (10), `AUD-D014-N01`, `N02`, `G01`, `G02` (4) = **30** | Fuente: `10-AUDIT/…` §12.1; lectura estática 2026-09-28, HEAD `066bb91` |
| `DOCUMENTED` | `AUD-X01`…`X06` (6) | Contradicciones en los comentarios del propio código |
| `NOT DETERMINABLE` | `AUD-E02`, `E03`, `E04`, `E05`, `E06` (5) | §9.3, §12.1 |
| `VERIFIED BY EXECUTION` (AS-IS, no de la auditoría de D-010/D-014) | Descuento FIFO transaccional, atomicidad de la venta, aislamiento con 404 entre empresas, recepción parcial, lote vencido marcado (`05-ASIS/12-ASIS-EVIDENCE.md:24-56`) | Documentado en `12-ASIS-EVIDENCE.md`; limitado a lo que SRC-004 registra |
| `VERIFIED BY TEST` | **0** | `AUD-D010-G08`: 0 archivos de test en el repositorio |
| `VERIFIED BY EXECUTION` (auditoría D-010/D-014) | **0** | `10-AUDIT/…:734` |

**Total de hallazgos del artefacto de auditoría: 41** = 30 + 6 + 5. Coincide con §12.1 y §12.2 de la
auditoría. **Ninguno alcanza `VERIFIED BY TEST` ni `VERIFIED BY EXECUTION`.**

### 14.3 Lo que este documento NO clasifica como evidencia

- **Las observaciones P1–P8** de la auditoría son `PROPOSED / OPEN` (`10-AUDIT/…:795-816`). No son
  evidencia de nada y no son requisitos.
- **Los `AUD-*` no son IDs de governance.** La propia auditoría lo dice (`:26-27`): *"Los
  identificadores `AUD-*` son **locales a esta auditoría**. No son IDs de governance (`REQ-`, `DEC-`,
  `CON-`, `INV-`, `TEST-`) y no crean ni reemplazan ninguno."* Este documento **no crea** ningún
  `REQ-*`, `INV-*`, `PNT-*`, `CONTRACT-*` ni `TEST-*`.
- **El AS-IS no es TO-BE.** Ninguna verificación de código de este documento es requisito.

---

## 15. Conflictos declarados y NO cerrados

Este documento **no resuelve ningún conflicto**. Los que le corresponden se declaran con su estado
real.

| Conflicto | Estado real | Qué dice | Efecto en este documento |
|---|---|---|---|
| **CON-023** — Ciclo de Vida y Propiedad del Inventario sin Definición TO-BE Explícita | **`OPEN`** | El AS-IS tiene inventario FIFO por lotes para un solo negocio; el TO-BE carecía de definición explícita sobre propiedad, gestión entre negocios y timings de movimiento. **Tipo:** `GAP + MISSING_DECISION (BUSINESS_RULE_CONFLICT / INVENTORY_CONFLICT)` | **D-014 cubre la propiedad** (§3.1). **No cubre** el ciclo de vida, las reservas, los informes multi-negocio ni los timings. `10-CONFLICT-RESOLUTION-MAPPING.md:82`: *"Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap."* **Permanece `OPEN`** |
| **CON-007** — Integridad: la SPEC Inc-1 exige controles que el código no tenía a la fecha de la auditoría | **`OPEN` — `EVIDENCE DETERMINED 2026-09-28` / `VERIFIED BY CODE`** | Evidencia propagada: `AUD-D010-C01`…`C06` (control parcial) y `AUD-D010-G01`…`G10` (brechas) | La evidencia está determinada; el conflicto sigue abierto. `10-CONFLICT-RESOLUTION-MAPPING.md:66` |
| **CON-019** — Brecha de Integridad: controles de stock ausentes en código | **`OPEN` — `EVIDENCE DETERMINED 2026-09-28` / `VERIFIED BY CODE`** | `UNBLOCKED` por el ruling de D-010: la verificación read-only del dominio Inventory **está completa** (`10-AUDIT/…`); D-010 **no** está satisfecha por completo | Flagged como **candidato a consolidación** con CON-007 y **retenido**: consolidar requiere autorización explícita del Owner y **no se aplica aquí** (`10-CONFLICT-RESOLUTION-MAPPING.md:78`, §5) |
| **CON-022** — Cash sin definición TO-BE | `OPEN` | Fuera de alcance | No se menciona más que como frontera (§10.4) |
| **CON-024** — Compras y AP sin ciclo de vida TO-BE completo | `OPEN` | Fuera de alcance; se menciona D-015 en §10.1 | No se desarrolla |
| **CON-025** — Fulfillment y Entregas (RF-13) | `OPEN` | Fuera de alcance; se menciona D-016 en §10.3 | No se desarrolla |
| **CON-002, CON-006** | `OPEN` | Listados en `03-OPERATIONS-SPEC.md:15` | No aplican a Inventory; no se tocan |

**Corolario de D-010 sobre CON-007/CON-019.** El ruling del Owner es el único que fija
*"no per-Business exception"*, y la verificación read-only ya ejecutada hacen que **el conflicto no se
cierre por tener evidencia**:
la evidencia determina *el estado* (`IMPLEMENTATION NON-COMPLIANT / GAP`), no la *solución*. Ningún
conflicto se marca `RESOLVED` aquí, y ninguna fila del `00-CONFLICT-REGISTER.md` se modifica.

**Candidatos a consolidación, sin aplicar.** `10-CONFLICT-RESOLUTION-MAPPING.md` §5 (`:112-151`)
concluye que CON-007 y CON-019 representan **el mismo conflicto normativo**: *"CON-019 es el
identificador decisional … CON-007 es el identificador de observación AS-IS"*. Este documento
**registra** el análisis y **no lo aplica**: consolidar requiere autorización explícita del Owner y
ningún registro se borra.

---

## 16. Trazabilidad

| Afirmación | Origen | Estado | Sección |
|---|---|---|---|
| El inventario pertenece exclusivamente a cada `Business` | **D-014** — `00-DECISION-REGISTER.md` §4.3.1, §4 fila D-014 (`:111`) | `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`) | §3.1 |
| No existe stock global compartido entre `Business` | **D-014** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §3.1 |
| Compras, ventas, ajustes y movimientos se registran dentro del `Business` correspondiente | **D-014** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §3.1, §6.1 |
| No se permite transferencia de stock entre `Business` salvo especificación posterior | **D-014** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §3.1, §3.3 |
| La v1.1 que degradaba "transferencias" a `OPEN DETAIL` está **REJECTED** | `00-DECISION-REGISTER.md` §4.3.1, *Consequence* | Vigente | §3.1, §3.3 |
| Garantía de integridad transaccional del stock mediante controles de BD y/o transacción | **D-010** — §4.3.1, §4 fila D-010 (`:107`) | `APPROVED — OWNER-RULED 2026-09-28` (texto `DERIVED / RECONSTRUCTED`) | §4.1 |
| Movimientos atómicos, concurrentemente seguros, resistentes a cantidades inválidas | **D-010** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §4.1, §4.4 |
| Consistentes entre movimientos y existencias resultantes | **D-010** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §4.1, §7.3, §9 |
| Verificar y mantener los controles existentes es requisito obligatorio del dominio Inventory | **D-010** — §4.3.1 | `APPROVED — OWNER-RULED 2026-09-28` | §4.1, §4.7 |
| Cantidades inválidas se rechazan **sin excepción por `Business`** (v1.1 **REJECTED**) | `00-DECISION-REGISTER.md` §4.3.1, *Consequence* | Vigente | §4.1, §9.2, §12.3 |
| Aislamiento verificado: extensión por request, `empresaId` forzado, fail-closed, 3 modelos cubiertos | `10-AUDIT/…` §7; `05-ASIS/03-ASIS-DATA.md:83-96` | `VERIFIED BY CODE` | §3.2 |
| No existe capacidad de transferencia inter-`Business`; cumplimiento por ausencia | `10-AUDIT/…` §8; `05-ASIS/03-ASIS-DATA.md:98-110` | `VERIFIED BY CODE` | §3.3 |
| Estado de implementación de D-014: `VERIFIED BY CODE` | `10-AUDIT/…:38`; `05-INVENTORY.md:19` | `VERIFIED BY CODE`, con calificación | §3.3, §14.2 |
| Estado de implementación de D-010: `IMPLEMENTATION NON-COMPLIANT / GAP` | `10-AUDIT/…:37`; `05-ASIS/11-ASIS-QUALITY.md:68-70` | Gap declarado | §4.4, §4.7 |
| Controles C01–C06 verificados | `05-ASIS/11-ASIS-QUALITY.md:72-81`; `10-AUDIT/…` §5 | `VERIFIED BY CODE` | §4.3 |
| Brechas G01–G10 verificadas | `05-ASIS/11-ASIS-QUALITY.md:83-96`; `10-AUDIT/…` §6 | `VERIFIED BY CODE` | §4.4, §9.1 |
| Contradicciones X01–X06 | `10-AUDIT/…` §9 | `DOCUMENTED` | §4.6 |
| 0 tests; 0 hallazgos `VERIFIED BY TEST` o `VERIFIED BY EXECUTION` | `05-ASIS/11:4-8`; `10-AUDIT/…:733-741` | `VERIFIED BY CODE` | §4.4, §14.2, §9.3 |
| Evidencia faltante E01–E07 | `10-AUDIT/…` §11 | 5 `NOT DETERMINABLE`, 2 acciones pendientes | §9.3, §14.2 |
| FIFO por lote en venta presencial | `05-ASIS/01:20-21`; `05-ASIS/07:12-18`; `05-ASIS/12-ASIS-EVIDENCE.md:24-26` | `VERIFIED BY EXECUTION` (AS-IS) | §7.1 |
| Venta de lote vencido permitida y marcada | `05-ASIS/12-ASIS-EVIDENCE.md:54-56`; `AUD-D010-C06` | `VERIFIED BY EXECUTION` (AS-IS) | §7.1, §7.2 |
| No existe concepto de reserva en el AS-IS | `05-ASIS/03-ASIS-DATA.md` (inventario de modelos); `05-ASIS/07:32-36` | `VERIFIED BY CODE` | §8.1 |
| Reservas: pregunta abierta del taller D-014 | `03-DECISION-WORKSHOP/D-014-inventory-ownership.md:50` | Abierta, sin responder | §8.2, §17 |
| Permiso `inventario.ajustes`; lecturas abiertas | `05-ASIS/06-ASIS-MODULES.md:19` | `VERIFIED BY CODE` | §12.2 |
| Anulación de `Sale` produce reversiones/ajustes sobre stock "según corresponda" | **D-008** — §4 fila D-008 | `APPROVED — DERIVED / RECONSTRUCTED` | §6.4 |
| Cláusula en disputa de D-008 (revertir explícitamente stock/caja/pagos/AR) | `00-DECISION-REGISTER.md` §4.3.2, punto 3 | `OPEN DETAIL — PENDING OWNER RULING` | §6.4, §10.2 |
| D-007: `Order` ≠ `Sale`; condiciones de conversión no definidas | **D-007** — §4 fila D-007 | `APPROVED — DERIVED / RECONSTRUCTED`; condiciones `OPEN` | §6.3, §10.2 |
| "`03-INVENTORY-SPEC.md` no existe"; `03-OPERATIONS-SPEC.md` es placeholder | `02-CANONICAL-SPEC/` (listado del directorio); `03-OPERATIONS-SPEC.md:2,6-7` | Verificado | §0 |
| Texto canónico de D-010/D-014 existe; GRF-09 retractado | `00-DECISION-REGISTER.md:185`; `02-COMMERCE.md:42-43` | Retractado | §0 |
| `Stock` es ítem de navegación; `Inventory` es dominio; ambos `TO-BE PROPOSED` | `00-WAPSELL-SPEC-GENERAL.md` §25, §24 | `TO-BE PROPOSED` | §1.3 |
| Mecanismo de aislamiento no decidido | `00-TOBE-OVERVIEW.md:224-228`; D-001 | `IMPLEMENTATION DETAIL` | §12.1 |
| Modelo de datos excluido explícitamente | `DEC-001:55-57` | `APPROVED DIRECTION` | §2, §5.1 |
| Ubicaciones físicas: fuentes divergentes | `00-WAPSELL-SPEC-GENERAL.md:149,244`; `05-INVENTORY.md:24`; `00-TOBE-OVERVIEW.md:261-263` | `OPEN DETAIL` | §0, §11 |
| CON-023, CON-007, CON-019 | `10-CONFLICT-RESOLUTION-MAPPING.md:66,78,82` | `OPEN` | §15 |
| Candidatura de consolidación CON-007/CON-019 sin aplicar | `10-CONFLICT-RESOLUTION-MAPPING.md` §5 (`:112-151`) | Requiere autorización del Owner | §15 |
| Observaciones P1–P8 no propagadas | `10-AUDIT/…:795-816`; `05-INVENTORY.md:29-31` | `PROPOSED / OPEN` | §4.7 |
| `Lote` y `MovimientoStock` citados en el overview como autoridad de D-014 | `00-TOBE-OVERVIEW.md:176` | **Divergencia** — D-014 no nombra esas entidades | §1.3, §5.2 |
| `AUD-X02` con caracteres corruptos en el encabezado | `10-AUDIT/…:600` | Defecto de codificación, read-only | §4.6 |

**Fuentes stale detectadas, no modificadas en esta fase.** Se listan para la pasada de gobernanza
documental; ninguna se altera aquí.

| Fuente | Qué dice | Estado real |
|---|---|---|
| `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:56` | D-010: *Source* = `03-OPERATIONS-SPEC.md` (placeholder) | El texto canónico está en §4.3.1; el placeholder no tiene reglas |
| `08-TRACEABILITY/00-MASTER-TRACEABILITY.md:98,102` | D-010 y D-014 sin spec a la que trazar | §0: la SPEC que los cubre es un placeholder |
| `02-CANONICAL-SPEC/03-OPERATIONS-SPEC.md:17` | *"Inventory, stock movements, purchases, suppliers, cash, fulfillment and deliveries."* | Correcto como alcance; sin contenido |

---

## 17. OPEN DETAIL

Agrupados por área. **Ninguno se resuelve en esta fase.** Cada uno cita la fuente que lo declara
abierto, para que ningún punto se presente como decisión tomada.

### Propiedad y aislamiento (D-014)

1. **Mecanismo de aislamiento multi-tenant** para inventario: RLS, filtro obligatorio, esquema por
   `Business` u otro. `IMPLEMENTATION DETAIL` de D-001. El AS-IS usa una Prisma Client Extension con
   limitaciones documentadas (`05-ASIS/05-ASIS-AUTHORIZATION.md:19-25`).
2. **Ubicaciones físicas de stock**: si existen en el MVP; qué las representa; granularidad. Fuentes
   divergentes (§11); `05-INVENTORY.md:24` lo lista como *"Still not decided"*.
3. **Almacenes físicos compartidos o compras centralizadas entre negocios.** Pregunta abierta del
   taller D-014, **sin responder** (`D-014-inventory-ownership.md:49`).
4. **Operación inter-`Business` de transferencia**, si alguna llegara a definirse: entidad, estados,
   transiciones, workflow, autorización, auditoría, consistencia entre dos negocios.
   **`FUTURE DETAIL`** — depende de la especificación posterior que D-014 exige
   (`00-DECISION-REGISTER.md` §4.3.1). **No existe** hoy.
5. **Cláusula de escape de la prohibición**: qué "operación inter-`Business`" sería autorizable y con
   qué procedimiento. No se propone ninguna.
6. **Reservas de stock** y su funcionamiento en multi-tenant. Pregunta abierta del taller D-014
   (`D-014-inventory-ownership.md:50`); el AS-IS no tiene reservas (§8).
7. **Disponibilidad** como concepto distinguible de la existencia. D-010 exige consistencia entre
   movimiento y existencia **resultante**; no define disponibilidad.
8. **Timings de movimiento en contexto multi-tenant.** CON-023 (`00-CONFLICT-REGISTER.md:69`).
9. **Informes de inventario multi-negocio.** Pregunta abierta del taller D-014
   (`D-014-inventory-ownership.md:51`); SPEC §17 `OPEN DETAIL`.
10. **Migración** de `Empresa` → `Business` para el inventario. `IMPLEMENTATION DETAIL` de D-001;
    GAP-001 `BLOCKING`.

### Integridad del stock (D-010)

11. **Qué control concreto satisface "controles de base de datos y/o transacción"**: `CHECK`, trigger,
    FK compuesta, `UPDATE` condicional, bloqueo optimista o pesimista, clave de versión, nivel de
    aislamiento, `SELECT … FOR UPDATE`, procedimiento. **Ninguno está decidido.** Observaciones P1–P4
    y P6 de la auditoría: `PROPOSED / OPEN` (§4.7).
12. **Qué es una "cantidad inválida"**: definición operativa, umbrales, tolerancias, signos permitidos,
    precisión y escala decimal. `AUD-E05` (`Decimal` sin `@db.Decimal`) es `NOT DETERMINABLE`.
13. **Política ante existencias insuficientes**: si el TO-BE admite alguna forma de stock negativo
    (sobreventa, backorder) y con qué autorización. La ausencia de excepción por `Business` está
    decidida (§4.1); la política de stock negativo, no (§9.3).
14. **Si `loteId` es obligatorio** o si el movimiento se condiciona cuando no hay lote. Observación P3
    (`PROPOSED / OPEN`); el requisito de consistencia de D-010 se aplica en cualquier caso (§7.3).
15. **Criterios de "mantener" los controles de integridad.** D-010 obliga a verificar y mantener, sin
    definir qué conjunto mínimo constitutes "mantener" ni quién lo verifica en el futuro.
16. **Estrategia de tests** para los controles C01–C06 y para las brechas G01–G10. Observación P7
    (`PROPOSED / OPEN`); pertenece a la fase `TESTS`.
17. **Unicidad de la numeración correlativa de venta** (`G07`). Corresponde a Sales; se registra aquí
    porque la auditoría la incluye en el hallazgo de integridad de stock. Observación P4
    (`PROPOSED / OPEN`).
18. **Comportamiento de la extensión de scope dentro de `$transaction`**. `AUD-E04`:
    **`NOT DETERMINABLE`**. Impacta `AUD-D014-C03`/`C04` dentro de transacciones.

### Conceptos, movimientos y lotes

19. **Si el TO-BE tiene entidad de stock** o si la existencia es derivada, como en el AS-IS
    (`AUD-D010-G10`). El texto canónico nombra *"existencias resultantes"*, no una entidad.
20. **Si se mantiene un movimiento único de trazabilidad** o varios, y cómo se relacionan con el
    ledger. El AS-IS tiene uno solo (`05-ASIS/03:54-56`); D-014 nombra *"movimientos"* sin pluralidad
    ni unicidad.
21. **Taxonomía y codificación de los tipos de movimiento**: si son enum; qué valores existen; cómo se
    codifican entradas, salidas, ajustes y, en su día, una transferencia. `AUD-D010-G09` documenta que
    hoy es texto libre y que `Ajuste` nunca se escribe. Observación P6 (`PROPOSED / OPEN`).
22. **Si existen lotes en el TO-BE** y, en ese caso, su modelo. Ninguna decisión los nombra (§7.2).
23. **Política FIFO** como criterio de consumo. AS-IS verificado; §22 del SPEC general es
    `TO-BE PROPOSED`; D-010 no la menciona (§7.2).
24. **Venta de lotes vencidos**: si se permite, se bloquea o requiere autorización. El AS-IS lo permite
    y lo marca (`AUD-D010-C06`); ninguna decisión lo regula (§7.2).
25. **Estados de lote.** CON-023 marca el ciclo de vida del lote como `GAP + MISSING_DECISION`; los
    "estados implícitos" del registro de conflictos **no** son estados verificados
    (`03-CONFLICTS/04-STATE-CONFLICTS.md:7`).
26. **Reversión de stock por anulación de `Sale`**: forma, condición y momento. D-008 dice
    *"reversiones o ajustes … según corresponda"* sin definir la condición; la cláusula en disputa está
    `OPEN DETAIL — PENDING OWNER RULING` (§6.4).
27. **Si la preparación o la entrega de un pedido es un movimiento de stock.** Ninguna decisión lo
    nombra (§10.3).
28. **Alertas de bajo stock y de vencimiento**: existencia, umbral, destinatario, canal,
    configurabilidad por `Business`, relación con Notifications (§13).

### Autorización y trazabilidad

29. **Permisos de Inventory**: qué puede hacer cada rol (leer existencias, ajustar, recibir, ver
    movimientos, ver alertas). D-005 deja el catálogo `OPEN`; ninguna decisión nombra un permiso de
    inventario (§12.2).
30. **Auditoría de los movimientos de stock**: qué se registra, en qué forma y con qué retención. SPEC
    §18 `OPEN DETAIL`. El AS-IS tiene `AuditLog` genérico y `MovimientoStock` como trazabilidad
    (`05-ASIS/03:59`), pero ninguna decisión exige ninguno de los dos en el TO-BE.
31. **Aplicabilidad de la autorización por excepción (D-006) a validaciones de stock.** D-010 excluye
    la excepción para cantidades inválidas; el alcance de D-006 fuera de ese caso no está decidido
    (§12.3).

### Transversal

32. **Correspondencia dominio `D13 Inventory` ↔ módulo de código ↔ carpeta.** `OPEN DETAIL` en
    `00-TOBE-OVERVIEW.md` §13, punto 3.
33. **Nombre canónico del ítem de navegación**: §25 dice "Stock" y §24 dice "Inventory". Ninguna
    decisión los vincula (§1.3).
34. **Modelado de la divergencia de fuentes sobre ubicaciones físicas** (§11): resolver si el MVP las
    tiene o no requiere una decisión que no existe.
35. **Nombre del archivo SPEC canónico de Inventory**: `03-INVENTORY-SPEC.md` no existe y
    `03-OPERATIONS-SPEC.md` es un placeholder que cubre además Cash, Purchases y Fulfillment (§0).
36. **Sobre-attribución de `Lote` y `MovimientoStock` a D-014** en `00-TOBE-OVERVIEW.md:176` (§1.3,
    §5.2).
37. **Candidatura de consolidación CON-007 / CON-019**: requiere autorización explícita del Owner;
    no se aplica (§15).
38. **Defecto de codificación en el encabezado `AUD-X02`** (`10-AUDIT/…:600`); el artefacto de auditoría
    es read-only para esta fase (§4.6).

---

## 18. Cobertura de los temas exigidos

Verificación de que cada área solicitada tiene una sección propia. Esta tabla es de control del
documento, no un requisito.

| # | Área solicitada | Sección |
|---|---|---|
| 1 | Propiedad del inventario | §3.1 |
| 2 | Aislamiento por `Business` | §3.2, §12.1 |
| 3 | `Business` → Inventory → Producto → Stock → Stock Movement (cadena) | §5.3 |
| 4 | Entradas y salidas | §6.2 |
| 5 | Ajustes | §5.2, §6.1 |
| 6 | Relación con compras | §10.1 |
| 7 | Relación con ventas y anulaciones | §6.4, §10.2 |
| 8 | Lotes | §7.1, §7.2 |
| 9 | Vencimientos | §7.1, §7.2 |
| 10 | Trazabilidad de movimientos | §5.2, §7.3, §10.4, §17.30 |
| 11 | Concurrencia e integridad transaccional | §4.1–§4.5, §9 |
| 12 | Stock negativo y oversell | §9 |
| 13 | Reservas y disponibilidad | §8 |
| 14 | Ubicaciones físicas | §11 |
| 15 | Transferencias entre negocios | §3.3 |
| 16 | Relación con Commerce (pedidos) | §6.3, §10.2 |
| 17 | Relación con Fulfillment | §10.3 |
| 18 | Autorización y permisos | §12.2, §12.3 |
| 19 | Trazabilidad y auditoría | §10.4, §17.30 |
| 20 | Alertas de stock y vencimiento | §13 |
| 21 | Estados y ciclo de vida de movimientos | §6.1, §6.5, §17.25 |
| 22 | Evidencia AS-IS vs. TO-BE | §14 |
| 23 | Conflictos abiertos | §15 |
| 24 | Deuda documental / SPEC inexistente | §0, §17.35 |
| 25 | Correspondencia dominio ↔ módulo ↔ entidad | §1.3, §5.1 |
| 26 | Migración desde `Empresa` | §2, §17.10 |
| 27 | OPEN DETAIL consolidados | §17 |
| 28 | Cadena de fase | §19 |

---

## 19. Cadena de fase

Este documento es el **escalón TO-BE** de
`REQUIREMENTS → DECISIONS → TO-BE → CONTRACTS → INVARIANTS → TESTS → PLAN → IMPLEMENTATION`.

- **Producido en 6.2:** este documento únicamente. Ninguna SPEC, ningún archivo AS-IS, ningún
  registro de decisiones, ningún registro de conflictos, ninguna matriz de trazabilidad y ningún
  artefacto de auditoría fue modificado.
- **No producido, por fase:** `Contract`, `Invariant`, `Test`, plan de implementación, migraciones,
  schema, refactors, cambios de API, cambios de UI, correcciones de código.
- **Estado de D-010:** requisito `APPROVED — OWNER-RULED`; implementación
  **`IMPLEMENTATION NON-COMPLIANT / GAP`**; 6 controles verificados, 10 brechas verificadas, 0 tests.
- **Estado de D-014:** requisito `APPROVED — OWNER-RULED`; implementación **`VERIFIED BY CODE`**, con
  cumplimiento de la prohibición **por ausencia del feature** (`AUD-D014-N02`).
- **Conflicto cerrado:** ninguno. CON-007, CON-019 y CON-023 permanecen `OPEN`.
- **Consolidación aplicada:** ninguna. La candidatura CON-007/CON-019 requiere autorización del Owner.
- **Observaciones de auditoría propagadas:** 0. P1–P8 siguen `PROPOSED / OPEN`.
- **Decisión creada:** 0. **Requisito inventado:** 0. **Estado inventado:** 0. **ID inventado:** 0.
  **Entidad física definida:** 0. **Contrato:** 0. **Invariante:** 0. **Test:** 0.

---

*Fin de `07-TOBE/03-INVENTORY.md` · Fase 6.2 · `DRAFT — NOT APPROVED` · sin efecto normativo más allá
de los grados declarados en §14.1.*

## POST-OR-B3 — OWNER RULINGS PROPAGATED

Inventory queda alineado con OR-B3-009: la reserva se produce al confirmar el Order y el decremento físico se registra mediante un movimiento de salida que representa la salida real de inventario. La decisión no define todavía schema, estados técnicos, transacciones, APIs ni contratos.

Locations quedan conceptualmente gobernadas por OR-B3-004: concepto genérico, MAIN mínimo y múltiples permitidas.
