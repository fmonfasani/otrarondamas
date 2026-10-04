# WAPSELL — R8-INV-003 ASSESSMENT — PHYSICAL LOCATION MODEL

**Fecha:** 2026-10-03  
**Task:** R8-INV-003  
**Estado:** READY FOR OWNER DECISION  
**Implementation:** NOT AUTHORIZED

## 1. Objective

Determine the physical-model direction for Inventory Locations without inventing schema, ORM relations, migration mechanics or implementation details.

The conceptual rule is already closed by OR-B3/R4:

- Inventory uses a generic **Location** concept.
- A **MAIN** Location is the minimum conceptual requirement.
- A Business may have multiple Locations.
- No separate Branch/Warehouse conceptual model is introduced.
- Inventory remains Business-owned.

## 2. Canonical boundary already closed

The approved conceptual model is:

`Business → Location(s)`

with:

- one or more Locations permitted;
- at least one MAIN Location as the minimum operational concept;
- Location is generic and does not become Branch or Warehouse;
- Location does not change Business ownership of Inventory.

The exact physical persistence model remains OPEN.

## 3. AS-IS evidence

The inspected Prisma schema does not evidence a canonical physical Location model.

No inspected model/field was identified for:

- `Location`;
- `Ubicacion`;
- `Almacen`;
- `Deposito`;
- `locationId`;
- `ubicacionId`.

Current inventory structures remain centered on Business-scoped Product/Lote/MovimientoStock and do not expose an approved physical Location association.

This means the current AS-IS does not provide an existing Location model that can simply be preserved.

## 4. Transformation implication

Because there is no verified AS-IS Location entity, the transformation cannot honestly be described as a simple rename or adaptation of an existing model.

The physical Location model must therefore be introduced as a new TO-BE concept during a later authorized implementation/specification stage.

This assessment does not authorize its creation.

## 5. Owner decision required

### Decision A — Location ownership

**A1 — Business-scoped Location**

A Location belongs to exactly one Business and cannot be shared across Businesses.

**Recommendation: A1.**

This follows directly from the approved Business-owned Inventory boundary and application-level tenant isolation.

### Decision B — Location cardinality

**B1 — One MAIN minimum, multiple Locations permitted**

Each Business must be able to operate with a MAIN Location while permitting additional Locations.

**Recommendation: B1.**

This directly implements the already-approved OR-B3 conceptual rule without imposing a fixed maximum.

### Decision C — Location taxonomy

**C1 — Generic Location only**

Do not create separate Branch, Warehouse or Deposito concepts in the MVP.

**Recommendation: C1.**

This preserves the approved generic Location boundary.

### Decision D — Inventory association granularity

The current evidence does not determine whether physical stock should be associated to Location at:

- Product level;
- Lot level;
- Stock-balance level;
- Movement level;
- or another physical representation.

**Recommendation: D1 — leave association granularity OPEN for the specialized Inventory physical model.**

No physical relationship should be invented in this task.

### Decision E — MAIN semantics

**E1 — MAIN is a canonical conceptual role, not a separate entity type.**

A MAIN Location represents the Business's minimum/default operational location without creating a distinct physical model.

**Recommendation: E1.**

The exact uniqueness/enforcement rule for MAIN remains implementation detail.

## 6. Recommended owner ruling

The recommended controlled decision is:

| Decision | Recommendation |
|---|---|
| A | A1 — Business-scoped Location |
| B | B1 — MAIN minimum, multiple allowed |
| C | C1 — generic Location |
| D | D1 — stock association granularity remains OPEN |
| E | E1 — MAIN as conceptual role, not separate entity |

This closes only the physical-model direction that is supported by existing canonical decisions. It deliberately leaves the persistence representation and inventory association details for the specialized implementation specification.

## 7. Explicitly open after this task

Even if A1–E1 are accepted, the following remain OPEN:

- physical Location fields;
- physical Location identifier;
- Location-to-inventory association;
- Location-to-Lote association;
- Location-to-Movement association;
- MAIN uniqueness enforcement;
- Location lifecycle;
- activation/deactivation;
- deletion rules;
- historical movement behavior after Location changes;
- stock transfer between Locations;
- reservation interaction with Location;
- FEFO/FIFO interaction with Location;
- API contracts;
- migration/backfill;
- database constraints;
- transaction boundaries.

## 8. Evidence classification

- **DOCUMENTED:** generic Location concept.
- **DOCUMENTED:** MAIN minimum.
- **DOCUMENTED:** multiple Locations permitted.
- **DOCUMENTED:** no separate Branch/Warehouse conceptual model.
- **VERIFICADO POR CÓDIGO:** inspected Prisma schema does not evidence a Location/Ubicacion/Almacen/Deposito model or location identifier in the inspected inventory structures.
- **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE:** physical Location fields and stock association granularity.
- **NOT AUTHORIZED:** schema/code/migration implementation.

## 9. Gate

**R8-INV-003: READY FOR OWNER DECISION.**

The conceptual Location boundary is already approved. This assessment requests only the bounded physical-model direction above.

No code, schema, migration, data or infrastructure was modified.
