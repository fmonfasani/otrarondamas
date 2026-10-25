# Relation Isolation Tests

This directory contains automatically generated test suites for tenant-scoped relations.

## Purpose

These tests verify that the multi-tenant isolation boundary is enforced at the database and application layers:

1. **Same-tenant relations persist** (positive tests)
2. **Cross-tenant relations are rejected** (negative tests P2025)
3. **Updates respect scope boundaries**
4. **Transactions preserve isolation**

## Structure

Each test file covers one relation pair:
- `{SourceModel}-{TargetModel}.spec.ts`

Example: `VentaItem-Producto.spec.ts` tests the relation from VentaItem to Producto.

## Test Patterns

Each relation test file includes 6 test cases:

### AA-01: Same-tenant create
Verifies that TenantA can create and link relations within TenantA.

```typescript
it('AA-01: VentaItemA can create same-tenant relation to ProductoA', async () => { ... })
```

### AA-02: Same-tenant createMany
Verifies batch operations work within same tenant.

```typescript
it('AA-02: VentaItemA can createMany within same tenant', async () => { ... })
```

### AB-01: Cross-tenant rejection
Verifies that TenantA cannot link to resources in TenantB (P2025 error).

```typescript
it('AB-01: VentaItemA attempting cross-tenant relation to ProductoB → P2025', async () => { ... })
```

### UPDATE-01: Update scope
Verifies that updates respect scope boundaries.

```typescript
it('UPDATE-01: VentaItemA can update relation within same tenant', async () => { ... })
```

### NESTED-01: Nested operations
Verifies isolation in nested create/connect operations.

```typescript
it('NESTED-01: VentaItemA nested create preserves same-tenant isolation', async () => { ... })
```

### TXN-01: Transaction safety
Verifies isolation within interactive transactions.

```typescript
it('TXN-01: relation isolation applies inside $transaction', async () => { ... })
```

## Generation

Test files are generated using the `RelationTestGenerator` class:

```bash
npm run generate:relation-tests
```

This reads the `RELATIONS_WITH_OWNERSHIP` registry and generates a test file for each registered relation.

## Running Tests

Run all relation isolation tests:

```bash
npm run test:relations
```

Run with coverage analysis:

```bash
npm run test:relations:coverage
```

## Coverage

The generator targets:
- **Threshold**: 75% of registered relations
- **Status**: Must have 56+ of 75 relations tested to pass
- **Output**: Each test file validates isolation in both directions

## Manifest

After generation, a `manifest.json` file is created containing:
- Count of generated test files
- Coverage percentage
- List of all generated test files
- Generation timestamp

## Configuration

Jest configuration for relation tests:

```json
{
  "testTimeout": 30000,
  "maxWorkers": 2
}
```

Tests run serially to avoid database contention.
