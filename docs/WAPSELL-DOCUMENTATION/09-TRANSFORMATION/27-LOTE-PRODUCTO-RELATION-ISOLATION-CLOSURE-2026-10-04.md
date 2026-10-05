# Lote.producto → Producto — RELATION ISOLATION CLOSURE — 2026-10-04

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `Lote.producto → Producto`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Auditoría previa:** `09-TRANSFORMATION/26-LOTE-PRODUCTO-RELATION-OWNERSHIP-AUDIT-2026-10-04.md`.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `Lote: ['producto'],`. Registry: 7 modelos, 11 relaciones. Ningún otro cambio de producción, schema ni migración.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3lote`, HEAD `72e794d`)

`b3-lote-producto.integration-spec.ts`: **5 fallan, 3 pasan.**
LP-02 (create cross-Business) **resolvió y persistió** un `Lote` de A con `productoId` de B; LP-03, LP-04, LP-05, LP-08 fallan. LP-01, LP-06, LP-07 pasan. LP-06 pasa por la FK de BD (existencia), no por el registry.

### 2.2 Con el cambio `[E]` local

Candidato 8/8; unit 17/17; B3 tenant isolation 42/42; Producto-Familia 5/5; ProductoProveedor 6/6; ISO-006 6/6; provider payment-return 6/6; DevolucionProveedorItem 7/7; `nest build` sin errores.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `ea436dc3c5b885df8a3088aa843f189eb975ccd6` (`fix(b3): enforce Lote.producto relation ownership`) |
| Run | `37248454391` (run #19, workflow *B3 Tenant Isolation Candidate*) |
| Job | `111570977656` (`b3-tenant-isolation`) — success |
| Pasos | build gate, db push, unit y las 7 suites de integración: todos success |

| Paso | Tests |
|---|---|
| Unit | 17 |
| B3 tenant isolation | 42 |
| Producto-Familia | 5 |
| Producto-Proveedor | 6 |
| **Lote-Producto (LP-01..LP-08)** | **8** |
| ISO-006 | 6 |
| Provider payment-return | 6 |
| DevolucionProveedorItem | 7 |
| **Total** | **97, 0 fallos** |

LP-01..LP-08 aparecen individualmente como `✓` en el log del job.

## 3. Cobertura real del slice

Cubierto `[E]` por el candidato: create y update por FK escalar, `createMany`, forma `$transaction` interactiva (rechazo y positivo), ausencia de persistencia parcial, destino inexistente.

## 4. Limitaciones

1. **El gap no es explotable desde el input de la API actual `[C]`.** El único write path productivo que escribe `Lote.productoId` (`recibirCompra`, `compras.service.ts:226`) deriva el valor de un `CompraItem` ya verificado; el DTO no lo recibe. El registry cierra la capa de persistencia ante write paths futuros o internos (defensa en profundidad). Esto cae en la clase "ownership derivado por servidor" de la decisión 51 §5; se admitió tras el análisis específico del doc 26 §5.1. **Punto abierto para el Owner:** si la política admite entradas sin vector productivo demostrado (doc 26 §5.1).
2. **`recibirCompra` no se ejecutó de punta a punta**: no hay spec. La compatibilidad se apoya en LP-07 (misma forma: `$transaction` + create con Producto confirmado) y en lectura de código `[C]`.
3. **No cubierto `[E]`**: forma anidada `producto.update({ lotes: { create } })`, `connect` (`producto: { connect }`), `upsert`, `updateMany`, raw SQL (el UPDATE de `inventario.service.ts:267` toca solo `cantidad` y no pasa por la extensión; su aislamiento es manual, cubierto por ISO-006 RAW-01..03).
4. **TOCTOU** del preflight (verificación en otra conexión): `[ND]`, igual que el resto del registry.
5. Los tests de create/update/transacción dependen de que el rechazo ocurra; el candidato afirma `rejects.toThrow()` y ausencia de persistencia, no el código de error (`P2025`). La procedencia del P2025 no se verificó en este slice.
6. **Fuera de alcance, no evaluado:** `MovimientoStock.lote`, `MovimientoStock.producto`, `Legajo`, ISO-009.

## 5. Estado de relaciones registradas tras este slice

`VentaItem` [producto, reglaFidelizacion], `PedidoItem` [producto, reglaFidelizacion], `CompraItem` [producto], `DevolucionProveedorItem` [producto, lote], `Producto` [familia], `ProductoProveedor` [producto, proveedor], `Lote` [producto] — **7 modelos, 11 relaciones**. Universo de referencia 75 `[D]` (doc 24). La cobertura relacional **no** está completa según la condición de la decisión 51 §9.

## 6. Documentación pendiente de propagación (no tocada)

Docs 23/24/29/30 y los documentos listados en doc 24 §H no se modificaron. El comentario de `empresa-scope.extension.ts:33-37` ("hoy solo VentaItem -> Producto") sigue desactualizado.
