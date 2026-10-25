# P16-1: Admin Dashboard API

## Overview

The Admin Dashboard provides comprehensive management and analytics capabilities for Wapsell multi-tenant operations. This module includes:

- **User Management**: Create, update, list, and manage staff users across businesses
- **Analytics Dashboard**: Real-time KPIs, sales trends, product performance, channel breakdown
- **Role Management**: Define roles, assign capabilities, manage user permissions
- **Audit Logging**: Track all administrative actions with full audit trails

## Architecture

### Service Layer

#### UserAdminService
Manages user lifecycle across multi-tenant infrastructure:

```typescript
listUsers(businessId, page, limit, role?, status?)           // Paginated list with filters
getUserDetail(businessId, userId)                            // Full user profile with roles/permissions
createUser(businessId, dto)                                  // Create new staff user + assign role
updateUser(businessId, userId, dto)                          // Update user info + status
deactivateUser(businessId, userId)                           // Soft delete: set status=SUSPENDED
resetPassword(businessId, userId)                            // Generate temp password
getRolesByBusiness(businessId)                               // Available roles for business
assignRoleToUser(businessId, userId, roleTemplateId)         // Create/update RoleGrant
removeRoleFromUser(businessId, userId)                       // Remove role assignment
```

**Key Features**:
- Multi-tenant isolation via businessId enforcement
- Membership + User model (dual-key: userId_businessId)
- RoleGrant binding (one-to-one with Membership)
- Capability-based permission model (via RoleTemplate + CapabilityDefinition)

#### AnalyticsDashboardService
Aggregates sales metrics from Venta + Pedido models:

```typescript
getDashboardKPIs(businessId, period)                         // Revenue, Orders, Customers, Products
getTrendChart(businessId, metric, period)                    // 7/30/90-day revenue/order trends
getTopProducts(businessId, limit, metric)                    // Ranked by revenue or quantity
getChannelBreakdown(businessId, period)                      // Online (Pedido) vs Retail (Venta)
getGeographicBreakdown(businessId, period)                   // Sales by customer location
```

**Key Metrics**:
- Revenue: Sum of confirmed Venta + Pedido amounts
- Orders: Count of confirmed Venta + Pedido
- Customers: Distinct clienteId (active customers)
- Periods: 7d, 30d, 90d (vs. previous period for trends)

#### PermissionAdminService
Manages role templates and capability assignments:

```typescript
listPermissions()                                            // All available capability definitions
createRole(businessId, name, permissions)                   // Create custom role for business
updateRole(businessId, roleId, dto)                         // Modify role + capabilities
listRolesByBusiness(businessId)                              // Available roles (global + business-scoped)
assignRoleToUser(businessId, userId, roleTemplateId)        // Create RoleGrant
removeRoleFromUser(businessId, userId)                       // Delete RoleGrant
```

**Authorization Model**:
- Global roles (empresaId=null): e.g., "Admin", "Manager" (shared across businesses)
- Business-scoped roles (empresaId=businessId): Custom roles per business
- RoleTemplate → RoleCapability[] → CapabilityDefinition (granular permissions)

#### AuditLogService
Exposes existing AuditReportingService for admin context:

```typescript
listAuditLogs(businessId, filters)                           // Query with pagination + filters
exportAuditLogs(businessId, format)                          // CSV or JSON export
```

### HTTP API

#### AdminUsersController
**Base: `/admin/users`**

| Method | Endpoint | Permission | Response |
|--------|----------|-----------|----------|
| GET | `/` | users.manage | ListUsersAdminDto |
| POST | `/` | users.manage | UserAdminResponseDto (201) |
| GET | `/:userId` | users.manage | UserAdminResponseDto |
| PATCH | `/:userId` | users.manage | UserAdminResponseDto |
| DELETE | `/:userId` | users.manage | 204 No Content |
| POST | `/:userId/reset-password` | users.manage | { tempPassword } |
| GET | `/:userId/roles` | users.manage | RoleGrantDto[] |
| PATCH | `/:userId/roles/:roleId` | users.manage | 200 OK |

#### DashboardController
**Base: `/admin/dashboard`**

| Method | Endpoint | Permission | Response |
|--------|----------|-----------|----------|
| GET | `/kpis?period=30d` | dashboard.view | DashboardKPIDto |
| GET | `/trends?metric=revenue&period=30d` | dashboard.view | TrendChartDto |
| GET | `/top-products?limit=10&metric=revenue` | dashboard.view | TopProductsDto |
| GET | `/channel-breakdown?period=30d` | dashboard.view | ChannelBreakdownResponseDto |
| GET | `/geographic-breakdown?period=30d` | dashboard.view | GeographicBreakdownResponseDto |

#### RoleAdminController
**Base: `/admin/roles`**

| Method | Endpoint | Permission | Response |
|--------|----------|-----------|----------|
| GET | `/` | roles.manage | RoleTemplate[] |
| POST | `/` | roles.manage | RoleTemplate (201) |
| PATCH | `/:roleId` | roles.manage | RoleTemplate |
| GET | `/permissions` | roles.manage | { [category]: CapabilityDef[] } |

#### AuditAdminController
**Base: `/admin/audit`**

| Method | Endpoint | Permission | Response |
|--------|----------|-----------|----------|
| GET | `/logs?page=1&limit=25` | audit.view | ListAuditLogsDto |
| GET | `/logs/export?format=json\|csv` | audit.view | JSON Array or CSV string |

## Data Models

### Membership (Multi-tenancy Key)
```prisma
model Membership {
  userId              String
  businessId          String
  role                RolUsuario         // OWNER, ASISTENTE_LOCAL, etc.
  status              MembershipStatus   // ACTIVE, SUSPENDED, INACTIVE
  User                User               @relation(fields: [userId], references: [id])
  Empresa             Empresa            @relation(fields: [businessId], references: [id])
  RoleGrant           RoleGrant?         // Optional capability assignment
  @@unique([userId, businessId])
}
```

### RoleGrant (Capabilities Binding)
```prisma
model RoleGrant {
  membershipId        String  @unique
  roleTemplateId      String
  Membership          Membership         @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  RoleTemplate        RoleTemplate       @relation(fields: [roleTemplateId], references: [id])
  CapabilityGrant[]   CapabilityGrant[]  // Individual capability overrides
}
```

### RoleTemplate (Role Definition)
```prisma
model RoleTemplate {
  name                String    @unique
  description         String?
  empresaId           String?   // NULL = global role
  RoleCapability[]    RoleCapability[]   // Base capabilities for role
  RoleGrant[]         RoleGrant[]
}
```

## Security & Authorization

### Guard Stack
```
JwtAuthGuard (authenticates)
  ↓
AuthorizationGuard (applies @Authorize)
  ↓
Capability check (e.g., "users.manage")
```

### Capabilities Required
- `users.manage` - User CRUD + password reset
- `dashboard.view` - Analytics dashboard access
- `roles.manage` - Role template management
- `audit.view` - Audit log access

### Multi-tenant Isolation
- All endpoints extract `businessId` from JWT (user's current business context)
- Services enforce businessId in WHERE clauses
- Membership is uniquely scoped to (userId, businessId)
- Cannot access users from other businesses

## Usage Examples

### Create Admin User
```bash
POST /admin/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "admin@empresa.local",
  "nombre": "Admin Staff",
  "password": "SecurePassword123!",
  "roleTemplateId": "role-uuid-admin"
}

→ 201 Created
{
  "id": "user-uuid",
  "email": "admin@empresa.local",
  "nombre": "Admin Staff",
  "membership": {
    "businessId": "empresa-uuid",
    "businessName": "Mi Empresa",
    "role": "ASISTENTE_LOCAL",
    "status": "ACTIVE"
  },
  "roleGrant": {
    "roleTemplateId": "role-uuid-admin",
    "roleName": "Admin",
    "capabilities": [...]
  }
}
```

### Get Dashboard KPIs
```bash
GET /admin/dashboard/kpis?period=30d
Authorization: Bearer {token}

→ 200 OK
{
  "period": "30d",
  "businessId": "empresa-uuid",
  "kpis": {
    "totalRevenue": {
      "value": 125432.50,
      "change": 12.5,
      "currency": "ARS",
      "trend": "up"
    },
    "totalOrders": {
      "value": 342,
      "change": 8.3,
      "trend": "up"
    },
    "totalCustomers": {
      "value": 1250,
      "change": 3.2,
      "trend": "up"
    },
    "totalProducts": {
      "value": 89,
      "active": 85,
      "inactive": 4
    }
  },
  "asOf": "2026-10-25T14:30:00Z"
}
```

### Export Audit Logs
```bash
GET /admin/audit/logs/export?format=csv&accion=CREATE&entidad=Usuario
Authorization: Bearer {token}

→ 200 OK
ID,Empresa ID,Usuario ID,Acción,Entidad Afectada,Entidad ID,Fecha/Hora,Motivo
log-uuid-1,empresa-uuid,user-uuid-1,CREATE,Usuario,user-uuid-2,2026-10-25T10:00:00Z,
...
```

## Testing

Run integration tests:
```bash
npm run test -- p16-1-admin.integration-spec.ts
```

Test coverage:
- User management: CRUD, pagination, filtering, role assignment
- Dashboard analytics: KPIs, trends, top products, breakdowns
- Role management: Creation, updates, capability assignment
- Audit logs: Listing, filtering, export
- Authorization: Guard behavior, multi-tenant isolation
- Error handling: 404, 400, 403, validation errors

## Performance Considerations

### Pagination
- Default: 25 items per page
- Maximum: 100 items per page
- Offset-based (not cursor-based)

### Caching
- No client-side caching (analytics are real-time)
- Consider Redis caching for `getDashboardKPIs` if called frequently

### Database Queries
- Membership queries use unique index (userId, businessId)
- Analytics aggregations scan Venta + Pedido tables (consider covering indexes for period queries)
- Audit logs use empresaId + date range indexes

## Migration Notes

### From Usuario to User + Membership
- Legacy `Usuario` model is single-tenant per empresaId
- New `User + Membership` is multi-tenant (N:N)
- Admin API uses User + Membership exclusively
- Old single-tenant staff may need migration to User model

### Database Schema
No migrations required - all tables exist:
- User, Membership, RoleGrant, RoleTemplate, RoleCapability, CapabilityDefinition, AuditLog

## Future Enhancements

- [ ] Real-time dashboard updates (WebSocket / Server-Sent Events)
- [ ] Advanced analytics (cohorts, lifetime value, churn)
- [ ] Bulk user import (CSV)
- [ ] Scheduled report delivery (email)
- [ ] Role cloning (copy existing role as template)
- [ ] Audit log retention policies
- [ ] Two-factor authentication (2FA) for admin accounts
