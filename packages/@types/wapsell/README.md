# @wapsell/types

Single source of truth for types across all Wapsell applications.

This package provides comprehensive TypeScript type definitions and Zod validation schemas for the entire Wapsell platform, ensuring type consistency and data validation across all applications.

## Features

- **Unified Type Definitions**: Single source of truth for all domain types
- **Zod Validation**: Built-in validation schemas for runtime type checking
- **Type Inference**: `z.infer<typeof schema>` for automatic type inference
- **Multi-domain Support**: Organized by business domains
- **Tree-shakeable**: ESM exports for optimal bundling
- **Well-documented**: JSDoc comments for IDE autocomplete

## Installation

```bash
npm install @wapsell/types
```

## Usage

### Basic Import

```typescript
import {
  User,
  UserRole,
  LoginRequest,
  LoginRequestSchema,
  AuthenticatedUser,
} from '@wapsell/types';

// Use types in your code
const user: User = {
  id: '123',
  empresaId: '456',
  nombre: 'John Doe',
  email: 'john@example.com',
  rol: UserRole.OWNER,
  estadoLegajo: 'APROBADO',
  activo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Validate runtime data
const loginData = { email: 'user@example.com', password: 'password123' };
const validated = LoginRequestSchema.parse(loginData);
```

### Domain-specific Imports

#### Authentication & Authorization

```typescript
import {
  JwtPayload,
  AuthenticatedUser,
  UserRole,
  LoginResponse,
} from '@wapsell/types/auth';
```

#### Tenant & Business Management

```typescript
import {
  Business,
  BusinessDetail,
  Membership,
  MembershipRole,
} from '@wapsell/types/tenant';
```

#### Point of Sale

```typescript
import {
  Sale,
  SaleItem,
  Payment,
  PaymentMethod,
  Cart,
  CartItem,
} from '@wapsell/types/pos';
```

#### E-commerce / Online Store

```typescript
import {
  Product,
  Order,
  OrderStatus,
  Customer,
  Category,
} from '@wapsell/types/tienda';
```

#### Dashboard & Analytics

```typescript
import {
  Dashboard,
  KPI,
  MetricType,
  Report,
  AnalyticsEvent,
} from '@wapsell/types/dashboard';
```

#### Admin & Management

```typescript
import {
  AuditLog,
  AuditAction,
  UserAdminResponse,
  SystemSettings,
} from '@wapsell/types/admin';
```

### Validation with Zod

```typescript
import { CreateSaleRequestSchema, CreateSaleRequestType } from '@wapsell/types/pos';

const saleData = {
  clienteId: 'customer-123',
  canal: 'mostrador',
  items: [
    {
      productoId: 'prod-456',
      cantidad: 2,
      precioUnitario: 100,
    },
  ],
  descuento: 10,
};

try {
  // Parse with validation
  const validatedSale = CreateSaleRequestSchema.parse(saleData);

  // Type is inferred as CreateSaleRequestType
  const sale: CreateSaleRequestType = validatedSale;
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Type Inference

```typescript
import {
  CustomerSchema,
  type CustomerType,
  JwtPayloadSchema,
  type JwtPayloadType,
} from '@wapsell/types';

// Automatically inferred types from schemas
type Customer = z.infer<typeof CustomerSchema>;
type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Or use the pre-inferred type exports
const customer: CustomerType = {
  id: '123',
  empresaId: '456',
  nombre: 'Acme Corp',
  email: 'info@acme.com',
  tipo: 'MINORISTA',
  activo: true,
  esMayorista: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Type Organization

### Common (`common.ts`)

Foundational types used across all domains:

- `Id`, `Timestamps`, `SoftDeletable`, `Auditable`
- `Decimal`, `CurrencyCode`, `EntityStatus`
- `PaginationMeta`, `PaginatedResponse`, `ApiResponse`
- `ContactInfo`, `Location`

### Auth (`auth.ts`)

Authentication and authorization types:

- `User`, `UserProfile`, `UserRole`, `DossierStatus`
- `JwtPayload`, `AuthenticatedUser`, `Session`
- `LoginRequest`, `LoginResponse`, `SignUpRequest`
- `Permission`, `Role`, `OAuthCallbackPayload`

### Tenant (`tenant.ts`)

Business and tenant management:

- `Business`, `BusinessDetail`, `BusinessConfig`, `BusinessStats`
- `Membership`, `MembershipRole`, `MembershipStatus`, `MembershipDetail`
- `Invitation`, `InvitationStatus`
- `TenantContext`

### POS (`pos.ts`)

Point of Sale and payment operations:

- `Sale`, `SaleItem`, `SaleStatus`, `SaleChannel`
- `Payment`, `PaymentMethod`, `PaymentStatus`
- `Receipt`
- `Cart`, `CartItem`

### Tienda (`tienda.ts`)

E-commerce and online store:

- `Product`, `ProductFamily`, `ProductPresentation`
- `Category`, `ProductType`, `ProductSubType`
- `Order`, `OrderItem`, `OrderStatus`
- `Customer`, `CustomerType`
- `ProductReview`, `Wishlist`, `Coupon`

### Dashboard (`dashboard.ts`)

Analytics and business intelligence:

- `AnalyticsEvent`, `AnalyticsAggregation`
- `KPI`, `MetricType`, `Dashboard`, `DashboardWidget`
- `Report`, `ReportType`, `SalesReport`, `InventoryReport`
- `TimePeriod`, `ChartType`, `WidgetType`

### Admin (`admin.ts`)

System administration:

- `AuditLog`, `AuditAction`, `AuditSummary`
- `UserAdminResponse`, `CreateUserAdminRequest`, `UpdateUserAdminRequest`
- `RoleAdmin`, `CreateRoleRequest`
- `SystemSettings`, `FeatureFlag`
- `BulkOperation`, `DataExport`, `HealthCheck`

## Building

```bash
npm run build
```

This compiles TypeScript to JavaScript and generates type definitions.

## Type Checking

```bash
npm run typecheck
```

## Testing

```bash
npm test
```

## Lint

```bash
npm run lint
npm run lint:fix
```

## Contributing

When adding new types:

1. Add the type definition to the appropriate file (`auth.ts`, `pos.ts`, etc.)
2. Create a Zod schema for validation
3. Export both the type and schema from the file
4. Add a `Type` export using `z.infer` pattern
5. Re-export from `index.ts`
6. Update this README with usage examples

## Publishing

```bash
npm version patch
npm publish
```

## License

UNLICENSED
