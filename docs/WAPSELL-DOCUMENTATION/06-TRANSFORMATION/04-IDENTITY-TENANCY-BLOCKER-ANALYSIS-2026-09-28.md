# Identity & Tenancy — Blocker Analysis

**Fecha:** 2026-09-28  
**Estado:** ANALYSIS — NOT APPROVED  
**Tipo:** Transformation / Decision Preparation

## 1. Purpose

Re-evaluate the five migration blockers against the current canonical specification and the verified AS-IS Prisma schema.

This document does not create new product decisions.

## 2. R-01 — Role mapping

### Verified AS-IS

Current enum:
- OWNER
- ASISTENTE_LOCAL
- PROVEEDOR
- REPARTIDOR

The current schema also contains role-specific Legajo semantics:
- ASISTENTE_LOCAL: personal data + required sensitive documents.
- REPARTIDOR: personal data + vehicle/license data + required sensitive documents.
- PROVEEDOR: fiscal data and supplier-oriented behavior.
- OWNER: fiscal fields, no required sensitive documents.

### Verified TO-BE

The canonical Identity & Tenancy specification describes Role as contextual to Membership and gives examples including OWNER, ASISTENTE and VENDEDOR.

The broader Wapsell role catalog used by the transformation contains:
- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

The canonical Identity spec does not provide a verified one-to-one mapping from the current enum to the full Wapsell catalog.

### Conclusion

**R-01 remains OPEN.**

Do not automatically map ASISTENTE_LOCAL to VENDEDOR.

REPARTIDOR and GESTOR DE STOCK are also not established as equivalent by the current canonical evidence.

The correct next artifact is an Owner-reviewed role mapping table preserving current operational semantics.

## 3. R-02 — Permission model

### Verified TO-BE

The canonical Identity & Tenancy specification states:

Membership → Role → Permissions

and states that Permissions are derived from the Role within the Membership.

The canonical session/token section also states that permissions should not be embedded as the complete permission set in the token; they should be resolved dynamically in the backend.

### Verified AS-IS

Current schema:

Usuario → UsuarioPermiso → Permiso

Current JWT includes permissions.

### Conclusion

**R-02 is resolved at product-direction level.**

Target direction is:

Membership → Role → Permission

with backend resolution.

What remains OPEN is only the physical migration mapping from existing UsuarioPermiso rows to Role/Permission assignments.

Therefore R-02 should no longer be treated as a product blocker, but as an implementation mapping task after Role mapping is approved.

## 4. R-03 — Legajo

### Verified AS-IS

Legajo is polymorphic:
- exactly one of usuarioId / clienteId is intended;
- exclusivity is enforced in service, not Prisma;
- content varies by role/entity;
- fiscal fields serve Owner, Proveedor and Cliente mayorista;
- personal fields serve Asistente de local and Repartidor;
- vehicle fields serve Repartidor;
- sensitive documents are required for Asistente de local and Repartidor.

### Conclusion

**R-03 remains OPEN.**

The current structure mixes several domain concerns:
- User/employee identity;
- role-specific operational qualification;
- supplier fiscal information;
- wholesale Customer information.

No physical move should be inferred.

A dedicated Legajo transformation analysis is required before migration.

## 5. R-04 — Proveedor

### Verified AS-IS

Proveedor is a Business-scoped commercial entity:

Proveedor → Empresa

and participates in:
- Compra;
- ProductoProveedor;
- PagoProveedor;
- DevolucionProveedor.

It is not currently a Usuario identity.

### Conclusion

The current code provides strong evidence that Proveedor is fundamentally a commercial external entity, not automatically a Membership.

Whether Wapsell later permits a supplier login/user relationship is a separate product decision.

**R-04 is therefore narrowed:**
- current supplier entity remains commercial domain data;
- no automatic conversion to Membership;
- optional supplier User relationship remains future/open.

This is sufficient for the first migration design and should not block Business/User/Membership migration.

## 6. R-05 — Customer ↔ User

### Verified TO-BE

D-002-bis explicitly establishes:
- Customer is NOT merged with User;
- Customer is a commercial relationship with a Business;
- Customer may optionally link to User;
- Customer does not require a User.

### Conclusion

**R-05 is resolved at product-direction level.**

What remains open is only the migration matching rule for existing AS-IS Customer records.

No automatic identity matching should be performed using approximate name, email or telephone equality.

The migration should initially preserve Customer independently and add User linkage only when an explicit deterministic rule is available.

## 7. Blocker status after analysis

| ID | Current status | Meaning |
|---|---|---|
| R-01 | OPEN | Role mapping requires Owner definition |
| R-02 | DIRECTION RESOLVED | Target permissions derive from Role; physical mapping remains |
| R-03 | OPEN | Legajo domain split unresolved |
| R-04 | NARROWED | Proveedor remains commercial entity; supplier login remains future/open |
| R-05 | DIRECTION RESOLVED | Customer remains separate; deterministic linkage rule remains |

## 8. Impact on implementation

The migration should not wait for R-02 or R-05 as product decisions.

The actual blocking design questions are now:
1. Role mapping.
2. Legajo ownership/domain split.

Proveedor no longer blocks the base Identity/Tenancy migration if it remains a Business-scoped commercial entity.

Customer/User can be migrated independently because the target explicitly allows Customer without User.

## 9. Next decision artifact

The next artifact should be a focused:

**Role & Membership Mapping Decision**

It should contain only:
- current role;
- current permissions;
- current Legajo requirements;
- target role;
- target permissions;
- migration treatment;
- unresolved cases.

No Prisma migration should be generated from this analysis.
