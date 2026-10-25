import React, { useCallback } from 'react';
import { Modal } from '@otrarondamas/ui-kit';
import { useModal } from '@otrarondamas/ui-kit';
import { useNotification } from '../hooks/useNotification';

/**
 * ProductDetailModal - Product details display in modal
 *
 * Shows detailed product information including:
 * - Product images (if available)
 * - Name and description
 * - Price and stock status
 * - "Add to Cart" action with toast feedback
 *
 * Uses Modal context from @wapsell/ui-kit.
 * Integrates with ToastProvider for user feedback.
 *
 * @example
 * ```tsx
 * const product = {
 *   id: '123',
 *   name: 'Product Name',
 *   description: 'Description',
 *   price: 100,
 *   image: '/product.jpg',
 *   stock: 5
 * };
 *
 * <ProductDetailModal
 *   product={product}
 *   onAddToCart={(product, quantity) => {
 *     addToCart(product, quantity);
 *   }}
 * />
 * ```
 */

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock: number;
  category?: string;
  sku?: string;
}

interface ProductDetailModalProps {
  product?: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onAddToCart }) => {
  const { modal, closeModal } = useModal();
  const { notify } = useNotification();
  const [quantity, setQuantity] = React.useState(1);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (quantity > product.stock) {
      notify(`Only ${product.stock} units available`, 'warning');
      return;
    }

    if (onAddToCart) {
      onAddToCart(product, quantity);
      notify(`${product.name} added to cart`, 'success');
      closeModal();
      setQuantity(1);
    }
  }, [product, quantity, onAddToCart, closeModal, notify]);

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      if (newQuantity > 0 && (!product || newQuantity <= product.stock)) {
        setQuantity(newQuantity);
      }
    },
    [product],
  );

  if (!modal.isOpen || !product) {
    return null;
  }

  const isOutOfStock = product.stock === 0;
  const imageUrl = product.image || '/placeholder-product.jpg';

  return (
    <Modal>
      <Modal.Header>
        <div className="flex justify-between items-center">
          <h2>{product.name}</h2>
          {product.sku && <span className="text-sm text-gray-500">SKU: {product.sku}</span>}
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="grid grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="flex items-center justify-center bg-gray-50 rounded-lg h-64">
            <img
              src={imageUrl}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Product Details */}
          <div className="flex flex-col gap-4">
            {/* Category */}
            {product.category && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Category</p>
                <p className="text-gray-700">{product.category}</p>
              </div>
            )}

            {/* Price */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Price</p>
              <p className="text-2xl font-bold text-green-600">${product.price.toFixed(2)}</p>
            </div>

            {/* Stock Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Stock</p>
              <p className={isOutOfStock ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                {isOutOfStock ? 'Out of stock' : `${product.stock} units available`}
              </p>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quantity</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    className="w-12 text-center border border-gray-300 rounded"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Description</p>
                <p className="text-gray-700 text-sm">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button
          onClick={closeModal}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          aria-label={isOutOfStock ? 'Product out of stock' : `Add ${product.name} to cart`}
          className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProductDetailModal;
