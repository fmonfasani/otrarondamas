# JWT Authentication Endpoints

## Overview
This document describes the NestJS JWT-based authentication endpoints for Otra Ronda Más. All endpoints use bcryptjs for password hashing and JWT tokens with a 7-day expiration.

## Endpoints

### POST /auth/register
Register a new user and create a company account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "nombre": "John Doe",
  "companyName": "Acme Corp"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Response: 201 Created**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "empresaId": "empresa-uuid",
  "empresa": {
    "id": "empresa-uuid",
    "nombre": "Acme Corp",
    "role": "owner"
  },
  "empresas": [
    {
      "id": "empresa-uuid",
      "nombre": "Acme Corp",
      "role": "owner"
    }
  ],
  "usuario": {
    "id": "user-uuid",
    "nombre": "John Doe",
    "email": "user@example.com",
    "empresaId": "empresa-uuid",
    "empresaNombre": "Acme Corp",
    "permisos": [],
    "fotoUrl": null,
    "metodoLogin": "password",
    "createdAt": "2024-10-29T12:00:00Z",
    "rol": "OWNER",
    "estadoLegajo": "APROBADO",
    "type": "usuario"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Invalid input or weak password
  ```json
  {
    "statusCode": 400,
    "message": "Password must be at least 8 characters long",
    "error": "Bad Request"
  }
  ```

- **409 Conflict**: Email already registered
  ```json
  {
    "statusCode": 409,
    "message": "Email already exists",
    "error": "Conflict"
  }
  ```

- **500 Internal Server Error**: Database or system error

---

### POST /auth/login
Authenticate an existing user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response: 200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "empresaId": "empresa-uuid",
  "empresa": {
    "id": "empresa-uuid",
    "nombre": "Acme Corp",
    "role": "owner"
  },
  "empresas": [...],
  "usuario": {...}
}
```

**Error Responses:**
- **401 Unauthorized**: Invalid email or password
  ```json
  {
    "statusCode": 401,
    "message": "Credenciales inválidas",
    "error": "Unauthorized"
  }
  ```

- **400 Bad Request**: Missing required fields

---

### GET /auth/me
Fetch the authenticated user's full profile (queries database for latest data).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "id": "user-uuid",
  "nombre": "John Doe",
  "email": "user@example.com",
  "empresaId": "empresa-uuid",
  "empresaNombre": "Acme Corp",
  "permisos": ["permission1", "permission2"],
  "fotoUrl": null,
  "metodoLogin": "password",
  "createdAt": "2024-10-29T12:00:00Z",
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario"
}
```

**Error Responses:**
- **401 Unauthorized**: Missing or invalid token
- **404 Not Found**: User no longer exists in database

---

### POST /auth/logout
Invalidate the current JWT token (blacklist mechanism).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response: 200 OK**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- **401 Unauthorized**: Invalid or missing token
- **400 Bad Request**: Malformed Authorization header

---

## JWT Token Structure

### Access Token
**Expiration:** 7 days (604,800 seconds)

**Payload:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "nombre": "John Doe",
  "empresaId": "empresa-uuid",
  "permisos": ["permission1"],
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario",
  "empresas": [
    {
      "id": "empresa-uuid",
      "nombre": "Acme Corp",
      "role": "owner"
    }
  ],
  "iat": 1730205600,
  "exp": 1730810400
}
```

---

## Password Hashing

All passwords are hashed using **bcryptjs** with a salt round of 10:
```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

This ensures:
- Passwords are never stored in plaintext
- Verification is done via `bcrypt.compare(plaintext, hash)`
- Hashes are resistant to brute-force attacks

---

## Security Considerations

### 1. Password Security
- Enforced strength requirements (8+ chars, mixed case, numbers)
- Hashed with bcryptjs before storage
- Identical error messages for "email not found" vs "wrong password" (timing attack prevention)

### 2. Token Management
- JWT issued with 7-day expiration
- Token contains user context (sub, email, empresaId, permissions)
- All protected routes require valid JWT in Authorization header (Bearer scheme)

### 3. Multi-Tenant Isolation
- Each user belongs to one primary `Empresa` (company)
- `UserEmpresa` relationship allows future multi-tenant access
- All queries scoped by `empresaId` at service layer

### 4. Logout Implementation
- Currently a placeholder (returns success immediately)
- Production should implement Redis or DB-based token blacklist
- Blacklist entry should include JWT jti/exp for cleanup

---

## Database Schema

### Usuario Table
```prisma
model Usuario {
  id              String   @id @default(uuid())
  empresaId       String
  nombre          String
  email           String   @unique
  passwordHash    String?
  activo          Boolean  @default(true)
  rol             RolUsuario @default(OWNER)
  estadoLegajo    EstadoLegajo @default(APROBADO)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  ...
}
```

### Empresa Table
```prisma
model Empresa {
  id              String   @id @default(uuid())
  nombre          String   @unique
  handle          String?  @unique
  slug            String   @unique
  configuracion   Json
  createdAt       DateTime @default(now())
  ...
}
```

### UserEmpresa Table
```prisma
model UserEmpresa {
  id              String   @id @default(uuid())
  usuarioId       String
  empresaId       String
  role            String   @default("owner")
  createdAt       DateTime @default(now())
  
  @@unique([usuarioId, empresaId])
}
```

---

## Testing

### Unit Tests
Located in: `src/auth/auth-jwt.service.spec.ts`
- Password validation (strength, hash)
- Register validation (email uniqueness, input)
- Login verification
- Logout token handling

### E2E Tests
Located in: `src/auth/auth-jwt.e2e.spec.ts`
- Full registration flow
- Login with credentials
- Profile fetch
- Logout
- Error cases for all endpoints

**Run tests:**
```bash
npm run test                 # Unit tests
npm run test:e2e             # E2E tests
npm run test:cov             # Coverage report
```

---

## Usage Examples

### Frontend Registration
```typescript
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
    nombre: 'John Doe',
    companyName: 'Acme Corp',
  }),
});
const { accessToken, usuario } = await response.json();
localStorage.setItem('token', accessToken);
```

### Protected Requests
```typescript
const response = await fetch('/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
const profile = await response.json();
```

### Logout
```typescript
await fetch('/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
localStorage.removeItem('token');
```

---

## Implementation Notes

### For Future Enhancement

1. **Refresh Tokens**
   - Consider issuing both `accessToken` (short-lived) and `refreshToken` (long-lived)
   - Implement token refresh endpoint to extend sessions without re-login

2. **Token Blacklist**
   - Implement Redis-based blacklist for logout
   - Store in format: `blacklist:${jti}` with TTL = exp time
   - Check blacklist in JWT strategy before accepting token

3. **Rate Limiting**
   - Add rate limiting to /auth/register and /auth/login
   - Prevent brute-force attacks (e.g., max 5 attempts per 15 minutes)

4. **Email Verification**
   - Send verification email on registration
   - Only allow login after email confirmation

5. **Two-Factor Authentication (2FA)**
   - Optional OTP via email or SMS
   - TOTP-based authenticator app support

---

## Troubleshooting

### "Credenciales inválidas"
- Verify email exists in database
- Verify password is correct
- Check account is active (activo = true)

### "Email already exists"
- User with that email is already registered
- Use different email or use login endpoint

### "Token expired"
- JWT is older than 7 days
- User must login again to get a new token

### "Authorization header missing"
- Request must include: `Authorization: Bearer <token>`
- Token must not be expired

---

## Environment Variables

```env
JWT_SECRET=your-secret-key-min-32-chars
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

- `JWT_SECRET`: Used to sign and verify JWT tokens (must be at least 32 characters for security)
- `FRONTEND_URL`: Used for Google OAuth callback redirects
- `DATABASE_URL`: PostgreSQL connection string

