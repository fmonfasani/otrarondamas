# Route Integration Examples

## Complete Implementation Examples

### Example 1: Simple Protected Dashboard Route

**File:** `routes/$lang.dashboard.vendedor.tsx`

```typescript
import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { createProtectedLoader } from '~/utils/route-guards.server';

interface VendedorLoaderData {
  tenantContext: any;
  locale: string;
  ventas: any[];
}

export const loader: LoaderFunction = async ({ request, params }) => {
  return createProtectedLoader(
    async (context) => {
      // Fetch seller-specific data
      // In production: call API with context.token and context.tenantContext.empresaId
      const ventas = []; // fetchVentas(context.tenantContext.empresaId);

      return {
        ventas,
      };
    },
    { fallbackLocale: (params.lang as string) || 'es' }
  )(
    { request, params } as any
  );
};

export const meta: MetaFunction = () => [
  { title: 'Vendedor - Wapsell' },
  { name: 'description', content: 'Dashboard del vendedor' },
];

export default function VendedorPage() {
  const { tenantContext, ventas, locale } = useLoaderData<VendedorLoaderData>();
  const { lang } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {lang === 'es' ? 'Mi Dashboard' : 'My Dashboard'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">
            {lang === 'es' ? 'Ventas Totales' : 'Total Sales'}
          </h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${ventas.length * 100}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">
            {lang === 'es' ? 'Órdenes' : 'Orders'}
          </h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {ventas.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium">
            {lang === 'es' ? 'Empresa Actual' : 'Current Business'}
          </h3>
          <p className="text-lg font-bold text-gray-900 mt-2">
            {tenantContext.empresaId}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Protected Action Handler

**File:** `routes/$lang.dashboard.productos.agregar.tsx`

```typescript
import type { ActionFunction, LoaderFunction, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useParams } from '@remix-run/react';
import { Form } from '@remix-run/react';
import { createProtectedAction, createProtectedLoader } from '~/utils/route-guards.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  return createProtectedLoader(
    undefined,
    { fallbackLocale: (params.lang as string) || 'es' }
  )(
    { request, params } as any
  );
};

export const action: ActionFunction = async ({ request, params }) => {
  return createProtectedAction(
    async (context) => {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
      }

      const formData = await request.formData();
      const nombre = formData.get('nombre');
      const precio = formData.get('precio');
      const stock = formData.get('stock');

      // Validate inputs
      if (!nombre || !precio || !stock) {
        return json(
          { error: 'Todos los campos son requeridos' },
          { status: 400 }
        );
      }

      // In production: API call with JWT token
      // await createProductoAPI(
      //   context.tenantContext.empresaId,
      //   { nombre, precio, stock },
      //   context.token
      // );

      const locale = (params.lang as string) || 'es';
      return redirect(`/${locale}/dashboard/productos`);
    },
    { allowedMethods: ['POST'] }
  )(
    { request, params } as any
  );
};

export const meta: MetaFunction = () => [
  { title: 'Agregar Producto - Wapsell' },
];

export default function AgregarProducto() {
  const { lang } = useParams();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {lang === 'es' ? 'Agregar Producto' : 'Add Product'}
      </h1>

      <Form method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {lang === 'es' ? 'Nombre' : 'Name'}
          </label>
          <input
            type="text"
            name="nombre"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {lang === 'es' ? 'Precio' : 'Price'}
          </label>
          <input
            type="number"
            name="precio"
            step="0.01"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {lang === 'es' ? 'Stock' : 'Stock'}
          </label>
          <input
            type="number"
            name="stock"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {lang === 'es' ? 'Crear Producto' : 'Create Product'}
        </button>
      </Form>
    </div>
  );
}
```

### Example 3: Tenant-Specific API Call

**File:** `routes/$lang.dashboard.reportes.tsx`

```typescript
import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { requireAuthContext } from '~/utils/route-guards.server';

interface ReportesData {
  tenantContext: any;
  locale: string;
  reportes: any[];
  error?: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  try {
    // Get auth context with full validation
    const authContext = await requireAuthContext(request, params);
    const locale = (params.lang as string) || 'es';

    // Fetch data for this tenant only
    // URL includes tenant ID from authContext
    // const response = await fetch(
    //   `${process.env.VITE_API_URL}/empresas/${authContext.tenantContext.empresaId}/reportes`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${authContext.token}`,
    //     },
    //   }
    // );

    // const reportes = await response.json();

    return json({
      tenantContext: authContext.tenantContext,
      locale,
      reportes: [],
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const locale = (params.lang as string) || 'es';
    return redirect(`/${locale}/auth/login`);
  }
};

export const meta: MetaFunction = () => [
  { title: 'Reportes - Wapsell' },
];

export default function ReportesPage() {
  const { tenantContext, reportes, locale } = useLoaderData<ReportesData>();
  const { lang } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {lang === 'es' ? 'Reportes' : 'Reports'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          {lang === 'es'
            ? `Reportes para ${tenantContext.empresaId}`
            : `Reports for ${tenantContext.empresaId}`}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold">
                {lang === 'es' ? 'Nombre' : 'Name'}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                {lang === 'es' ? 'Tipo' : 'Type'}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                {lang === 'es' ? 'Fecha' : 'Date'}
              </th>
            </tr>
          </thead>
          <tbody>
            {reportes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  {lang === 'es'
                    ? 'No hay reportes disponibles'
                    : 'No reports available'}
                </td>
              </tr>
            ) : (
              reportes.map((report: any) => (
                <tr key={report.id} className="border-b">
                  <td className="px-6 py-4">{report.nombre}</td>
                  <td className="px-6 py-4">{report.tipo}</td>
                  <td className="px-6 py-4">{report.fecha}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Example 4: Multi-Step Form with Tenant Isolation

**File:** `routes/$lang.dashboard.pedidos.crear.tsx`

```typescript
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData, useParams, useNavigation } from '@remix-run/react';
import { createProtectedAction, createProtectedLoader } from '~/utils/route-guards.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  return createProtectedLoader(
    async (context) => {
      // Fetch products for this tenant only
      // const products = await fetchProductos(context.tenantContext.empresaId, context.token);
      return { products: [] };
    },
    { fallbackLocale: (params.lang as string) || 'es' }
  )(
    { request, params } as any
  );
};

export const action: ActionFunction = async ({ request, params }) => {
  return createProtectedAction(
    async (context) => {
      const formData = await request.formData();
      const items = JSON.parse(formData.get('items') as string);

      // Create order for this tenant
      // const order = await createPedido(
      //   context.tenantContext.empresaId,
      //   { items },
      //   context.token
      // );

      const locale = (params.lang as string) || 'es';
      return redirect(`/${locale}/dashboard/pedidos`);
    },
    { allowedMethods: ['POST'] }
  )(
    { request, params } as any
  );
};

export default function CrearPedido() {
  const { products } = useLoaderData();
  const { lang } = useParams();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {lang === 'es' ? 'Crear Pedido' : 'Create Order'}
      </h1>

      <Form method="post" className="space-y-6">
        {/* Secure order creation - tenant ID from context only */}
        <input type="hidden" name="tenantId" />

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {lang === 'es' ? 'Productos' : 'Products'}
          </h2>

          <div className="space-y-3">
            {products.map((product: any) => (
              <label key={product.id} className="flex items-center gap-3">
                <input type="checkbox" name={`product-${product.id}`} />
                <span>{product.nombre}</span>
                <span className="ml-auto text-gray-600">${product.precio}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isSubmitting
            ? lang === 'es'
              ? 'Creando...'
              : 'Creating...'
            : lang === 'es'
            ? 'Crear Pedido'
            : 'Create Order'}
        </button>
      </Form>
    </div>
  );
}
```

## Testing Patterns

### Mock Protected Loader

```typescript
import { createMemorySessionStorage } from '@remix-run/node';

const mockSession = new Map();

export async function createMockSession(data: Record<string, any>) {
  const storage = createMemorySessionStorage({
    cookie: { secrets: ['test-secret'] },
  });

  const session = await storage.getSession();
  
  Object.entries(data).forEach(([key, value]) => {
    session.set(key, value);
  });

  return session;
}
```

### Test Protected Route

```typescript
import { json } from '@remix-run/node';

describe('Protected Routes', () => {
  it('should redirect unauthenticated users to login', async () => {
    const response = await loader({
      request: new Request('http://localhost/es/dashboard'),
      params: { lang: 'es' },
      context: {},
    } as any);

    expect(response).toEqual(
      expect.objectContaining({
        status: expect.any(Number),
      })
    );
  });
});
```

## API Integration Checklist

- [ ] Extract tenantContext from request
- [ ] Include empresaId in API URL path or query params
- [ ] Pass JWT token in Authorization header
- [ ] Validate response belongs to current tenant
- [ ] Handle 403 Forbidden for unauthorized access
- [ ] Handle 404 Not Found (may indicate wrong tenant)
- [ ] Refresh JWT if expired (401 response)
- [ ] Log all cross-tenant access attempts

## Security Best Practices

1. **Always validate tenant context** before accessing protected data
2. **Never trust client-provided tenant IDs** - extract from JWT
3. **Use requireTenant()** for routes with specific tenant requirements
4. **Validate ownership** when accessing nested resources
5. **Log suspicious access patterns** for security audit
6. **Use HTTPS in production** for all authenticated requests
7. **Rotate session secrets** regularly
8. **Monitor for token expiration** and refresh automatically
