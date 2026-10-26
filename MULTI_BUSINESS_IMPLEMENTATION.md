# Multi-Business Backend Implementation

## Overview
This implementation adds multi-business support to the Wapsell API, allowing users to manage multiple companies with JWT-based switching.

## Implementation Status

### ✅ COMPLETED

#### 1. Auth Types Updated
**File**: `apps/api/src/auth/auth.types.ts`
- Added `EmpresaInJwt` interface with `{ id, nombre, role }`
- Extended `JwtPayload` with optional `empresas: EmpresaInJwt[]`
- Extended `AuthenticatedUser` with optional `empresas: EmpresaInJwt[]`
- Extended `UserProfile` with optional `empresasDetail` array

#### 2. Login Response DTO
**File**: `apps/api/src/auth/dto/login-response.dto.ts`
- New DTO with shape:
  ```
  {
    accessToken: string;
    empresaId: string;
    empresa: { id, nombre, role };
    empresas: [{ id, nombre, role }];
    usuario: { id, email, nombre, empresaNombre, ... };
  }
  ```

#### 3. Auth Service Updated
**File**: `apps/api/src/auth/auth.service.ts`
- Modified `verifyCredentials()` to include `UserEmpresa` in include
- Modified `issueSession()` to:
  - Build empresas[] from UserEmpresa relationship
  - Include empresas in JWT payload
  - Return LoginResponseDto shape
- Added `switchEmpresa()` method:
  - Validates user has access to target empresa
  - Updates Usuario.empresaId
  - Issues new JWT with updated empresaId

#### 4. Auth Controller Extended
**File**: `apps/api/src/auth/auth.controller.ts`
- Added `POST /auth/switch-empresa/:empresaId` endpoint
  - Protected with JWT auth
  - Calls authService.switchEmpresa()
  - Returns new JWT and session data

#### 5. Tenants Module Created
**Files**:
- `apps/api/src/tenants/tenants.service.ts`
  - `getMyEmpresas(usuarioId)` - List all accessible empresas with roles
  - `validateUserAccess(usuarioId, empresaId)` - Check authorization
  - `seedUserEmpresas()` - Create UserEmpresa for legacy users
  
- `apps/api/src/tenants/tenants.controller.ts`
  - `GET /tenants/my-empresas` - Returns empresas list + current

- `apps/api/src/tenants/tenants.module.ts`
  - Module definition with PrismaModule dependency

#### 6. App Module Updated
**File**: `apps/api/src/app.module.ts`
- Added TenantsModule to imports

#### 7. E2E Tests Created
**File**: `tests/e2e/multi-business-flows.spec.js`
- Test JWT includes empresas[]
- Test LoginResponseDto shape
- Test GET /tenants/my-empresas
- Test POST /auth/switch-empresa/:id
- Test authorization validation
- Test auth requirement

#### 8. Seed Script Created
**File**: `apps/api/prisma/seed-multi-business.ts`
- Seeds UserEmpresa for existing users
- Assigns "owner" role to legacy users
- Idempotent (skips if already exists)

### ⏳ PENDING

#### Database Migration
- UserEmpresa model already exists in schema.prisma
- Migration creation: `prisma migrate dev --name add_user_empresa_m2m`
- Status: Attempted, npm cache issues encountered
- Action: Run migration after resolving npm cache

## Schema
The following models are already configured in `apps/api/prisma/schema.prisma`:

```prisma
model UserEmpresa {
  id        String   @id @default(uuid())
  usuarioId String
  empresaId String
  role      String   @default("owner")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  Usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  Empresa   Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, empresaId])
  @@index([usuarioId])
  @@index([empresaId])
}
```

Relations:
- `Usuario.UserEmpresa[]` (M:M through UserEmpresa)
- `Empresa.UserEmpresa[]` (M:M through UserEmpresa)
- `Usuario.empresaId` (1:1, primary company, still present for backward compatibility)

## API Endpoints

### POST /auth/login
**Response Shape**:
```json
{
  "accessToken": "eyJhbGc...",
  "empresaId": "uuid",
  "empresa": {
    "id": "uuid",
    "nombre": "Company Name",
    "role": "owner"
  },
  "empresas": [
    { "id": "uuid", "nombre": "Company 1", "role": "owner" },
    { "id": "uuid", "nombre": "Company 2", "role": "admin" }
  ],
  "usuario": {
    "id": "uuid",
    "email": "user@example.com",
    "nombre": "John Doe",
    "empresaNombre": "Current Company",
    "permisos": ["read_sales", ...],
    "fotoUrl": "https://...",
    "metodoLogin": "password",
    "createdAt": "2026-10-26T...",
    "rol": "OWNER",
    "estadoLegajo": "APROBADO"
  }
}
```

### POST /auth/switch-empresa/:empresaId
**Headers**: `Authorization: Bearer <jwt>`
**Response**: Same as POST /auth/login (new JWT with switched empresaId)
**Errors**:
- 401 Unauthorized: Not authenticated or no access to empresa
- 404 Not Found: Empresa doesn't exist

### GET /tenants/my-empresas
**Headers**: `Authorization: Bearer <jwt>`
**Response**:
```json
{
  "empresas": [
    { "id": "uuid", "nombre": "Company 1", "role": "owner", "createdAt": "..." },
    { "id": "uuid", "nombre": "Company 2", "role": "admin", "createdAt": "..." }
  ],
  "current": "uuid"
}
```

## JWT Payload
The JWT now includes:
```json
{
  "sub": "usuario-id",
  "email": "user@example.com",
  "nombre": "John Doe",
  "empresaId": "current-empresa-id",
  "permisos": ["permission1", "permission2"],
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario",
  "empresas": [
    { "id": "uuid", "nombre": "Company 1", "role": "owner" },
    { "id": "uuid", "nombre": "Company 2", "role": "admin" }
  ]
}
```

## Security Considerations

1. **Access Control**: TenantsService.validateUserAccess() checks that user has UserEmpresa record
2. **Role-Based**: Each UserEmpresa has a role (owner, admin, user, editor)
3. **Fallback**: If no UserEmpresa exists, falls back to Usuario.empresaId for backward compatibility
4. **JWT Signing**: New JWT signed with same secret, no additional verification needed
5. **State Update**: switchEmpresa updates Usuario.empresaId in database for consistency

## Testing

Run E2E tests:
```bash
npm run test:e2e -- tests/e2e/multi-business-flows.spec.js
```

Test scenarios:
1. Login returns empresas[] in JWT and response
2. Switch empresa generates new JWT with updated empresaId
3. User can only switch to empresas they have access to
4. List all accessible empresas
5. Current empresa tracking in JWT and response

## Next Steps

1. **Resolve npm lock issues** and run database migration
2. **Run E2E tests** to verify all endpoints work
3. **Seed UserEmpresa** for existing users using provided seed script
4. **Frontend integration**:
   - Store empresas[] from login response
   - Implement company switcher UI
   - Call POST /auth/switch-empresa/:id on switch
   - Update local JWT after switch
5. **Optional enhancements**:
   - Implement role-based endpoint restrictions
   - Add invitation flow for adding users to empresas
   - Add empresa preferences/settings per user

## Files Modified

- ✅ `apps/api/src/auth/auth.types.ts`
- ✅ `apps/api/src/auth/auth.service.ts`
- ✅ `apps/api/src/auth/auth.controller.ts`
- ✅ `apps/api/src/auth/dto/login-response.dto.ts` (new)
- ✅ `apps/api/src/tenants/tenants.service.ts` (new)
- ✅ `apps/api/src/tenants/tenants.controller.ts` (new)
- ✅ `apps/api/src/tenants/tenants.module.ts` (new)
- ✅ `apps/api/src/app.module.ts`
- ✅ `apps/api/prisma/seed-multi-business.ts` (new)
- ✅ `tests/e2e/multi-business-flows.spec.js` (new)
