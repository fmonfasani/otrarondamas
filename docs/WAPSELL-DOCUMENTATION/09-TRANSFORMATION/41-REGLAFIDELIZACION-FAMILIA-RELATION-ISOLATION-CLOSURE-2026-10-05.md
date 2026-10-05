# ReglaFidelizacion.familia → Familia — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `ReglaFidelizacion.familia → Familia`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/40-REGLAFIDELIZACION-FAMILIA-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.
**Con este slice el registry queda en 8 modelos / 17 relaciones.** No autoriza `ReglaFidelizacion.subfamilia/tipo` ni ninguna otra relación.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `ReglaFidelizacion: ['subtipo']` → `ReglaFidelizacion: ['subtipo', 'familia']`, conservando las entradas existentes. Registry: 8 modelos, **17 relaciones**. Sin cambios de schema, migraciones, `verificarNivelesCatalogo`, otros servicios, otras relaciones, arquitectura ni Policy 51. Los tests y docs de los slices anteriores no se modificaron.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3rffam`, registry sin `ReglaFidelizacion.familia`)

`b3-reglafidelizacion-familia.integration-spec.ts`: **4 fallan, 3 pasan.** RF-F-02, RF-F-03 y RF-F-05 recibieron `RESOLVED` (la referencia cross-Business persistió, incluso dentro de transacción). RF-F-04 recibió `P2003` (FK de BD), no `P2025`. RF-F-01, RF-F-06 y RF-F-07 pasan (el servicio rechaza la ajena con `NotFoundException`: la ruta estaba protegida, la capacidad no).

### 2.2 Con el cambio, local `[E]`

Candidato 7/7. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; Producto-Proveedor 6; Lote-Producto 8; Producto-Subfamilia 8; Producto-Tipo 8; Producto-Subtipo 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7; MovimientoStock-Producto 12; ReglaFidelizacion-Subtipo 7. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `74f478a` (`fix(b3): enforce ReglaFidelizacion.familia relation ownership`) |
| Run | `37257135469` (run #25, *B3 Tenant Isolation Candidate*) |
| Job | `111596536674` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success; el paso de build pasó |

| Paso | Tests |
|---|---|
| Unit | 17 |
| B3 tenant isolation | 42 |
| Producto-Familia | 5 |
| Producto-Proveedor | 6 |
| Lote-Producto | 8 |
| Producto-Subfamilia | 8 |
| Producto-Tipo | 8 |
| Producto-Subtipo | 8 |
| ISO-006 | 6 |
| Provider payment-return | 6 |
| DevolucionProveedorItem | 7 |
| MovimientoStock-Producto | 12 |
| ReglaFidelizacion-Subtipo | 7 |
| **ReglaFidelizacion-Familia (RF-F-01..RF-F-07)** | **7** |
| **Total** | **147, 0 fallos** |

RF-F-01..RF-F-07 figuran individualmente en el log del job (paso en success, 7 passed).

## 3. ¿Existe garantía de persistence-layer independiente del registry?

No, antes del cambio. `verificarNivelesCatalogo` rechaza el `familiaId` ajeno en la ruta del servicio, pero el baseline `[E]` persiste la referencia con el cliente scoped sin pasar por él. Con el registry, esa misma ruta se rechaza con `P2025`. RF-F-06/07 confirman que la protección de la ruta no cambió (sigue `NotFoundException`): las dos defensas son complementarias.

## 4. Diseño del candidato

- Nombre único por test; ningún conteo depende de filas de otro test.
- Los rechazos se afirman por **código**: `P2025` (ownership); RF-F-04 distingue `P2003` (baseline) de `P2025` (con fix).
- RF-F-06/07 (controles de ruta) usan los **servicios reales** (`crear`, `actualizar`) y pasan antes y después del fix.
- Cubre: create, update por FK escalar, transacción con rollback, destino inexistente, controles de no-regresión de la ruta.

## 5. Procedencia de los commits

El fix, el spec, el paso de CI y el doc de auditoría 40 entraron juntos en `74f478a` (commit propio del slice, con pathspec explícito). No se reescribió historia. Este doc de cierre se commitea aparte, solo documentación, por lo que CI no se dispara.

## 6. Limitaciones

1. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
2. **TOCTOU** del preflight: `[ND]`.
3. **Fuera de alcance y sin registrar:** `ReglaFidelizacion.subfamilia/tipo` (mismos write paths, admisión propia pendiente) y el resto del universo.
4. La cobertura relacional **no** está completa según la decisión 51.
5. El comentario `empresa-scope.extension.ts:33-37` sigue desactualizado: no tocado, reportado.
