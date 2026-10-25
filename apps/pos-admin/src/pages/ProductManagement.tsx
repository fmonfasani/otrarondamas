import React, { useState, useCallback } from 'react';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { useToast, ToastContainer } from '../components/Toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'discontinued';
}

export const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Wireless Headphones',
      sku: 'WH-001',
      price: 129.99,
      stock: 45,
      category: 'Electronics',
      status: 'active',
    },
    {
      id: '2',
      name: 'USB-C Cable',
      sku: 'USB-C-001',
      price: 19.99,
      stock: 234,
      category: 'Accessories',
      status: 'active',
    },
    {
      id: '3',
      name: 'Laptop Stand',
      sku: 'LS-001',
      price: 49.99,
      stock: 12,
      category: 'Office',
      status: 'active',
    },
    {
      id: '4',
      name: 'Vintage Mouse',
      sku: 'VM-001',
      price: 39.99,
      stock: 0,
      category: 'Electronics',
      status: 'discontinued',
    },
  ]);

  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    category: '',
    status: 'active',
  });

  const { toasts, removeToast, success, error } = useToast();

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddProduct = useCallback(() => {
    if (!formData.name || !formData.sku || !formData.price) {
      error('Please fill in all required fields');
      return;
    }

    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      sku: formData.sku,
      price: formData.price,
      stock: formData.stock || 0,
      category: formData.category || 'Uncategorized',
      status: formData.status || 'active',
    };

    setProducts([...products, newProduct]);
    setFormData({ name: '', sku: '', price: 0, stock: 0, category: '', status: 'active' });
    setIsAddModalOpen(false);
    success('Product added successfully');
  }, [formData, products, success, error]);

  const handleEditProduct = useCallback(() => {
    if (!editingProduct) return;

    setProducts(products.map((p) => (p.id === editingProduct.id ? editingProduct : p)));
    setEditingProduct(null);
    success('Product updated successfully');
  }, [editingProduct, products, success]);

  const handleDeleteProduct = useCallback(
    (id: string) => {
      setProducts(products.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
      success('Product deleted successfully');
    },
    [products, success],
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'discontinued':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStockVariant = (stock: number) => {
    if (stock === 0) return 'error';
    if (stock < 50) return 'warning';
    return 'success';
  };

  return (
    <AdminLayout currentPage="/admin/products">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 font-bold text-brand-dark">Product Management</h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardBody className="pb-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus:ring-0 p-0"
              />
            </div>
          </CardBody>
        </Card>

        {/* Products Table */}
        <Card>
          <CardBody>
            {filteredProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {search ? 'No products match your search.' : 'No products found.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">SKU</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Category</th>
                      <th className="px-4 py-3 text-right text-gray-600 font-semibold">Price</th>
                      <th className="px-4 py-3 text-right text-gray-600 font-semibold">Stock</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right text-gray-600 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{product.sku}</td>
                        <td className="px-4 py-3 text-gray-600">{product.category}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={getStockVariant(product.stock) as any} size="sm">
                            {product.stock} units
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusVariant(product.status) as any} size="sm">
                            {product.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 hover:bg-blue-100 rounded transition text-blue-600"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(product.id)}
                              className="p-2 hover:bg-red-100 rounded transition text-red-600"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setFormData({ name: '', sku: '', price: 0, stock: 0, category: '', status: 'active' });
        }}
        title="Add New Product"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setFormData({
                  name: '',
                  sku: '',
                  price: 0,
                  stock: 0,
                  category: '',
                  status: 'active',
                });
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddProduct}>
              Create Product
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Product Name *"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
          />
          <Input
            label="SKU *"
            value={formData.sku || ''}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Enter SKU"
          />
          <Input
            label="Category"
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Enter category"
          />
          <Input
            label="Price *"
            type="number"
            step="0.01"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            placeholder="Enter price"
          />
          <Input
            label="Stock"
            type="number"
            value={formData.stock || ''}
            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
            placeholder="Enter stock quantity"
          />
        </div>
      </Modal>

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Edit ${editingProduct.name}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEditProduct}>
                Update Product
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Product Name"
              value={editingProduct.name}
              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
            />
            <Input
              label="SKU"
              value={editingProduct.sku}
              onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
            />
            <Input
              label="Category"
              value={editingProduct.category}
              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
            />
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={editingProduct.price}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })
              }
            />
            <Input
              label="Stock"
              type="number"
              value={editingProduct.stock}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })
              }
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Product"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDeleteProduct(deleteConfirmId)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-gray-600">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
        </Modal>
      )}
    </AdminLayout>
  );
};
