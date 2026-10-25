import { create } from 'zustand';
import { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;

  // Actions
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;

  // Getters
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItem: (productId: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,

  addItem: (product: Product, quantity: number) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.productoId === product.id);

      let newItems: CartItem[];
      if (existingItem) {
        // Update quantity if product already in cart
        newItems = state.items.map((item) =>
          item.productoId === product.id
            ? {
                ...item,
                cantidad: item.cantidad + quantity,
              }
            : item,
        );
      } else {
        // Add new item
        newItems = [
          ...state.items,
          {
            productoId: product.id,
            producto: product,
            cantidad: quantity,
            precioUnitario: product.precio,
          },
        ];
      }

      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.cantidad, 0),
        totalPrice: newItems.reduce(
          (sum, item) => sum + item.cantidad * item.precioUnitario,
          0,
        ),
      };
    });
  },

  removeItem: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((item) => item.productoId !== productId);

      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.cantidad, 0),
        totalPrice: newItems.reduce(
          (sum, item) => sum + item.cantidad * item.precioUnitario,
          0,
        ),
      };
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => {
      const newItems = state.items.map((item) =>
        item.productoId === productId
          ? {
              ...item,
              cantidad: quantity,
            }
          : item,
      );

      return {
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.cantidad, 0),
        totalPrice: newItems.reduce(
          (sum, item) => sum + item.cantidad * item.precioUnitario,
          0,
        ),
      };
    });
  },

  clearCart: () => {
    set({
      items: [],
      totalItems: 0,
      totalPrice: 0,
    });
  },

  setItems: (items: CartItem[]) => {
    set({
      items,
      totalItems: items.reduce((sum, item) => sum + item.cantidad, 0),
      totalPrice: items.reduce(
        (sum, item) => sum + item.cantidad * item.precioUnitario,
        0,
      ),
    });
  },

  getTotalItems: () => {
    return get().totalItems;
  },

  getTotalPrice: () => {
    return get().totalPrice;
  },

  getItem: (productId: string) => {
    return get().items.find((item) => item.productoId === productId);
  },
}));
