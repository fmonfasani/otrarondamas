# B3 — RELATION OWNERSHIP COVERAGE POLICY v0.1 — OWNER DECISION — 2026-10-04

**Status:** OWNER-APPROVED (policy v0.1) — RECORDED
**Scope:** criterio de admisión al registry `RELACIONES_CON_OWNERSHIP` (`apps/api/src/prisma/relation-ownership.ts`).
**No autoriza:** registrar relaciones por sí misma; declarar B3 VERIFIED; cambios de schema, migraciones ni deploy.
**Origen del problema:** `09-TRANSFORMATION/24-RELATION-OWNERSHIP-COVERAGE-POLICY-AUDIT-2026-10-04.md` (OD-1..OD-6). Este documento no modifica ni reescribe los documentos 23, 24, 29 ni 30, ni ninguna decisión histórica.

**Convención de lectura.** La sección 1 es texto del Owner, transcrito. Las secciones 2–9 son la **operacionalización** de ese texto redactada por Claude para que la política sea aplicable; donde agrega precisión, está marcado. Cualquier punto de las secciones 2–9 que el Owner considere que excede su decisión debe corregirse en este documento; no se aplica por defecto como política más allá del texto de la sección 1.

---

## 1. Decisión del Owner (transcripción)

> `RELACIONES_CON_OWNERSHIP` no representa todas las relaciones hacia modelos tenant-owned. Representa las relaciones que requieren enforcement genérico de ownership porque su persistencia puede introducir una referencia cross-Business desde una superficie de escritura y no existe una garantía equivalente ya establecida.
>
> Las relaciones con ownership derivado por servidor, ownership heredado por el padre, destinos creados dentro de la misma transaction, modelos sin `empresaId`, raw SQL o validaciones específicas de dominio quedan sujetas a análisis específico y no se registran automáticamente.
>
> La condición de entrada de una relación al registry debe ser verificable mediante código + test y debe existir una estrategia de enforcement compatible con todos sus write paths conocidos.

La autorización asociada es únicamente para **implementar esta política documentalmente** y continuar con el siguiente slice. **No** autoriza registrar relaciones arbitrariamente.

## 2. Universo

Para esta política, el universo de relaciones candidatas es el de las relaciones con FK en el origen cuyo destino es un modelo con `empresaId` (excluyendo `Empresa`, que es la columna de scope misma).

- Cifra de referencia: **75** de 108 relaciones con FK `[D]` (doc 24 §1.2, derivada por parser de schema, no re-derivada aquí).
- El universo **no es** el registry. El registry es un subconjunto del universo (hoy 10 relaciones antes de este slice; 11 después de Lote → Producto).
- Estar en el universo no implica entrar al registry (sección 4).

## 3. Fundamento

1. El mecanismo (Prisma Client Extension + preflight de ownership) ya fue aprobado por R8-ARCH-002; lo que estaba abierto era **su extensión** (doc 24, OD-1/OD-2).
2. Registrar una relación tiene un costo: falla cerrado ante formas no verificables y puede afectar flujos legítimos (doc 24, inferencia B-4). Registrarla sin necesidad es riesgo sin beneficio.
3. No registrar una relación que sí lo necesita deja un bypass cross-Business en la capa de persistencia.
4. Por eso la entrada se rige por una condición verificable y no por un criterio de volumen.

## 4. Qué entra al registry

Una relación entra si **se cumplen todas**:

| # | Condición | Fuente |
|---|---|---|
| E-1 | Su persistencia **puede introducir una referencia cross-Business desde una superficie de escritura** (operación de modelo interceptable por la extensión: `create`, `update`, `updateMany`, `createMany`, `upsert`, o forma anidada). | Owner §1 |
| E-2 | **No existe una garantía equivalente ya establecida** en la capa de persistencia para esa relación. | Owner §1 |
| E-3 | Es una relación de FK simple (una columna) cuyo destino tiene `empresaId` directo. | Restricción técnica del mecanismo `[C]` (`relation-ownership.ts` `relacionesRegistradas`; extensión del preflight) — precisión de Claude |
| E-4 | Existe una estrategia de enforcement **compatible con todos sus write paths conocidos** (ver sección 8). | Owner §1 |

## 5. Qué queda fuera del registry (sujeto a análisis específico)

Las siguientes clases **no se registran automáticamente**. No quedan excluidas para siempre: quedan sujetas a análisis específico y pueden entrar si el análisis demuestra E-1..E-4.

| Clase | Qué significa |
|---|---|
| Ownership derivado por servidor | El FK no proviene del input del cliente sino de una lectura previa del servidor. |
| Ownership heredado por el padre | El hijo no tiene ownership propio; lo hereda de su padre. |
| Destinos creados dentro de la misma transaction | El destino todavía no es visible para el preflight (ver 6.1). |
| Modelos sin `empresaId` | El preflight exige `empresaId` directo en el destino. |
| Raw SQL | No pasa por la extensión (ver 6.4). |
| Validaciones específicas de dominio | Una validación en el servicio ya cubre la relación (ver 6.3). |

## 6. Tratamiento de los casos particulares

### 6.1 Destinos creados dentro de la misma transaction
El preflight lee con el cliente base (otra conexión) y por eso **no ve filas no confirmadas** de la transacción en curso `[C]`. Registrar una relación cuyo destino se crea en la misma transacción provocaría un rechazo falso (P2025). Esas relaciones requieren una estrategia distinta (p. ej. verificación posterior o por construcción) y se analizan una a una. El hecho de que **otro** write path de la misma relación apunte a destinos ya confirmados no basta: E-4 exige compatibilidad con **todos** los write paths conocidos.

### 6.2 FK derivado por servidor
Que el FK sea derivado por el servidor **reduce** el riesgo pero **no lo demuestra nulo**: la garantía vive en el código del servicio, no en la capa de persistencia. Se analiza específicamente: (a) de dónde sale el valor; (b) si esa fuente está ella misma verificada; (c) si existe o puede existir otro write path que no la derive. El resultado del análisis, no la clasificación, decide la entrada. Una relación derivada por servidor solo entra si el análisis documenta por qué E-1/E-2 igualmente se cumplen.

### 6.3 Validaciones compensatorias
Una validación en el servicio (por ejemplo `verificarJerarquia`) es una garantía **de aplicación**, no necesariamente **equivalente** al enforcement de la capa de persistencia. Es "equivalente" (y por lo tanto E-2 falla) únicamente si se demuestra que cubre **todos** los write paths de la relación, incluidos los de la capa de persistencia accesibles desde el cliente scoped. Una validación que cubre solo el path principal no cumple E-2. Esta decisión no resuelve OD-6 de doc 24 (coexistencia registry/validación) más allá de este criterio.

### 6.4 Raw SQL
`$executeRaw` y `$queryRaw` **no** son interceptados por la extensión `[C]`. El registry no puede proteger ni verificar escrituras raw. Su aislamiento es manual (cláusula `empresaId` en el SQL) y se verifica con tests específicos de la superficie raw (por ejemplo, ISO-006 RAW-01..03), nunca asumiendo cobertura del registry.

## 7. Condición de admisión

Una relación se **admite** en el registry cuando, para esa relación, el análisis específico documenta E-1..E-4 y la condición de evidencia (sección 8) está satisfecha o programada en el mismo slice. La admisión se hace de a una relación por slice. Cada admisión debe quedar documentada en un documento de auditoría del slice antes del cambio de código.

## 8. Condición de evidencia

Para que una relación entre y para que se considere verificada:

1. **Código `[C]`**: la entrada en el registry + los write paths conocidos relevados con ubicación exacta (archivo y línea).
2. **Test `[T]`**: un candidato aislado que, como mínimo, cubra: create mismo-Business (positivo), create cross-Business (rechazo y sin persistencia), update cross-Business, forma transaccional, ausencia de persistencia parcial, destino inexistente.
3. **Ejecución `[E]`**: el candidato se ejecuta **primero sin el cambio de producción** (para demostrar el gap, o para registrar que no existe) y luego con él, y corre en CI junto con las suites de regresión.
4. **Compatibilidad con todos los write paths conocidos**: se demuestra, por ejecución o por análisis explícitamente marcado `[C]`/`[ND]`, que los write paths legítimos conocidos no se rompen. Lo que no se pudo ejecutar se declara como límite, no se asume.

Un slice verificado **no equivale** a B3 globalmente verificado.

## 9. Condición de completitud

Esta política **no** fija una cifra objetivo ni declara condición de salida de B3. Define cuándo la cobertura relacional puede *considerarse completa* para efectos de B3:

- cada relación del universo (sección 2) está en uno de dos estados documentados: **(a)** registrada con evidencia `[T]`+`[E]`; o **(b)** no registrada, con análisis específico documentado que indica a cuál clase de la sección 5 pertenece y por qué E-1/E-2 no se cumplen;
- ninguna relación queda en estado "sin análisis".

Hasta que eso ocurra, la cobertura relacional **no** se considera completa y B3 **no** puede declararse VERIFIED por este eje. La cifra de relaciones restantes del universo no se computa en este documento. Si la propia política debe fijar un porcentaje o un listado priorizado, es una decisión adicional del Owner.

## 10. Lo que este documento no hace

- No registra ninguna relación (la primera aplicación es el slice Lote → Producto, documentado aparte en `09-TRANSFORMATION/26-…` y `27-…`).
- No modifica decisiones históricas ni los documentos 23, 24, 29, 30.
- No declara B3 VERIFIED, ni ningún invariant `ISO-*` VERIFIED.
- No propaga la política a contratos, invariants, tests/evals ni a los comentarios de código (propagación listada en doc 24 §H, pendiente de autorización).
- No resuelve OD-3 ni OD-4 de doc 24 más allá de lo escrito en secciones 5 y 9.
