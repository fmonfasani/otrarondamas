# Informe de pre-commit — reconciliación previa al versionado

**Fase:** 10-AUDIT · **Fecha:** 2026-09-28 · **Estado:** LISTO PARA REVISIÓN DEL OWNER
**Rama:** `deploy/otrarondamas-wapsell-com` · **Commit base:** `066bb91`
**Commit ejecutado:** **NINGUNO** — por instrucción explícita.

## Alcance de esta fase

Resolver CON-029 y CON-030, investigar TD-006 y TD-007, determinar qué entra a Git, y verificar que no haya cambios de código. **No** se avanzó TO-BE ni Transformation, **no** se modificó código, **no** se eliminó documentación.

---

## 1. CON-029 — RESUELTO (por exclusión, no por borrado)

Se agregó `*.lnk` a la sección `# OS` de `.gitignore`, junto a `Thumbs.db` y `.DS_Store`.

```
git check-ignore -v "docs/.../04-DECISIONS/Porfolio - Acceso directo.lnk"
→ .gitignore:31:*.lnk    (coincide)
```

El archivo **sigue en disco** (975 bytes, verificado). No se eliminó nada: la exclusión logra el objetivo real —que no entre al historial— sin tocar el árbol de trabajo. La regla cubre además el caso general a futuro.

---

## 2. CON-030 — YA ESTABA MITIGADO; mi registro inicial era incorrecto

**Corrección de mi propio trabajo previo.** Registré CON-030 como desorden documental sin haber leído los archivos. Al leerlos, los 7 "duplicados" resultaron ser **marcadores de reconciliación deliberados**, creados el 2026-09-28 bajo el identificador `GRF-05`, cada uno nombrando explícitamente a su gemelo poblado:

| Marcador vacío | Gemelo autoritativo |
|---|---|
| `01-FUNCTIONAL-CONFLICTS.md` | `01-TERMINOLOGY-CONFLICTS.md` |
| `02-DATA-CONFLICTS.md` | `02-ROLE-CONFLICT-MATRIX.md` |
| `03-ARCHITECTURAL-CONFLICTS.md` | `03-DOMAIN-MODULE-CONFLICTS.md` (CON-026, CON-027) |
| `04-ROLE-CONFLICTS.md` | `04-STATE-CONFLICTS.md` (CON-016, 017, 020, 022…025) |
| `05-STATE-CONFLICTS.md` | `05-BUSINESS-RULE-CONFLICTS.md` (CON-006, 007, 018, 019, 021, 023, 024) |
| `06-TERMINOLOGY-CONFLICTS.md` | `06-ASIS-TOBE-GAPS.md` |
| `07-OPEN-CONFLICTS.md` | `07-DECISION-REGISTER.md` (marcado `HISTORICAL`, `GRF-03`) |

Los marcadores declaran: *"Not deleted: the mandate requires preserving historical artifacts."*

**Impacto rebajado de MEDIO a BAJO. No requiere acción antes del commit.** Un renumerado sería cosmético y rompería las referencias cruzadas de los marcadores. Recomendación: dejar como está, citar por nombre de archivo y no por número.

---

## 3. TD-006 — investigado sin exponer credenciales

### Higiene de secretos: CORRECTA — riesgo descartado

Verificado sin volcar ningún valor:

| Verificación | Resultado |
|---|---|
| Archivos tipo `.env` trackeados en Git | **2, ambos `.example`**. Ningún `.env` real versionado |
| Cobertura de `.gitignore` | `.env`, `.env.local`, `.env.production`, `.env.*.local` |
| `POSTGRES_PASSWORD`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` en `.env.prod.example` | **0 caracteres** (medido por longitud, sin leer contenido) |
| `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` en `apps/api/.env.example` | `""` vacíos |
| `JWT_SECRET` en `apps/api/.env.example` | Placeholder de 19 chars, empieza con `super…` |

**No hay ningún secreto real filtrado en el repositorio.** Esta parte queda cerrada, no pendiente.

### Lo que sigue abierto

`apps/api/prisma/seed.ts:53` hashea una contraseña **literal en el código** con bcrypt (coste 10) y la aplica a **3 cuentas** (líneas 141, 157, 184). No se lee de variable de entorno: no hay forma de sembrar con otra sin editar el archivo.

**Sigue `NOT DETERMINABLE`** si esas cuentas existen en producción con esa contraseña. No se intentó autenticar contra el entorno real — probar credenciales contra producción no corresponde a una auditoría documental.

Acción sugerida, en orden: (1) confirmar contra la base de producción si esos 3 emails existen; (2) si existen, rotar; (3) parametrizar la contraseña del seed por variable de entorno.

---

## 4. TD-007 — elevado a `VERIFIED BY CODE`; el riesgo es real y más preciso

El AS-IS lo tenía como riesgo heredado sin verificar. **Verificado: es real, con alcance distinto al que sugería la formulación original.**

### Mecánica

Los tokens de cliente (`auth.cliente.service.ts:149-159`) llevan discriminador `type: 'cliente'` y **`permisos: []`**. `JwtAuthGuard` y `PermissionsGuard` son guards **globales** (`app.module.ts:51-52`). `jwt.strategy.ts:32` propaga `type`.

**Ningún guard verifica `type`.** El alcance lo define `permissions.guard.ts:26-28`:

```
if (!permisoRequerido) {
  return true; // Endpoint sin @RequierePermiso: solo exige autenticación.
}
```

### Consecuencia

Un endpoint **con** `@RequierePermiso` está protegido de facto (`permisos: []` nunca satisface el chequeo). Uno **sin** ese decorador acepta cualquier JWT válido, incluido uno de cliente.

El patrón real es que **las escrituras llevan el decorador y las lecturas no**. Lecturas de panel alcanzables por un token de cliente:

| Controller | Endpoints expuestos |
|---|---|
| `clientes.controller.ts` | `@Get()` :29, `@Get(':id')` :34 — **cartera de clientes** |
| `compras.controller.ts` | `proveedores`, `compras`, `compras/:id`, `.../pagos`, `.../devoluciones` — **costos y márgenes** |
| `inventario.controller.ts` | `stock`, `productos/:id/lotes`, `.../movimientos`, `alertas` |
| `caja.controller.ts` | `estado`, `movimientos` |
| `catalogo.controller.ts` | `@Get()`, `@Get(':id')` — impacto bajo, ya es público por diseño |

El aislamiento por `empresaId` **se mantiene** (los servicios reciben `user.empresaId`): no hay fuga entre empresas, la fuga es **de rol dentro de la misma empresa**. El dato sensible es comercial, no credenciales.

**Defensa que sí existe:** `legajo.cliente.controller.ts` (:96, :119) y `auth.cliente.controller.ts` validan `user.type !== 'usuario'` en línea. Son **2 de 18** controllers. El patrón correcto existe, pero no está aplicado sistemáticamente.

**No verificado:** si algún frontend expone estos endpoints, y si un atacante externo puede obtener un token de cliente. **No se ejecutó ninguna request contra un servidor.**

**No corregido** — es cambio de código, fuera de alcance.

---

## 5. Qué está listo para commit

### Total definitivo: **147 entradas**

Verificado por categoría el 2026-09-28. Una cifra intermedia de "141" que circuló en el análisis previo era incorrecta: no sumaba el `docs/README.md` nuevo ni contaba bien los modificados.

| Grupo | Entradas | Detalle |
|---|---|---|
| **A** | **138** | `.md` nuevos en `docs/WAPSELL-DOCUMENTATION/` — verificado que **ninguno existe en HEAD** |
| **B** | **6** | Borrados de `docs/*.md` (el otro lado de las 6 reubicaciones) |
| **C** | **2** | Modificados: `README.md` (+133/−83), `.gitignore` (+4) |
| **D** | **1** | Nuevo: `docs/README.md` |
| | **147** | **TOTAL** |

**Quedan fuera 104 entradas**, verificadas como **exclusivamente binarias o trabajo en curso**: `docs/Design/` (44 PNG/PDF), `assets/brand/` (44 PNG/JFIF/DOCX), `docs/WapSell docs/Idea/` (8 DOCX/XLSX), `docs/Funcional Analysis/` (2 DOCX), `docs/Research/` (1 PDF), y 5 borrados previos en `apps/pos-admin/` que ya estaban antes de esta sesión.

**Comprobación crítica: `0` archivos `.md` entre los excluidos.** No queda documentación fuera del commit.

### Grupo A — Documentación canónica (recomendado: commitear)

> **CORRECCIÓN ARITMÉTICA 2026-09-28 (verificación final).** Este informe declaraba
> **137** archivos. El número real es **138**. Causa: el conteo se ejecutó *antes* de
> escribir este propio informe, que quedó excluido de su propia cifra. Verificado por
> `find … -name "*.md" -type f | wc -l` → **138**, y
> `git status --porcelain --untracked-files=all` → **138**. Ambos coinciden.

**138 archivos, todos `.md`, 1.6 MB.** Cero binarios, cero archivos vacíos, cero `.lnk` (excluido).

```
docs/WAPSELL-DOCUMENTATION/     138 archivos .md
```

Incluye las 12 fases: gobernanza, inventario de fuentes (con los 7 originales en `SOURCES/HISTORICAL/`), SPEC canónica, conflictos, decisiones, AS-IS, Transformation, TO-BE, trazabilidad, anexos y auditorías.

**Escaneo de credenciales:** 6 archivos mencionan `password123` o nombres de claves. **Todos son documentación del riesgo, no filtraciones** — `password123` ya era público en el README anterior y en `seed.ts`, así que documentarlo no agrega exposición. Ningún secreto de producción aparece.

### Grupo B — Documentos históricos: 6 reubicaciones + 1 archivo nuevo

> **CORRECCIÓN 2026-09-28 (verificación final).** Este informe decía "los 7 documentos
> históricos" mientras su tabla enumeraba 6. **Ambas cifras eran correctas pero describían
> cosas distintas**, y mezclarlas era el error:
> - **7** archivos residen en `SOURCES/HISTORICAL/`.
> - **6** son *reubicaciones*: existían en `docs/` en HEAD y figuran como `D` en `git status`.
> - El **séptimo es `spec-modulos_ventas.md`** (SRC-007, 50.005 b), que **nunca estuvo
>   trackeado en `docs/`**. `git diff --diff-filter=D -- docs/` lista **6** borrados, no 7.
>   Entra al commit como **archivo nuevo**, no como movimiento.
>
> Cifra definitiva: **6 reubicaciones + 1 archivo histórico nuevo = 7 en `HISTORICAL/`.**

Los 6 reubicados aparecen como borrados de `docs/` porque el movimiento no fue commiteado. **Integridad verificada por hash SHA-1 de Git** (`git hash-object`), no solo por tamaño:

| Archivo | Bytes | SHA-1 (HEAD = destino) |
|---|---|---|
| `scaffolding-notas.md` | 145.906 | `2095c7ee069bfb389fa79537f68d71baaec5fb5e` |
| `SDD-especificacion-funcional-v0.1.md` | 41.762 | `6819f370a7c5edcc5d9ada71de0215917cd563de` |
| `prompt-scaffolding-opencode.md` | 28.796 | `58074601ebebb8adf1d9fb2e3f4aad7b7ce4fdab` |
| `spec-catalogo-productos.md` | 24.624 | `e52a61ac1c430388a58d3252975a83b862606c7e` |
| `criterios-diseno-dueno-D01-D19.md` | 14.789 | `0a76de27a78842f628482cf1da67f52cc09a392a` |
| `spec-login-roles.md` | 8.155 | `0e013c54b2645ae5265f14dfc342dc689347ad7b` |

**Los 6 hashes coinciden exactamente entre origen y destino: identidad byte a byte probada criptográficamente. No se pierde una línea.**

**Detección de rename:** Git **no** los mostrará como `R` en `git status` mientras los destinos sigan untracked — la detección de similitud opera sobre contenido ya indexado. Cuando ambos lados entren al índice en el mismo commit, `git log --follow` y `git show -M` reconstruirán el movimiento, porque los blobs son idénticos (mismo SHA-1). **No se requiere `git mv` ni ninguna acción correctiva.**

Los 6 borrados deben ir en el mismo commit que el Grupo A: commitear los borrados sin los destinos dejaría el repositorio sin esa documentación.

### Grupo C — README y `.gitignore` (recomendado: commitear)

| Archivo | Cambio |
|---|---|
| `README.md` | +129 / −83 — estado real, typo del título, 3 enlaces rotos eliminados |
| `docs/README.md` | nuevo — mapa de autoridad documental |
| `.gitignore` | +4 — `*.lnk` y `desktop.ini` (CON-029) |

---

## 6. Qué queda fuera, y por qué

### `.lnk` de Windows — excluido por `.gitignore`

Sigue en disco. No entra al historial.

### 186 MB de binarios — **decisión separada, no incluir en este commit**

| Ruta | Peso | Archivos |
|---|---|---|
| `assets/brand/` | **113 MB** | 44 |
| `docs/Design/` | **73 MB** | 44 |
| `docs/Research/` | 524 KB | 1 |
| `docs/Funcional Analysis/` | 60 KB | 2 |
| `docs/WapSell docs/` | 436 KB | 8 |

Logos individuales de 1–2 MB cada uno (`Otra_ronda_mas_logo_cuadrado_banner_promo.png` pesa 2.2 MB).

**Razones para no mezclarlos con el commit documental:**

1. **Git no versiona binarios eficientemente.** Cada reemplazo de un PNG de 2 MB guarda una copia completa. 186 MB hoy se vuelven un historial de varios GB con pocas iteraciones de diseño.
2. **Es irreversible en la práctica.** Sacar binarios del historial requiere reescribirlo (`filter-repo`), lo que rompe todos los clones.
3. **Es una decisión de infraestructura, no documental** — Git LFS, un bucket, o versionar solo los assets que el build consume.
4. **Mezclarlos arruina la revisabilidad** del commit que importa: 137 `.md` auditables quedarían sepultados bajo 88 binarios.

Los cinco grupos ya están inventariados como SRC-018…SRC-024, así que **no versionarlos ahora no los pierde de vista.**

Recomendación: commit documental primero; decidir los binarios después, por separado.

### Archivos ya borrados en el working tree al inicio

Los borrados de `apps/pos-admin/public/*.svg`, `apps/pos-admin/src/assets/*` y los 9 PNG `ChatGPT Image…` de `assets/brand/` **ya estaban** en `git status` antes de esta sesión. No los toqué ni los evalué: son trabajo tuyo en curso. **Decidí nada sobre ellos.**

---

## 7. Verificación de código

```
git diff --numstat -- apps/api/ packages/   →  (vacío)
```

**Cero cambios de contenido en código fuente.** Los únicos archivos trackeados que modifiqué son `README.md` y `.gitignore`.

Nota de proceso: el script `npm run lint --workspace=@otrarondamas/api` corre `eslint --fix`, o sea **muta código al validar**. En la sesión anterior reescribió dos DTOs de compras; se verificó que el contenido quedó idéntico. **No se volvió a ejecutar en esta fase** para no arriesgar cambios de código.

Estado de validaciones (sin cambios respecto a la auditoría previa): **0 tests** (no existe ninguno), lint de API **falla con 10 errores de indentación preexistentes**, typecheck **pasa** con 2 avisos de deprecación, build **no ejecutado**.

---

## 8. Riesgos abiertos después de esta fase

| # | Riesgo | Severidad | Estado |
|---|---|---|---|
| 1 | **CON-028** — la documentación canónica sigue sin versionar. Nada de esto es alcanzable por otro desarrollador hasta que se commitee. | **CRÍTICO** | OPEN — el commit está preparado, falta tu decisión |
| 2 | **TD-006** — 3 cuentas del seed con contraseña pública; si existen en producción, hay acceso Owner | ALTA | Parcial: secretos en Git descartados; estado en producción `NOT DETERMINABLE` |
| 3 | **TD-007** — lecturas de panel (cartera de clientes, costos de proveedores, caja) alcanzables con token de cliente | ALTA | **Verificado en código**, no corregido |
| 4 | **TD-001** — 0 tests, sin CI. Ningún cambio tiene red de seguridad | **CRÍTICA** | OPEN |
| 5 | **TD-002** — typo `"Roonda"` es clave `@unique` del `upsert` de `Empresa`; corregirlo sin migración duplica la empresa | ALTA | OPEN |
| 6 | 186 MB de binarios sin decisión de versionado | MEDIA | Pendiente, separado del commit documental |
| 7 | **TD-004** — `docs/pos-admin-files/` de vigencia desconocida (`INTEGRADO.md` y `COPIAR_ESTO_AHORA.txt` se contradicen) | MEDIA | `NOT DETERMINABLE` |
| 8 | Brechas de integridad de stock `AUD-D010-G01`…`G10` (oversell concurrente, 0 CHECK/TRIGGER en 17 migraciones) | ALTA | OPEN, sin corrección aprobada |
| 9 | Fases 02, 06, 07, 08 en `DRAFT` — requieren decisiones de producto abiertas | MEDIA | Fuera del alcance de esta fase |

**El riesgo nº1 es el único que esta fase dejó listo para cerrar.** Los demás requieren o una decisión tuya, o cambios de código que el protocolo prohíbe acá.

---

## 9. Mensaje de commit sugerido

Para el Grupo A + B + C en un solo commit:

```
docs: versionar documentación canónica de Wapsell y reconciliar el repositorio

Incorpora docs/WAPSELL-DOCUMENTATION/ al control de versiones (137
archivos .md): gobernanza, inventario de 24 fuentes, SPEC canónica,
32 conflictos, registro de decisiones, AS-IS verificado, Transformation,
TO-BE, trazabilidad y auditorías de evidencia en código.

Hasta ahora esa documentación existía solo en disco, sin trackear
(CON-028, CRÍTICO): los identificadores CON-*/DEC-*/SRC-* no eran
resolubles por ningún colaborador y el trabajo era vulnerable a
cualquier operación destructiva de Git.

Incluye la reubicación de los 7 documentos históricos de docs/ a
01-SOURCE-INVENTORY/SOURCES/HISTORICAL/ (verificados byte a byte,
sin pérdida de contenido), la reescritura del README con el estado
real del sistema en lugar del aspiracional, y un índice de autoridad
documental en docs/README.md.

Nuevos registros: CON-028…CON-032 (higiene del repositorio),
TD-001…TD-007 (deuda técnica), y auditorías 02 y 03.

Sin cambios de código.
```

Los binarios (`assets/brand/`, `docs/Design/`, 186 MB) quedan deliberadamente fuera: requieren una decisión de estrategia de versionado separada.
