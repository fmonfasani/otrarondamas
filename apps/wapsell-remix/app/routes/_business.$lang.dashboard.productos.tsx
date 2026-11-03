import { LoaderFunction, ActionFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ProductList } from '~/components/products/ProductList';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  await requireAuth(request);

  // Mock products data for now
  const products: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      price: 29.99,
      stock: 100,
    },
    {
      id: '2',
      name: 'Product 2',
      price: 49.99,
      stock: 50,
    },
    {
      id: '3',
      name: 'Product 3',
      price: 79.99,
      stock: 25,
    },
  ];

  return json({ products });
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const name = formData.get('name');
    const price = formData.get('price');
    const stock = formData.get('stock');

    try {
      // TODO: Integrate with actual API
      if (!name || !price || !stock) {
        return json({ error: 'Missing required fields' }, { status: 400 });
      }

      return redirect(`/${params.lang}/dashboard/productos`);
    } catch (error) {
      return json({ error: 'Failed to create product' }, { status: 500 });
    }
  }

  return null;
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-2">Gestión de productos</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          + Crear Producto
        </button>
      </div>

      <ProductList products={products} />
    </div>
  );
}
