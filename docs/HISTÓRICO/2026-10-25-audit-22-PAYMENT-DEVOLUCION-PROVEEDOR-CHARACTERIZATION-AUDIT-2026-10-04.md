# B3 — PagoProveedor / DevolucionProveedor Characterization Audit — 2026-10-04

**Estado:** CHARACTERIZATION CANDIDATE — NOT VERIFIED AS ISOLATED  
**Scope:** PagoProveedor and DevolucionProveedor direct Business ownership and current service compensation  
**Evidence:** [C] code / [T] test / [E] execution / [D] documented / [ND] not determinable

## 1. Objective

Characterize the current behavior of two models that have a direct `empresaId` in Prisma schema but are absent from `MODELOS_CON_EMPRESA_ID` in `empresa-scope.extension.ts`.

This is deliberately a characterization, not a production fix.

## 2. Code evidence

### PagoProveedor

Schema defines:
- direct `empresaId`;
- `compraId` -> Compra;
- `proveedorId` -> Proveedor;
- `usuarioId` -> Usuario.

The current scope registry does not contain `PagoProveedor`.

`ComprasService.listarPagos(empresaId, compraId)` first calls `getCompra(empresaId, compraId)` through the scoped client and then queries `pagoProveedor.findMany({ where: { compraId } })`.

`ComprasService.crearPago()` similarly resolves the Compra through scoped access, then creates the payment with the Compra's `proveedorId` and the supplied `empresaId`.

### DevolucionProveedor

Schema defines:
- direct `empresaId`;
- `compraId` -> Compra;
- `proveedorId` -> Proveedor;
- `usuarioId` -> Usuario;
- child `DevolucionProveedorItem` rows.

The current scope registry does not contain `DevolucionProveedor`.

`ComprasService.listarDevoluciones(empresaId, compraId)` first resolves the Compra through scoped access and then queries `devolucionProveedor.findMany({ where: { compraId } })`.

`ComprasService.crearDevolucion()` resolves the Compra through scoped access and executes the creation inside a Business-scoped transaction. The child Item relations are protected by the existing relation-ownership registry, but the parent DevolucionProveedor model itself is not in the direct scope list.

## 3. Current mechanism implication

Because these two models are absent from `MODELOS_CON_EMPRESA_ID`, the generic extension does not inject `empresaId` into their create/createMany operations and does not add `empresaId` to their normal where operations.

That is a code-level characterization [C], not yet an execution claim [E].

The candidate therefore distinguishes:

1. direct scoped-client behavior on the models;
2. current public service-path behavior that compensates by resolving a scoped Compra first.

## 4. Candidate acceptance

The candidate should establish with real PostgreSQL:

- direct `forEmpresa(A)` read of a B-owned PagoProveedor/DevolucionProveedor is currently possible;
- direct scoped update of a B-owned record is currently possible, if the model is left outside the registry;
- public `ComprasService` listing paths remain bounded by an A-owned Compra;
- A-owned positive controls work.

If these observations hold, the result is a confirmed **mechanism coverage gap with current service-level compensation**, not automatically a requirement to change production code.

## 5. Non-goals

- no registry modification;
- no schema modification;
- no production service modification;
- no B3 global closure;
- no claim that the public API currently exposes the direct scoped-client path;
- no automatic classification as a security vulnerability without considering reachable application paths.

## 6. Next decision after execution

If the direct-client leak is reproduced:
1. determine whether direct scoped-client access is an allowed architectural path;
2. if yes, decide whether both models belong in `MODELOS_CON_EMPRESA_ID`;
3. if no, document the boundary and test the reachable service paths;
4. only then propose the minimum production change.

## 7. Current classification

**[C] MECHANISM GAP CHARACTERIZED IN CODE.**  
**[E] PENDING EXECUTION.**  
**Production change: NOT AUTHORIZED / NOT YET INDICATED.**
