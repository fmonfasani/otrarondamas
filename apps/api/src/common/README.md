# Common Module

## Overview

The Common module provides shared infrastructure components for consistent error handling, validation, security, and monitoring across the entire API.

## Structure

```
common/
├── decorators/          # Custom decorators for routes and parameters
│   ├── auth.decorator.ts           # @Auth() - Requires JWT
│   ├── roles.decorator.ts          # @Roles() - Role-based access
│   ├── tenant.decorator.ts         # @Tenant(), @EnforceTenant() - Tenant isolation
│   └── pagination.decorator.ts     # @Pagination() - Pagination params
├── dtos/               # Standard Data Transfer Objects
│   ├── error-response.dto.ts       # Standardized error response
│   ├── success-response.dto.ts     # Standardized success response
│   └── pagination.dto.ts           # Pagination metadata
├── filters/           # Exception filters
│   └── http-exception.filter.ts   # Global HTTP exception handler
├── guards/            # Route guards
│   ├── auth.guard.ts              # Authentication verification
│   ├── roles.guard.ts             # Role-based authorization
│   └── tenant.guard.ts            # Tenant isolation enforcement
├── middleware/        # Express middleware
│   ├── correlation-id.middleware.ts    # Correlation ID tracking
│   ├── request-logger.middleware.ts    # Request/response logging
│   └── rate-limiter.middleware.ts      # Rate limiting (100 req/min)
├── pipes/            # Validation pipes
│   └── validation.pipe.ts         # DTO validation
├── common.module.ts   # Module definition
├── README.md          # This file
├── API-ERROR-CODES.md # Error codes reference
├── HEALTH-CHECK.md    # Health check specification
├── RESPONSE-FORMAT.md # Standard response format
└── RATE-LIMITING.md   # Rate limiting policy
```

## Quick Start

### 1. Register Common Module

In your app.module.ts or feature module:

```typescript
import { CommonModule } from './common/common.module';

@Module({
  imports: [CommonModule],
})
export class AppModule {}
```

### 2. Use in Main.ts (Already Done)

Exception filter and middleware are registered in main.ts:

```typescript
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  CorrelationIdMiddleware,
  RequestLoggerMiddleware,
  RateLimiterMiddleware,
} from './common/middleware';

// In bootstrap():
app.useGlobalFilters(new HttpExceptionFilter());
app.use(new CorrelationIdMiddleware().use);
app.use(new RequestLoggerMiddleware().use);
app.use(new RateLimiterMiddleware().use);
```

## Components

### Decorators

#### @Auth()
Requires user to be authenticated (JWT token present).

```typescript
@Auth()
@Get('protected')
getProtected() {
  return { message: 'Only authenticated users' };
}
```

#### @Roles(...roles)
Restricts access to users with specific roles.

```typescript
@Roles('OWNER', 'ADMIN')
@Get('admin-only')
getAdminOnly() {
  return { message: 'Only OWNER and ADMIN' };
}
```

#### @Tenant()
Injects the user's empresaId from JWT token.

```typescript
@Get('my-data')
getMyData(@Tenant() empresaId: string) {
  return { empresaId };
}
```

#### @EnforceTenant()
Enforces tenant isolation on a route.

```typescript
@EnforceTenant()
@Get('empresa/:empresaId/data')
getEmpresaData(@Param('empresaId') empresaId: string) {
  return { empresaId };
}
```

#### @Pagination()
Validates limit/offset query parameters.

```typescript
@Get('items')
getItems(
  @Pagination() pagination: { limit: number; offset: number }
) {
  // pagination.limit, pagination.offset
}
```

### DTOs

#### ErrorResponseDto
Used in HTTP exception filter responses.

```typescript
{
  statusCode: 400,
  message: "Validation failed",
  errors: [{field: "email", message: ["Email is required"]}],
  timestamp: "2024-01-01T12:00:00.000Z",
  path: "/api/auth/login",
  correlationId: "uuid-here"
}
```

#### SuccessResponseDto
Wrap successful responses.

```typescript
import { SuccessResponseDto } from './common/dtos';

@Get(':id')
async getUser(@Param('id') id: string) {
  const user = await this.usersService.findOne(id);
  return new SuccessResponseDto(user, 'User retrieved successfully');
}
```

#### PaginationDto & PaginationMeta
For paginated list endpoints.

```typescript
import { PaginationMeta } from './common/dtos';

@Get()
async listUsers(
  @Query('limit') limit = 20,
  @Query('offset') offset = 0,
) {
  const { items, total } = await this.usersService.list(limit, offset);
  const meta = new PaginationMeta(total, limit, offset);
  return new SuccessResponseDto(items, 'Users retrieved', meta);
}
```

### Exception Filter

The `HttpExceptionFilter` is registered globally and catches all HTTP exceptions.

**Handles:**
- HttpException
- BadRequestException
- UnauthorizedException
- ForbiddenException
- NotFoundException
- And all other NestJS HTTP exceptions

**Features:**
- Standardized error responses
- Field-level validation error extraction
- Correlation ID tracking
- Appropriate logging by status code
- Timestamps in ISO 8601 format

### Guards

#### AuthGuard
Verifies JWT token is present and user is authenticated.

#### RolesGuard
Checks if user has required role(s). Used with @Roles decorator.

#### TenantGuard
Enforces tenant isolation by validating empresaId. Used with @EnforceTenant decorator.

### Middleware

#### CorrelationIdMiddleware
- Adds unique request ID for tracking
- Generates UUID if not in header
- Adds X-Correlation-ID to response headers

#### RequestLoggerMiddleware
- Logs all requests with method, path, status, duration
- Logs to appropriate level based on status code (error, warn, log, debug)
- Includes correlation ID in logs

#### RateLimiterMiddleware
- Enforces 100 requests per minute per IP
- Adds rate limit headers to all responses
- Returns 429 when limit exceeded
- Extracts client IP from X-Forwarded-For header

### Validation Pipe

The API uses class-validator for DTO validation. Validation is enabled globally in main.ts.

**Features:**
- Validates all DTO properties
- Returns detailed field-level errors
- Whitelist mode (forbids extra properties)
- Automatic type transformation

## Error Handling Flow

```
Request
  ↓
Correlation ID Middleware (add request ID)
  ↓
Request Logger Middleware (log request)
  ↓
Rate Limiter Middleware (check rate limit)
  ↓
Controller/Service (throws exception)
  ↓
HTTP Exception Filter (catch & format)
  ↓
Response (standard error format)
```

## Standard Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Validation error |
| 401 | No authentication |
| 403 | No authorization |
| 404 | Not found |
| 409 | Conflict |
| 422 | Semantic error |
| 429 | Rate limited |
| 500 | Server error |
| 503 | Service unavailable |

## Response Headers

All responses include:

```
X-Correlation-ID: {uuid}
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2024-01-01T12:01:00.000Z
```

## Examples

### Example 1: Create User with Validation

```typescript
import { Post, Body, HttpCode } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { SuccessResponseDto } from './common/dtos';

@Public()
@Post('register')
@HttpCode(201)
async register(@Body() dto: RegisterDto) {
  const user = await this.authService.register(dto);
  return new SuccessResponseDto(user, 'User registered successfully');
}
```

**Error Response (validation fails):**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {"field": "email", "message": ["Email must be valid"]},
    {"field": "password", "message": ["Password too short"]}
  ],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/auth/register",
  "correlationId": "uuid-here"
}
```

### Example 2: Protected Route with Roles

```typescript
import { Get, UseGuards } from '@nestjs/common';
import { Roles } from './common/decorators';

@Roles('OWNER', 'ADMIN')
@Get('admin/stats')
async getAdminStats() {
  return { sales: 10000, users: 150 };
}
```

**Unauthorized Error (wrong role):**
```json
{
  "statusCode": 403,
  "message": "User role 'SELLER' does not have access. Required roles: OWNER, ADMIN",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/admin/stats",
  "correlationId": "uuid-here"
}
```

### Example 3: Tenant-Isolated Route

```typescript
@EnforceTenant()
@Get('empresa/:empresaId/data')
async getEmpresaData(
  @Param('empresaId') empresaId: string,
  @Tenant() userEmpresaId: string,
) {
  // userEmpresaId === empresaId is guaranteed by TenantGuard
  return await this.service.getByEmpresa(empresaId);
}
```

### Example 4: Paginated List

```typescript
import { Get, Query } from '@nestjs/common';
import { SuccessResponseDto, PaginationMeta } from './common/dtos';

@Get()
async list(
  @Query('limit') limit = 20,
  @Query('offset') offset = 0,
) {
  const { items, total } = await this.service.list(limit, offset);
  const meta = new PaginationMeta(total, limit, offset);
  return new SuccessResponseDto(items, 'Items retrieved', meta);
}
```

**Response:**
```json
{
  "data": [
    {"id": "1", "name": "Item 1"},
    {"id": "2", "name": "Item 2"}
  ],
  "message": "Items retrieved",
  "meta": {
    "total_count": 100,
    "limit": 20,
    "offset": 0,
    "total_pages": 5
  }
}
```

## Documentation

- [API Error Codes](./API-ERROR-CODES.md) - Comprehensive error code reference
- [Health Check](./HEALTH-CHECK.md) - Health check endpoint specification
- [Response Format](./RESPONSE-FORMAT.md) - Standard response format guide
- [Rate Limiting](./RATE-LIMITING.md) - Rate limiting policy and best practices

## Testing

### Unit Tests

Run unit tests for common components:

```bash
npm test -- src/common
```

### E2E Tests

Health check E2E tests:

```bash
npm run test:e2e -- health.controller.e2e-spec.ts
```

## Migration Guide

### For Existing Controllers

1. **Remove manual error handling** - The filter handles it automatically
2. **Add decorators** - Use @Auth(), @Roles(), @Tenant() as needed
3. **Use SuccessResponseDto** - For consistent response format
4. **Use standard status codes** - Reference the status code table

### Example Migration

**Before:**
```typescript
@Post('users')
async createUser(@Body() dto: CreateUserDto) {
  if (!dto.email) {
    throw new BadRequestException('Email required');
  }
  const user = await this.usersService.create(dto);
  return { id: user.id, email: user.email };
}
```

**After:**
```typescript
@Post('users')
async createUser(@Body() dto: CreateUserDto) {
  // Validation handled by ValidationPipe
  const user = await this.usersService.create(dto);
  return new SuccessResponseDto(user, 'User created successfully');
}
```

## Best Practices

1. **Always use DTOs** - For validation and type safety
2. **Leverage decorators** - For security and authorization
3. **Use SuccessResponseDto** - For consistent responses
4. **Include correlation IDs** - In logs for tracing
5. **Monitor rate limits** - Track X-RateLimit-Remaining
6. **Test error cases** - Verify proper error formatting
7. **Document endpoints** - Include in Swagger/OpenAPI

## Performance Considerations

- **Correlation ID**: ~1-2ms per request (UUID generation)
- **Request Logging**: ~2-5ms per request (I/O operations)
- **Rate Limiter**: ~1-2ms per request (Map lookup)
- **Validation**: ~5-50ms per request (depends on DTO complexity)

## Future Enhancements

- [ ] Circuit breaker for external services
- [ ] Request/response compression
- [ ] Request timeout enforcement
- [ ] Distributed rate limiting (Redis-backed)
- [ ] Request signature validation
- [ ] Custom error codes for specific errors
- [ ] Metrics collection (Prometheus)
- [ ] Distributed tracing (OpenTelemetry)

## Support

For issues or questions about the Common module:

1. Check the documentation in this folder
2. Review example usage in the codebase
3. Check unit and E2E tests for implementation details
