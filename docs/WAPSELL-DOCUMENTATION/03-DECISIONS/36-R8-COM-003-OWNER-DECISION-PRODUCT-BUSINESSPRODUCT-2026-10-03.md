# WAPSELL — R8-COM-003 OWNER DECISION — PRODUCT / BUSINESSPRODUCT PHYSICAL ALLOCATION

**Fecha:** 2026-10-03  
**Task:** R8-COM-003  
**Decision:** CLOSED — OWNER APPROVED DIRECTION  
**Implementation:** NOT AUTHORIZED

## 1. Owner ruling

The Owner accepts the recommended physical allocation direction:

`Product (global identity) → BusinessProduct (Business-specific commercial configuration)`

The transformation must separate global product identity from Business-specific commercial configuration without requiring an immediate destructive migration.

## 2. Product — global identity

The global Product represents the product identity and reusable descriptive/catalog identity.

Conceptually global attributes include:

- identity;
- canonical name/description;
- global media/identification where applicable;
- product classification identity where classification is itself global.

The exact field list remains subject to the specialized Commerce specification.

## 3. BusinessProduct — Business-specific configuration

BusinessProduct represents how a Business commercially uses/offers the Product.

Business-specific concerns include, at minimum conceptually:

- Business ownership/availability;
- SKU or Business-specific commercial code where applicable;
- price(s);
- visibility/active status;
- Business-specific pricing configuration;
- Business-specific commercial attributes.

Stock is not a global Product property.

## 4. Inventory boundary

Inventory remains Business-owned.

Therefore:

`Product` does not become the owner of global shared stock.

Stock, lots, movements and future Location associations remain Business-scoped.

## 5. Migration direction

Current AS-IS:

`Empresa → Producto`

Target:

`Product → BusinessProduct → Business`

The existing Product records must be preserved and associated with the corresponding BusinessProduct during transformation.

Existing commercial data must not be silently discarded.

## 6. Explicitly open

The following remain specialized implementation/specification details:

- exact Product fields;
- exact BusinessProduct fields;
- SKU ownership and uniqueness constraints;
- category ownership;
- price model;
- discount model;
- image/media model;
- physical foreign keys;
- migration/backfill procedure;
- treatment of existing Product IDs;
- transaction boundaries.

## 7. Non-approval

This decision does not authorize:

- Prisma schema changes;
- Product table migration;
- creation of BusinessProduct rows;
- data backfill;
- deletion of `Producto.empresaId`;
- production cutover.

## 8. Evidence

- DOCUMENTADO: OR-B2-010.
- DOCUMENTADO: canonical Commerce Specification.
- VERIFICADO POR CÓDIGO: current Product is Business-scoped through `empresaId` and currently contains commercial fields directly.
- VERIFICADO POR CÓDIGO: no BusinessProduct model was identified in the inspected schema.

**R8-COM-003: CLOSED — OWNER APPROVED DIRECTION.**
