# ReglaFidelizacion.subfamilia → Subfamilia — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `ReglaFidelizacion.subfamilia → Subfamilia`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/42-REGLAFIDELIZACION-SUBFAMILIA-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.
**Con este slice el registry queda en 8 modelos / 18 relaciones.** No autoriza `ReglaFidelizacion.tipo` ni ninguna otra relación.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `ReglaFidelizacion: ['subtipo', 'familia']` → `ReglaFidelizacion: ['subtipo', 'familia', 'subfamilia']`, conservando las entradas existentes. Registry: 8 modelos, **18 relaciones**. Sin cambios de schema, migraciones, `verificarNivelesCatalogo`, otros servicios, otras relaciones, arquitectura ni Policy 51. Los tests y docs de los slices anteriores no se modificaron.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3rfsf`, registry sin `ReglaFidelizacion.subfamilia`)

`b3-reglafidelizacion-subfamilia.integration-spec.ts`: **4 fallan, 3 pasan.** RS-F-02, RS-F-03 y RS-F-05 recibieron `RESOLVED` (la referencia cross-Business persistió, incluso dentro de transacción). RS-F-04 recibió `P2003` (FK de BD), no `P2025`. RS-F-01, RS-F-06 y RS-F-07 pasan (el servicio rechaza la ajena con `NotFoundException`: la ruta estaba protegida, la capacidad no).

### 2.2 Con el cambio, local `[E]`

Candidato 7/7. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; Producto-Proveedor 6; Lote-Producto 8; Producto-Subfamilia 8; Producto-Tipo 8; Producto-Subtipo 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7; MovimientoStock-Producto 12; ReglaFidelizacion-Subtipo 7; ReglaFidelizacion-Familia 7. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `e3f58f4` (`fix(b3): enforce ReglaFidelizacion.subfamilia relation ownership`) |
| Run | `37258074040` (run #26, *B3 Tenant Isolation Candidate*) |
| Job | `111599285493` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success; el paso de build pasó |

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
| ReglaFidelizacion-Familia | 7 |
| **ReglaFidelizacion-Subfamilia (RS-F-01..RS-F-07)** | **7** |
| **Total** | **154, 0 fallos** |

RS-F-01..RS-F-07 figuran individualmente en el log del job (paso en success, 7 passed).

## 3. ¿Existe garantía de persistence-layer independiente del registry?

No, antes del cambio. `verificarNivelesCatalogo` rechaza el `subfamiliaId` ajeno en la ruta del servicio, pero el baseline `[E]` persiste la referencia con el cliente scoped sin pasar por él. Con el registry, esa misma ruta se rechaza con `P2025`. RS-F-06/07 confirman que la protección de la ruta no cambió (sigue `NotFoundException`): las dos defensas son complementarias.

## 4. Diseño del candidato

- Nombre único por test; ningún conteo depende de filas de otro test.
- Los rechazos se afirman por **código**: `P2025` (ownership); RS-F-04 distingue `P2003` (baseline) de `P2025` (con fix).
- RS-F-06/07 (controles de ruta) usan los **servicios reales** (`crear`, `actualizar`) y pasan antes y después del fix.
- Cubre: create, update por FK escalar, transacción con rollback, destino inexistente, controles de no-regresión de la ruta.

## 5. Procedencia de los commits

El fix, el spec, el paso de CI y el doc de auditoría 42 entraron juntos en `e3f58f4` (commit propio del slice, con pathspec explícito). No se reescribió historia. Este doc de cierre se commitea aparte, solo documentación, por lo que CI no se dispara.

## 6. Limitaciones

1. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
2. **TOCTOU** del preflight: `[ND]`.
3. **Fuera de alcance y sin registrar:** `ReglaFidelizacion.tipo` (mismos write paths, admisión propia pendiente) y el resto del universo.
4. La cobertura relacional **no** está completa según la decisión 51.
5. El comentario `empresa-scope.extension.ts:33-37` sigue desactualizado: no tocado, reportado.
