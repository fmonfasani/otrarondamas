# OR-001 — Owner Ruling Closure

**Fase:** 04-DECISIONS · **Fecha del ruling:** 2026-09-28 · **Estado:** **CLOSED**
**Decisión gobernada:** `D-001` · **Conflicto asociado:** `CON-009` (ya `RESOLVED`)
**Autoridad:** ruling explícito del Owner (fmonfasani), sesión del 2026-09-28

---

## 1. Registro de decisión

> Transcripción del ruling del Owner. **No reinterpretado.**

### Decision

**P1 — Destino de `Empresa`: opción A — renombrar `Empresa` → `Business`.**

**P2 — Estrategia: opción C — convivencia temporal de ambos modelos.**

**P3 — Continuidad: sí, sin downtime.** La continuidad obligatoria cubre:

- Ventas
- Caja
- Catálogo
- Compras
- Tienda Online
- Auth
- Datos históricos

**P4 — Datos existentes:** el nombre actual `"Roonda"` debe corregirse a `"Otra Ronda Más"`.

**P5 — Autorización: opción B — OR-001 autoriza documentar y posteriormente implementar la migración.**

### Rationale

El Owner no consignó rationale explícito por pregunta. Lo que el ruling **sí** fija de forma expresa, como interpretación obligatoria:

- `Business` continúa siendo el término canónico.
- `Tenant` continúa describiendo la **función de aislamiento**, no la entidad.
- La coexistencia `Empresa` + `Business` es **TEMPORAL**.
- El estado TO-BE final es **`Business`**.
- **P5-B no debe interpretarse como autorización para ejecutar cambios inmediatamente.**
- **Primero debe especificarse la estrategia de migración.**
- No inventar detalles técnicos todavía.

**No se atribuye al Owner ningún motivo que no haya enunciado.** La coherencia entre P1 (renombrar) y P2 (convivencia temporal) se registra tal como fue decidida: el destino final es un renombrado, y el camino para llegar es una convivencia transitoria.

### Scope

**Dentro del alcance de este ruling:**

- Destino de la entidad `Empresa`: renombrado a `Business`.
- Mecanismo de transición: convivencia temporal de ambos modelos.
- Requisito de continuidad sin downtime sobre los 7 dominios enumerados en P3.
- Corrección del valor de nombre `"Roonda"` → `"Otra Ronda Más"`.
- Autorización para especificar y, posteriormente, implementar la migración.

**Fuera del alcance de este ruling** (no decidido por el Owner, no inventado acá):

- Tablas, columnas, foreign keys, tipos e identificadores.
- Mecanismo técnico de compatibilidad durante la convivencia.
- Estrategia de deployment.
- Migraciones concretas de Prisma.
- Criterio de finalización de la coexistencia.
- Mecanismo de rollback.
- Modelo físico de `Business`.
- Mecanismo de aislamiento multi-tenant (RLS, filtro obligatorio, esquema por Business).

### Effective version

**`0.x` — draft / evolving**, conforme a `00-GOVERNANCE/04-VERSIONING.md`.

Clasificación del cambio: **MAJOR** según la misma norma — *"MAJOR = change to requirements, behavior, contracts or approved decisions"*. Este ruling modifica el estado de una decisión aprobada (el `IMPLEMENTATION DETAIL` de D-001) y añade requisitos nuevos (continuidad sin downtime, corrección de nombre).

No se promueve a `1.x`: la norma reserva `1.x` para *"approved baseline"*, y la línea base de Wapsell no está aprobada mientras OR-002…OR-007 sigan pendientes.

### Implementation authorization

**AUTORIZADO:** documentar la estrategia de migración, y posteriormente implementarla.

**NO AUTORIZADO TODAVÍA:** ejecutar la migración. El ruling es explícito: *"No interpretar P5-B como autorización para ejecutar cambios inmediatamente. Primero debe especificarse la estrategia de migración."*

**Secuencia autorizada:**

```text
1. Especificar la estrategia de migración
      (06-TRANSFORMATION/02-MULTITENANCY.md, 08-MIGRATION-STRATEGY.md, 07-TOBE/03-DATA.md)
                    ↓
2. Aprobación del Owner de esa especificación   ← puerta no superada
                    ↓
3. Implementación
```

En consecuencia, el `IMPLEMENTATION DETAIL` de D-001 **no pasa a `AUTHORIZED`**: pasa a **`SPECIFICATION REQUIRED`** (ver §6).

---

## 2. Validez del cierre según la gobernanza existente

La acción 2 del mandato pide cerrar OR-001 *"únicamente si el mecanismo documental lo permite según la gobernanza existente"*. Verificación:

| Norma | Requisito | Cumplimiento |
|---|---|---|
| `01-SOURCE-OF-TRUTH.md` | *"Approved decisions → Decision Register"* | El ruling se registra en `04-DECISIONS/`, y este documento se referencia desde el registro de OR-001 en `12-ARCHITECTURAL-DECISION-CLOSURE.md` §14 |
| `03-CONFLICT-RESOLUTION.md` | *"The agent must not silently choose between contradictory sources"* | No se eligió entre fuentes: el Owner resolvió explícitamente. Las alternativas provienen de `DEC-001`, citadas literalmente |
| `02-EVIDENCE-POLICY.md` | Clasificación de evidencia | Este ruling es evidencia de clase **`OWNER-VERBATIM`**: transcripción directa de la decisión del Owner |
| `04-VERSIONING.md` | Clasificación del cambio | **MAJOR**, versión `0.x` — §1 |
| `05-NAMING-CONVENTIONS.md` | *"Do not replace existing approved IDs"* | `OR-001` y `D-001` conservan sus identificadores. Ningún ID renombrado |

**Conclusión: el cierre es válido.** OR-001 pasa a **`CLOSED`**.

**Alcance preciso del cierre:** se cierra **OR-001** (la pregunta del ruling). **No** se cierra `D-001` como decisión — ya estaba `APPROVED` desde antes. Lo que cambia es el estado de su `IMPLEMENTATION DETAIL`.

---

## 3. OR-001 — antes y después

| Campo | ANTES | DESPUÉS |
|---|---|---|
| **Estado de OR-001** | `PENDING OWNER RULING` | **`CLOSED`** (2026-09-28) |
| **Término canónico** | `Business` — ya decidido (D-001 `OWNER-VERBATIM`) | `Business` — **sin cambios** |
| **Destino de `Empresa`** | `OPEN` — renombrar / fusionar / coexistir (`DEC-001` punto 1) | **RENOMBRAR a `Business`** (P1-A) |
| **Mecanismo de transición** | `OPEN` — reescritura / incremental / convivencia (`DEC-001` punto 2) | **CONVIVENCIA TEMPORAL** (P2-C) |
| **Requisito de continuidad** | `NOT DOCUMENTED` — pregunta abierta de la ficha D-001 | **SIN DOWNTIME**, sobre 7 dominios (P3) |
| **Nombre del negocio** | Defecto registrado, sin decisión (CON-008, TD-002) | **CORREGIR** `"Roonda"` → `"Otra Ronda Más"` (P4) |
| **`IMPLEMENTATION DETAIL` de D-001** | `OPEN` — *"migración y modelo físico no definidos"* | **`SPECIFICATION REQUIRED`** — dirección y requisitos fijados; modelo físico sigue sin definir |
| **Autorización de implementación** | Ninguna | **Documentar + implementar tras aprobación de la especificación** (P5-B) |

---

## 4. Impacto del cierre sobre las decisiones dependientes

D-001 bloquea 12 decisiones (`02-DECISION-DEPENDENCIES.md:44`). Estado tras el cierre:

| ID | Relación | Antes | Después | Motivo |
|---|---|---|---|---|
| **D-002** | `DIRECT` | `Dependency satisfied? PARTIAL` | **`PARTIAL` — sin cambio material** | Su bloqueo propio nunca fue el nombre de la entidad, sino el modelo de identidad: *"Concrete data model, `Usuario.email @unique` and the `Usuario`/`Cliente` split are NOT decided"*. **Requiere OR-002** |
| **D-004** | `DIRECT` | `PARTIAL — Brand concept only` | **`PARTIAL` — sin cambio material** | Bloqueado por *"canonical design system NOT decided"*, independiente de D-001 |
| **D-014** | `DIRECT` | `Dependency satisfied? NO` | **`PARTIAL`** — dependencia de D-001 satisfecha en dirección | La propiedad de inventario por `Business` ya tenía ruling propio (§4.3.1). Con `Empresa`→`Business` fijado, su dependencia ascendente deja de ser indeterminada. `IMPLEMENTATION DETAIL` (ubicaciones, modelo físico) sigue `OPEN` |
| **D-003** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Alcance funcional **explícitamente excluido** por `DEC-001:61-65` |
| **D-005** | `INDIRECT` | `PARTIAL — principle only` | **`PARTIAL` — sin cambio material** | Bloqueado por el catálogo de roles/permisos, no por el nombre de la entidad |
| **D-006** | `INDIRECT` (vía D-002) | `NO` | **`NO` — sin cambio** | Depende de D-002 y D-005; además su formulación normativa está en disputa (OR-005) |
| **D-007** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Order/Sale states, sin relación con el nombre de la entidad |
| **D-011** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Estrategia de pasarelas, independiente |
| **D-012** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Modelo de deuda, independiente |
| **D-013** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Lifecycle de caja, independiente |
| **D-015** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Depende de D-014 (`INDIRECT`), que sigue con `IMPLEMENTATION DETAIL` abierto |
| **D-016** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Depende de D-007 (`DIRECT`) |
| **D-017** | `INDIRECT` | `NO` | **`NO` — sin cambio** | Depende también de D-002 y D-003; cláusula tecnológica en disputa (OR-007) |

### 4.1 Hallazgo: el desbloqueo es menor de lo que anticipaba el análisis previo

**Solo D-014 mejora su estado** (`NO` → `PARTIAL`). Las otras 11 dependientes **no se desbloquean** con este cierre.

La razón: el informe G1.1 asumió que D-001 era la raíz cuya resolución liberaría la cadena. El cierre revela que **cada dependiente tiene su propio bloqueo interno**, independiente del nombre de la entidad. D-001 era condición *necesaria* pero no *suficiente*.

Esto **no invalida** que OR-001 fuera el primer paso correcto: sin destino y mecanismo definidos, ninguna especificación de migración era escribible. Pero corrige la expectativa: cerrar la raíz no cascadea.

---

## 5. Nuevos bloqueos y desbloqueos

### Desbloqueado

| Elemento | Estado |
|---|---|
| **Especificación de la estrategia de migración** | **DESBLOQUEADA.** `06-TRANSFORMATION/02-MULTITENANCY.md`, `08-MIGRATION-STRATEGY.md` y `07-TOBE/03-DATA.md` pueden poblarse. Requisitos en §7 |
| **D-014 — dependencia ascendente** | `NO` → `PARTIAL` |
| **TD-002 / CON-008** (typo `"Roonda"`) | **Decisión tomada** (P4): corregir a `"Otra Ronda Más"`. Deja de ser deuda sin decisión y pasa a ser requisito de la migración. **No corregido todavía** — depende de la especificación |
| **`02-CANONICAL-SPEC/01`** — nota `Flagged for the D-001 reconciliation` | El destino de `Empresa` ya no es indeterminado; la reconciliación terminológica pendiente en §1/§3–§10 de esa spec tiene ahora criterio |

### Nuevo bloqueo introducido por el propio ruling

| Bloqueo | Origen |
|---|---|
| **Puerta de aprobación de la especificación** | P5-B + interpretación obligatoria: *"Primero debe especificarse la estrategia de migración."* La implementación queda detrás de una aprobación que **aún no ocurrió**. Es un bloqueo nuevo, creado por el ruling, no preexistente |

### Requisitos nuevos que la especificación deberá satisfacer

Ninguno existía antes de este ruling:

1. **Continuidad sin downtime** sobre 7 dominios (P3).
2. **Convivencia temporal** de dos modelos simultáneos (P2-C).
3. **Criterio de finalización** de esa convivencia — implícito en *"TEMPORAL"*, **no** especificado por el Owner.
4. **Corrección de nombre** durante la migración (P4).

El punto 3 merece atención: el ruling declara la coexistencia temporal pero **no define cuándo termina**. Queda como requisito a especificar, no como decisión tomada.

---

## 6. Actualización del estado de D-001

**Modificación registrada en `12-ARCHITECTURAL-DECISION-CLOSURE.md` §14** (referencia al cierre). El registro canónico `00-DECISION-REGISTER.md` **no fue modificado** — ver §9.

Estado resultante de D-001:

```
Decision Status:        APPROVED — OWNER-VERBATIM        (sin cambio)
Canonicality:           Texto citable                    (sin cambio)
Implementation Detail:  SPECIFICATION REQUIRED           (antes: OPEN)
                        ├── Destino:      RENOMBRAR → Business      [DECIDIDO]
                        ├── Mecanismo:    Convivencia temporal       [DECIDIDO]
                        ├── Continuidad:  Sin downtime, 7 dominios   [DECIDIDO]
                        ├── Nombre:       "Otra Ronda Más"           [DECIDIDO]
                        ├── Modelo físico:                           [OPEN]
                        ├── Compatibilidad técnica:                  [OPEN]
                        ├── Fin de coexistencia:                     [OPEN]
                        └── Rollback:                                [OPEN]
```

`SPECIFICATION REQUIRED` es un estado **intermedio** entre `OPEN` y `AUTHORIZED`: la dirección y los requisitos están fijados, el diseño no, y la implementación está autorizada solo tras aprobar la especificación.

---

## 7. Requisitos para los documentos de estrategia

Acción 11 del mandato. **Son requisitos que la especificación deberá cumplir, no diseño.** Ninguno elige tablas, columnas, FKs, IDs, deployment ni mecanismos que el Owner no haya decidido.

### 7.1 `06-TRANSFORMATION/02-MULTITENANCY.md`

Hoy: 104 bytes, plantilla sin poblar.

| # | Requisito | Origen |
|---|---|---|
| R-MT-01 | Declarar `Business` como entidad canónica y `Tenant` como función de aislamiento | D-001 `OWNER-VERBATIM` + ruling |
| R-MT-02 | Declarar que `Empresa` **se renombra** a `Business` (no se fusiona ni coexiste de forma permanente) | P1-A |
| R-MT-03 | Declarar la convivencia `Empresa` + `Business` como **temporal**, con estado final `Business` | P2-C + interpretación obligatoria |
| R-MT-04 | Especificar el **criterio de finalización** de la coexistencia | Implícito en *"TEMPORAL"*; **no decidido por el Owner** |
| R-MT-05 | Especificar el **mecanismo de aislamiento** multi-tenant por `Business` | `07-TOBE/01` Open Detail #8 |
| R-MT-06 | Tratar las **fugas de aislamiento** documentadas: `groupBy`, `upsert` y `$executeRaw` evaden la extensión de Prisma | `07-TOBE/01` §12 gap #7 |
| R-MT-07 | Especificar el destino de `GOOGLE_SIGNUP_EMPRESA_ID` y `TIENDA_EMPRESA_ID` (variables de entorno con una empresa fija) | `07-TOBE/01` §12 gap #12 |
| R-MT-08 | Declarar la relación con `Membership`, o declarar explícitamente que depende de OR-002 | D-002 `IMPLEMENTATION DETAIL` `OPEN` |
| R-MT-09 | Referenciar el gap #14: `Empresa` solo se crea por `seed.ts`, sin administración de negocios | `07-TOBE/01` §12 gap #14 |

### 7.2 `06-TRANSFORMATION/08-MIGRATION-STRATEGY.md`

Hoy: plantilla sin poblar.

| # | Requisito | Origen |
|---|---|---|
| R-MS-01 | Especificar cómo se logra la **continuidad sin downtime** | P3 |
| R-MS-02 | Preservar **Ventas** sin interrupción | P3 |
| R-MS-03 | Preservar **Caja** sin interrupción | P3 |
| R-MS-04 | Preservar **Catálogo** sin interrupción | P3 |
| R-MS-05 | Preservar **Compras** sin interrupción | P3 |
| R-MS-06 | Preservar **Tienda Online** sin interrupción | P3 |
| R-MS-07 | Preservar **Auth** sin interrupción | P3 |
| R-MS-08 | Preservar **datos históricos** íntegros | P3 |
| R-MS-09 | Especificar el **mecanismo de compatibilidad** durante la transición | Pregunta abierta de la ficha D-001 |
| R-MS-10 | Especificar la corrección `"Roonda"` → `"Otra Ronda Más"`, considerando que `Empresa.nombre` es `@unique` y clave del `upsert` del seed | P4 + TD-002 / CON-008 |
| R-MS-11 | Especificar **rollback / reversibilidad**, o justificar documentalmente por qué no corresponde | Mandato de la acción 11 |
| R-MS-12 | Cubrir las ~20 entidades relacionadas con `Empresa` y los ~42 modelos con `empresaId` | `05-ASIS/03-ASIS-DATA.md`, `DEC-001` |
| R-MS-13 | Especificar el tratamiento de los datos de `seed.ts` | `DEC-001` punto 2 |
| R-MS-14 | Declarar la secuencia de fases y el punto de no retorno de cada una | P2-C + R-MS-11 |
| R-MS-15 | Declarar explícitamente que la ejecución requiere **aprobación previa del Owner** de esta especificación | P5-B + interpretación obligatoria |
| R-MS-16 | Declarar cómo se verifica la migración, **reconociendo que no existen tests** (TD-001: 0 suites, sin CI) | TD-001, CON-027 |

**R-MS-16 es el requisito de mayor riesgo:** el ruling exige continuidad sin downtime sobre 7 dominios en un sistema con **cobertura de tests 0%**. La especificación deberá declarar cómo se verifica esa continuidad. Se señala como hecho documentado; **no se propone solución**.

### 7.3 `07-TOBE/03-DATA.md`

Hoy: 104 bytes, plantilla sin poblar.

| # | Requisito | Origen |
|---|---|---|
| R-DT-01 | Declarar `Business` como unidad de aislamiento del modelo de datos TO-BE | D-001 |
| R-DT-02 | Declarar el estado final: `Business`, sin `Empresa` | P1-A + P2-C |
| R-DT-03 | Declarar qué entidades pasan a depender de `Business` | `05-ASIS/03-ASIS-DATA.md` (~20 entidades) |
| R-DT-04 | Declarar el estado transitorio del modelo durante la coexistencia | P2-C |
| R-DT-05 | Declarar la relación con `Membership`, o su dependencia de OR-002 | D-002 |
| R-DT-06 | Declarar la relación con `Customer` (no fusionado con `User`), o su dependencia de OR-003 | D-002-bis |
| R-DT-07 | Preservar el invariante de D-014: *"no code path may move stock between Business"* | `00-DECISION-REGISTER.md` §4.3.1 |
| R-DT-08 | Declarar el tratamiento de `Empresa.nombre @unique` en el modelo TO-BE | P4 + TD-002 |
| R-DT-09 | Declarar explícitamente qué queda como `OPEN DETAIL` y bajo qué OR pendiente | `07-TOBE/01` §13 |

### 7.4 Advertencia de dependencia cruzada

**R-MT-08, R-DT-05 y R-DT-06 no son satisfacibles sin OR-002 y OR-003.** El modelo de datos de `Business` se relaciona con `Membership` y `Customer`, cuyos modelos siguen `OPEN`.

Dos caminos posibles, **no decididos acá**: especificar solo la parte de `Business` y declarar el resto como dependiente, o esperar OR-002/OR-003 antes de escribir el modelo de datos. Es una decisión de secuenciación que corresponde al Owner.

---

## 8. Evidencia utilizada

| Fuente | Uso | Clasificación |
|---|---|---|
| Ruling del Owner, 2026-09-28 | P1-A, P2-C, P3, P4, P5-B + interpretación obligatoria | **`OWNER-VERBATIM`** |
| `00-DECISION-REGISTER.md` §4 | Estado de D-001 y de las dependientes | `DOCUMENTADO` |
| `02-DECISION-DEPENDENCIES.md:21,44` | `Blocks` de D-001; `Dependency satisfied?` | `DOCUMENTADO` |
| `04-DECISIONS/02-MULTITENANCY.md:53-72` | Alternativas literales (puntos 1 y 2); qué no decide DEC-001 | `DOCUMENTADO` |
| `03-DECISION-WORKSHOP/D-001-canonical-business-name.md` | Preguntas abiertas; documentos afectados | `DOCUMENTADO` |
| `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md:67` | `Business` canónico; CON-009 cerrada | `DOCUMENTADO` |
| `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md:68` | CON-009 `RESOLVED` | `DOCUMENTADO` |
| `07-TOBE/01-IDENTITY-AND-TENANCY.md` §12, §13 | 14 gaps; 17 Open Details | `DOCUMENTADO` (gaps `VERIFIED BY CODE` en origen) |
| `05-ASIS/03-ASIS-DATA.md` | ~20 entidades relacionadas; `nombre @unique` | `DOCUMENTADO` (`VERIFIED BY CODE` en origen) |
| `09-ANNEXES/TECHNICAL-DEBT-REGISTER.md` | TD-001 (0 tests), TD-002 (typo `"Roonda"`) | `DOCUMENTADO` |
| `00-GOVERNANCE/03-CONFLICT-RESOLUTION.md`, `04-VERSIONING.md`, `05-NAMING-CONVENTIONS.md` | Validez del cierre; clasificación MAJOR; conservación de IDs | `DOCUMENTADO` |
| Estado vacío de los 3 documentos de estrategia | Verificado por tamaño de archivo (104 bytes / plantilla) | **`VERIFICADO POR CÓDIGO`** (lectura de archivos) |

**Sin evidencia `VERIFICADO POR TEST` ni `VERIFICADO POR EJECUCIÓN`:** el repositorio no tiene tests y esta fase no ejecutó nada.

---

## 9. Qué NO se modificó, y por qué

| Documento | Motivo |
|---|---|
| `00-DECISION-REGISTER.md` | Es el registro canónico. Modificar el `IMPLEMENTATION DETAIL` de D-001 de `OPEN` a `SPECIFICATION REQUIRED` en la tabla §4 es una alteración del registro canónico que excede *"actualizar únicamente las dependencias y referencias que necesariamente resulten afectadas"*. **Se recomienda hacerlo como acción explícita del Owner.** El cierre queda registrado acá y referenciado desde `12-...` §14 |
| `02-DECISION-DEPENDENCIES.md` | La matriz se preserva **verbatim de Fase 3.5** por decisión de su propio encabezado. El cambio de D-014 (`NO` → `PARTIAL`) se registra en §4 de este documento, no sobrescribiendo la matriz histórica |
| `10-OPEN-DECISIONS.md` | Su contenido describe el estado de las 18 decisiones del workshop, que **no cambió**: D-001 seguía y sigue `APPROVED` con detalle de implementación no cerrado |
| `03-CONFLICTS/*` | CON-009 ya estaba `RESOLVED` antes del ruling. CON-008 (typo) recibe decisión pero **no se cierra**: su corrección no se ejecutó |
| `06-TRANSFORMATION/*`, `07-TOBE/03-DATA.md` | El mandato pide **preparar requisitos**, no poblar los documentos. Poblarlos sería diseñar la solución |
| `11-DECISION-CLOSURE-REPORT.md` | Informe histórico de una fase anterior. Su contradicción sobre `Blocks` de D-006 sigue reportada como OR-006 |
| **Todo el código** | `apps/`, `packages/`, `schema.prisma`, migraciones, datos: **intactos** |

---

## 10. Qué queda pendiente para OR-002

OR-002 es el siguiente ruling en el orden del informe G1.1.

**Pregunta de OR-002** (sin cambios por este cierre):

> ¿Cómo se reconcilian `Usuario` y `Cliente` con una identidad `User` global, qué ocurre con la unicidad global de `Usuario.email`, y cómo se modela la relación N:N `User ↔ Business`?

**Qué aporta el cierre de OR-001 a OR-002:** el término y el destino de la entidad de negocio están fijados, así que `Membership` ya tiene un extremo definido (`Business`). El otro extremo (`User`) sigue abierto.

**Qué sigue bloqueando OR-002:** *"Concrete data model, `Usuario.email @unique` and the `Usuario`/`Cliente` split are NOT decided"* (`02-DECISION-DEPENDENCIES.md:22`).

**Observación de secuenciación, para tu consideración:** R-MT-08, R-DT-05 y R-DT-06 requieren `Membership` y `Customer`, que dependen de OR-002 y OR-003. Escribir la estrategia de migración **completa** antes de OR-002 obligaría a dejar esas secciones como dependientes. **No decido el orden** — lo señalo.

**Hallazgo relevante, ya verificado:** `CON-010` figura como **`RESOLVED`** en `10-CONFLICT-RESOLUTION-MAPPING.md:69`, resuelto por D-002 + D-002-bis `OWNER-VERBATIM`. Igual que ocurrió con OR-001, **parte de OR-002 podría estar ya decidida** (la dirección: `User` global, `Membership` N:N, `Customer` no fusionado). Lo que restaría es el mecanismo de migración. Se verificará al preparar OR-002, **no en esta ejecución**.

---

## 11. Confirmación de no ejecución

Confirmación explícita, conforme a las restricciones 4–9 del mandato:

- **NO se modificó código.** `apps/api/`, `apps/pos-admin/src/`, `apps/tienda-online/src/`, `packages/`: sin cambios de contenido.
- **NO se modificó el schema de Prisma.** `apps/api/prisma/schema.prisma`: intacto.
- **NO se ejecutaron migraciones.** Ningún comando de Prisma fue invocado.
- **NO se modificaron datos.** No se ejecutó ninguna operación contra ninguna base de datos. El nombre `"Roonda"` **sigue sin corregir** en el código y en los datos: P4 es una decisión registrada, no una corrección aplicada.
- **NO se hizo commit.** El índice conserva el commit documental preparado en la fase anterior.
- **NO se cerró OR-002** ni ningún otro ruling.
- **NO se ejecutó ninguna herramienta que escriba archivos de código** (sin `eslint --fix`, sin formatters, sin codemods, sin generators).

Las únicas escrituras de esta ejecución son dos archivos de documentación: este documento (nuevo) y una nota de cierre en `12-ARCHITECTURAL-DECISION-CLOSURE.md` §14.
