/**
 * Product Detail Page
 * Public route for viewing product details, images, reviews, and related products
 * Allows add-to-cart for both authenticated and guest users
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { json } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { useState } from 'react';

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  rating: number;
  reviewCount: number;
  images: string[];
  specifications: {
    [key: string]: string;
  };
  relatedProducts: Array<{
    id: string;
    nombre: string;
    precio: number;
    image: string;
  }>;
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

interface ProductDetailLoaderData {
  product: Product;
  isAuthenticated: boolean;
  locale: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');
  const { id, lang } = params;

  // In a real app, fetch from API based on id
  // For now, return mock data
  const mockProduct: Product = {
    id: id || '1',
    nombre: 'Producto Premium',
    descripcion: 'Descripción completa del producto con todos los detalles',
    precio: 199.99,
    stock: 45,
    rating: 4.5,
    reviewCount: 128,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    ],
    specifications: {
      'Material': 'Premium Leather',
      'Tamaño': '30cm x 20cm',
      'Peso': '1.5 kg',
      'Garantía': '2 años',
    },
    relatedProducts: [
      {
        id: '2',
        nombre: 'Producto Relacionado 1',
        precio: 149.99,
        image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
      },
      {
        id: '3',
        nombre: 'Producto Relacionado 2',
        precio: 179.99,
        image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400',
      },
    ],
    reviews: [
      {
        id: '1',
        author: 'Juan García',
        rating: 5,
        comment: 'Excelente producto, muy recomendado',
        date: '2024-10-20',
      },
      {
        id: '2',
        author: 'María López',
        rating: 4,
        comment: 'Buena calidad, entrega rápida',
        date: '2024-10-18',
      },
    ],
  };

  return json({
    product: mockProduct,
    isAuthenticated: !!jwt,
    locale: lang || 'es',
  });
};

export const meta: MetaFunction<typeof loader> = ({ data, params }) => [
  {
    title: data?.product?.nombre ? `${data.product.nombre} - Tienda` : 'Producto - Tienda',
  },
  {
    name: 'description',
    content: data?.product?.descripcion || 'Detalle del producto',
  },
];

export default function ProductDetailPage() {
  const { product, isAuthenticated, locale } = useLoaderData<ProductDetailLoaderData>();
  const { lang } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isInStock = product.stock > 0;
  const t = locale === 'es' ? {
    images: 'Imágenes',
    price: 'Precio',
    availability: 'Disponibilidad',
    inStock: 'En Stock',
    outOfStock: 'Agotado',
    quantity: 'Cantidad',
    addToCart: 'Agregar al Carrito',
    specifications: 'Especificaciones',
    reviews: 'Reseñas',
    relatedProducts: 'Productos Relacionados',
    rating: 'Calificación',
    stock: 'Stock disponible',
    login: 'Inicia sesión para comprar',
    continueShoppingGuest: 'Continuar como invitado',
  } : {
    images: 'Images',
    price: 'Price',
    availability: 'Availability',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    quantity: 'Quantity',
    addToCart: 'Add to Cart',
    specifications: 'Specifications',
    reviews: 'Reviews',
    relatedProducts: 'Related Products',
    rating: 'Rating',
    stock: 'Stock available',
    login: 'Sign in to shop',
    continueShoppingGuest: 'Continue as guest',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <a href={`/${lang}/tienda`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← {locale === 'es' ? 'Volver' : 'Back'}
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images Section */}
          <div>
            <div className="bg-white rounded-lg overflow-hidden shadow mb-4">
              <img
                src={product.images[selectedImage]}
                alt={product.nombre}
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`border-2 rounded overflow-hidden ${
                    selectedImage === idx ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img src={image} alt={`Thumbnail ${idx}`} className="w-full h-24 object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.nombre}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span key={i}>{i < Math.floor(product.rating) ? '★' : '☆'}</span>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount} {locale === 'es' ? 'reseñas' : 'reviews'})
              </span>
            </div>

            {/* Price */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                ${product.precio.toFixed(2)}
              </div>
              <div className={`text-sm font-medium ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                {isInStock ? `${t.inStock} (${product.stock} ${t.stock})` : t.outOfStock}
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-6">{product.descripcion}</p>

            {/* Quantity Selector and Add to Cart */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.quantity}</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-0 py-2"
                    min="1"
                    max={product.stock}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              disabled={!isInStock}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white mb-4 transition ${
                isInStock
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {t.addToCart}
            </button>

            {/* Guest/Auth Info */}
            {!isAuthenticated && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  {t.login} · {t.continueShoppingGuest}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Specifications Section */}
        <div className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.specifications}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="border-b border-gray-200 pb-4">
                <dt className="text-sm font-medium text-gray-600">{key}</dt>
                <dd className="text-lg text-gray-900 mt-1">{value}</dd>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.reviews}</h2>
          <div className="space-y-6">
            {product.reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{review.author}</h3>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <div className="flex text-yellow-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                  ))}
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products Section */}
        {product.relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.relatedProducts}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {product.relatedProducts.map((related) => (
                <a
                  key={related.id}
                  href={`/${lang}/tienda/product/${related.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden group"
                >
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={related.image}
                      alt={related.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      {related.nombre}
                    </h3>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${related.precio.toFixed(2)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
