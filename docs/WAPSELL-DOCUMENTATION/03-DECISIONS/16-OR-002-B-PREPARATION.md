# OR-002-B — Preparación del Owner Ruling

**Fase:** 04-DECISIONS · **Fecha:** 2026-09-28 · **Estado:** PREPARADO — no cerrado
**Cuestión:** mecanismo de transición del modelo de identidad
**Precedentes cerrados:** OR-001 `CLOSED` · OR-002-A `CLOSED` — **no se reabren**

> **Este documento no decide nada, no recomienda alternativas y no extrapola OR-001.**
> `ISS-07` continúa `PRESERVED — DO NOT SILENTLY RECONCILE`. `ISS-08` fuera de alcance.

**Pregunta bajo análisis:**

> ¿Cuál es el mecanismo de transición del modelo de identidad AS-IS `Usuario`/`Cliente` al modelo TO-BE `User`/`Membership`/`Customer`?

---

## 1. Estado AS-IS relevante

Todo lo siguiente es `VERIFIED BY CODE` en su origen (`05-ASIS/03-ASIS-DATA.md`, `05-ASIS/04-ASIS-IDENTITY.md`).

### 1.1 Dos identidades separadas

| Entidad | Ámbito | Discriminador JWT |
|---|---|---|
| `Usuario` | Panel interno | `type: 'usuario'` |
| `Cliente` | Tienda online | `type: 'cliente'` |

### 1.2 Reglas de unicidad — distintas entre sí

| Entidad | Regla | Consecuencia documentada |
|---|---|---|
| `Usuario` | `email @unique` **global**, no por empresa | *"una misma persona **no puede** tener cuenta de `Usuario` en dos empresas distintas con el mismo email"* |
| `Cliente` | `@@unique([empresaId, email])` | Unicidad **por empresa** |

`05-ASIS/04-ASIS-IDENTITY.md:20-22` señala que la regla de `Usuario` es *"lo opuesto de"* lo que pide DEC-001.

### 1.3 Pertenencia fija

> **No hay tabla `Membership`**: la relación Usuario↔Empresa es **1:N directa y fija** (`Usuario.empresaId`, escalar y obligatorio) — un Usuario pertenece a una empresa.

### 1.4 Ausencia total de los conceptos TO-BE

`07-TOBE/01` §12 gap #4:

> **Ausencia total** de `Business` / `Tenant` / `Membership` en el código — *"Los tres conceptos **no existen**; doble lectura de código lo confirma (SRC-011 + propia)"*

### 1.5 Elementos acoplados a la identidad actual

| Elemento | Detalle |
|---|---|
| `Permiso` / `UsuarioPermiso` | Granulares, ligados al `Usuario`, independientes de `RolUsuario` |
| `RolUsuario` (enum) | `OWNER` / `ASISTENTE_LOCAL` / `PROVEEDOR` / `REPARTIDOR` — *"no autoriza nada por sí solo"* |
| Variables de entorno fijas | `GOOGLE_SIGNUP_EMPRESA_ID` (para `Usuario`), `TIENDA_EMPRESA_ID` (para `Cliente`) — *"el sistema falla explícito si faltan"* |
| `Cliente` | `passwordHash`/`googleId` nullable, mismo patrón que `Usuario`; `esMayorista` distingue minorista/mayorista |
| Invitaciones y legajo | `invitaciones.service.ts`; alta solo por invitación |
| Autenticación | Password + Google OAuth, JWT 8h |

### 1.6 Lo que `DEC-001` declara como requisito mínimo de la migración

`05-ASIS/04-ASIS-IDENTITY.md:59-64`, tres puntos textuales:

> 1. Separar la identidad de la pertenencia: hoy `Usuario` *es* la identidad y *tiene* una empresa
> 2. Resolver qué pasa con `Usuario.email @unique` global
> 3. Decidir qué pasa con la separación actual `Usuario`/`Cliente` (dos tablas con JWT discriminado)

**El punto 3 ya está resuelto** por `D-002-bis`: no hay fusión. Los puntos **1 y 2 siguen abiertos**.

---

## 2. Estado TO-BE ya decidido

Confirmado por OR-002-A (`CLOSED`), con autoridad en `D-002` + `D-002-bis` (`OWNER-VERBATIM`):

```text
User global
   → Membership N:N
      → Business

Customer: relación comercial independiente de User
          · no se fusiona con User
          · vínculo Customer → User opcional
```

Más, vía `D-001` + OR-001 (`CLOSED`): `Business` es el término canónico, renombrado desde `Empresa`.

---

## 3. Qué parte de la transición YA está determinada

Clasificado según lo pedido en el punto 7 del mandato.

### 3.1 DECISIÓN (`OWNER-VERBATIM` — no reabrible)

| # | Contenido | Autoridad |
|---|---|---|
| D.1 | `User` es la identidad global | `D-002` |
| D.2 | `Membership` es la relación `User ↔ Business`, N:N | `D-002` |
| D.3 | Roles y permisos viven dentro del `Membership` | `D-002` |
| D.4 | `Customer` **no** se fusiona con `User` | `D-002-bis` |
| D.5 | `Customer` es relación comercial con un `Business`; vínculo a `User` **opcional** | `D-002-bis` |
| D.6 | `Business` es el extremo del `Membership` del lado del negocio | `D-001` + OR-001 |
| D.7 | La implementación física **no está autorizada** hasta determinar el mecanismo | OR-002-A |

**Consecuencia sobre el mecanismo:** D.4 elimina una clase entera de mecanismos posibles. Cualquier transición que consolide `Usuario` + `Cliente` en una sola tabla queda **descartada por decisión previa**, no por criterio de este análisis.

### 3.2 REQUISITO (heredado, vinculante — ver §8)

Los requisitos de continuidad de OR-001 (P3), en cuanto alcanzan a identidad.

### 3.3 Qué **no** está determinado

El mecanismo mismo. Es el objeto de este ruling.

---

## 4. Qué parte del mecanismo está realmente abierta

| # | Elemento | Categoría | Fuente |
|---|---|---|---|
| 4.1 | **Mecanismo de transición** `Usuario`/`Cliente` → `User`/`Membership`/`Customer` | **ABIERTO — objeto de OR-002-B** | Sin fuente que lo determine |
| 4.2 | Separación de identidad y pertenencia (hoy `Usuario` *es* identidad y *tiene* empresa) | ABIERTO | `DEC-001`, requisito mínimo 1 |
| 4.3 | Destino de `Usuario.email @unique` global | ABIERTO — **es OR-002-C** | `DEC-001`, requisito mínimo 2 |
| 4.4 | Destino de las filas existentes | ABIERTO — **es OR-002-D** | Open Question de la ficha `D-002` |
| 4.5 | Validez de sesiones y tokens durante la transición | ABIERTO — **es OR-002-E** | Requisito P3 de OR-001, sin especificar |
| 4.6 | Régimen de autorización posterior | ABIERTO — **es OR-002-F** | OR-002-A fija el presente, no el régimen |
| 4.7 | Mapeo `Permiso`/`UsuarioPermiso` → autorización por `Membership` | ABIERTO — **bloqueo propio de `D-005`** | Open Question de la ficha `D-002` |
| 4.8 | Modelo físico de `User` y `Membership` | `IMPLEMENTATION DETAIL` | `00-DECISION-REGISTER.md:98` |
| 4.9 | Ciclos de vida de `User` y de `Membership` | `IMPLEMENTATION DETAIL` | `07-TOBE/01` Open Details #3, #4 |
| 4.10 | Destino de `GOOGLE_SIGNUP_EMPRESA_ID` / `TIENDA_EMPRESA_ID` | `IMPLEMENTATION DETAIL` | `07-TOBE/01` §12 gap #12 |

**Estrictamente propio de OR-002-B: 4.1**, y su articulación con 4.2. El resto pertenece a C, D, E, F, a `D-005`, o es `IMPLEMENTATION DETAIL`.

---

## 5. Alternativas explícitamente documentadas para identidad

### Resultado de la verificación

> # NINGUNA DOCUMENTADA.

### 5.1 Qué se buscó y qué se encontró

Búsqueda exhaustiva sobre todo `docs/WAPSELL-DOCUMENTATION/` de los términos: `reescritura`, `migración incremental`, `convivencia temporal`, `dual-write`, `shadow`, `backfill`, `big-bang`, `strangler`.

**Resultado: una única enumeración de mecanismos en todo el corpus**, en `04-DECISIONS/02-MULTITENANCY.md:58-60`. Texto literal con su encabezado:

> 2. **Plan de migración.** Qué pasa con los datos de seed y la estructura ya implementada (**auth**, catálogo, ventas, caja, compras — ver SRC-004/SRC-011): reescritura, migración incremental, o convivencia temporal de ambos modelos.

Todas las demás apariciones de esos términos son: (a) citas de esa misma línea en documentos posteriores, (b) el ruling de OR-001 aplicándolos a `Empresa`→`Business`, o (c) usos no relacionados (p. ej. *"reescritura del README"*).

### 5.2 Por qué esa enumeración NO se cuenta como alternativas documentadas para identidad

El mandato exige verificar esto antes de formular nada. Registro los dos lados con precisión, **sin resolverlos**:

**A favor de que aplicaría a identidad:** la enumeración menciona explícitamente **`auth`** entre la estructura ya implementada que el plan de migración debe cubrir. `auth` es el módulo de identidad.

**En contra de contarla como alternativa aprobada para identidad:**

1. Es una lista de **qué NO decide DEC-001**, no un conjunto de opciones evaluadas. Aparece bajo el encabezado *"Qué NO decide este documento"*.
2. Su objeto declarado es *"los datos de seed y la estructura ya implementada"* en conjunto — no una estrategia por dominio.
3. **Ninguna de las tres opciones está desarrollada.** Son tres sustantivos sin definición, consecuencias ni condiciones de aplicación.
4. El Owner las aplicó a `Empresa`→`Business` en OR-001. **No hay registro de que las haya extendido a identidad**, y el mandato prohíbe extrapolarlo.

**Conclusión registrada:** la enumeración existe y menciona `auth`, pero **no constituye un conjunto de alternativas documentadas y aprobadas para el mecanismo de identidad**. Si el Owner quiere que ese conjunto sea el espacio de opciones de OR-002-B, debe declararlo — no se asume.

### 5.3 Las dos "alternativas" de la ficha `D-002` no son utilizables

| Opción listada | Marca en la fuente | Estado |
|---|---|---|
| Fusionar `Usuario` y `Cliente` en una nueva tabla `User` | `(ALTERNATIVES NOT DOCUMENTED, inferido)` | **REFUTADA permanentemente** por `D-002-bis` |
| Mantener `Usuario` y `Cliente` con una entidad `User` envolvente | `(ALTERNATIVES NOT DOCUMENTED, inferido)` | Inferida, nunca adoptada |

Ninguna cuenta: la primera está descartada por decisión del Owner, la segunda está marcada como inferida por su propia fuente.

### 5.4 Nada en TRANSFORMATION ni TO-BE aporta mecanismos

| Documento | Estado verificado |
|---|---|
| `06-TRANSFORMATION/01-IDENTITY.md` | Sin mecanismos |
| `06-TRANSFORMATION/02-MULTITENANCY.md` | **Plantilla vacía** (104 bytes) |
| `06-TRANSFORMATION/08-MIGRATION-STRATEGY.md` | **Plantilla vacía** |
| `07-TOBE/03-DATA.md` | **Plantilla vacía** (104 bytes) |
| `07-TOBE/01-IDENTITY-AND-TENANCY.md` | 14 gaps y 17 Open Details declarados; **Open Detail #12 es "Estrategia de migración"** con nota *"dirección aprobada, plan no"*. Declara el hueco, no lo llena |

---

## 6. Separación estricta de categorías

Punto 7 del mandato.

### DECISIÓN — no reabrible

D.1…D.7 de §3.1. Autoridad `OWNER-VERBATIM` (`D-001`, `D-002`, `D-002-bis`) más OR-001 y OR-002-A.

### REQUISITO — vinculante, no elegible

| # | Requisito | Origen |
|---|---|---|
| R.1 | Continuidad sin downtime de **Auth** | OR-001 P3 |
| R.2 | Preservación de **datos históricos** | OR-001 P3 |
| R.3 | Continuidad de **Tienda Online** (donde vive `Cliente`) | OR-001 P3 |
| R.4 | Separar identidad de pertenencia | `DEC-001` requisito mínimo 1 |
| R.5 | El mecanismo debe especificarse **antes** de tocar schema, código o datos | OR-002-A |

### ALTERNATIVA — opciones entre las que elegir

**NINGUNA DOCUMENTADA.** Ver §5.

### INFERENCIA — no es decisión ni requisito

| # | Inferencia | Etiquetada así en |
|---|---|---|
| I.1 | *"Migración de datos compleja, refactorización significativa de la lógica de autenticación y autorización, impacto en todas las funcionalidades de cara al usuario"* | Ficha `D-002`, sección `Consequences`, marcada **`INFERRED`** |
| I.2 | Que la enumeración de `DEC-001` sea aplicable a identidad | **Inferencia de este análisis** — registrada en §5.2, **no adoptada** |
| I.3 | Que la convivencia temporal de OR-001 se extienda a identidad | **Inferencia prohibida por el mandato** — no adoptada |

### IMPLEMENTATION DETAIL — fuera del alcance de OR-002-B

4.8, 4.9, 4.10 de §4. Más: schema, tablas, FKs, IDs, claims JWT, sesiones — **explícitamente vedados por el mandato y no abordados**.

---

## 7. Contradicciones documentales

**No se detectó ninguna contradicción nueva** en el análisis de OR-002-B.

Las preexistentes se preservan sin tocar:

| ID | Estado |
|---|---|
| `ISS-07` | **`PRESERVED — DO NOT SILENTLY RECONCILE`** — las 6 posiciones sobre el `STATUS` de `CON-010` siguen intactas |
| `ISS-08` | **Fuera de alcance** — los 7 documentos de `00-GOVERNANCE/` siguen `PROPOSED` |
| `ISS-02` | Sin cambio — `D-002-bis` sigue sin entrada propia en la matriz de dependencias |

---

## 8. Requisitos de continuidad de OR-001 que afectan esta transición

Punto 8 del mandato. De los 7 dominios que P3 declara, **tres alcanzan directamente a identidad**:

| Dominio P3 | Por qué afecta la transición de identidad |
|---|---|
| **Auth** | Es el módulo de identidad. Login por password, Google OAuth, emisión de JWT, invitaciones y legajo dependen de `Usuario`/`Cliente` |
| **Datos históricos** | `Usuario` y `Cliente` son referenciados por registros históricos: ventas (usuario responsable), caja (movimientos con responsable), pedidos, clientes con historial de compra y fidelidad |
| **Tienda Online** | `Cliente` es su identidad; el login es obligatorio para acceder desde el commit `1dcee59` |

Los otros cuatro (**Ventas, Caja, Catálogo, Compras**) están alcanzados **indirectamente**: sus operaciones se autorizan hoy mediante `Usuario` + `Permiso`/`UsuarioPermiso`. **Esto es inferencia**, no declaración de OR-001 — se etiqueta como tal.

### 8.1 Tensión documentada, sin resolver

`07-TOBE/01` §12 gap #9 (`VERIFIED BY CODE` en origen):

> JWT con campo `type` (`usuario`/`cliente`) discrimina dos identidades separadas → Identidad `User` global única — *"Dos identidades para la misma persona según el canal"*

El requisito R.1 (continuidad de Auth sin downtime) y el destino del discriminador `type` interactúan. **El alcance de esa interacción es OR-002-E**, no OR-002-B.

### 8.2 Riesgo de verificación, documentado

`TD-001`: **0 tests, 0% de cobertura, sin CI**. Cualquier mecanismo que se elija deberá demostrar continuidad sin downtime de Auth sobre un sistema sin verificación automatizada. **Hecho documentado; no se propone solución.**

---

## 9. Dependencias con OR-002-C, D, E y F

| ID | Relación con OR-002-B | ¿Puede resolverse antes que B? |
|---|---|---|
| **OR-002-C** (unicidad de `User`) | El mecanismo condiciona **cuándo** la regla entra en vigor —de inmediato o al final de una transición—, pero **cuál sea la regla** es independiente | **Sí**, en cuanto al contenido de la regla |
| **OR-002-D** (filas existentes) | **Acoplada fuertemente.** El destino de las filas depende del mecanismo: una convivencia y una reescritura tratan las filas de forma distinta | **No de forma completa** — el mecanismo condiciona el tratamiento |
| **OR-002-E** (sesiones y tokens) | **Acoplada.** Si el mecanismo implica dos modelos simultáneos, la pregunta de validez de tokens se plantea de una manera; si implica un corte, de otra | **No de forma completa** |
| **OR-002-F** (régimen de autorización) | **Independiente.** Es una pregunta de proceso | **Sí** |

**Orden sugerido por el acoplamiento, no una decisión:** B condiciona a D y E; C y F son independientes de B. **No se propone secuencia** — es decisión del Owner.

### 9.1 Confirmado fuera de OR-002 completo

| Elemento | Pertenece a |
|---|---|
| Lifecycle de `Customer`; modelado del vínculo `Customer ↔ User` | **OR-003** |
| Diseño de token: formato, claims, revocación; guards y middleware | **OR-005** (`D-006`) |
| Catálogo de roles y permisos | **`D-005`** — bloqueo propio |

---

## 10. Pregunta única para el Owner

> **¿Cuál es el mecanismo de transición del modelo de identidad AS-IS (`Usuario` y `Cliente`, con pertenencia fija a `Empresa`) al modelo TO-BE (`User` global, `Membership` N:N a `Business`, y `Customer` como relación comercial independiente)?**

**No se ofrecen opciones porque no existen alternativas documentadas para identidad** (§5). Si el Owner desea que el conjunto *"reescritura / migración incremental / convivencia temporal"* de `DEC-001:58-60` sea el espacio de opciones aplicable a identidad, **debe declararlo explícitamente**: este análisis no lo asume, conforme al mandato.

La pregunta es neutral: no incluye recomendación, ranking, opción marcada como preferible, ni extrapolación de OR-001.

### Registro de decisión

*Bloque reservado. No completado.*

```
Mecanismo de transición de identidad:

Espacio de alternativas aplicable (si se declara):

Rationale:

Relación con la convivencia temporal decidida en OR-001:

Scope:

Implementation authorization:
```

---

## Resumen

```text
OR-002-B STATUS:          PREPARADO — NO CERRADO

TO-BE DECIDIDO:           7 puntos (D.1…D.7) — OWNER-VERBATIM, no reabribles
REQUISITOS HEREDADOS:     5 (R.1…R.5) — vinculantes, no elegibles
ALTERNATIVAS DOCUMENTADAS: NINGUNA DOCUMENTADA
ABIERTO Y PROPIO DE B:    1 elemento (4.1 mecanismo) + su articulación con 4.2

VERIFICACIÓN CLAVE:       la única enumeración de mecanismos del corpus
                          (DEC-001:58-60) menciona "auth", pero es una lista
                          de lo que DEC-001 NO decide, sin desarrollar ninguna
                          opción. NO se cuenta como alternativas aprobadas
                          para identidad. NO se extrapoló OR-001.

CONTRADICCIONES NUEVAS:   0
ISS-07:                   PRESERVED — DO NOT SILENTLY RECONCILE
ISS-08:                   fuera de alcance

ACOPLAMIENTO:             B condiciona D y E · C y F independientes de B

PRÓXIMO OWNER RULING:     OR-002-B
```

**No se implementó código, no se modificó Prisma, no se modificaron datos, no se diseñó schema, no se eligieron tablas, FKs, IDs, claims JWT ni sesiones. No se cerró C, D, E ni F. No se avanzó a OR-003. No se hizo commit.**
