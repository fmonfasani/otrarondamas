# Producto.tipo → Tipo — RELATION ISOLATION CLOSURE — 2026-10-05

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `Producto.tipo → Tipo`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/30-PRODUCTO-TIPO-RELATION-OWNERSHIP-AUDIT-2026-10-05.md`.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `Producto: ['familia', 'subfamilia']` → `Producto: ['familia', 'subfamilia', 'tipo']`. Registry: 7 modelos, **13 relaciones**. Sin cambios de schema, migraciones, `Producto.subtipo`, `MovimientoStock` ni `Lote`.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3tipo`, registry sin `tipo`)

`b3-producto-tipo.integration-spec.ts`: **6 fallan, 2 pasan** (ejecutado dos veces, mismo resultado). TP-02, TP-03, TP-05, TP-07 y el segmento P2025 de TP-08 recibieron `RESOLVED` (la escritura cross-Business persistió). TP-06 (destino inexistente) recibió `P2003`, la FK de BD, no `P2025`. TP-01 y TP-04 pasan.

### 2.2 Con el cambio, local `[E]`

Candidato 8/8, y TP-02, TP-03, TP-05, TP-06, TP-07 y TP-08 pasan **aislados** con `-t`. Regresiones: unit 17; B3 tenant isolation 42; Producto-Familia 5; ProductoProveedor 6; Lote-Producto 8; Producto-Subfamilia 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7. `nest build` exit 0.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `bcaeadcb749298be24f18a9a708f75ea319364d2` |
| Run | `37249813759` (run #21, *B3 Tenant Isolation Candidate*) |
| Job | `111574995363` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success |

| Paso | Tests |
|---|---|
| Unit | 17 |
| B3 tenant isolation | 42 |
| Producto-Familia | 5 |
| Producto-Proveedor | 6 |
| Lote-Producto | 8 |
| Producto-Subfamilia | 8 |
| **Producto-Tipo (TP-01..TP-08)** | **8** |
| ISO-006 | 6 |
| Provider payment-return | 6 |
| DevolucionProveedorItem | 7 |
| **Total** | **113, 0 fallos** |

TP-01..TP-08 figuran individualmente como `✓` en el log del job.

## 3. Procedencia de los commits (aclaración)

El slice no quedó en un commit propio. En el mismo working tree trabajaba otra sesión, que incorporó mis archivos pendientes a sus propios commits antes de que yo commiteara:

- `f7fcc49` ("Block 3, Isolation, Prisma resitence raw sql product audit"): el cambio del registry y `b3-producto-tipo.integration-spec.ts`, junto con 14 documentos de auditoría ajenos al slice.
- `815469f` ("isolation tenant candidate"): el paso de CI "Run Producto-Tipo candidate".
- `bcaeadc` ("fix(b3): enforce Producto.tipo relation ownership"): solo el doc de auditoría 30, a pesar de su mensaje.

Los tres ya estaban en el remoto cuando se verificó el estado. El contenido del slice (registry, spec, workflow, doc 30) es el mismo que ejecuté y validé; el run #21 corre sobre `bcaeadc`, que incluye todo. No se reescribió historia.

## 4. Diseño del candidato

- `codigoInterno` único por test y jerarquías A/B propias del spec; ningún test depende de filas de otro ni de counts globales (cada `count` filtra por el `codigoInterno` del propio test).
- Los rechazos se afirman por **código**: `P2025` (ownership); TP-08 produce un `P2002` real y un `P2025` real en el mismo test.
- El Producto cross-Business usa familia, subfamilia y subtipo propios y **solo** el `tipoId` ajeno, de modo que el único eje que puede fallar es `tipo`.
- Cubre: create, update por FK escalar, `createMany` mixto, transacción positiva y con rollback, destino inexistente.

## 5. Limitaciones

1. **`verificarJerarquia` ya protege el path HTTP si la cadena del catálogo está íntegra `[C]`** (doc 30 §3). El registry cierra la capa de persistencia; no hay un exploit HTTP demostrado ni spec de `createProducto`/`updateProducto`. Si esa validación debe conservarse como defensa en profundidad queda como decisión abierta (ND-4).
2. La integridad Subtipo→Tipo→Subfamilia→Familia depende de relaciones **no registradas** (`Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia`); no se evaluaron.
3. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, raw SQL, flujo HTTP real del controller.
4. **TOCTOU** del preflight: `[ND]`.
5. **Fuera de alcance y sin registrar:** `Producto.subtipo` (gap confirmado por el Red Team; slice propio pendiente de autorización), `MovimientoStock`.
6. La cobertura relacional **no** está completa según la decisión 51.
