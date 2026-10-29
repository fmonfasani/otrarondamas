/**
 * Online Store Catalog Home
 * Public catalog with product grid, category filters, search, sorting, and pagination
 * Responsive design: 4 columns desktop, 2 tablet, 1 mobile
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams, Form } from '@remix-run/react';
import { json } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { useState, useMemo } from 'react';

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  rating: number;
  stock: number;
}

interface TiendaLoaderData {
  products: Product[];
  categories: string[];
  isAuthenticated: boolean;
  locale: string;
  page: number;
  pageSize: number;
  total: number;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const sort = url.searchParams.get('sort') || 'popular';
  const category = url.searchParams.get('category') || '';
  const search = url.searchParams.get('search') || '';

  // Mock products data
  const allProducts: Product[] = [
    {
      id: '1',
      nombre: 'Premium Headphones',
      descripcion: 'High-quality wireless headphones with noise cancellation',
      precio: 199.99,
      categoria: 'Audio',
      imagen: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      rating: 4.5,
      stock: 45,
    },
    {
      id: '2',
      nombre: 'Smartphone Case',
      descripcion: 'Durable and stylish phone protection',
      precio: 29.99,
      categoria: 'Accessories',
      imagen: 'https://images.unsplash.com/photo-1522869635100-ce306b08738d?w=400',
      rating: 4.2,
      stock: 120,
    },
    {
      id: '3',
      nombre: 'USB-C Cable',
      descripcion: 'Fast charging and data transfer cable',
      precio: 15.99,
      categoria: 'Cables',
      imagen: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400',
      rating: 4.7,
      stock: 200,
    },
    {
      id: '4',
      nombre: 'Wireless Charger',
      descripcion: 'Fast wireless charging pad for all devices',
      precio: 49.99,
      categoria: 'Chargers',
      imagen: 'https://images.unsplash.com/photo-1591577957802-b3baea6e7869?w=400',
      rating: 4.4,
      stock: 60,
    },
    {
      id: '5',
      nombre: 'Screen Protector',
      descripcion: 'Tempered glass screen protector',
      precio: 12.99,
      categoria: 'Accessories',
      imagen: 'https://images.unsplash.com/photo-1608720122310-dfca46de3560?w=400',
      rating: 4.3,
      stock: 150,
    },
    {
      id: '6',
      nombre: 'Portable Speaker',
      descripcion: 'Compact bluetooth speaker with amazing sound',
      precio: 79.99,
      categoria: 'Audio',
      imagen: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
      rating: 4.6,
      stock: 30,
    },
    {
      id: '7',
      nombre: 'Laptop Stand',
      descripcion: 'Adjustable aluminum laptop stand',
      precio: 39.99,
      categoria: 'Accessories',
      imagen: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
      rating: 4.5,
      stock: 40,
    },
    {
      id: '8',
      nombre: 'Phone Mount',
      descripcion: 'Dashboard phone mount for cars',
      precio: 19.99,
      categoria: 'Accessories',
      imagen: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
      rating: 4.1,
      stock: 80,
    },
    {
      id: '9',
      nombre: 'USB Hub',
      descripcion: 'Multi-port USB 3.0 hub',
      precio: 34.99,
      categoria: 'Cables',
      imagen: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400',
      rating: 4.3,
      stock: 50,
    },
    {
      id: '10',
      nombre: 'Keyboard & Mouse',
      descripcion: 'Wireless keyboard and mouse combo',
      precio: 59.99,
      categoria: 'Accessories',
      imagen: 'https://images.unsplash.com/photo-1587829191301-f21cc94e1e47?w=400',
      rating: 4.4,
      stock: 35,
    },
    {
      id: '11',
      nombre: 'HDMI Cable',
      descripcion: '4K HDMI cable 6 feet',
      precio: 14.99,
      categoria: 'Cables',
      imagen: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400',
      rating: 4.2,
      stock: 100,
    },
    {
      id: '12',
      nombre: 'Power Bank',
      descripcion: '20000mAh portable battery',
      precio: 44.99,
      categoria: 'Chargers',
      imagen: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
      rating: 4.5,
      stock: 25,
    },
  ];

  // Filter products
  let filtered = allProducts;
  if (category) {
    filtered = filtered.filter((p) => p.categoria.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Sort products
  if (sort === 'price-low') {
    filtered = [...filtered].sort((a, b) => a.precio - b.precio);
  } else if (sort === 'price-high') {
    filtered = [...filtered].sort((a, b) => b.precio - a.precio);
  } else if (sort === 'rating') {
    filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  } else if (sort === 'new') {
    filtered = [...filtered].reverse();
  }
  // default: popular (by rating)

  // Pagination
  const pageSize = 8;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const products = filtered.slice(start, start + pageSize);

  const categories = [...new Set(allProducts.map((p) => p.categoria))].sort();

  return json({
    products,
    categories,
    isAuthenticated: !!jwt,
    locale: params.lang || 'es',
    page,
    pageSize,
    total,
  });
};

export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? 'Tienda - Wapsell' : 'Store - Wapsell',
  },
  {
    name: 'description',
    content: params.lang === 'es'
      ? 'Descubre nuestros productos con mejores precios'
      : 'Discover our products at the best prices',
  },
];

export default function OnlineStore() {
  const { products, categories, isAuthenticated, locale, page, pageSize, total } = useLoaderData<TiendaLoaderData>();
  const { lang } = useParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const t = locale === 'es' ? {
    welcome: '¡Bienvenido a Nuestra Tienda!',
    subtitle: 'Descubre nuestros productos y realiza tu compra',
    search: 'Buscar productos...',
    category: 'Categoría',
    all: 'Todas',
    sort: 'Ordenar por',
    popular: 'Popular',
    priceLow: 'Menor precio',
    priceHigh: 'Mayor precio',
    rating: 'Calificación',
    new: 'Más nuevo',
    filters: 'Filtros',
    apply: 'Aplicar',
    clear: 'Limpiar',
    product: 'Producto',
    price: 'Precio',
    stock: 'Stock',
    add: 'Agregar al Carrito',
    view: 'Ver Detalles',
    noResults: 'No se encontraron productos',
    pagination: 'Página {page} de {total}',
    cart: '🛒 Carrito',
    account: '👤 Cuenta',
  } : {
    welcome: 'Welcome to Our Store!',
    subtitle: 'Discover our products and make your purchase',
    search: 'Search products...',
    category: 'Category',
    all: 'All',
    sort: 'Sort by',
    popular: 'Popular',
    priceLow: 'Lowest price',
    priceHigh: 'Highest price',
    rating: 'Rating',
    new: 'Newest',
    filters: 'Filters',
    apply: 'Apply',
    clear: 'Clear',
    product: 'Product',
    price: 'Price',
    stock: 'Stock',
    add: 'Add to Cart',
    view: 'View Details',
    noResults: 'No products found',
    pagination: 'Page {page} of {total}',
    cart: '🛒 Cart',
    account: '👤 Account',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Tienda</span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href={`/${lang}/tienda/cart`}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              {t.cart}
            </a>
            {isAuthenticated ? (
              <a
                href={`/${lang}/tienda/orders`}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                {t.account}
              </a>
            ) : (
              <a
                href={`/${lang}/auth/login`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                {t.account}
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 sm:p-12 text-white text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t.welcome}</h1>
          <p className="text-base sm:text-lg text-blue-100">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t.filters}</h2>

              {/* Search */}
              <Form method="get" className="mb-6">
                <input
                  type="text"
                  name="search"
                  placeholder={t.search}
                  defaultValue=""
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {t.apply}
                </button>
              </Form>

              {/* Category Filter */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">{t.category}</h3>
                <Form method="get" className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="category" value="" defaultChecked className="w-4 h-4" />
                    <span className="ml-3 text-gray-700">{t.all}</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center">
                      <input type="radio" name="category" value={cat} className="w-4 h-4" />
                      <span className="ml-3 text-gray-700">{cat}</span>
                    </label>
                  ))}
                  <button
                    type="submit"
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    {t.apply}
                  </button>
                </Form>
              </div>

              {/* Sort */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t.sort}</h3>
                <Form method="get">
                  <select
                    name="sort"
                    defaultValue="popular"
                    onChange={(e) => e.target.form?.submit()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="popular">{t.popular}</option>
                    <option value="price-low">{t.priceLow}</option>
                    <option value="price-high">{t.priceHigh}</option>
                    <option value="rating">{t.rating}</option>
                    <option value="new">{t.new}</option>
                  </select>
                </Form>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Mobile Filters Toggle */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {t.filters}
              </button>
            </div>

            {/* Products List */}
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 text-lg">{t.noResults}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {products.map((product) => (
                    <a
                      key={product.id}
                      href={`/${lang}/tienda/product/${product.id}`}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden group"
                    >
                      <div className="h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={product.imagen}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
                            {product.nombre}
                          </h3>
                          <span className="text-xs text-yellow-500 ml-1">⭐ {product.rating}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-1">{product.descripcion}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">${product.precio.toFixed(2)}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                          >
                            {t.add}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {product.stock > 0 ? `${t.stock}: ${product.stock}` : 'Out of stock'}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-gray-200">
                    {page > 1 && (
                      <a
                        href={`?page=${page - 1}`}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        ← {locale === 'es' ? 'Anterior' : 'Previous'}
                      </a>
                    )}

                    <span className="text-gray-600 text-sm">
                      {t.pagination.replace('{page}', page.toString()).replace('{total}', totalPages.toString())}
                    </span>

                    {page < totalPages && (
                      <a
                        href={`?page=${page + 1}`}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        {locale === 'es' ? 'Siguiente' : 'Next'} →
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
