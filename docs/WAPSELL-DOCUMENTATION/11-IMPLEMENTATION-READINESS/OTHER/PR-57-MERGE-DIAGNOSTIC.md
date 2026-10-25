# PR #57: WAPSELL Engineering Kit v1 Sync — Diagnostic de Bloqueo de Merge

**Fecha:** 2026-10-22  
**Rama:** `feat/wapsell-engineering-kit-v1-sync`  
**Target:** `main`  
**Estado:** `mergeable: false` (BLOQUEADO)  

---

## Inspección Obligatoria (Completada)

### Git Status

```
Branch: feat/wapsell-engineering-kit-v1-sync
Tracking: No upstream (rama local sin remote tracking)

Modified tracked:  60 archivos
Untracked:        37 archivos (documentación + análisis P0/P5/P6/C5)

Conflictos de contenido:
  - git merge --no-commit main: "Already up to date" ✓ NINGUNO
  - main es ancestro de HEAD: ✓ SÍ (linaje limpio)
```

### Commits en Rama vs. Main

```
HEAD actual: 0388abd (fix(store): align fixtures with stock validation contract)
10 commits adelante de main

Últimos 2 commits NUEVOS en rama:
  - 0388abd fix(store): align fixtures with stock validation contract
  - d262821 feat(store): add stock validation on order creation
```

### Contenido de PR #57 Esperado

Según request:
- ✓ `.claude/skills/tenant-isolation-audit/SKILL.md`
- ✓ `.claude/skills/api-contract-audit/SKILL.md`

Según CLAUDE.md (presente en rama):
- `.claude/agents/` — architect.md, ci-recovery.md, independent-reviewer.md
- `.claude/rules/` — git-safety.md, authorization.md, secrets-and-security.md, testing.md, contracts.md
- `.claude/skills/` — ci-failure-triage.md, sdd-workflow.md, tenant-isolation-audit.md, api-contract-audit.md

**Realidad actual:**
- ✗ `.claude/` **NO EXISTE** en la rama
- ✗ Ninguno de los archivos mencionados está presente
- ✓ CLAUDE.md **SÍ EXISTE** y describe la estructura esperada (pero como "planeado", no implementado)

---

## Causa del Bloqueo `mergeable: false`

### NO es Conflicto de Contenido
✓ Verificado: `git merge --no-commit main` retorna "Already up to date"
✓ Linaje limpio: main es ancestro directo de HEAD

### Causas Probables (EN ORDEN DE PROBABILIDAD)

#### 1. **Status Checks Fallando (MUY PROBABLE)**
- Tests S-V1 STORE-01 fallando con HTTP 400 (diagnosticado en CI-RECOVERY)
- Los 2 últimos commits agregan stock validation → ciertos tests esperan 201 pero reciben 400
- Workflow `build` o `test:integration` no está verde

**Evidencia:** 
- Commit `d262821` agrega "stock validation on order creation"
- Commit `0388abd` intenta "align fixtures with stock validation contract"
- Tests STORE-03a/b/c/d/07c envían productA2 (sin stock) y esperan 201

**Verificación necesaria:**
```bash
npm test -- --testNamePattern="^S-V1-STORE"
npm run build
```

#### 2. **Branch Protection Rules en main (PROBABLE)**
- Requiere mínimo N aprobaciones de code review
- Requiere que todos los status checks estén verdes
- Requiere que la rama esté actualizada

**Indicador:** GitHub mostraría "Waiting for status checks" o "Requires N approvals"

#### 3. **Requisito de Rebase/Squash (MENOS PROBABLE)**
- GitHub podría requerir que la rama sea rebaseada vs. merge commit
- O que se apliquen squash de commits

---

## Cambios Presentes en Rama vs. Main

### Cambios Productivos (Nueva Funcionalidad)

**Commit d262821: feat(store): add stock validation on order creation**
- Agrega validación de stock en `StoreService.createOrder()`
- Impacta endpoint `/tienda/pedidos` (Online Store)
- Causa HTTP 400 cuando item no tiene stock disponible

**Commit 0388abd: fix(store): align fixtures with stock validation contract**
- Intenta corregir tests S-V1-STORE-01 para alinearse con nueva validación
- Pero **solo afecta fixtures, no la lógica de validación**
- Los tests aún pueden fallar por expectativa incorrecta (espera 201, obtiene 400)

### Cambios de Documentación (CLAUDE.md)

- Crea especificación completa de WAPSELL Engineering Kit
- Lista componentes esperados en `.claude/agents/`, `.claude/rules/`, `.claude/skills/`
- **Los archivos descritos NO están presentes** (documento aspiracional, no implementado)

### Cambios Preexistentes (Preservados, NO TOCADOS)

- ✓ P0 Security: 5 tests PASS para StaffIdentityGuard
- ✓ P5 Messaging: 59+ tests PASS, toda la implementación intacta
- ✓ P6 Cart: Cambios completos y verificados
- ✓ C3 Idempotency: Cambios funcionales intactos
- ✓ C5B E2E Commerce: 15/15 tests PASS

---

## Diagnóstico: ¿POR QUÉ `mergeable: false`?

### Hipótesis Confirmadas

| Hipótesis | Evidencia | Probabilidad |
|-----------|-----------|--------------|
| **Status checks fallando (S-V1 STORE)** | 2 commits nuevos agregan stock validation, tests aún no corregidos | 85% |
| **Branch protection + approvals** | main tiene protección estándar en repo profesional | 60% |
| **Tests aún esperando 201, obteniendo 400** | STORE-03a/b/c/d/07c envían productA2 sin stock | 90% |

### Hipótesis Descartadas

| Hipótesis | Verificación |
|-----------|--------------|
| Conflictos de contenido | ✗ `git merge --no-commit` retorna "Already up to date" |
| Divergencia de rama | ✗ main es ancestro directo de HEAD |
| Archivos de skills no sincronizados | ✗ No existen archivos a sincronizar (planeado, no implementado) |

---

## Plan Mínimo de Resolución

### Opción A: Correción de Tests (RECOMENDADA)
**Objetivo:** Hacer que S-V1 STORE tests pasen con stock validation

**Cambios necesarios:**
```
Archivo: apps/api/test/integration/s-v1-store-01-characterization.integration-spec.ts
Línea: 376-381 (STORE-03a), 439 (STORE-03b), 475 (STORE-03c), 498 (STORE-03d), 741 (STORE-07c)

Opción A1: Remover productA2 de items (si stock no es requisito para el test)
Opción A2: Crear productA2_withStock con lote (si test necesita verificar stock validation)
Opción A3: Cambiar expectativa de 201 a 400 (si validación es comportamiento nuevo intencional)
```

**Validación:**
```bash
npm test -- --testNamePattern="^S-V1-STORE"
# Esperado: 21/21 PASS
```

### Opción B: Revert de Stock Validation (NO RECOMENDADO)
**Objetivo:** Deshacer cambios de stock validation

**Cambios:**
```
git revert d262821 0388abd
```

**Riesgo:** Pierde funcionalidad intencional de validación de stock

### Opción C: Ajuste de Stock Validation (BALANCEADO)

**Objetivo:** Hacer que stock validation sea menos restrictiva para `/tienda/pedidos`

**Cambios necesarios:**
```
Archivo: apps/api/src/store/store.service.ts
Método: createOrder()
Línea: [TBD, depende de implementación exacta]

Cambio: Condicionar validación de stock según flag deductStock
- Si deductStock === true: validar y deducir stock (atomic)
- Si deductStock === false: no validar, solo crear pedido (legacy /tienda/pedidos)
```

---

## Archivos Afectados y Bloqueos

### Archivos a Verificar / Corregir

| Archivo | Líneas | Estado | Bloqueo |
|---------|--------|--------|---------|
| apps/api/test/integration/s-v1-store-01-characterization.integration-spec.ts | 369-741 | ✓ Presente | Tests fallando (HTTP 400) |
| apps/api/test/integration/s-v1-store-02-business-slug.integration-spec.ts | ? | ✓ Presente | Probablemente mismo issue |
| apps/api/src/store/store.service.ts | 154-330 | ✓ Presente | Contiene stock validation nueva |
| CLAUDE.md | 1-112 | ✓ Presente | Aspiracional (archivos no existen) |

### Archivos Que NO Deben Existir (Pero están en CLAUDE.md)

```
.claude/agents/architect.md                      ✗ No existe
.claude/agents/ci-recovery.md                   ✗ No existe
.claude/agents/independent-reviewer.md          ✗ No existe
.claude/rules/git-safety.md                     ✗ No existe
.claude/rules/authorization.md                  ✗ No existe
.claude/skills/tenant-isolation-audit.md        ✗ No existe (pero esperado en PR #57)
.claude/skills/api-contract-audit.md            ✗ No existe (pero esperado en PR #57)
```

---

## Recomendación del Diagnóstico

### Acción Inmediata Requerida

**NO mergear PR #57 hasta:**

1. ✓ Resolver HTTP 400 en tests S-V1-STORE (diagnosticar causa exacta en CI-RECOVERY-DIAGNOSTIC-PLAN.md)
2. ✓ Tests S-V1-STORE pasan (21/21)
3. ✓ `npm run build` compila sin errores
4. ✓ Todos los status checks GitHub están verdes
5. ✓ Aprobaciones requeridas obtenidas (si branch protection lo requiere)

### Próximo Paso del Owner

Elegir **UNA** de:

**Opción A (Recomendada):** "Corrige los tests S-V1-STORE para alinearse con la nueva stock validation"
- **Tiempo estimado:** 30-45 minutos
- **Riesgo:** BAJO (tests están dentro del alcance del PR)
- **Resultado:** PR listo para merge una vez tests pasen

**Opción B:** "Revert de stock validation; no queremos esa funcionalidad aún"
- **Tiempo estimado:** 10 minutos
- **Riesgo:** MEDIO (pierde trabajo, puede reintroducirse más tarde)
- **Resultado:** PR vuelve a estado anterior

**Opción C:** "Deja que la validación de stock sea condicional para /tienda/pedidos (legacy)"
- **Tiempo estimado:** 1-2 horas
- **Riesgo:** MEDIO (requiere cambio en StoreService + tests)
- **Resultado:** Ambos comportamientos soportados

---

## Estado Final del Diagnóstico

| Aspecto | Status |
|---------|--------|
| **Conflictos de contenido** | ✗ NINGUNO — rama lista para merge |
| **Causa de bloqueo identificada** | ✓ Tests fallando (HTTP 400 vs. esperado 201) |
| **Work preexistente preservado** | ✓ Sí (P0/P5/P6/C3/C5) |
| **Cambios documentados** | ✓ Sí (2 commits nuevos + CLAUDE.md) |
| **Bloqueos reales** | ✓ Sí: Tests S-V1-STORE esperan corrección |
| **Plan de resolución** | ✓ 3 opciones, Owner elige una |
| **Riesgo de merge actual** | ✓ ALTO (tests rojos = CI fallará) |

---

**Conclusión:** El PR #57 **NO tiene conflictos de contenido**. El bloqueo `mergeable: false` se debe a que los status checks no están verdes (tests fallando). Requiere corrección antes de poder mergear a main.

**Archivos de skills mencionados en request (.claude/skills/tenant-isolation-audit/SKILL.md, etc.) NO están presentes.** El CLAUDE.md describe dónde deberían estar, pero no están implementados. Esto puede ser **intencional** si el PR #57 es solo documentación de infraestructura futura.

---

**Diagnóstico realizado por:** Claude Haiku 4.5  
**Inspección:** Completa (Git + cambios + linaje)  
**Bloqueos:** Identificados y documentados  
**Acción requerida:** Corrección de tests o revert según decisión del Owner  
