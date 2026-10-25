/**
 * Domain Types for Wapsell Mobile App
 * Aligned with backend Prisma schema models
 */

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  empresaId: string;
  rol?: 'ADMINISTRADOR' | 'VENDEDOR' | 'CLIENTE' | 'CLIENTE_MAYORISTA';
  activo: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends AuthCredentials {
  nombre: string;
  telefono?: string;
  empresaId: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

// ============================================================================
// Products & Catalog
// ============================================================================

export interface Familia {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface Subfamilia {
  id: string;
  nombre: string;
  familiaId: string;
  activa: boolean;
}

export interface Tipo {
  id: string;
  nombre: string;
  subfamiliaId: string;
  activa: boolean;
}

export interface Subtipo {
  id: string;
  nombre: string;
  tipoId: string;
  activa: boolean;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precioMayorista?: number;
  imagen?: string;
  stock: number;
  stockMinimo: number;
  familiaId: string;
  subfamiliaId?: string;
  tipoId?: string;
  subtipoId?: string;
  empresaId: string;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Lote {
  id: string;
  numero: string;
  productoId: string;
  cantidadOriginal: number;
  cantidadActual: number;
  fechaVencimiento: Date;
  costo: number;
}

// ============================================================================
// Cart & Orders
// ============================================================================

export interface CartItem {
  productoId: string;
  producto?: Product;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export type PedidoEstado = 'PENDIENTE' | 'CONFIRMADO' | 'ENTREGADO' | 'CANCELADO';

export interface PedidoItem {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  numero: string;
  fecha: Date;
  usuarioId: string;
  empresaId: string;
  total: number;
  estado: PedidoEstado;
  items: PedidoItem[];
  direccionEntrega?: string;
  observaciones?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

export type VentaEstado = 'PENDIENTE' | 'CONFIRMADO' | 'ENTREGADO' | 'CANCELADO';

export interface VentaItem {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  numero: string;
  fecha: Date;
  clienteId?: string;
  usuarioId: string;
  empresaId: string;
  total: number;
  estado: VentaEstado;
  items: VentaItem[];
  creadoEn: Date;
  actualizadoEn: Date;
}

// ============================================================================
// Checkout & Payment
// ============================================================================

export type MetodoPago = 'EFECTIVO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA';

export interface CheckoutData {
  direccionEntrega: string;
  metodoPago: MetodoPago;
  observaciones?: string;
}

export interface DatosEntrega {
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SplashScreen: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Cart: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  ProductDetail: { productId: string };
  Search: undefined;
};

export type CartStackParamList = {
  CartScreen: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
};
