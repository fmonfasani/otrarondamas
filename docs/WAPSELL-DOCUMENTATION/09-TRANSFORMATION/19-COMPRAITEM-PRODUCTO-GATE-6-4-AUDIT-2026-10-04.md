# CompraItem → Producto — Gate 6.4 Audit

**Fecha:** 2026-10-04  
**Estado:** AUDIT COMPLETED — TEST DESIGN REQUIRED  
**Gate:** 6 — Coverage Expansion  
**Slice:** 6.4 — CompraItem → Producto  
**Baseline:** 877f9c74398cc4418215ea89909e436726ddf161

## 1. Objective

Audit exclusively the relation CompraItem → Producto before any production change.

This audit does not modify production code, schema, migrations, seed, CI or tests.

## 2. Prisma model verified

The schema establishes:

    Compra
     ├── empresaId → Empresa.id
     └── items[] → CompraItem

    CompraItem
     ├── compraId → Compra.id
     └── productoId → Producto.id

    Producto
     └── empresaId → Empresa.id

CompraItem has no direct empresaId. Compra and Producto are tenant-owned directly.

Expected ownership:

    Business A
     └── Compra A
          └── CompraItem
               └── Producto A   ✓

    Business A
     └── Compra A
          └── CompraItem
               └── Producto B   ✗

## 3. Current relation registry

At the baseline the registry contains:

    VentaItem: ['producto', 'reglaFidelizacion'],
    PedidoItem: ['producto', 'reglaFidelizacion'],

It does not contain:

    CompraItem: ['producto']

This is a code observation [C], not yet a confirmed runtime gap.

Because the registry is opt-in, the generic relation-ownership mechanism does not automatically enforce CompraItem → Producto.

## 4. Actual write surface verified

ComprasService.crearCompra() performs:

1. scoped supplier lookup;
2. scoped lookup of all requested product IDs;
3. validation that every requested product exists in the effective Business;
4. nested Compra.create with items.create[].

The nested item contains productoId, cantidadPedida and costoUnitario.

This is the primary Gate 6.4 persistence surface.

The inspected service does not contain a direct CompraItem.create or CompraItem.createMany call, and does not expose a nested Compra.update for items. However, the available repository search did not provide sufficient repository-wide evidence to prove that no such write site exists elsewhere. Those global absences remain [ND].

recibirCompra() uses an interactive transaction, but it creates RecepcionCompra, Lote and MovimientoStock and updates existing CompraItem rows; it does not create a new CompraItem → Producto relation.

## 5. Service-level validation

crearCompra() resolves product IDs through the scoped Producto query and rejects requested IDs absent from the scoped result.

This is useful service-level protection, but it is not sufficient evidence of persistence-boundary protection. The Gate 6.4 question remains whether the persistence boundary itself rejects a CompraItem belonging to Compra A when it references Producto B.

## 6. Gap classification

Current classification:

**REQUIRES TEST — HIGH CONFIDENCE EXPOSURE**

Reasons:

- CompraItem → Producto is absent from the relation-ownership registry;
- Producto has direct tenant ownership;
- CompraItem has no direct empresaId;
- Compra has direct empresaId;
- the main nested write exists;
- service-level validation does not prove direct persistence-boundary enforcement.

The gap is not classified as CONFIRMED until PostgreSQL execution demonstrates the behavior.

## 7. Required test candidates

### C-01 — Positive same-Business nested create

Compra A → CompraItem → Producto A.

Expected: operation succeeds and the CompraItem persists referencing Producto A.

### C-02 — Negative nested create cross-Business

Compra A → CompraItem → Producto B.

Expected:

- operation rejects;
- the Compra created by the rejected operation does not remain;
- no CompraItem from the rejected operation remains;
- Producto B is unchanged.

All other relevant resources must belong to Business A.

### C-03 — Direct CompraItem.create, if applicable

Using Compra A:

    CompraItem.create(
      compraId = Compra A,
      productoId = Producto B
    )

Expected: reject and no item persists.

If there is no legitimate application write site, the test should still be considered only if the B3 methodology requires direct persistence-boundary coverage. No application surface is to be invented.

### C-04 — createMany, if applicable

Cross-Business product reference must reject without invalid persistence.

### C-05 — Mixed nested write

Compra A contains:

- Item 1 → Producto A;
- Item 2 → Producto B.

Expected: whole operation rejects and no rows from the rejected Compra remain.

### C-06 — Interactive transaction

Inside a transaction:

1. negative Compra A → Producto B;
2. verify rollback;
3. positive Compra A → Producto A;
4. verify persistence.

Expected: negative operation rejected/rolled back and positive operation succeeds.

## 8. Fixture requirements

Create dynamically:

- Business A;
- Business B;
- required User A;
- Supplier A;
- Producto A;
- Producto B.

The negative case must use Compra A, Supplier A and Producto A plus only Producto B as the cross-Business resource.

No hardcoded IDs.

## 9. Candidate mechanism

The existing reusable mechanism is directly applicable:

    RELACIONES_CON_OWNERSHIP
            +
    Prisma DMMF traversal
            +
    verificarOwnershipRelacional()

If execution confirms the gap, the minimal candidate fix is:

    CompraItem: ['producto']

No production change is authorized by this audit.

Rule:

**test first → classify → minimal fix only if confirmed → rerun → verify.**

## 10. Known limitations

Existing mechanism limitations remain:

1. preflight ownership queries use the base client and may not see uncommitted rows created inside the same transaction;
2. theoretical TOCTOU risk remains;
3. no equivalent database-level composite tenant FK guarantee exists;
4. registry coverage is opt-in;
5. repository-wide completeness of additional CompraItem write sites is not established by the available search result;
6. this slice does not close other CompraItem relations or global B3 coverage.

## 11. Evidence classification

### VERIFIED BY CODE [C]

- Compra has direct empresaId;
- CompraItem has compraId and productoId, but no direct empresaId;
- Producto has direct empresaId;
- CompraItem → Producto is absent from the registry;
- crearCompra() performs scoped product lookup before nested persistence;
- crearCompra() persists CompraItem through nested Compra.create;
- the generic DMMF relation-ownership mechanism exists.

### DOCUMENTED [D]

- relation isolation is being expanded incrementally;
- previous slices use the reusable registry mechanism;
- T-01 requires tenant-aware relation ownership.

### NOT DETERMINABLE [ND]

- whether another repository location contains direct CompraItem.create;
- whether another location contains CompraItem.createMany;
- whether another location performs nested Compra.update with item writes;
- whether an additional indirect persistence path exists outside the inspected service.

### NOT YET EXECUTED [ND]

- cross-Business persistence behavior;
- no-partial-persistence behavior;
- transaction behavior for this slice.

## 12. Gate 6.4 audit result

**AUDIT COMPLETED.**

Classification:

    CompraItem → Producto
            ↓
    REQUIRES TEST — HIGH CONFIDENCE EXPOSURE
            ↓
    PRODUCTION FIX NOT AUTHORIZED YET

### Controlled next step

Execute the applicable C-01…C-06 cases against disposable PostgreSQL.

If execution confirms the gap:

1. classify CONFIRMED GAP [E];
2. add only CompraItem: ['producto'];
3. rerun positive/negative cases;
4. verify persisted state and rollback;
5. record execution evidence;
6. close Gate 6.4.

If execution passes AS-IS:

1. record PASS [E];
2. make no production change;
3. close Gate 6.4;
4. select the next matrix candidate.

**No production code was changed by this audit.**
