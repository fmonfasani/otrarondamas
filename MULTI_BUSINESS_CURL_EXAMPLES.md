# Multi-Business API - cURL Examples

Quick reference for testing the multi-business API with curl commands.

## Setup

```bash
# Set variables for easier testing
API="http://localhost:8600"
EMAIL="owner@otrarondamas.test"
PASSWORD="Test123!@#"
```

## 1. Login - Get Initial JWT with empresas[]

```bash
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }' | jq .
```

**Expected Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "empresaId": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  "empresa": {
    "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
    "nombre": "Otra Ronda Más",
    "role": "owner"
  },
  "empresas": [
    {
      "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
      "nombre": "Otra Ronda Más",
      "role": "owner"
    },
    {
      "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
      "nombre": "Test Company 2",
      "role": "admin"
    }
  ],
  "usuario": {
    "id": "u1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
    "email": "owner@otrarondamas.test",
    "nombre": "Owner User",
    "empresaNombre": "Otra Ronda Más",
    "permisos": [
      "create_venta",
      "read_inventario",
      "delete_pedido"
    ],
    "fotoUrl": null,
    "metodoLogin": "password",
    "createdAt": "2026-10-26T10:00:00.000Z",
    "rol": "OWNER",
    "estadoLegajo": "APROBADO"
  }
}
```

**Save token for subsequent requests**:
```bash
TOKEN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL'","password":"'$PASSWORD'"}' | jq -r '.accessToken')

echo "Token: $TOKEN"
```

## 2. Decode JWT to Verify empresas[] Payload

```bash
# Extract JWT payload (without verification)
JWT_PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)

# Add padding if needed
PADDED=$(printf '%s' "$JWT_PAYLOAD" | sed 's/.\{4\}$/&===/')

# Decode base64
echo $PADDED | base64 -d | jq .
```

**Expected JWT Payload**:
```json
{
  "sub": "u1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  "email": "owner@otrarondamas.test",
  "nombre": "Owner User",
  "empresaId": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  "permisos": ["create_venta", "read_inventario", "delete_pedido"],
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario",
  "empresas": [
    {
      "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
      "nombre": "Otra Ronda Más",
      "role": "owner"
    },
    {
      "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
      "nombre": "Test Company 2",
      "role": "admin"
    }
  ],
  "iat": 1698392400,
  "exp": 1698478800
}
```

## 3. Get List of Accessible Empresas

```bash
curl -X GET $API/tenants/my-empresas \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response**:
```json
{
  "empresas": [
    {
      "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
      "nombre": "Otra Ronda Más",
      "role": "owner",
      "createdAt": "2026-10-19T15:30:00.000Z"
    },
    {
      "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
      "nombre": "Test Company 2",
      "role": "admin",
      "createdAt": "2026-10-22T08:15:00.000Z"
    }
  ],
  "current": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b"
}
```

## 4. Switch to Different Empresa

Save the second empresa ID:
```bash
EMPRESA_2=$(curl -s -X GET $API/tenants/my-empresas \
  -H "Authorization: Bearer $TOKEN" | jq -r '.empresas[1].id')

echo "Switching to: $EMPRESA_2"
```

Switch to the segunda empresa:
```bash
curl -X POST $API/auth/switch-empresa/$EMPRESA_2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response** (same shape as login, but with new JWT):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "empresaId": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
  "empresa": {
    "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
    "nombre": "Test Company 2",
    "role": "admin"
  },
  "empresas": [ /* same list */ ],
  "usuario": { /* same user */ }
}
```

**Save new token**:
```bash
TOKEN_2=$(curl -s -X POST $API/auth/switch-empresa/$EMPRESA_2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq -r '.accessToken')

echo "New Token: $TOKEN_2"
```

**Verify switched empresaId in new JWT**:
```bash
JWT_PAYLOAD_2=$(echo $TOKEN_2 | cut -d'.' -f2)
PADDED_2=$(printf '%s' "$JWT_PAYLOAD_2" | sed 's/.\{4\}$/&===/')
echo $PADDED_2 | base64 -d | jq '.empresaId'

# Should output: "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c"
```

## 5. Get User Profile with Fresh Empresa List

```bash
curl -X GET $API/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response**:
```json
{
  "id": "u1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  "email": "owner@otrarondamas.test",
  "nombre": "Owner User",
  "empresaId": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
  "permisos": ["create_venta", "read_inventario"],
  "rol": "OWNER",
  "estadoLegajo": "APROBADO",
  "type": "usuario",
  "empresaNombre": "Otra Ronda Más",
  "fotoUrl": null,
  "metodoLogin": "password",
  "createdAt": "2026-10-26T10:00:00.000Z",
  "empresas": [
    {
      "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
      "nombre": "Otra Ronda Más",
      "role": "owner"
    },
    {
      "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
      "nombre": "Test Company 2",
      "role": "admin"
    }
  ],
  "empresasDetail": [
    {
      "id": "c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b",
      "nombre": "Otra Ronda Más",
      "role": "owner",
      "createdAt": "2026-10-19T15:30:00.000Z"
    },
    {
      "id": "d2b3c4d5-e6f7-48a9-0b1c-2d3e4f5a6b7c",
      "nombre": "Test Company 2",
      "role": "admin",
      "createdAt": "2026-10-22T08:15:00.000Z"
    }
  ]
}
```

## Error Cases

### 6a. Switch to Unauthorized Empresa (401)

```bash
curl -X POST $API/auth/switch-empresa/invalid-empresa-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

**Expected Response (401)**:
```json
{
  "statusCode": 401,
  "message": "No tienes acceso a esta empresa",
  "error": "Unauthorized"
}
```

### 6b. Missing Authorization Header (401)

```bash
curl -X GET $API/tenants/my-empresas | jq .
```

**Expected Response (401)**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 6c. Invalid Credentials (401)

```bash
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "WrongPassword"
  }' | jq .
```

**Expected Response (401)**:
```json
{
  "statusCode": 401,
  "message": "Credenciales inválidas"
}
```

## Bash Script for Full Test

```bash
#!/bin/bash

API="http://localhost:8600"
EMAIL="owner@otrarondamas.test"
PASSWORD="Test123!@#"

echo "=== 1. Login ==="
RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL'","password":"'$PASSWORD'"}')

echo $RESPONSE | jq .

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
echo "Token obtained: ${TOKEN:0:50}..."

echo ""
echo "=== 2. Get My Empresas ==="
curl -s -X GET $API/tenants/my-empresas \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "=== 3. Get My Profile ==="
curl -s -X GET $API/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "Test Complete!"
```

## Quick Test One-Liner

```bash
# Login and print empresas count
curl -s -X POST http://localhost:8600/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@otrarondamas.test","password":"Test123!@#"}' | \
  jq '.empresas | length'

# Login and list empresa names
curl -s -X POST http://localhost:8600/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@otrarondamas.test","password":"Test123!@#"}' | \
  jq '.empresas[].nombre'
```

## Tools for JWT Inspection

### Online (not recommended for production)
- https://jwt.io (paste token to decode and verify)

### Command Line
```bash
# Using jq (already used above)
JWT_PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
echo $JWT_PAYLOAD | base64 -d | jq .

# Using Python
echo $TOKEN | python3 -c "import sys, json, base64; token = sys.stdin.read().strip(); parts = token.split('.'); payload = parts[1]; padding = '=' * (4 - len(payload) % 4); print(json.dumps(json.loads(base64.urlsafe_b64decode(payload + padding)), indent=2))"

# Using Node.js
node -e "const t='$TOKEN'.split('.')[1]; console.log(JSON.stringify(JSON.parse(Buffer.from(t, 'base64').toString()), null, 2))"
```

## Testing Checklist

- [ ] Login returns JWT with `empresas[]` array
- [ ] JWT payload includes all accessible empresas
- [ ] Current `empresaId` matches login response
- [ ] GET /tenants/my-empresas lists all empresas
- [ ] POST /auth/switch-empresa/:id switches empresa
- [ ] New JWT after switch has updated `empresaId`
- [ ] Switching to unauthorized empresa returns 401
- [ ] GET /auth/me includes fresh `empresasDetail`
- [ ] Unauthorized requests return 401

## Performance Tips

1. **Cache empresas list** in frontend localStorage
2. **Verify JWT expiration** before making requests
3. **Avoid frequent switches** - implement a minimum delay
4. **Batch requests** when operating across empresas
5. **Monitor token size** - empresas[] increases JWT size slightly
