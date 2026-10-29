# API Error Codes Reference

This document lists all HTTP status codes and error codes returned by the Otra Ronda Más API.

## Standard Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": ["Email is required", "Email must be valid"]
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/auth/login",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Success Response Format

All success responses follow this format (optional wrapper):

```json
{
  "data": { /* actual response data */ },
  "message": "Operation successful",
  "meta": {
    "total_count": 100,
    "limit": 20,
    "offset": 0,
    "total_pages": 5
  }
}
```

## HTTP Status Codes

### 2xx - Success

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded (no content to return) |

### 3xx - Redirection

| Code | Status | Meaning |
|------|--------|---------|
| 301 | Moved Permanently | Resource permanently moved |
| 302 | Found | Resource temporarily moved |
| 304 | Not Modified | Resource not modified since last request |

### 4xx - Client Errors

| Code | Status | Meaning | Example |
|------|--------|---------|---------|
| 400 | Bad Request | Request is invalid or malformed | Validation failed, missing required fields |
| 401 | Unauthorized | Authentication required or failed | Missing/invalid JWT token |
| 403 | Forbidden | Authenticated but not authorized | Insufficient permissions, wrong tenant |
| 404 | Not Found | Resource does not exist | User not found, resource deleted |
| 409 | Conflict | Request conflicts with current state | Email already registered, duplicate entry |
| 422 | Unprocessable Entity | Request is well-formed but has semantic errors | Email send failed, payment processing error |
| 429 | Too Many Requests | Rate limit exceeded | More than 100 requests per minute |

### 5xx - Server Errors

| Code | Status | Meaning | Example |
|------|--------|---------|---------|
| 500 | Internal Server Error | Unhandled server error | Database error, null pointer exception |
| 503 | Service Unavailable | Service temporarily unavailable | Database down, external service down |

## Common Error Codes

### Authentication Errors (401)

```json
{
  "statusCode": 401,
  "message": "No authentication token provided",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/protected",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Validation Errors (400)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": ["Email is required"]
    },
    {
      "field": "password",
      "message": ["Password must be at least 8 characters"]
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/auth/login",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Authorization Errors (403)

```json
{
  "statusCode": 403,
  "message": "User role 'SELLER' does not have access. Required roles: OWNER, ADMIN",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/admin/users",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Tenant Isolation Errors (403)

```json
{
  "statusCode": 403,
  "message": "Access denied: You do not have access to this tenant",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/empresa/other-id/data",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Rate Limiting Errors (429)

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/some-endpoint",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Not Found Errors (404)

```json
{
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/users/999",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Conflict Errors (409)

```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/auth/register",
  "correlationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Service Unavailable Errors (503)

```json
{
  "statusCode": 503,
  "status": "unavailable",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "database": "error"
  }
}
```

## Error Handling Guide

### For Client Applications

1. **Always check the status code** - This is the primary indicator of success/failure
2. **Use correlationId for support** - Include this when reporting errors to support
3. **Handle rate limits** - Check response headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
4. **Parse validation errors** - Field-level validation errors are in the `errors` array
5. **Implement retry logic** - For 5xx errors and certain 4xx errors

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2024-01-01T12:01:00.000Z
```

## Logging

All errors are logged with:
- Timestamp
- HTTP method and path
- Status code
- Correlation ID (for tracing)
- Error message

Logs can be filtered by:
- Correlation ID (for tracking a single request across services)
- Status code (for finding all errors of a specific type)
- Time range (for debugging issues during specific periods)
