# ReglaFidelizacion.subtipo → Subtipo — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `ReglaFidelizacion.subtipo → Subtipo`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/38-REGLAFIDELIZACION-SUBTIPO-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.
**Con este slice el registry queda en 8 modelos / 16 relaciones.** No autoriza `ReglaFidelizacion.familia/subfamilia/tipo` ni ninguna otra relación.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: se agrega `ReglaFidelizacion: ['subtipo']`, conservando las entradas existentes. Registry: 8 modelos, **16 relaciones**. Sin cambios de schema, migraciones, `verificarNivelesCatalogo`, otros servicios, otras relaciones, arquitectura ni Policy 51. Los tests y docs de los slices anteriores no se modificaron.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3rfsub`, registry sin `ReglaFidelizacion`)

`b3-reglafidelizacion-subtipo.integration-spec.ts`: **4 fallan, 3 pasan.** RF-P-02, RF-P-03 y RF-P-05 recibieron `RESOLVED` (la referencia cross-Business persistió, incluso dentro de transacción). RF-P-04 recibió `P2003` (FK de BD), no `P2025`. RF-P-01, RF-P-06 y RF-P-07 pasan (el servicio rechaza el ajeno con `NotFoundException`: la ruta estaba protegida, la capacidad no).

### 2.2 Con el cambio, local `[E]`

Candidato 7/7. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; Producto-Proveedor 6; Lote-Producto 8; Producto-Subfamilia 8; Producto-Tipo 8; Producto-Subtipo 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7; MovimientoStock-Producto 12. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `9b01777` (`fix(b3): enforce ReglaFidelizacion.subtipo relation ownership`) |
| Run | `37254637412` (run #24, *B3 Tenant Isolation Candidate*) |
| Job | `111588993941` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success; el paso de build pasó |

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
| **ReglaFidelizacion-Subtipo (RF-P-01..RF-P-07)** | **7** |
| **Total** | **140, 0 fallos** |

RF-P-01..RF-P-07 figuran individualmente en el log del job (paso en success, 7 passed).

## 3. ¿Existe garantía de persistence-layer independiente del registry?

No, antes del cambio. `verificarNivelesCatalogo` rechaza el `subtipoId` ajeno en la ruta del servicio, pero el baseline `[E]` persiste la referencia con el cliente scoped sin pasar por él. Con el registry, esa misma ruta se rechaza con `P2025`. RF-P-06/07 confirman que la protección de la ruta no cambió (sigue `NotFoundException`): las dos defensas son complementarias.

## 4. Diseño del candidato

- Nombre único por test; ningún conteo depende de filas de otro test.
- Los rechazos se afirman por **código**: `P2025` (ownership); RF-P-04 distingue `P2003` (baseline) de `P2025` (con fix).
- RF-P-06/07 (controles de ruta) usan los **servicios reales** (`crear`, `actualizar`) y pasan antes y después del fix.
- Cubre: create, update por FK escalar, transacción positiva implícita (RF-P-01/04 fuera de tx + RF-P-05 con rollback), destino inexistente, controles de no-regresión de la ruta.

## 5. Procedencia de los commits

El fix, el spec, el paso de CI y el doc de auditoría 38 entraron juntos en `9b01777` (commit propio del slice, con pathspec explícito). No se reescribió historia. Este doc de cierre se commitea aparte, solo documentación, por lo que CI no se dispara.

## 6. Limitaciones

1. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
2. **TOCTOU** del preflight: `[ND]`.
3. **Fuera de alcance y sin registrar:** `ReglaFidelizacion.familia/subfamilia/tipo` (mismos write paths, admisión propia pendiente), `MovimientoStock.*` restante y el resto del universo.
4. La cobertura relacional **no** está completa según la decisión 51.
5. El comentario `empresa-scope.extension.ts:33-37` sigue desactualizado: no tocado, reportado.
