# Auditoría — Reconciliación documental del repositorio

**Fase:** 10-AUDIT · **Fecha:** 2026-09-28 · **Estado:** COMPLETA
**Rama:** `deploy/otrarondamas-wapsell-com` · **Commit de referencia:** `066bb91`
**Alcance:** documental. **Ningún archivo de código fue modificado.**

## Qué se pidió y qué se hizo en su lugar

La tarea encomendada fue una transformación integral del repositorio: inspeccionar, auditar el estado real, construir inventario, SPEC canónica, AS-IS, Transformation, TO-BE, conflictos y trazabilidad.

**Al inspeccionar, se encontró que ese trabajo ya existía** en `docs/WAPSELL-DOCUMENTATION/`: estructura de 12 fases poblada, 24 fuentes inventariadas, AS-IS de 13 documentos fechado 2026-09-25 y referenciado a este mismo commit, 27 conflictos registrados con IDs, registro de decisiones D-001…D-018, y una auditoría de evidencia en código de 41 hallazgos fechada hoy.

Ejecutar la tarea literalmente habría producido una **segunda fuente AS-IS paralela** — exactamente el tipo de conflicto que el proceso existente manda detectar, no crear. Ese riesgo ya estaba anticipado en `05-ASIS/00-ASIS-OVERVIEW.md`.

**Decisión (con el Owner, 2026-09-28):** reconciliar y cerrar brechas en lugar de reconstruir. Declarar `WAPSELL-DOCUMENTATION/` como canónica, y limitar el trabajo nuevo a lo que faltaba.

## Verificación independiente del AS-IS existente

Antes de construir sobre él, se verificaron sus afirmaciones clave por lectura directa de repositorio. **Coinciden en todos los puntos comprobados:**

| Afirmación del AS-IS | Verificación | Resultado |
|---|---|---|
| 0 tests en el backend | `find apps/api -name "*.spec.ts" -o -name "*.e2e-spec.ts"` | **0 archivos** — confirmado |
| Sin `Membership`, `Usuario` ligado 1:1 a `Empresa` | Lectura de `schema.prisma` | Confirmado — existe `Empresa`, no `Business`/`Tenant`/`Membership` |
| Messaging inexistente en código | Búsqueda en `apps/` | Confirmado — solo string literal en `Pedido.canalOrigen` |
| Typo `"Roonda"` en el código | `grep -rl "Roonda"` | Confirmado — **6 archivos de código**, incluido `seed.ts` donde es clave de `upsert` |
| Permisos granulares, no roles | Lectura de guards y decoradores | Confirmado — `PermissionsGuard` + `@RequierePermiso` |

No se detectó ninguna afirmación del AS-IS que resultara falsa o desactualizada.

## Brechas encontradas que el proceso no cubría

| # | Brecha | Acción |
|---|---|---|
| 1 | **Documentación canónica sin versionar** — `git ls-files docs/WAPSELL-DOCUMENTATION/` → 0 resultados | Registrada como **CON-028 (`CRÍTICO`)** |
| 2 | **README principal desactualizado** — typo "Roonda" en el título, "scaffolding inicial completado", 3 enlaces rotos a `docs/*.md` movidos | **Reescrito** |
| 3 | **`docs/` sin índice de autoridad** — nada declaraba qué carpeta era canónica; `WapSell docs/` (insumo abandonado) aparecía como par de `WAPSELL-DOCUMENTATION/` | **`docs/README.md` creado** |
| 4 | **`.lnk` de Windows en `04-DECISIONS/`** | Registrado como **CON-029** |
| 5 | **Numeración duplicada en `03-CONFLICTS/`** — dos `01-`, dos `02-`, … hasta `07-` | Registrado como **CON-030** |
| 6 | **`src/` vacío en la raíz** | Registrado como **CON-032**, documentado en el README |
| 7 | **Sin registro de deuda técnica** como documento propio | **TD-001…TD-007 creados** |
| 8 | **README de `WAPSELL-DOCUMENTATION/` decía "Starter structure"** describiendo pasos ya completados | **Reescrito** |

## Validaciones ejecutadas

Resultados reales, sin corregir nada para hacerlos pasar.

### Tests

```
find apps/api -name "*.spec.ts" -o -name "*.e2e-spec.ts"  →  0 archivos
```

**No se ejecutó ninguna suite porque no existe ninguna.** `npm test` invoca Jest sin tests. Cobertura 0%. (TD-001, CON-027.)

### Lint

```
npm run lint                                → no ejecuta nada: el script raíz solo imprime un mensaje
npm run lint --workspace=@otrarondamas/api  → FALLA: 10 errores
```

Los 10 errores son de indentación (`Expected indentation of 4 spaces but found 2`) en dos DTOs de compras:
- `apps/api/src/compras/dto/crear-devolucion-proveedor.dto.ts` (6 errores)
- `apps/api/src/compras/dto/crear-pago-proveedor.dto.ts` (4 errores)

**Son preexistentes**, no introducidos por esta fase.

**Observación de proceso:** el script de lint de la API corre `eslint --fix`, es decir **modifica código al validar**. Durante esta auditoría reescribió esos dos archivos. Se verificó por `git diff --numstat` que el contenido quedó idéntico (solo normalización de finales de línea, absorbida por `core.autocrlf`) y que el árbol de trabajo no retuvo cambios de código. Aun así, un comando de validación que muta el código es un riesgo para cualquier fase de solo lectura: registrado acá como observación, `PROPOSED / OPEN`, sin corregir.

### Typecheck

```
npx tsc --noEmit -p apps/api/tsconfig.json  →  exit 0, con 2 avisos de deprecación
```

Sin errores de tipos. Los dos avisos son de configuración y preexistentes:
- `TS5107` — `moduleResolution=node10` deprecado, deja de funcionar en TypeScript 7.0
- `TS5101` — `baseUrl` deprecado, deja de funcionar en TypeScript 7.0

No bloquean hoy; son deuda de configuración a futuro. No corregidos.

### Build

**No ejecutado.** Un build de producción de los tres workspaces excede el alcance documental de esta fase y no aporta evidencia sobre las brechas tratadas. Estado del build: `NOT DETERMINABLE` en esta auditoría.

### Estado del árbol de trabajo

```
git diff --numstat -- apps/api/src/   →  vacío
```

Confirmado: **cero cambios de contenido en código fuente.**

## Cambios en el repositorio

### Archivos creados (4)

| Archivo | Contenido |
|---|---|
| `docs/README.md` | Mapa de autoridad documental: qué es canónico, qué es insumo, qué no editar |
| `docs/WAPSELL-DOCUMENTATION/03-CONFLICTS/11-REPOSITORY-HYGIENE-CONFLICTS.md` | CON-028…CON-032 |
| `docs/WAPSELL-DOCUMENTATION/09-ANNEXES/TECHNICAL-DEBT-REGISTER.md` | TD-001…TD-007 |
| `docs/WAPSELL-DOCUMENTATION/10-AUDIT/02-REPOSITORY-RECONCILIATION-2026-09-28.md` | Este documento |

### Archivos modificados (3)

| Archivo | Cambio |
|---|---|
| `README.md` | Reescrito: Wapsell vs. Otra Ronda Más, estado real por módulo, qué no existe, limitaciones y riesgos, enlaces rotos eliminados, typo del título corregido |
| `docs/WAPSELL-DOCUMENTATION/README.md` | Reescrito: de "starter structure" a estado real de las 12 fases + advertencias vigentes |
| `docs/WAPSELL-DOCUMENTATION/03-CONFLICTS/00-CONFLICT-REGISTER.md` | **Solo encabezado**: nota apuntando a CON-028…CON-032. La tabla CON-001…CON-027 queda **verbatim**, según la regla del propio documento |

### Archivos reubicados

**Ninguno.**

### Archivos eliminados

**Ninguno.** Explícitamente: no se borró el `.lnk` (CON-029), no se borraron los `src/` vacíos (CON-032), no se tocó `docs/WapSell docs/` (documentado como legacy, sin mover). Los borrados y archivos sin trackear que ya estaban en `git status` al comenzar se dejaron intactos.

### Código

**Ninguna modificación de contenido.** Verificado por `git diff --numstat -- apps/api/src/` → vacío.

### Commits

**Ninguno.** Por instrucción del Owner, los cambios quedan en el árbol de trabajo para su revisión.

## Lo que sigue abierto

1. **CON-028 es lo único que convierte esto en trabajo útil para terceros.** Mientras `WAPSELL-DOCUMENTATION/` no esté en Git, nada de esto es alcanzable por otro desarrollador, y el criterio de éxito nº12 ("otro desarrollador puede continuar el proyecto sin depender de conocimiento informal") no se cumple. Resolver CON-029 y CON-030 antes o durante ese commit.
2. **TD-006 y TD-007** son de severidad ALTA y su estado real es **desconocido**, no conocido-y-malo. Verificarlos cuesta poco y cambia la evaluación de riesgo del sistema.
3. **TD-001 (sin tests)** condiciona todo lo demás: cualquier paso de la Transformation sobre código en operación, sin red de seguridad automatizada y con brechas de concurrencia ya verificadas (`AUD-D010-G01`, `G02`), es una apuesta.
4. **Fases 02, 06, 07 y 08 siguen en `DRAFT`.** No se avanzaron en esta sesión: hacerlo requiere decisiones de producto que están registradas como abiertas en `04-DECISIONS/10-OPEN-DECISIONS.md`.
