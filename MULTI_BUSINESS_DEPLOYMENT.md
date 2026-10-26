# Multi-Business Deployment & Testing Guide

## Prerequisites
- Node.js 18+
- PostgreSQL running with `wapsell_prod` database
- npm/yarn package manager

## Step 1: Apply Database Migration

```bash
# From root directory
npm run prisma:migrate --workspace=@otrarondamas/api

# This will:
# 1. Create UserEmpresa table with M:M relationship
# 2. Add indexes and foreign keys
# 3. Update Prisma client
```

Expected output:
```
✔ Successfully created migrations folder
✔ Created migration: 20261026_add_user_empresa_multi_tenancy
✔ Database synced
✔ Generated Prisma Client
```

## Step 2: Seed UserEmpresa for Existing Users

```bash
# Run seed script to create UserEmpresa records for legacy users
npm run prisma:seed --workspace=@otrarondamas/api -- --name multi-business

# Or run it directly with ts-node
npx ts-node apps/api/prisma/seed-multi-business.ts
```

Expected output:
```
Seeding UserEmpresa for existing users...
Created UserEmpresa for user <uuid> -> empresa <uuid>
...
Seed complete: N created, M skipped
```

## Step 3: Start API Server

```bash
# Development mode
npm run dev --workspace=@otrarondamas/api

# Or production
npm run build --workspace=@otrarondamas/api
npm run start --workspace=@otrarondamas/api
```

Server should be available at `http://localhost:8600`

## Step 4: Test Endpoints

### Test 1: Login with Multi-Empresa JWT

```bash
curl -X POST http://localhost:8600/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@otrarondamas.test",
    "password": "Test123!@#"
  }'
```

Expected response structure:
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
  "usuario": { ... }
}
```

**Verify JWT payload**:
```bash
# Extract access token from login response and decode it
# The payload should include:
# {
#   "empresas": [{ "id": "...", "nombre": "...", "role": "..." }],
#   "empresaId": "...",
#   ...
# }
```

### Test 2: Get List of Accessible Empresas

```bash
curl -X GET http://localhost:8600/tenants/my-empresas \
  -H "Authorization: Bearer <access_token>"
```

Expected response:
```json
{
  "empresas": [
    {
      "id": "uuid",
      "nombre": "Company 1",
      "role": "owner",
      "createdAt": "2026-10-26T..."
    },
    {
      "id": "uuid",
      "nombre": "Company 2",
      "role": "admin",
      "createdAt": "2026-10-26T..."
    }
  ],
  "current": "uuid"
}
```

### Test 3: Switch to Different Empresa

If the user has access to multiple empresas, test switching:

```bash
curl -X POST http://localhost:8600/auth/switch-empresa/<empresa_id> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"
```

Expected response:
- New JWT with updated `empresaId`
- Same shape as login response

**Verify the switch**:
```bash
# Decode the new JWT payload
# Should have empresaId matching the switched empresa
```

### Test 4: Authorization Validation

Attempt to switch to an empresa the user doesn't have access to:

```bash
curl -X POST http://localhost:8600/auth/switch-empresa/invalid-empresa-id \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"
```

Expected response (401):
```json
{
  "statusCode": 401,
  "message": "No tienes acceso a esta empresa"
}
```

### Test 5: GET /auth/me with Fresh Empresa List

```bash
curl -X GET http://localhost:8600/auth/me \
  -H "Authorization: Bearer <access_token>"
```

Should include `empresasDetail` array with fresh data from database.

## Step 5: Run E2E Tests

```bash
# Run all multi-business tests
npm run test:e2e -- tests/e2e/multi-business-flows.spec.js

# Or run specific test suite
npm run test:e2e -- tests/e2e/multi-business-flows.spec.js --grep "switch-empresa"
```

## Frontend Integration Checklist

- [ ] Store `empresas[]` from login response in state/localStorage
- [ ] Display company switcher dropdown populated from `empresas`
- [ ] Show current empresa indicator in UI
- [ ] On switch selection, call `POST /auth/switch-empresa/:id`
- [ ] Update JWT and `empresaId` in localStorage after switch
- [ ] Redirect to homepage or refresh page after switch
- [ ] Update API requests to use current `empresaId` as context

## Troubleshooting

### Migration Fails with "Column already exists"
- The UserEmpresa model was already in schema.prisma
- Check if migration was partially applied
- Run: `npx prisma migrate resolve --applied 20261026_add_user_empresa_multi_tenancy`

### JWT doesn't include empresas[]
- Verify verifyCredentials() includes `UserEmpresa` in include
- Verify issueSession() maps empresas from UserEmpresa
- Decode JWT at jwt.io to inspect payload

### 401 on switch-empresa
- Check that UserEmpresa record exists for the user+empresa combination
- Run seed script to create UserEmpresa for legacy users
- Query database: `SELECT * FROM "UserEmpresa" WHERE "usuarioId" = '...'`

### No empresas in list
- Verify migration was applied: `SELECT * FROM "UserEmpresa" LIMIT 1`
- If table is empty, run seed script
- If seed script shows "M skipped", UserEmpresa records already exist

## Database Queries for Verification

```sql
-- Check UserEmpresa table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'UserEmpresa';

-- List all UserEmpresa records
SELECT ue.*, u.email, e.nombre 
FROM "UserEmpresa" ue
JOIN "Usuario" u ON ue."usuarioId" = u.id
JOIN "Empresa" e ON ue."empresaId" = e.id
ORDER BY ue."createdAt" DESC;

-- Check a specific user's empresas
SELECT ue.*, e.nombre, e.slug
FROM "UserEmpresa" ue
JOIN "Empresa" e ON ue."empresaId" = e.id
WHERE ue."usuarioId" = '<usuario-id>';

-- Verify foreign keys
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'UserEmpresa';
```

## Performance Considerations

- `UserEmpresa` has indexes on `usuarioId` and `empresaId` for query performance
- Unique constraint on `(usuarioId, empresaId)` prevents duplicate assignments
- Foreign keys with CASCADE delete ensure data consistency
- Consider caching `empresas[]` in frontend to avoid extra /tenants/my-empresas calls

## Security Review Checklist

- [x] JWT includes empresas[] with all accessible empresas
- [x] switch-empresa validates user has access to target empresa
- [x] validateUserAccess() throws ForbiddenException on unauthorized access
- [x] UserEmpresa records are scoped to authenticated user
- [x] Password verification still required before issuing JWT
- [x] Fallback to Usuario.empresaId for backward compatibility
- [x] No role-based endpoint filtering yet (future enhancement)

## Post-Deployment Tasks

1. **Monitor Logs**: Watch for any `UnauthorizedException` in switch-empresa
2. **Database**: Verify UserEmpresa population: `SELECT COUNT(*) FROM "UserEmpresa"`
3. **Frontend**: Implement company switcher UI and test with multiple empresas
4. **Analytics**: Track empresa switching frequency to understand usage patterns
5. **Documentation**: Update API docs with empresas[] field in JWT

## Rollback Procedure (if needed)

```bash
# Revert migration
npm run prisma:migrate -- resolve --rolled-back 20261026_add_user_empresa_multi_tenancy

# Or manual rollback
# 1. Remove UserEmpresa table
# 2. Update code to remove empresas[] from JwtPayload
# 3. Restart API
```

Note: Rollback will lose all UserEmpresa data. Ensure backup before rolling back.
