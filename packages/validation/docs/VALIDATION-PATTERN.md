# Validation Patterns for Remix & API

Complete examples of how to use centralized Zod validation across the monorepo.

## Remix Server Action Pattern

### Basic Form Validation with Errors

```typescript
// app/routes/auth.login.tsx
import { json, redirect, type ActionFunction } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import {
  LoginSchema,
  safeValidate,
  type Login,
} from '@otrarondamas/validation';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Validate
  const result = safeValidate(LoginSchema, data);

  if (!result.success) {
    return json(
      {
        ok: false,
        fieldErrors: result.errors,
      },
      { status: 400 }
    );
  }

  // Process validated data
  try {
    const { accessToken, usuario } = await authenticateUser(result.data);

    // Store token in session
    const session = await getSession(request);
    session.set('token', accessToken);

    return redirect('/dashboard', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (error) {
    return json(
      {
        ok: false,
        fieldErrors: {
          _root: ['Invalid credentials'],
        },
      },
      { status: 401 }
    );
  }
};

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const fieldErrors = actionData?.fieldErrors || {};

  return (
    <Form method="POST" className="login-form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={!!fieldErrors.email}
          aria-describedby={
            fieldErrors.email ? 'email-error' : undefined
          }
        />
        {fieldErrors.email && (
          <span id="email-error" className="error">
            {fieldErrors.email[0]}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          aria-invalid={!!fieldErrors.password}
          aria-describedby={
            fieldErrors.password ? 'password-error' : undefined
          }
        />
        {fieldErrors.password && (
          <span id="password-error" className="error">
            {fieldErrors.password[0]}
          </span>
        )}
      </div>

      {fieldErrors._root && (
        <div className="error" role="alert">
          {fieldErrors._root[0]}
        </div>
      )}

      <button type="submit">Login</button>
    </Form>
  );
}
```

## Client-Side Validation

### React Hook Form Integration

```typescript
// app/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type Login } from '@otrarondamas/validation';
import { useFetcher } from '@remix-run/react';

export function LoginForm() {
  const { register, formState: { errors }, handleSubmit } = useForm<Login>({
    resolver: zodResolver(LoginSchema),
    mode: 'onBlur',
  });

  const fetcher = useFetcher<typeof action>();

  const onSubmit = async (data: Login) => {
    // Send to server action
    fetcher.submit(data, { method: 'POST' });
  };

  return (
    <fetcher.Form method="POST" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <button type="submit">Login</button>
    </fetcher.Form>
  );
}
```

## Multi-Step Form with Nested Validation

```typescript
// app/routes/checkout.tsx
import { json, type ActionFunction } from '@remix-run/node';
import { CheckoutSchema, safeValidate } from '@otrarondamas/validation';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  
  // Combine nested form data
  const data = {
    nome: formData.get('nome'),
    email: formData.get('email'),
    telefono: formData.get('telefono'),
    direccion: formData.get('direccion'),
    items: JSON.parse(formData.get('items') as string),
    medioPago: formData.get('medioPago'),
    numeroTarjeta: formData.get('numeroTarjeta'),
    fechaVencimiento: formData.get('fechaVencimiento'),
    cvv: formData.get('cvv'),
  };

  const result = safeValidate(CheckoutSchema, data);

  if (!result.success) {
    return json(
      { ok: false, fieldErrors: result.errors },
      { status: 400 }
    );
  }

  // Process order
  const order = await createOrder(result.data);

  return json({ ok: true, orderId: order.id });
};
```

## NestJS Controller Pattern

```typescript
// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { LoginSchema, safeValidate } from '@otrarondamas/validation';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    // Validate incoming data
    const result = safeValidate(LoginSchema, body);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.errors,
      });
    }

    // Process validated data
    try {
      return await this.authService.login(result.data);
    } catch (error) {
      throw new BadRequestException('Invalid credentials');
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    const result = safeValidate(RegisterSchema, body);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.errors,
      });
    }

    return await this.authService.register(result.data);
  }
}
```

## Service Layer Validation

```typescript
// apps/api/src/sales/sales.service.ts
import { Injectable } from '@nestjs/common';
import {
  CreateSaleSchema,
  safeValidate,
  type CreateSale,
} from '@otrarondamas/validation';

@Injectable()
export class SalesService {
  async createSale(input: unknown, empresaId: string) {
    // Validate
    const result = safeValidate(CreateSaleSchema, input);

    if (!result.success) {
      throw new ValidationError('Invalid sale data', result.errors);
    }

    const saleData = result.data;

    // Business logic with validated data
    const sale = await this.prisma.venta.create({
      data: {
        empresaId,
        canal: saleData.canal,
        clienteId: saleData.clienteId,
        items: {
          create: saleData.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            descuentoItem: item.descuentoItem || 0,
          })),
        },
        idempotencyKey: saleData.idempotencyKey,
      },
    });

    return sale;
  }
}
```

## Conditional Validation

```typescript
// app/routes/payment.tsx
import { CheckoutSchema } from '@otrarondamas/validation';
import { z } from 'zod';

// Extend schema with conditional validation
const PaymentValidationSchema = CheckoutSchema.refine(
  (data) => {
    if (data.medioPago === 'tarjeta') {
      return !!(data.numeroTarjeta && data.cvv);
    }
    return true;
  },
  {
    message: 'Card details required for card payments',
    path: ['numeroTarjeta'],
  }
);

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const result = safeValidate(PaymentValidationSchema, Object.fromEntries(formData));

  if (!result.success) {
    return json({ fieldErrors: result.errors }, { status: 400 });
  }

  // Process payment
};
```

## Error Display Component

```typescript
// app/components/FormErrors.tsx
import type { FC } from 'react';

interface FormErrorsProps {
  errors: Record<string, string[]>;
  fieldName: string;
}

export const FormErrors: FC<FormErrorsProps> = ({ errors, fieldName }) => {
  const fieldErrors = errors[fieldName];

  if (!fieldErrors || fieldErrors.length === 0) {
    return null;
  }

  return (
    <div className="form-errors" role="alert">
      {fieldErrors.map((error, index) => (
        <p key={index} className="error-message">
          {error}
        </p>
      ))}
    </div>
  );
};

// Usage:
<FormErrors errors={fieldErrors} fieldName="email" />
```

## Testing Validation

```typescript
// app/routes/__tests__/auth.login.test.ts
import { LoginSchema, safeValidate } from '@otrarondamas/validation';

describe('Login validation', () => {
  it('should accept valid credentials', () => {
    const data = {
      email: 'user@example.com',
      password: 'Password123',
    };

    const result = safeValidate(LoginSchema, data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject invalid email', () => {
    const result = safeValidate(LoginSchema, {
      email: 'not-an-email',
      password: 'Password123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it('should reject empty password', () => {
    const result = safeValidate(LoginSchema, {
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.password).toBeDefined();
    }
  });
});
```

## API Error Response

```typescript
// Standard API error format

interface ApiErrorResponse {
  ok: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  timestamp?: string;
}

// Example validation error response:
{
  "ok": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email inválido"],
    "password": ["La contraseña debe tener al menos 6 caracteres"]
  }
}

// Usage in controller:
throw new BadRequestException({
  message: 'Validation failed',
  errors: result.errors,
});
```

## Advanced: Custom Validation

```typescript
// packages/validation/src/custom.ts
import { z } from 'zod';

// Custom validator for stock availability
export const StockCheckSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().positive(),
  empresaId: z.string().uuid(),
}).refine(
  async (data) => {
    // Check stock in database
    const stock = await checkStock(data.productoId, data.empresaId);
    return stock >= data.cantidad;
  },
  {
    message: 'Insufficient stock',
    path: ['cantidad'],
  }
);

// Usage:
const result = await StockCheckSchema.parseAsync(data);
```

## Migration Checklist

When migrating existing validation to use this package:

- [ ] Identify all existing validation files in the app
- [ ] Map existing schemas to new @otrarondamas/validation schemas
- [ ] Update imports in action handlers
- [ ] Update imports in service classes
- [ ] Update error handling to use new format
- [ ] Update tests to use new schemas
- [ ] Remove old validation files
- [ ] Test forms end-to-end
- [ ] Verify error messages match design system
