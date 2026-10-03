# Wapsell — Repository Hygiene Conflicts (CON-028…CON-032)

**Fase:** 03-CONFLICTS · **Fecha:** 2026-09-28 · **Estado:** OPEN
**Método:** verificación directa de repositorio (lectura de archivos, `git ls-files`, `git status`) sobre la rama `deploy/otrarondamas-wapsell-com`, commit `066bb91`.

## Por qué existe este documento

Los conflictos CON-001…CON-027 cubren contradicciones de **producto, arquitectura, datos y proceso**. Ninguno cubre el **estado del repositorio como artefacto**: qué está versionado, qué es alcanzable, qué está duplicado en disco.

Esa categoría importa por una razón concreta: el objetivo declarado es que **GitHub sea la fuente operativa y documental del proyecto**. Un documento canónico que no está versionado no cumple esa función, por correcto que sea su contenido.

Estos cinco conflictos no invalidan ninguno de los anteriores ni reabren `DEC-001`.

---

## CON-028 — La documentación canónica no está versionada

| Campo | Contenido |
|---|---|
| **Fuente A** | `docs/WAPSELL-DOCUMENTATION/` — ~100 archivos en disco, incluyendo toda la SPEC canónica, el AS-IS, el registro de conflictos y el de decisiones. |
| **Fuente B** | `git ls-files docs/WAPSELL-DOCUMENTATION/` → **0 resultados**. `git ls-files docs/` → 22 archivos, ninguno de ellos de la estructura canónica. |
| **Conflicto** | La documentación declarada canónica por [`00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`](../00-GOVERNANCE/01-SOURCE-OF-TRUTH.md) **no existe en el historial de Git**. Vive únicamente en el sistema de archivos local, sin trackear (`??` en `git status`). Ningún colaborador, clon o CI puede alcanzarla. Simultáneamente, los 7 `.md` históricos figuran como **borrados** (`D`) en `git status` porque su reubicación a `SOURCES/HISTORICAL/` tampoco fue commiteada: desde la perspectiva de Git, el repositorio **perdió documentación y no ganó nada**. |
| **Impacto** | **CRÍTICO.** Riesgo de pérdida total del trabajo documental ante una operación destructiva de Git, un `git clean`, o un cambio de máquina. Contradice directamente el objetivo de que GitHub sea la fuente operativa. Invalida en la práctica la trazabilidad, porque los identificadores (`CON-*`, `DEC-*`, `SRC-*`) no son resolubles por nadie más que el autor en su propia máquina. |
| **Estado** | **OPEN** |
| **Evidencia** | `VERIFIED BY CODE` (`git ls-files`, `git status` — 2026-09-28). |
| **Decisión requerida** | Commitear la estructura documental. Es una acción del Owner: requiere revisar qué entra al historial (ver CON-029 y CON-030, que deberían resolverse antes o en el mismo acto). No se ejecutó en esta fase por instrucción explícita de no generar commits automáticos. |

---

## CON-029 — `.lnk` de Windows dentro del registro de decisiones

| Campo | Contenido |
|---|---|
| **Fuente A** | `04-DECISIONS/` — carpeta de decisiones aprobadas, con 11 `.md` (`00-DECISION-REGISTER.md`, `01-IDENTITY.md`, …). |
| **Fuente B** | `04-DECISIONS/Porfolio - Acceso directo.lnk` — atajo binario de Windows, 975 bytes, marcado como ejecutable, con fecha 2026-09-28. |
| **Conflicto** | Un atajo del sistema de archivos personal del autor quedó dentro de una carpeta de documentación canónica. No es una decisión, no es documentación, y apunta a una ruta local que no existe en ninguna otra máquina. |
| **Impacto** | **BAJO.** Ruido documental. Sin la exclusión, al commitear (CON-028) entraría al historial un binario inútil y específico de una máquina. |
| **Estado** | **RESUELTO 2026-09-28 — excluido, no eliminado.** |
| **Evidencia** | `VERIFIED BY CODE`. Se agregó `*.lnk` a la sección `# OS` de `.gitignore` (junto a `Thumbs.db`/`.DS_Store`, por ser artefacto de Windows). Verificado con `git check-ignore -v` → coincide con `.gitignore:31`. El archivo **sigue presente en disco** (975 bytes, verificado con `ls`): no se eliminó nada. |
| **Nota** | Se resolvió por exclusión y no por borrado deliberadamente: el protocolo prohíbe cambios destructivos, y la exclusión logra el objetivo real —que no entre al historial de Git— sin tocar el árbol de trabajo del Owner. Si el Owner prefiere eliminarlo, es una acción suya. La regla `*.lnk` además previene el caso general a futuro, no solo este archivo. |

---

## CON-030 — Numeración duplicada en `03-CONFLICTS/` — **YA MITIGADO POR `GRF-05`**

> **CORRECCIÓN 2026-09-28 (posterior al registro inicial).** Este conflicto fue registrado
> inicialmente como desorden documental sin verificar el contenido de los archivos. **Esa
> caracterización era incorrecta.** Al leerlos, los 7 archivos "duplicados" resultaron ser
> **marcadores de reconciliación deliberados**, creados el 2026-09-28 bajo el identificador
> propio `GRF-05`. La colisión de numeración estaba **ya diagnosticada y documentada** por el
> proceso existente. Se conserva este registro como CON-030 por trazabilidad, recaracterizado.

| Campo | Contenido |
|---|---|
| **Fuente A** | `03-CONFLICTS/` contiene prefijos numéricos repetidos: los prefijos `01-` a `07-` aparecen **dos veces cada uno**. |
| **Fuente B** | Cada uno de los 7 archivos vacíos contiene un encabezado `RECONCILED 2026-09-28 — EMPTY (GRF-05: duplicate numbering)` que **nombra explícitamente a su gemelo poblado** y redirige al inventario real (`00-CONFLICT-REGISTER.md`, `10-CONFLICT-RESOLUTION-MAPPING.md`). |
| **Estado real verificado** | La ambigüedad **está resuelta por documentación, no por renumerado**. Cada par tiene un lado autoritativo declarado: `01-FUNCTIONAL` → `01-TERMINOLOGY`; `02-DATA` → `02-ROLE-CONFLICT-MATRIX`; `03-ARCHITECTURAL` → `03-DOMAIN-MODULE` (CON-026, CON-027); `04-ROLE` → `04-STATE` (CON-016, CON-017, CON-020, CON-022…CON-025); `05-STATE` → `05-BUSINESS-RULE` (CON-006, CON-007, CON-018, CON-019, CON-021, CON-023, CON-024); `06-TERMINOLOGY` → `06-ASIS-TOBE-GAPS`; `07-OPEN` → `07-DECISION-REGISTER` (marcado `HISTORICAL` por `GRF-03`). Los marcadores declaran además: *"Not deleted: the mandate requires preserving historical artifacts."* |
| **Conflicto residual** | Únicamente cosmético: el prefijo numérico no sirve como identificador único, así que **hay que citar por nombre completo de archivo**, no por número. No hay riesgo de citar el documento equivocado, porque cada archivo vacío dice cuál es el correcto. |
| **Impacto** | **BAJO** (rebajado desde MEDIO). |
| **Estado** | **MITIGADO por `GRF-05`** — no requiere acción antes del commit. |
| **Evidencia** | `VERIFIED BY CODE` — lectura completa de los 7 marcadores y de sus 7 gemelos poblados (2026-09-28). |
| **Decisión requerida** | **Ninguna urgente.** Un renumerado futuro sería cosmético y rompería las referencias cruzadas existentes de los marcadores. Recomendación: **dejar como está** y conservar la regla de citar por nombre de archivo. |

---

## CON-031 — `docs/` fuera de la gobernanza documental

| Campo | Contenido |
|---|---|
| **Fuente A** | [`01-SOURCE-INVENTORY/00-SOURCE-INVENTORY.md`](../01-SOURCE-INVENTORY/00-SOURCE-INVENTORY.md) — inventaría 24 fuentes, e incluye correctamente `Design/`, `Research/`, `Funcional Analysis/` y `WapSell docs/`. |
| **Fuente B** | Hasta 2026-09-28, `docs/` **no tenía índice propio**: nada en la raíz de `docs/` declaraba que `WAPSELL-DOCUMENTATION/` fuese canónica y el resto insumo. El README principal, además, enlazaba a rutas `docs/*.md` **ya inexistentes** (3 enlaces rotos verificados). |
| **Conflicto** | La jerarquía de autoridad documental existía en la gobernanza interna pero **no era visible desde afuera**. Alguien entrando al repositorio por `docs/` encontraba seis carpetas sin indicación de cuál leer, con `WapSell docs/` (insumo abandonado, governance en 0 bytes) presentándose visualmente como par de `WAPSELL-DOCUMENTATION/`. |
| **Impacto** | **MEDIO.** Riesgo directo de trabajar sobre insumo histórico creyéndolo canónico, o de editar `WapSell docs/` esperando que propague. |
| **Estado** | **MITIGADO PARCIALMENTE (2026-09-28)** — se creó `docs/README.md` con el mapa de autoridad, y se reescribió el README principal eliminando los 3 enlaces rotos. **Permanece OPEN** en lo que respecta a `pos-admin-files/`, cuyo estado sigue siendo `NOT DETERMINABLE` (ver TD-004). |
| **Evidencia** | `VERIFIED BY CODE` (enlaces roto verificados por existencia de archivo; `docs/README.md` creado en esta fase). |
| **Decisión requerida** | Determinar el destino de `pos-admin-files/`. El resto está mitigado. |

---

## CON-032 — Carpetas `src/` vacías en la raíz del monorepo

| Campo | Contenido |
|---|---|
| **Fuente A** | El README (hasta 2026-09-28) y la estructura declarada del monorepo ubican todo el código en `apps/` y `packages/`. |
| **Fuente B** | Existen en disco `src/`, `src/components/`, `src/features/` y `src/features/pos/`. `find src -type f` → **0 archivos**. `git ls-files src/` → **0 resultados**. Tampoco figuran en `git status`. |
| **Conflicto** | Estructura de directorios que sugiere una ubicación alternativa de código fuente en la raíz, sin contenido alguno. Residuo de un scaffold previo a la consolidación en `apps/`. Contradice la arquitectura de monorepo real sin aportar nada. |
| **Impacto** | **BAJO.** Confusión estructural para quien llega nuevo: sugiere que hay código en la raíz. Sin efecto funcional — Git ignora directorios vacíos, así que ni siquiera llegarían al historial. |
| **Estado** | **OPEN** — documentado en el README reescrito como residuo no activo. |
| **Evidencia** | `VERIFIED BY CODE` (`find`, `git ls-files` — 2026-09-28). |
| **Decisión requerida** | Eliminar los directorios. Trivial y sin riesgo (están vacíos y no versionados), pero es una acción destructiva sobre el árbol de trabajo: queda a decisión del Owner. Registrado como TD-005. |

---

## Resumen

| ID | Tema | Impacto | Estado |
|---|---|---|---|
| CON-028 | Documentación canónica sin versionar en Git | **CRÍTICO** | **OPEN** — commit preparado, pendiente de decisión del Owner |
| CON-029 | `.lnk` de Windows en `04-DECISIONS/` | BAJO | **RESUELTO** — excluido vía `.gitignore`, archivo intacto en disco |
| CON-030 | Numeración duplicada en `03-CONFLICTS/` | BAJO (rebajado) | **MITIGADO por `GRF-05`** — ya estaba diagnosticado; mi registro inicial era incorrecto |
| CON-031 | `docs/` sin índice de autoridad | MEDIO | MITIGADO PARCIALMENTE — resta `pos-admin-files/` (TD-004) |
| CON-032 | `src/` vacío en la raíz | BAJO | OPEN — documentado; Git ignora directorios vacíos, no llegarían al historial |

**Ninguno de estos conflictos fue resuelto por modificación de código ni por eliminación de archivos.** Acciones ejecutadas, todas documentales o de configuración: reescritura del README principal, creación de `docs/README.md`, este registro, y la regla `*.lnk` en `.gitignore`.

El estado de preparación para el commit está en [`10-AUDIT/03-PRE-COMMIT-REPORT-2026-09-28.md`](../10-AUDIT/03-PRE-COMMIT-REPORT-2026-09-28.md): **137 archivos `.md` listos**, 186 MB de binarios deliberadamente excluidos por requerir una decisión de versionado separada.
