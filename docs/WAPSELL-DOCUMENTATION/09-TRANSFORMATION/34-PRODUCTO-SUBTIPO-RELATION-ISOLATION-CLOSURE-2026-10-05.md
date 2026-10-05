# Producto.subtipo → Subtipo — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `Producto.subtipo → Subtipo`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/33-PRODUCTO-SUBTIPO-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.
**Con este slice quedan registradas las 4 ramas de Producto hacia el catálogo** (`familia`, `subfamilia`, `tipo`, `subtipo`); cada una con su propio slice y su propio veredicto.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `Producto: ['familia', 'subfamilia', 'tipo']` → `Producto: ['familia', 'subfamilia', 'tipo', 'subtipo']`, conservando las entradas existentes. Registry: 7 modelos, **14 relaciones**. Sin cambios de schema, migraciones, `MovimientoStock`, `Lote`, `Subtipo→Tipo`, `Tipo→Subfamilia` ni `Subfamilia→Familia`. Los tests y docs de `Producto.tipo` y `Producto.subfamilia` no se modificaron.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3subtipo`, registry sin `subtipo`)

`b3-producto-subtipo.integration-spec.ts`: **6 fallan, 2 pasan.** ST-02, ST-03, ST-05, ST-07 y el segmento P2025 de ST-08 recibieron `RESOLVED` (la escritura cross-Business persistió). ST-06 (destino inexistente) recibió `P2003`, la FK de BD, no `P2025`. ST-01 y ST-04 pasan.

### 2.2 Con el cambio, local `[E]`

Candidato 8/8, y ST-02, ST-03, ST-05, ST-06, ST-07 y ST-08 pasan **aislados** con `-t`. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; ProductoProveedor 6; Lote-Producto 8; Producto-Subfamilia 8; **Producto-Tipo 8**; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `bcc89b8` (`fix(b3): enforce Producto.subtipo relation ownership`) |
| Run | `37251097001` (run #22, *B3 Tenant Isolation Candidate*) |
| Job | `111578714578` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success; el paso de build pasó |

| Paso | Tests |
|---|---|
| Unit | 17 |
| B3 tenant isolation | 42 |
| Producto-Familia | 5 |
| Producto-Proveedor | 6 |
| Lote-Producto | 8 |
| Producto-Subfamilia | 8 |
| Producto-Tipo | 8 |
| **Producto-Subtipo (ST-01..ST-08)** | **8** |
| ISO-006 | 6 |
| Provider payment-return | 6 |
| DevolucionProveedorItem | 7 |
| **Total** | **121, 0 fallos** |

ST-01..ST-08 figuran individualmente como `✓` en el log del job.

## 3. ¿Existe garantía de persistence-layer independiente del controller?

No, antes del cambio. `verificarJerarquia` consulta el Subtipo directamente con el cliente scoped (la defensa más fuerte del controller sobre este FK), pero vive en el controller. El baseline `[E]` ejecuta el cliente scoped sin pasar por él y persiste un Producto de A con el Subtipo de B. Con el registry, esa misma ruta se rechaza con `P2025`. Las dos defensas son complementarias: el registry cubre la capacidad; la jerarquía cubre el encadenamiento de los 4 niveles, que el registry no verifica.

## 4. Diseño del candidato

- `codigoInterno` único por test y jerarquías A/B propias del spec; ningún test depende de filas de otro ni de counts globales.
- Los rechazos se afirman por **código**: `P2025` (ownership); ST-08 produce un `P2002` real y dos `P2025` reales, uno de ellos con **código duplicado y Subtipo ajeno a la vez**: el ownership check se evalúa antes que el unique y no queda enmascarado.
- El Producto cross-Business usa familia, subfamilia y tipo propios y **solo** el `subtipoId` ajeno: el único eje que puede fallar es `subtipo`.
- Cubre: create, update por FK escalar, `createMany` mixto, transacción positiva y con rollback, destino inexistente.

## 5. Procedencia de los commits

El fix, el spec, el paso de CI y el doc de auditoría 33 entraron juntos en `bcc89b8` (commit propio del slice, con pathspec explícito). No se reescribió historia. Este doc de cierre se commitea aparte, solo documentación, por lo que CI no se dispara.

## 6. Limitaciones

1. **`verificarJerarquia` ya protege el path HTTP `[C]`** (doc 33 §3). El registry cierra la capa de persistencia; no hay exploit HTTP demostrado ni spec de `createProducto`/`updateProducto`. Si esa validación debe conservarse como defensa en profundidad queda como decisión abierta (ND-4).
2. La integridad Subtipo→Tipo→Subfamilia→Familia depende de relaciones **no registradas** (`Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia`); no se evaluaron.
3. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, raw SQL, flujo HTTP real del controller.
4. **TOCTOU** del preflight: `[ND]`.
5. **Fuera de alcance y sin registrar:** `MovimientoStock.*` y las relaciones del propio árbol de catálogo.
6. La cobertura relacional **no** está completa según la decisión 51.
