# Producto.subfamilia → Subfamilia — RELATION ISOLATION CLOSURE — 2026-10-04

**Verdict (slice):** **VERIFIED WITH LIMITATIONS [E]** — solo para la relación `Producto.subfamilia → Subfamilia`.
**No es B3 globalmente VERIFIED.** Un slice verificado no equivale a B3 globalmente verificado.
**Política aplicada:** `03-DECISIONS/51-…` · **Auditoría previa:** `09-TRANSFORMATION/28-PRODUCTO-SUBFAMILIA-RELATION-OWNERSHIP-AUDIT-2026-10-04.md`.

---

## 1. Cambio de producción

Una línea en `apps/api/src/prisma/relation-ownership.ts`: `Producto: ['familia']` → `Producto: ['familia', 'subfamilia']`. Registry: 7 modelos, **12 relaciones**. Sin cambios de schema, migraciones ni de `Producto.tipo` / `Producto.subtipo`.

## 2. Evidencia

### 2.1 Baseline sin el cambio `[E]` (local, BD descartable `otrarondamas_b3sub`, HEAD `2e0c3ee`)

`b3-producto-subfamilia.integration-spec.ts`: **5 fallan, 3 pasan.** SP-02, SP-03, SP-04 y SP-05 recibieron `RESOLVED` (la escritura cross-Business persistió). SP-06 (destino inexistente) recibió `P2003`, la FK de BD, no `P2025`. SP-01, SP-07 y SP-08 pasan.

### 2.2 Con el cambio, local `[E]`

Candidato 8/8 (y cada test negativo pasa **aislado** con `-t`, sin dependencia de orden); unit 17; B3 tenant isolation 42; Producto-Familia 5; ProductoProveedor 6; Lote-Producto 8; ISO-006 6; provider payment-return 6; DevolucionProveedorItem 7; `nest build` sin errores.

### 2.3 CI `[E]`

| Dato | Valor |
|---|---|
| Commit | `a3e062908f39e49299520ae4ce937503c60c070b` (`fix(b3): enforce Producto.subfamilia relation ownership`) |
| Run | `37249161283` (run #20, *B3 Tenant Isolation Candidate*) |
| Job | `111573040145` (`b3-tenant-isolation`) — success; ningún paso con conclusión distinta de success |

| Paso | Tests |
|---|---|
| Unit | 17 |
| B3 tenant isolation | 42 |
| Producto-Familia | 5 |
| Producto-Proveedor | 6 |
| Lote-Producto | 8 |
| **Producto-Subfamilia (SP-01..SP-08)** | **8** |
| ISO-006 | 6 |
| Provider payment-return | 6 |
| DevolucionProveedorItem | 7 |
| **Total** | **105, 0 fallos** |

SP-01..SP-08 figuran individualmente como `✓` en el log del job.

## 3. Diseño del candidato

- `codigoInterno` único por test (sin colisión con `@@unique([empresaId, codigoInterno])`), sin dependencia de filas de otros tests (verificado por ejecución aislada).
- Los rechazos se afirman por **código**: `P2025` (ownership). SP-08 provoca un `P2002` real y demuestra que la aserción distingue los dos códigos; así un falso verde por colisión de unique (como el de PP-06 en ProductoProveedor) no es posible en este spec.
- Cubre: create y update por FK escalar, `createMany` mixto, transacción (rechazo con rollback del válido previo, y positivo con commit), destino inexistente.

## 4. Limitaciones

1. **La validación compensatoria `verificarJerarquia` ya protege el path HTTP si la cadena del catálogo está íntegra `[C]`** (doc 28 §3, §7). El registry cierra la capa de persistencia, no un exploit HTTP demostrado: no hay spec de `createProducto`/`updateProducto`.
2. La integridad de la cadena Subtipo→Tipo→Subfamilia→Familia depende de relaciones **no registradas** (`Tipo.subfamilia`, `Subtipo.tipo`, `Subfamilia.familia`); no se evaluaron.
3. **No cubierto `[E]`:** forma anidada y `connect`, `upsert`, `updateMany`, raw SQL, y el flujo HTTP real del controller.
4. **TOCTOU** del preflight: `[ND]`.
5. **Fuera de alcance y sin registrar:** `Producto.tipo`, `Producto.subtipo` (gap confirmado por el Red Team, pendiente de slices propios), `MovimientoStock`.
6. La cobertura relacional **no** está completa según la decisión 51 §9.

## 5. Observación operativa

Durante el slice otra sesión (Red Team) stasheó temporalmente mi edit sin commitear del registry (`RT-sensitivity-temp`) en el mismo working tree y lo restauró minutos después. No afectó el resultado: el commit `a3e0629` contiene la línea y CI lo ejecutó. Compartir el working tree entre sesiones puede invalidar ejecuciones locales en curso.
