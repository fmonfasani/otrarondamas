# WAPSELL — R8-INV-003 OWNER DECISION — PHYSICAL LOCATION MODEL

**Fecha:** 2026-10-03  
**Task:** R8-INV-003  
**Estado:** CLOSED — OWNER APPROVED

## Owner-approved decisions

- **A1:** Location is Business-scoped and belongs to exactly one Business.
- **B1:** Each Business has a MAIN Location as the minimum operational requirement and may have multiple Locations.
- **C1:** Location remains a generic concept; no separate Branch/Warehouse/Deposito conceptual entities are introduced in MVP.
- **D1:** The physical association between Location and Inventory remains OPEN for the specialized Inventory physical model.
- **E1:** MAIN is a canonical conceptual role of a Location, not a separate entity type.

## Explicitly OPEN

Physical fields and identifiers, inventory association granularity, Location↔Lot/Movement relations, MAIN uniqueness enforcement, lifecycle, activation/deactivation, deletion, historical movement behavior, stock transfers between Locations, reservation/Location interaction, FEFO/FIFO interaction, API contracts, migration/backfill, DB constraints and transaction boundaries.

**Implementation remains NOT AUTHORIZED.**
