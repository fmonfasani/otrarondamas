# MovimientoStock.producto → Producto — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `MovimientoStock.producto → Producto`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/36-MOVIMIENTOSTOCK-PRODUCTO-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.
**Con este slice el registry queda en 7 modelos / 15 relaciones**; `MovimientoStock.producto` era la única relación con E-1..E-4 cumplidos pendiente de registro.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: se agrega `MovimientoStock: ['producto']`, conservando las entradas existentes. Registry: 7 modelos, **15 relaciones**. Sin cambios de schema, migraciones, `MovimientoStock.lote`, `MovimientoStock.recepcionCompra`, ni otras relaciones. Los tests y docs de los slices anteriores no se modificaron.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3msprod`, registry sin `MovimientoStock`)

`b3-movimientostock-producto.integration-spec.ts`: **5 fallan, 7 pasan.** MS-P-02, MS-P-03 y MS-P-05 recibieron `RESOLVED` (la referencia cross-Business persistió, incluso dentro de transacción). MS-P-06 y MS-P-12 recibieron `P2003` (FK de BD), no `P2025`. MS-P-01, MS-P-04, MS-P-07, MS-P-08, MS-P-09, MS-P-10 y MS-P-11 pasan.

Nota: MS-P-10 pasa también sin el fix porque el `items.create` anidado de `crearDevolucion` ya atraviesa la relación registrada `DevolucionProveedorItem.producto` (doc 36 §2) — la protección observada vive ahí, no en `MovimientoStock.producto`.

### 2.2 Con el cambio, local `[E]`

Candidato 12/12. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; Producto-Proveedor 6; Lote-Producto 8; Producto-Subfamilia 8; Producto-Tipo 8; Producto-Subtipo 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `eb18a75` (`fix(b3): enforce MovimientoStock.producto relation ownership`) |
| Run | `37252722322` (run #23, *B3 Tenant Isolation Candidate*) |
| Job | `111583468366` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success; el paso de build pasó |

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
| **MovimientoStock-Producto (MS-P-01..MS-P-12)** | **12** |
| **Total** | **133, 0 fallos** |

MS-P-01..MS-P-12 figuran individualmente como `✓` en el log del job.

## 3. ¿Existe garantía de persistence-layer independiente del registry?

No, antes del cambio. Los cuatro write paths derivan el `productoId` de lecturas scoped o del DTO, pero ninguna verificación de ownership cubría `MovimientoStock.producto` en la capa de persistencia: el baseline `[E]` persiste referencias cross-Business con el cliente scoped. Con el registry, esas rutas se rechazan con `P2025`. Las validaciones de servicio (p. ej. `resolverItems` en ventas) siguen siendo complementarias, no redundantes.

## 4. Diseño del candidato

- Motivo único por test (`B3MS-<id>-<suffix>-<n>`); ningún conteo depende de filas de otro test.
- Los rechazos se afirman por **código**: `P2025` (ownership); MS-P-06/MS-P-12 distinguen `P2003` (baseline) de `P2025` (con fix).
- MS-P-07/08/09/11 ejercitan los **servicios reales** (`registrarAjuste`, `recibirCompra`, `crearDevolucion`, `descontarStock`), no solo llamadas directas al registry.
- MS-P-10 documenta la interacción con `DevolucionProveedorItem.producto`: el flujo de devolución con `productoId` ajeno ya era rechazado antes del fix por esa vía; con el fix el veredicto es idéntico (P2025 + rollback total).
- Cubre: create, update por FK escalar, `createMany` (no existe write path — no aplica), transacción positiva y con rollback, destino inexistente, y los cuatro write paths productivos (W-1..W-4).

## 5. Procedencia de los commits

El fix, el spec, el paso de CI y el doc de auditoría 36 entraron juntos en `eb18a75` (commit propio del slice, con pathspec explícito). No se reescribió historia. Este doc de cierre se commitea aparte, solo documentación, por lo que CI no se dispara.

## 6. Limitaciones

1. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
2. **TOCTOU** del preflight: `[ND]`.
3. Deriva doc/código en el comentario de `crearDevolucion` (afirma validación lote↔producto no encontrada en el código): reportada en doc 36 §3, no resuelta.
4. **Fuera de alcance y sin registrar:** `MovimientoStock.lote` (E-4 NO, BLOCKED), `MovimientoStock.recepcionCompra`, `MovimientoStock.usuario` y el resto del universo.
5. La cobertura relacional **no** está completa según la decisión 51 (47 pendientes de análisis individual tras este slice).
6. El comentario `empresa-scope.extension.ts:33-37` sigue desactualizado (“hoy solo VentaItem → Producto” con 15 registradas): no tocado, reportado.
