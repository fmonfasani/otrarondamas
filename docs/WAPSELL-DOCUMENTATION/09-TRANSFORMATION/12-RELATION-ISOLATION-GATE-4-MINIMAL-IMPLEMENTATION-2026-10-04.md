# Relation Isolation — Gate 4 Minimal Implementation (Venta → VentaItem → Producto)

**Fecha:** 2026-10-04
**Estado:** GATE 4 — MINIMAL IMPLEMENTATION COMPLETED FOR ONE RELATION EDGE
**Tipo:** Transformation / Implementation Record
**Plan:** `10-RELATION-ISOLATION-CAPABILITY-TRANSFORMATION-PLAN-2026-10-04.md`
**Audit:** `11-RELATION-OWNERSHIP-AUDIT-2026-10-04.md`
**Contrato técnico:** `07-DESIGN/CONTRACTS/DOMAIN/28-B3-PERSISTENCE-ISOLATION-CONTRACT-CLOSURE-2026-10-04.md` (T01-02, T01-03)

## 1. Alcance de este incremento

Implementado: la relación **VentaItem → Producto** (FK `productoId` y `producto.connect`), tanto cuando VentaItem se escribe anidado desde Venta (`create` / `update`) como cuando se escribe directamente (`ventaItem.create/createMany/update/updateMany/upsert`).

**No implementado:** ninguna otra relación. La capability Relation Isolation **NO está completa**. B3 **NO está VERIFIED**. Gates 5–8 del plan siguen pendientes (Gate 5 queda cubierto solo para esta relación, ver §6).

## 2. Root cause `[C]`

`empresaScopeExtension` actúa solo sobre modelos con `empresaId` directo y solo sobre los argumentos de nivel superior. `Venta.create` recibe `empresaId` forzado, pero el payload anidado `ventaItems.create[].productoId` no se inspeccionaba: `VentaItem` no tiene `empresaId`, no figura en `MODELOS_CON_EMPRESA_ID`, y ningún FK se comparaba con la empresa efectiva. El único control existente era `VentasService.resolverItems` (prevalidación en el service), que depende de la disciplina del call-site y no protege la frontera de persistencia (ISO-008).

Prisma no ejecuta hooks `query` independientes para operaciones anidadas, pero el hook de nivel superior recibe el payload anidado completo; esa es la superficie que se usa.

## 3. Mecanismo `[C]`

| Archivo | Cambio |
|---|---|
| `apps/api/src/prisma/relation-ownership.ts` (nuevo) | Registro declarativo opt-in `RELACIONES_CON_OWNERSHIP` (hoy `VentaItem: ['producto']`) + recorrido del payload guiado por `Prisma.dmmf` que extrae las referencias a recursos relacionados (FK escalar, `{ set }`, `connect`) en `create`, `createMany`, `connectOrCreate`, `update`, `updateMany`, `upsert` anidados. Una relación registrada usada de una forma no verificable (`create`, `connectOrCreate`, `disconnect`, FK con valor desconocido) **falla cerrada**. |
| `apps/api/src/prisma/empresa-scope.extension.ts` | El hook `$allOperations` llama al recolector y, si hay referencias, verifica que cada recurso pertenezca a la empresa efectiva **antes** de `query(args)`. Recurso de otra empresa o inexistente → `P2025` (indistinguible, T01-02). Aplica a modelos con y sin `empresaId` directo. |
| `apps/api/src/prisma/relation-ownership.spec.ts` (nuevo) | Tests unitarios del recolector (sin BD). |
| `apps/api/test/integration/b3-tenant-isolation.integration-spec.ts` | Solo se **agregó** un `describe` con 8 tests. Los 6 tests previos del archivo (incluido TE-B3-001) **no se modificaron**. |

Reusabilidad (RI-07): proteger otra relación es agregar una entrada al registro; el recorrido, la verificación y la falla cerrada son los mismos. El Business Context sigue proviniendo del servidor (`forEmpresa(empresaId)`); el cliente no interviene.

No modificados: schema Prisma, migrations, seed, datos, auth/JWT, User/Membership, servicios de dominio, CI B4, TE-B3-001.

## 4. Cobertura de reglas RI

| Regla | Verificación | Test |
|---|---|---|
| RI-01 contexto del servidor define el scope | `[C]` `forEmpresa(empresaId)` + comparación contra `empresaId` de la clausura; sin uso de ningún `empresaId` del cliente para ownership relacional | todos los negativos |
| RI-02 sin vínculos cross-Business | `[T]` | TE-B3-001; RI-02 (hijo directo, `update` anidado) |
| RI-03 válido same-Business funciona | `[T]` | RI-03; RI-02 (positivo directo); RI-08 (positivo en tx) |
| RI-04 cross-Business falla cerrado | `[T]` | RI-04/RI-05; RI-04 `connect`; RI-05 mixto |
| RI-05 sin persistencia parcial | `[T]` | RI-04/RI-05, RI-05 mixto, RI-04 connect, RI-02 update, RI-08: conteo de Venta y VentaItem en BD = 0 |
| RI-06 sin fallback no-scoped | `[T]` | RI-06 (`connectOrCreate` rechazado) |
| RI-07 reusable | `[C]` registro + recolector genérico (DMMF); `[T]` unit del registro | `relation-ownership.spec.ts` |
| RI-08 contexto en transacciones | `[T][E]` solo para esta relación | RI-08 |

## 5. Evidencia ANTES / DESPUÉS

Entorno: PostgreSQL 15 (contenedor Docker local `postgres:15-alpine`), base descartable `otrarondamas_b3rel` creada para esta ejecución, `prisma db push` con el schema vigente. La base de desarrollo `otrarondamas` no se utilizó.

| | Resultado |
|---|---|
| **ANTES** (HEAD `ccdbdbc`, sin cambios) | Integración: 8 pasan, **1 falla** (TE-B3-001: la promesa se resolvió; Venta A + VentaItem → Producto B persistida). `[E]` |
| **ANTES** (extensión original + tests nuevos) | 8 fallan (TE-B3-001 + 7 negativos nuevos), 9 pasan (incluye el positivo RI-03, que ya funcionaba). Demuestra que los tests nuevos detectan el gap. `[E]` |
| **DESPUÉS** | Integración: **17/17 pasan**. Venta A + Producto B → `P2025`, 0 Venta y 0 VentaItem persistidos. Venta A + Producto A → persiste Venta y VentaItem. `[T][E]` |

Los totales de integración incluyen las 2 suites del runner e2e: `b3-tenant-isolation` (6 tests previos + 8 nuevos = 14) y `tenant-isolation` de B4 (3 tests).

Comandos (equivalentes a `b4-verification.yml`, con `DATABASE_URL` apuntando a la base descartable):

```
npm run prisma:generate --workspace=@otrarondamas/api
npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate
npm test --workspace=@otrarondamas/api -- --runInBand            # 2 suites, 17 tests: PASS
npm run test:e2e --workspace=@otrarondamas/api -- --runInBand    # 2 suites, 17 tests: PASS
npx eslint <4 archivos tocados>                                  # sin --fix: 0 errores
npx prettier --check <4 archivos tocados>                        # OK
```

Regresión: TE-ID-006, TE-ID-008, TE-ID-009, TE-B3-006, TE-B3-007 y la suite `tenant-isolation.integration-spec.ts` pasan tal cual. `[T][E]`

## 6. Gate 5 — persistence integrity (solo esta relación)

Un rechazo cross-Business deja sin cambios a Venta, VentaItem y al recurso externo, verificado por conteo directo en BD con el cliente base. El check ocurre antes de `query(args)`, por lo que no hay escritura que revertir; dentro de transacción, el rechazo propaga y la transacción no confirma. `[T][E]`

## 7. Limitaciones

1. **Visibilidad transaccional** `[E]` (spike): la verificación usa el cliente base en otra conexión y no ve filas **no confirmadas** de la transacción en curso. Un recurso relacionado creado en la misma transacción se rechazaría (falla cerrada, no abierta). No afecta a `VentasService.create` (los productos ya existen), pero es una restricción para usos futuros del registro.
2. **TOCTOU** `[ND]`: entre la verificación y la escritura no hay bloqueo. El `empresaId` de un Producto no tiene un flujo de cambio conocido; no se evaluó más allá de eso.
3. **Costo**: una consulta `findUnique` por recurso distinto referenciado.
4. **Sin garantía a nivel BD**: no hay FK compuesta; el aislamiento es de aplicación (R8-ARCH-002).
5. `VentasService.resolverItems` sigue como prevalidación compensatoria; no se retiró ni se modificó.

## 8. Hallazgos fuera de alcance (registrados, NO implementados)

1. **`npm run build` falla en HEAD** `[E]` (exit 1, antes y después de este incremento): `tsc` reporta un error de tipos en el test TE-B3-001 existente (`venta.create` sin `empresaId`, línea ~247). Jest lo ejecuta igual. El `Dockerfile` usa `npm run build`. No se tocó porque modificarlo equivale a editar TE-B3-001; requiere decisión.
2. **Otras aristas sin validar** `[C]`: `VentaItem.ventaId`, `VentaItem.reglaFidelizacionId`, `Venta.usuarioId`, `Venta.clienteId` y todas las demás relaciones de la matriz de `11-…` (PedidoItem, CompraItem, DevolucionProveedorItem, caja, pagos, etc.).
3. Los hallazgos adyacentes de `11-…` §8 (lista de modelos desactualizada, `LegajoService` sobre Prisma base, Legajo/DocumentoLegajo) permanecen sin cambios.
4. **Fricción de formato**: ESLint exige CRLF (`linebreak-style`) mientras `prettier --write` produce LF. Se normalizó a CRLF en el árbol de trabajo (git normaliza a LF en el índice).

## 9. Qué NO se afirma

- B3 no está VERIFIED ni la capability Relation Isolation está completa.
- La propiedad 12 de R8-ARCH-002 (verificación negativa cross-Business) no queda cumplida globalmente: solo se verificó negativamente esta arista.
- El resultado del workflow `b4-verification.yml` en GitHub Actions es `[ND]` hasta observarlo tras el push.
- Ninguna otra relación, modelo o dominio fue modificado.

## 10. Trazabilidad

| Elemento | Referencia |
|---|---|
| Trigger | TE-B3-001 (ISO-001 / ISO-002) |
| Contrato | T01-02, T01-03 |
| Plan | Gate 4 de `10-…`; RI-01…RI-08 |
| Matriz | fila "Venta → VentaItem → Producto" de `11-…`: CONFIRMED GAP → mitigado a nivel de persistencia |
