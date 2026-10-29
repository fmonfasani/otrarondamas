# @otrarondamas/validation

Centralized Zod validation schemas for Otra Ronda Más - unified validation across API, POS, Dashboard, and Online Store.

## Features

- **Centralized schemas** for all forms and API inputs
- **Type-safe inference** with TypeScript
- **Reusable common schemas** (email, phone, currency, etc.)
- **Domain-specific validation** (auth, sales, inventory, etc.)
- **Utility functions** for safe parsing and error handling
- **Remix integration patterns** included

## Installation

This package is internal to the monorepo. No installation needed - configure in `tsconfig.base.json`:

```json
{
  "paths": {
    "@otrarondamas/validation": ["./packages/validation/src"]
  }
}
```

## Quick Start

### Basic Usage

```typescript
import {
  LoginSchema,
  safeValidate,
  formatErrors,
} from '@otrarondamas/validation';

// Validate data
const result = safeValidate(LoginSchema, {
  email: 'user@example.com',
  password: 'password123',
});

if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.log('Errors:', result.errors);
}
```

### Remix Action Pattern

```typescript
import { json, redirect, type ActionFunction } from '@remix-run/node';
import { LoginSchema, safeValidate } from '@otrarondamas/validation';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Validate
  const result = safeValidate(LoginSchema, data);

  if (!result.success) {
    return json({ errors: result.errors }, { status: 400 });
  }

  // Process validated data
  const user = await authenticateUser(result.data);

  if (!user) {
    return json(
      { errors: { email: ['Invalid credentials'] } },
      { status: 401 }
    );
  }

  return redirect('/dashboard');
};
```

### Client-Side Form Validation

```typescript
import { useActionData } from '@remix-run/react';
import { LoginSchema } from '@otrarondamas/validation';
import { useState } from 'react';

export default function LoginForm() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const actionData = useActionData<typeof action>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validate on change
    const schema = LoginSchema.pick({
      [name]: true,
    });
    const result = safeValidate(schema, { [name]: value });

    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } else {
      setErrors((prev) => ({
        ...prev,
        ...result.errors,
      }));
    }
  };

  return (
    <form method="POST">
      <input
        name="email"
        type="email"
        onChange={handleChange}
        aria-invalid={!!errors.email}
      />
      {errors.email && <span>{errors.email[0]}</span>}

      <input
        name="password"
        type="password"
        onChange={handleChange}
        aria-invalid={!!errors.password}
      />
      {errors.password && <span>{errors.password[0]}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

## Validation Schemas

### Common Schemas

```typescript
// Email validation
import { EmailSchema, type Email } from '@otrarondamas/validation';

// Password validation (basic)
import { PasswordSchema, type Password } from '@otrarondamas/validation';

// Strong password (with special chars)
import { StrongPasswordSchema } from '@otrarondamas/validation';

// Other common fields
import {
  NameSchema,
  PhoneSchema,
  AddressSchema,
  CurrencySchema,
  UUIDSchema,
  QuantitySchema,
  PercentageSchema,
} from '@otrarondamas/validation';
```

### Authentication

```typescript
import {
  LoginSchema,
  RegisterSchema,
  OnboardingSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  GoogleOAuthSchema,
} from '@otrarondamas/validation';
```

### Point of Sale (POS)

```typescript
import {
  CreateSaleSchema,
  UpdateCartSchema,
  PaymentSchema,
  CreateCustomerSchema,
  OpenCashRegisterSchema,
  RegisterCashMovementSchema,
} from '@otrarondamas/validation';
```

### Online Store (Tienda)

```typescript
import {
  OrderSchema,
  CheckoutSchema,
  ReviewSchema,
  ProductSearchSchema,
  NewsletterSubscriptionSchema,
} from '@otrarondamas/validation';
```

### Dashboard

```typescript
import {
  UpdateSettingsSchema,
  CreateUserSchema,
  UpdateCompanySettingsSchema,
} from '@otrarondamas/validation';
```

### Admin

```typescript
import {
  CreateTenantSchema,
  CreateProductAdminSchema,
  CreateCategorySchema,
  SystemSettingsSchema,
  AuditLogQuerySchema,
} from '@otrarondamas/validation';
```

## Utility Functions

### `safeValidate(schema, data)`

Safely validate data without throwing exceptions.

```typescript
const result = safeValidate(LoginSchema, data);

if (result.success) {
  // result.data is typed correctly
  processUser(result.data);
} else {
  // result.errors: Record<string, string[]>
  displayErrors(result.errors);
}
```

### `formatErrors(zodError)`

Convert ZodError to readable error object.

```typescript
try {
  LoginSchema.parse(data);
} catch (error) {
  if (error instanceof ZodError) {
    const formatted = formatErrors(error);
    // { email: ['Invalid email'], password: ['Too short'] }
  }
}
```

### `getFirstError(errors, fieldPath)`

Get first error message for a field.

```typescript
const firstError = getFirstError(errors, 'email');
// "Invalid email" or null
```

### `createFormDataObject(formData)`

Convert FormData to plain object for validation.

```typescript
const formData = await request.formData();
const data = createFormDataObject(formData);

const result = safeValidate(LoginSchema, data);
```

### `coerceFormValues(data)`

Convert string form values to appropriate types.

```typescript
const formData = await request.formData();
const data = coerceFormValues(Object.fromEntries(formData));
// "123" -> 123, "true" -> true, etc.
```

### `parseJSON(json, schema)`

Safely parse JSON with validation.

```typescript
const result = parseJSON(jsonString, LoginSchema);

if (result.success) {
  const data = result.data;
} else {
  const errors = result.errors;
}
```

## Type Inference

All schemas support TypeScript type inference:

```typescript
import { LoginSchema, type Login } from '@otrarondamas/validation';

// Type is automatically inferred
type LoginForm = Login;

// Use in functions
async function handleLogin(data: Login) {
  // data.email and data.password are typed correctly
}
```

## Custom Schemas

Extend common schemas for specific use cases:

```typescript
import { z } from 'zod';
import { EmailSchema, PasswordSchema } from '@otrarondamas/validation';

const CustomLoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  rememberMe: z.boolean().default(false),
});

type CustomLogin = z.infer<typeof CustomLoginSchema>;
```

## Error Handling Best Practices

### In Remix Actions

```typescript
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const result = safeValidate(MySchema, Object.fromEntries(formData));

  if (!result.success) {
    return json(
      { formError: true, fieldErrors: result.errors },
      { status: 400 }
    );
  }

  // Process...
};
```

### In Components

```typescript
export default function Form() {
  const { fieldErrors = {} } = useActionData<typeof action>() || {};

  return (
    <input
      name="email"
      aria-invalid={fieldErrors.email ? true : undefined}
    />
  );
}
```

### In API Routes (NestJS)

```typescript
import { safeValidate, CreateSaleSchema } from '@otrarondamas/validation';

@Post()
async createSale(@Body() body: any) {
  const result = safeValidate(CreateSaleSchema, body);

  if (!result.success) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors: result.errors,
    });
  }

  return await this.salesService.create(result.data);
}
```

## Migration from Local Validation

If you have local validation files, migrate to this package:

### Before

```typescript
// apps/wapsell-remix/app/utils/validation.ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

### After

```typescript
// Import from centralized package
import { LoginSchema } from '@otrarondamas/validation';

// Or import and rename
import { LoginSchema as RemixLoginSchema } from '@otrarondamas/validation';
```

## Testing

Validate test fixtures:

```typescript
import { LoginSchema, safeValidate } from '@otrarondamas/validation';

describe('LoginSchema', () => {
  it('should accept valid login', () => {
    const result = safeValidate(LoginSchema, {
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = safeValidate(LoginSchema, {
      email: 'invalid-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.errors.email).toBeDefined();
  });
});
```

## See Also

- [Zod Documentation](https://zod.dev)
- [Remix Validation](https://remix.run/docs/en/main/guides/form-validation)
- `apps/api/src/*/dto` for NestJS DTO patterns
- `apps/wapsell-remix/app/routes` for Remix action examples
