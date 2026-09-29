import React, { useState } from 'react';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components';
import { Button } from '../components';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

const products: Product[] = [
  { id: '1', name: 'Coca Cola 2L', price: 250, category: 'Bebidas', image: '🥤' },
  { id: '2', name: 'Cerveza Quilmes', price: 180, category: 'Bebidas', image: '🍺' },
  { id: '3', name: 'Pan de Queso', price: 150, category: 'Panadería', image: '🥖' },
  { id: '4', name: 'Café', price: 120, category: 'Bebidas', image: '☕' },
  { id: '5', name: 'Chicles', price: 50, category: 'Golosinas', image: '🍬' },
  { id: '6', name: 'Cigarrillos', price: 350, category: 'Tabaco', image: '🚬' },
  { id: '7', name: 'Galletitas', price: 100, category: 'Alimentos', image: '🍪' },
  { id: '8', name: 'Chocolate', price: 200, category: 'Golosinas', image: '🍫' },
];

export const POSPage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const categories = ['Todos', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <Card>
          <CardHeader>
            <h1 className="text-h2 font-bold">Punto de Venta</h1>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-brand-yellow"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-md transition ${
                      selectedCategory === cat
                        ? 'bg-brand-yellow text-brand-dark font-semibold'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition text-center"
                  >
                    <div className="text-4xl mb-2">{product.image}</div>
                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                    <p className="text-brand-yellow font-bold text-lg my-2">${product.price}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => addToCart(product)}
                      className="w-full"
                    >
                      Agregar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cart Sidebar */}
      <div className="w-80 sticky top-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h2 className="text-h3 font-bold">Carrito ({cart.length})</h2>
            </div>
          </CardHeader>
          <CardBody className="max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Carrito vacío</p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-brand-yellow font-bold">${item.price}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-brand-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <p className="ml-auto font-bold text-sm">${item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total:</span>
              <span className="text-brand-yellow">${total.toFixed(2)}</span>
            </div>
            <Button variant="primary" className="w-full">
              Cobrar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
