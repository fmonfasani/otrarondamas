# @wapsell/types Package Structure

## Overview

The `@wapsell/types` package is a single source of truth for TypeScript type definitions and Zod validation schemas across all Wapsell applications. It provides comprehensive type coverage for the entire platform's domain models.

## Directory Structure

```
packages/@types/wapsell/
├── src/
│   ├── index.ts              # Main export file, re-exports all types
│   ├── common.ts             # Shared/foundational types
│   ├── auth.ts               # Authentication & authorization
│   ├── tenant.ts             # Business & tenant management
│   ├── pos.ts                # Point of Sale operations
│   ├── tienda.ts             # E-commerce & online store
│   ├── dashboard.ts          # Analytics & dashboards
│   └── admin.ts              # Admin & management
├── package.json              # Package metadata with exports
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Comprehensive documentation
├── examples.ts               # Usage examples (non-compiled)
└── .npmignore                # NPM publication rules
```

## Module Breakdown

### 1. common.ts (Shared Types)
**Purpose**: Foundational types used across all domains

**Key Types**:
- `Id` - Unique identifier type
- `Timestamps` - Creation/update timestamps
- `Auditable`, `SoftDeletable` - Entity traits
- `Decimal` - Precise decimal/currency handling
- `CurrencyCode` - Currency enumeration
- `PaginationMeta`, `PaginatedResponse` - Pagination
- `ApiResponse<T>` - Standard API response
- `ContactInfo`, `Location` - Data structures

**Zod Schemas**: 15+ validation schemas
**Lines of Code**: ~250

### 2. auth.ts (Authentication & Authorization)
**Purpose**: User authentication, JWT, roles, and permissions

**Key Types**:
- `User`, `UserProfile` - User entities
- `UserRole` - Role enumeration
- `JwtPayload`, `AuthenticatedUser` - JWT handling
- `LoginRequest`, `LoginResponse` - Auth flow
- `Session`, `Permission`, `Role` - Session/permission mgmt
- `OAuthCallbackPayload` - OAuth support

**Zod Schemas**: 12+ validation schemas
**Lines of Code**: ~350

### 3. tenant.ts (Business & Tenant Management)
**Purpose**: Multi-tenant business context and isolation

**Key Types**:
- `Business`, `BusinessDetail` - Company entities
- `BusinessConfig` - Feature flags and settings
- `Membership`, `MembershipRole` - User-business relationships
- `Invitation` - Invitation system
- `TenantContext` - Request context

**Zod Schemas**: 10+ validation schemas
**Lines of Code**: ~400

### 4. pos.ts (Point of Sale)
**Purpose**: Sales, payments, receipts, and carts

**Key Types**:
- `Sale`, `SaleItem` - Sales transactions
- `SaleStatus`, `SaleChannel` - Enumerations
- `Payment`, `PaymentMethod` - Payment processing
- `Receipt` - Receipts/invoices
- `Cart`, `CartItem` - Shopping carts
- `RefundRequest` - Refund handling

**Zod Schemas**: 12+ validation schemas
**Lines of Code**: ~380

### 5. tienda.ts (E-commerce & Online Store)
**Purpose**: Products, orders, customers, inventory

**Key Types**:
- `Product` - Product entity
- `Category`, `ProductFamily` - Classification
- `Order`, `OrderItem` - Customer orders
- `Customer` - Customer entity
- `ProductReview`, `Wishlist` - Customer interactions
- `Coupon` - Promotional codes

**Zod Schemas**: 13+ validation schemas
**Lines of Code**: ~420

### 6. dashboard.ts (Analytics & Reporting)
**Purpose**: Business intelligence, KPIs, dashboards

**Key Types**:
- `AnalyticsEvent`, `AnalyticsAggregation` - Event tracking
- `KPI` - Key Performance Indicators
- `Dashboard`, `DashboardWidget` - Dashboard config
- `WidgetType`, `ChartType` - Visualization types
- `Report`, `ReportType` - Business reports
- `AnalyticsQuery`, `AnalyticsResponse` - Queries

**Zod Schemas**: 11+ validation schemas
**Lines of Code**: ~420

### 7. admin.ts (Administration & Audit)
**Purpose**: User management, audit logging, system config

**Key Types**:
- `AuditLog`, `AuditAction` - Audit trail
- `AdminUserList`, `RoleAdmin` - User management
- `SystemSettings`, `FeatureFlag` - Configuration
- `BulkOperation`, `DataExport` - Data operations
- `HealthCheck` - System monitoring
- `ActivityDashboard` - Admin dashboard

**Zod Schemas**: 9+ validation schemas
**Lines of Code**: ~340

## Type Statistics

| Module | Types | Enums | Schemas | Interfaces | LOC |
|--------|-------|-------|---------|-----------|-----|
| common.ts | 20+ | 2 | 15+ | 18+ | 250 |
| auth.ts | 25+ | 4 | 12+ | 21+ | 350 |
| tenant.ts | 22+ | 3 | 10+ | 19+ | 400 |
| pos.ts | 27+ | 5 | 12+ | 22+ | 380 |
| tienda.ts | 29+ | 3 | 13+ | 26+ | 420 |
| dashboard.ts | 24+ | 8 | 11+ | 16+ | 420 |
| admin.ts | 20+ | 2 | 9+ | 18+ | 340 |
| **TOTAL** | **~200** | **~30** | **~82** | **~140** | **~2,560** |

## Key Features

### 1. Type Safety
- Full TypeScript with strict mode enabled
- Comprehensive type definitions for all domain models
- Exported type inference helpers

### 2. Runtime Validation
- Zod schemas for all major types
- Input validation before processing
- Type-safe error handling

### 3. Consistency
- Single source of truth eliminates duplication
- Ensures all apps use identical types
- Reduces synchronization issues

### 4. Extensibility
- Clear module organization by domain
- Easy to add new types to existing modules
- Tree-shakeable exports

### 5. Documentation
- Comprehensive JSDoc comments
- Usage examples in examples.ts
- Detailed README with patterns

## Export Patterns

### Default Export
```typescript
import { User, UserRole, Sale, Product } from '@wapsell/types';
```

### Domain-Specific Exports
```typescript
import { User, JwtPayload } from '@wapsell/types/auth';
import { Sale, Payment } from '@wapsell/types/pos';
import { Product, Order } from '@wapsell/types/tienda';
```

### Validation & Type Inference
```typescript
import { LoginRequestSchema } from '@wapsell/types';
const validated = LoginRequestSchema.parse(loginData);
```

## Building & Publishing

### Build
```bash
npm run build --workspace=@wapsell/types
```

### TypeCheck
```bash
npm run typecheck --workspace=@wapsell/types
```

### Publish
```bash
npm publish --workspace=@wapsell/types
```

## Integration Points

### Consuming Applications
- `apps/api` - Backend API (NestJS)
- `apps/wapsell-frontend` - Next.js frontend
- `apps/wapsell-remix` - Remix frontend
- `apps/pos-admin` - POS admin
- `apps/tienda-online` - Online store
- `apps/mobile` - Mobile app

### Type Dependencies
- `zod@^3.22.0` - Runtime validation

## Maintenance

### Adding New Types
1. Add type definition to appropriate module
2. Create Zod validation schema
3. Export type inference with z.infer
4. Update module exports
5. Re-export from index.ts if needed
6. Document in README

### Breaking Changes
- Use semantic versioning
- Document in CHANGELOG
- Notify consuming apps
- Provide migration path

## Performance Considerations

- **Lazy Loading**: Import only needed types
- **Tree Shaking**: ESM exports enable optimization
- **No Runtime Overhead**: Types compile to no-op
- **Validation Optional**: Schemas only when needed

## Security Considerations

- No secrets embedded in types
- Sensitive data fields documented
- Type definitions don't expose credentials
- Validation happens at application layer
