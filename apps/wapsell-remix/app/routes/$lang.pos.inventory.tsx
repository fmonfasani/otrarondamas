/**
 * POS Inventory Management Route
 * Stock manager and inventory control for sellers
 * Responsive design with table view (desktop) and cards (mobile)
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { useState } from 'react';
import { createProtectedLoader } from '~/utils/route-guards.server';
import type { Locale } from '~/types/routes';

interface InventoryData {
  tenantContext: any;
  locale: string;
  empresaId: string;
}

interface StockItem {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  costo?: number;
  estado: 'activo' | 'inactivo' | 'descontinuado';
  ultimaActualizacion: string;
}

const inventoryLoader: LoaderFunction = async ({ request, params }) => {
  const protectedLoader = createProtectedLoader(
    async (context) => {
      return {
        empresaId: context.tenantContext?.empresaId || '',
      };
    },
    { fallbackLocale: params.lang as string }
  );

  return protectedLoader({ request, params } as any);
};

export const loader = inventoryLoader;

export const meta: MetaFunction<typeof loader> = () => [
  { title: 'Inventario - Wapsell POS' },
  { name: 'description', content: 'Manage inventory and stock levels' },
];

/**
 * Stock Status Badge Component
 */
function StockStatusBadge({
  stock,
  stockMinimo,
  locale,
}: {
  stock: number;
  stockMinimo: number;
  locale: Locale;
}) {
  if (stock === 0) {
    return (
      <span className="px-2 md:px-3 py-1 bg-red-100 text-red-700 text-xs md:text-sm font-semibold rounded-full">
        {locale === 'es' ? 'Agotado' : 'Out of Stock'}
      </span>
    );
  }

  if (stock <= stockMinimo) {
    return (
      <span className="px-2 md:px-3 py-1 bg-yellow-100 text-yellow-700 text-xs md:text-sm font-semibold rounded-full">
        {locale === 'es' ? 'Bajo Stock' : 'Low Stock'}
      </span>
    );
  }

  return (
    <span className="px-2 md:px-3 py-1 bg-green-100 text-green-700 text-xs md:text-sm font-semibold rounded-full">
      {locale === 'es' ? 'Disponible' : 'Available'}
    </span>
  );
}

/**
 * Desktop Table View Component
 */
function InventoryTable({
  items,
  locale,
  onEditStock,
}: {
  items: StockItem[];
  locale: Locale;
  onEditStock: (item: StockItem) => void;
}) {
  return (
    <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b-2 border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'SKU' : 'SKU'}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Producto' : 'Product'}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Categoría' : 'Category'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Stock' : 'Stock'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Mínimo' : 'Min'}
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Precio' : 'Price'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Estado' : 'Status'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Acciones' : 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-b transition ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } hover:bg-blue-50`}
            >
              <td className="px-6 py-4 text-sm font-mono text-gray-700">
                {item.sku}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                {item.nombre}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {item.categoria}
              </td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`text-lg font-bold ${
                    item.stock === 0
                      ? 'text-red-600'
                      : item.stock <= item.stockMinimo
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                >
                  {item.stock}
                </span>
              </td>
              <td className="px-6 py-4 text-center text-sm text-gray-700">
                {item.stockMinimo}
              </td>
              <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                ${item.precio.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-center">
                <StockStatusBadge
                  stock={item.stock}
                  stockMinimo={item.stockMinimo}
                  locale={locale}
                />
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => onEditStock(item)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  {locale === 'es' ? 'Editar' : 'Edit'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Mobile Card View Component
 */
function InventoryCardGrid({
  items,
  locale,
  onEditStock,
}: {
  items: StockItem[];
  locale: Locale;
  onEditStock: (item: StockItem) => void;
}) {
  return (
    <div className="md:hidden grid grid-cols-1 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
              <h3 className="text-base font-bold text-gray-900">{item.nombre}</h3>
              <p className="text-xs text-gray-600 mt-1">{item.categoria}</p>
            </div>
            <StockStatusBadge
              stock={item.stock}
              stockMinimo={item.stockMinimo}
              locale={locale}
            />
          </div>

          {/* Stock Info */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-200">
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Stock Actual' : 'Current Stock'}
              </p>
              <p
                className={`text-2xl font-bold ${
                  item.stock === 0
                    ? 'text-red-600'
                    : item.stock <= item.stockMinimo
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {item.stock}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Stock Mínimo' : 'Minimum'}
              </p>
              <p className="text-2xl font-bold text-gray-700">{item.stockMinimo}</p>
            </div>
          </div>

          {/* Price and Action */}
          <div className="mt-3 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Precio Venta' : 'Selling Price'}
              </p>
              <p className="text-xl font-bold text-gray-900">
                ${item.precio.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => onEditStock(item)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {locale === 'es' ? 'Editar' : 'Edit'}
            </button>
          </div>

          {/* Last Update */}
          <p className="text-xs text-gray-500 mt-3 text-right">
            {locale === 'es' ? 'Actualizado' : 'Updated'}: {item.ultimaActualizacion}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Stock Edit Modal Component
 */
function StockEditModal({
  item,
  locale,
  onClose,
  onSave,
}: {
  item: StockItem | null;
  locale: Locale;
  onClose: () => void;
  onSave: (stock: number) => void;
}) {
  const [newStock, setNewStock] = useState(item?.stock || 0);

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            {locale === 'es' ? 'Actualizar Stock' : 'Update Stock'}
          </h2>

          <div className="space-y-4">
            {/* Product Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                {locale === 'es' ? 'Producto' : 'Product'}
              </p>
              <p className="text-lg font-bold text-gray-900">{item.nombre}</p>
              <p className="text-xs text-gray-500 mt-1">{item.sku}</p>
            </div>

            {/* Current and New Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {locale === 'es' ? 'Stock Actual' : 'Current Stock'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{item.stock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {locale === 'es' ? 'Nuevo Stock' : 'New Stock'}
                </p>
                <p className="text-2xl font-bold text-blue-600">{newStock}</p>
              </div>
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {locale === 'es' ? 'Ingresar Nueva Cantidad' : 'Enter New Quantity'}
              </label>
              <input
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Adjustment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNewStock(Math.max(0, newStock - 10))}
                className="py-2 bg-red-100 text-red-700 font-semibold rounded hover:bg-red-200 transition text-sm"
              >
                -10
              </button>
              <button
                onClick={() => setNewStock(item.stock)}
                className="py-2 bg-gray-100 text-gray-700 font-semibold rounded hover:bg-gray-200 transition text-sm"
              >
                {locale === 'es' ? 'Reset' : 'Reset'}
              </button>
              <button
                onClick={() => setNewStock(newStock + 10)}
                className="py-2 bg-green-100 text-green-700 font-semibold rounded hover:bg-green-200 transition text-sm"
              >
                +10
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
            >
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                onSave(newStock);
                onClose();
              }}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {locale === 'es' ? 'Guardar' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inventory Stats Component
 */
function InventoryStats({
  items,
  locale,
}: {
  items: StockItem[];
  locale: Locale;
}) {
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.stock <= i.stockMinimo).length;
  const outOfStockItems = items.filter((i) => i.stock === 0).length;
  const totalValue = items.reduce((sum, i) => sum + i.precio * i.stock, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Total Productos' : 'Total Products'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
          {totalItems}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-yellow-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Bajo Stock' : 'Low Stock'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-yellow-600 mt-2">
          {lowStockItems}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-red-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Agotados' : 'Out of Stock'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-red-600 mt-2">
          {outOfStockItems}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Valor Total' : 'Total Value'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">
          ${totalValue.toFixed(0)}
        </p>
      </div>
    </div>
  );
}

/**
 * Main Inventory Page Component
 */
export default function InventoryPage() {
  const { locale: loaderLocale } = useLoaderData<InventoryData>();
  const { lang } = useParams();
  const locale = (lang || 'es') as Locale;

  // State
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock inventory data - replace with API call
  const mockInventory: StockItem[] = [
    {
      id: '1',
      sku: 'SKU001',
      nombre: 'Producto Premium A',
      categoria: 'Electrónica',
      stock: 45,
      stockMinimo: 20,
      precio: 99.99,
      costo: 50.00,
      estado: 'activo',
      ultimaActualizacion: '2024-10-29',
    },
    {
      id: '2',
      sku: 'SKU002',
      nombre: 'Producto B',
      categoria: 'Ropa',
      stock: 12,
      stockMinimo: 20,
      precio: 29.99,
      costo: 15.00,
      estado: 'activo',
      ultimaActualizacion: '2024-10-28',
    },
    {
      id: '3',
      sku: 'SKU003',
      nombre: 'Producto C - Accesorios',
      categoria: 'Accesorios',
      stock: 0,
      stockMinimo: 15,
      precio: 19.99,
      costo: 8.00,
      estado: 'activo',
      ultimaActualizacion: '2024-10-25',
    },
    {
      id: '4',
      sku: 'SKU004',
      nombre: 'Producto D - Descontinuado',
      categoria: 'Otros',
      stock: 5,
      stockMinimo: 0,
      precio: 14.99,
      costo: 5.00,
      estado: 'descontinuado',
      ultimaActualizacion: '2024-10-20',
    },
  ];

  const filteredInventory = mockInventory.filter(
    (item) =>
      item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditStock = (item: StockItem) => {
    setEditingItem(item);
  };

  const handleSaveStock = (newStock: number) => {
    if (editingItem) {
      console.log(`Updated ${editingItem.sku} stock to ${newStock}`);
      // TODO: Implement API call to save stock
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {locale === 'es' ? 'Gestión de Inventario' : 'Inventory Management'}
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          {locale === 'es'
            ? 'Controla tu stock y mantén los niveles óptimos'
            : 'Control your stock and maintain optimal levels'}
        </p>
      </div>

      {/* Stats */}
      <InventoryStats items={mockInventory} locale={locale} />

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <input
          type="text"
          placeholder={
            locale === 'es'
              ? 'Buscar por SKU, nombre o categoría...'
              : 'Search by SKU, name or category...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
      </div>

      {/* Desktop Table */}
      <InventoryTable
        items={filteredInventory}
        locale={locale}
        onEditStock={handleEditStock}
      />

      {/* Mobile Cards */}
      <InventoryCardGrid
        items={filteredInventory}
        locale={locale}
        onEditStock={handleEditStock}
      />

      {/* Empty State */}
      {filteredInventory.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12 text-center">
          <p className="text-gray-500 text-base md:text-lg">
            {locale === 'es'
              ? 'No se encontraron productos'
              : 'No products found'}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <StockEditModal
        item={editingItem}
        locale={locale}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveStock}
      />
    </div>
  );
}
