# R0 — Baseline remoto GitHub (2026-11-04)

## 1. Resumen ejecutivo

La rama remota `main` avanzó después de la auditoría del 2026-11-03. La rama `refactor/opcion-6` ya no es una candidata de integración directa: está divergida, el PR #100 reporta conflictos y el diff tiene un alcance muy grande.

**Conclusión:** mantener PR #100 abierto sin merge y tratarlo como fuente de cambios para extracción selectiva, no como una unidad integrable.

## 2. Referencias verificadas

Repositorio: `fmonfasani/otrarondamas`

| Ref | SHA | Observación |
|---|---|---|
| `main` | `523780c0ba345c324c5225e674ca221f22574dbe` | HEAD remoto consultado |
| `refactor/opcion-6` | `c64ed48bb91074e9188250a14656ac4bfc5ed23f` | Rama de PR #100 |
| `docs/phase-4-reconciliation-plan` | `7ab05b875bbfee09d51bed8c0b939825b4974a80` | Rama documental creada desde refactor/opcion-6 |

El commit actual de `main` es un merge de `feat/phase1-remix-foundation` e incluye los límites de rutas Customer/Business/Platform, correcciones de seguridad de sesión, eliminación de datos mock, pruebas de límites de rutas y entregables de consolidación.

## 3. Divergencia PR #100

PR: https://github.com/fmonfasani/otrarondamas/pull/100

- Estado: OPEN.
- Mergeable: false.
- Mergeable state: `dirty`.
- Head: `refactor/opcion-6` (`c64ed48`).
- Base: `main`; el PR conserva como base SHA histórico `2939750c000952273bd6284d159dc5287f6d2f0c`.
- Comparación actual `main...refactor/opcion-6`: diverged, 67 commits ahead, 18 behind; merge-base `5e9f1be6f7643b7f9e6fc37093629849230ae562`.
- PR reporta 753 archivos, 92.390 adiciones y 55.755 eliminaciones.

La enumeración de archivos del PR mostró, entre otros:
- 29 rutas bajo caches `.cache`.
- 15 workflows renombrados a `.disabled`.
- 1 workflow guardado como `.backup`.
- 93 archivos de documentación/texto.
- 532 archivos de código fuente.
- Cambios relevantes en `apps/api`, `apps/pos-admin`, workflows y estructura Remix.

La clasificación por extensión/directorio es orientativa; no equivale a revisión semántica de cada archivo.

**Decisión operativa:** no mergear ni rebasar el PR completo. Extraer cambios por dominio después de clasificar su vigencia frente a `main`.

## 4. Rama documental de Fase 4

La rama `docs/phase-4-reconciliation-plan` se creó desde `refactor/opcion-6`, no desde `main`. Comparada con `main`, está divergida: 76 commits ahead y 18 behind, con 300 archivos en el compare.

Por lo tanto:
- No abrir PR de esa rama ni mergearla.
- Conservarla como artefacto de auditoría.
- No asumir que sus propuestas D1-D4 son decisiones aprobadas.
- Cualquier contenido útil debe portarse selectivamente a una rama basada en el `main` actual, después de reconciliarlo con los documentos canónicos vigentes.

Esto corrige la suposición de la documentación anterior de que la rama documental podía utilizarse directamente para integrar la Fase 4.

## 5. Decisiones canónicas vigentes encontradas en main

Los archivos `PROJECT_CONTEXT.md`, `WORKFLOW.md` y `docs/DECISIONS-CURRENT.md` declaran como dirección aprobada:

1. Frontend unificado Remix 2.15; no mantener múltiples frontends activos.
2. NestJS como único backend de aplicación y autoridad para autenticación, autorización y aislamiento de tenants.
3. PostgreSQL accedido mediante Prisma desde NestJS; no acceso directo desde frontend.
4. Tres límites de experiencia: Customer, Business Operations y Platform Admin.
5. No confiar en tenantId/businessId enviado por el cliente.

Estos documentos tienen fecha de actualización 2026-11-03 y contienen referencias de ramas, SHAs y PRs que ya quedaron desactualizadas. No se modificaron durante esta auditoría.

**Riesgo documental:** el README de una rama histórica `refactor/opcion-6` no debe imponerse sobre las decisiones canónicas de `main`. La documentación histórica debe etiquetarse y actualizarse antes de utilizarse para decidir arquitectura.

## 6. Pull requests abiertos observados

| PR | Título | Head | Estado | Observación |
|---|---|---|---|---|
| #100 | Phase 1-8 multi-tenant migration | `refactor/opcion-6` | OPEN / dirty | 753 archivos; no integrar completo |
| #112 | Remix P1 frontend experience | `feat/remove-legacy-frontends` | OPEN | Sigue abierto; revisar relación con #113 |
| #113 | Remix P1 frontend experience | `feat/remix-p1-clean` | OPEN | 14 archivos; mergeable true, checks inestables |
| #114 | TypeScript 6 API compilation fixes | `fix/api-ts6-multer-ci` | OPEN | 4 archivos; checks inestables |
| #115 | Isolated CI recovery diagnostics | `diagnostic/ci-recovery-2026-11-04` | OPEN / draft | Diagnóstico aislado |
| #116 | Missing typecheck script + TS6 fixes | `chore/ci-recovery-integrated` | OPEN | 12 archivos; checks fallidos |

No se hizo merge, cierre ni modificación de PRs.

## 7. Evidencia CI inspeccionada

### PR #100 — Remix quality gates

Run asociado: https://github.com/fmonfasani/otrarondamas/actions/runs/41826704585

- Job `Remix quality gates`: FAILURE.
- Tests: 40 passed, 5 failed (45 total).
- Los 5 fallos están en `tests/auth.test.ts`.
- El mock espera `http://api.test/auth/me`, mientras el código llama `undefined/auth/validate` o `undefined/auth/login`.
- También fallan las expectativas de error para identidad Customer, servicio de autenticación no disponible y credenciales inválidas.
- Durante el cleanup de Git aparece: `No url found for submodule path 'worktrees/commerce-cart-order' in .gitmodules`.

Esto muestra incompatibilidad entre tests y contrato/configuración de autenticación en el head probado; no se presume cuál de los dos lados debe cambiar sin revisar la especificación vigente.

### PR #116 — CI recovery integrated

Runs observados: https://github.com/fmonfasani/otrarondamas/actions

- `Lint and Type Check`: FAILURE en TypeScript.
- Los logs muestran tipos Prisma no exportados (`Prisma.Decimal`, `DateTimeFilter`, `VentaWhereInput`, `ClienteUncheckedCreateInput`) y tipos `unknown/never` en servicios de ventas/tienda.
- El job Jest reportó 23/34 suites aprobadas y 11 fallidas; 288/339 tests aprobados y 51 fallidos.
- El job de verificación API fue cancelado después de completar instalación, generación Prisma, build y db push; no cuenta como suite completa aprobada.
- El intento de publicar comentario automático del workflow falló por permisos del token (`Resource not accessible by integration`).

**Conclusión:** PR #116 no está validado para merge. No equiparar generación/build exitosos con suite de tests aprobada.

### Otros runs

- CI Failure Diagnostic run 41826961645: SUCCESS; es diagnóstico, no prueba de que todos los gates del producto estén verdes.
- Daily Database Backup run 41802638072: FAILURE; investigar por separado antes de afirmar que hay backups recientes válidos.

## 8. Protección de main

La consulta del branch endpoint devuelve `protected: false` para `main`.

Esto significa que la API no reporta protección de rama habilitada. No se cambió la configuración. Es un riesgo de gobernanza: revisar branch protection/rulesets y requerir checks/review antes de permitir cambios directos.

## 9. Limitaciones de esta captura

Esta auditoría verificó datos remotos de GitHub. No verificó:
- El estado de los checkouts locales de Windows.
- Los archivos untracked, stashes o worktrees actuales del PC.
- El estado actual de `/opt/wapsell`, `/opt/wapsell-repo` ni otros repositorios de Hetzner.
- Contenedores, imágenes, volúmenes, base de datos, Nginx, DNS, certificados ni healthchecks actuales.

No se dispone de sesión SSH ni de una herramienta de terminal conectada al host de Hetzner en esta ejecución. Tampoco hay acceso directo al filesystem del PC del usuario. Esos estados quedan `NO VERIFICADO`.

## 10. Próximas acciones recomendadas

1. Capturar LOCAL con comandos estrictamente read-only: `git status`, branches, worktrees, stashes, remotes y refs.
2. Capturar HETZNER read-only: repos/SHAs/status, Docker inventory, mounts, compose projects, Nginx routes y healthchecks; redactar secretos.
3. Crear bundles/patches y verificar backups antes de cualquier cambio.
4. Clasificar los 753 cambios del PR #100 por funcionalidad vigente, duplicado, obsoleto, generado o conflicto.
5. Resolver PRs #112/#113/#114/#116 y CI con evidencia antes de definir integración.
6. Habilitar protección de `main` mediante decisión de gobernanza separada.

## 11. Criterio R0

**R0 GitHub: VERIFICADO.**  
**R0 completo: BLOQUEADO** hasta obtener evidencia de LOCAL y HETZNER.  
**Cambios de código, merges y despliegues: NO EJECUTADOS.**
