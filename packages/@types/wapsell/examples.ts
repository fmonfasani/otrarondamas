/**
 * EXAMPLES - @wapsell/types usage patterns
 *
 * This file demonstrates common patterns for using the types.
 * These are NOT part of the built package - for reference only.
 */

// ============================================================================
// AUTHENTICATION EXAMPLES
// ============================================================================

import {
  User,
  UserRole,
  DossierStatus,
  JwtPayload,
  AuthenticatedUser,
  LoginRequest,
  LoginRequestSchema,
  SignUpRequest,
  SignUpRequestSchema,
} from './src/auth';

// Example 1: Type definition for a staff user
const staffUser: User = {
  id: 'usr-001',
  empresaId: 'biz-001',
  nombre: 'María García',
  email: 'maria@empresa.com',
  activo: true,
  rol: UserRole.OWNER,
  estadoLegajo: DossierStatus.APROBADO,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 2: JWT payload
const jwtPayload: JwtPayload = {
  sub: 'usr-001',
  email: 'maria@empresa.com',
  nombre: 'María García',
  empresaId: 'biz-001',
  permisos: ['read:sales', 'write:inventory'],
  rol: UserRole.OWNER,
  estadoLegajo: DossierStatus.APROBADO,
  type: 'usuario',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
};

// Example 3: Validate login request
const loginData = { email: 'user@example.com', password: 'securePassword123' };
try {
  const validatedLogin: LoginRequest = LoginRequestSchema.parse(loginData);
  console.log('Login validated:', validatedLogin);
} catch (error) {
  console.error('Invalid login:', error);
}

// Example 4: Validate sign up
const signUpData = {
  email: 'newuser@example.com',
  nombre: 'New User',
  password: 'securePassword123',
  type: 'usuario' as const,
};
const validatedSignUp: SignUpRequest = SignUpRequestSchema.parse(signUpData);

// ============================================================================
// TENANT & BUSINESS EXAMPLES
// ============================================================================

import {
  Business,
  BusinessDetail,
  Membership,
  MembershipRole,
  MembershipStatus,
  CreateBusinessRequest,
  CreateBusinessRequestSchema,
} from './src/tenant';

// Example 5: Business entity
const business: Business = {
  id: 'biz-001',
  nombre: 'Otra Ronda Más',
  slug: 'otra-ronda-mas',
  configuracion: {
    enableInventory: true,
    enableDelivery: true,
    currency: 'ARS',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 6: Membership
const membership: Membership = {
  id: 'mem-001',
  userId: 'usr-001',
  businessId: 'biz-001',
  role: MembershipRole.OWNER,
  status: MembershipStatus.ACTIVE,
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 7: Create business with validation
const createBusinessReq: CreateBusinessRequest = {
  nombre: 'Nueva Tienda',
  slug: 'nueva-tienda',
  currency: 'ARS' as const,
};
const validatedBusiness = CreateBusinessRequestSchema.parse(createBusinessReq);

// ============================================================================
// POINT OF SALE (POS) EXAMPLES
// ============================================================================

import {
  Sale,
  SaleItem,
  SaleStatus,
  SaleChannel,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Cart,
  CartItem,
  CreateSaleRequest,
  CreateSaleRequestSchema,
} from './src/pos';

// Example 8: Create sale with validation
const saleRequest: CreateSaleRequest = {
  clienteId: 'cust-001',
  canal: SaleChannel.COUNTER,
  items: [
    {
      productoId: 'prod-001',
      cantidad: 2,
      precioUnitario: 100,
      descuentoItem: 5,
    },
    {
      productoId: 'prod-002',
      cantidad: 1,
      precioUnitario: 50,
    },
  ],
  descuento: 10,
  payments: [
    {
      monto: 235,
      metodo: PaymentMethod.CASH,
    },
  ],
};

try {
  const validatedSale = CreateSaleRequestSchema.parse(saleRequest);
  console.log('Sale validated:', validatedSale);
} catch (error) {
  console.error('Invalid sale:', error);
}

// Example 9: Complete sale object with items
const completeSale: Sale = {
  id: 'sale-001',
  empresaId: 'biz-001',
  usuarioId: 'usr-001',
  clienteId: 'cust-001',
  canal: SaleChannel.COUNTER,
  total: 235,
  descuento: 10,
  estado: SaleStatus.CONFIRMED,
  items: [
    {
      id: 'item-001',
      ventaId: 'sale-001',
      productoId: 'prod-001',
      cantidad: 2,
      precioUnitario: 100,
      descuentoItem: 5,
      subtotal: 195,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// E-COMMERCE (TIENDA) EXAMPLES
// ============================================================================

import {
  Product,
  Order,
  OrderStatus,
  Customer,
  CustomerType,
  Category,
  CreateProductRequest,
  CreateProductRequestSchema,
  CreateOrderRequest,
  CreateOrderRequestSchema,
  CreateCustomerRequest,
  CreateCustomerRequestSchema,
} from './src/tienda';

// Example 10: Product
const product: Product = {
  id: 'prod-001',
  empresaId: 'biz-001',
  nombre: 'Café Premium',
  codigoInterno: 'CAFE-PREM-001',
  codigoBarras: '7898765432109',
  marca: 'Café del Sur',
  descripcion: 'Café 100% arabica de alta calidad',
  unidadBase: 'kg',
  costo: 50,
  precioMinorista: 150,
  precioMayorista: 120,
  activo: true,
  stockMinimo: 10,
  familiaId: 'fam-001',
  subfamiliaId: 'subfam-001',
  tipoId: 'type-001',
  subtipoId: 'subtype-001',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 11: Create product with validation
const createProductReq: CreateProductRequest = {
  nombre: 'Café Premium',
  codigoInterno: 'CAFE-PREM-001',
  unidadBase: 'kg',
  costo: 50,
  precioMinorista: 150,
  familiaId: 'fam-001',
  subfamiliaId: 'subfam-001',
  tipoId: 'type-001',
  subtipoId: 'subtype-001',
};

const validatedProduct = CreateProductRequestSchema.parse(createProductReq);

// Example 12: Customer
const customer: Customer = {
  id: 'cust-001',
  empresaId: 'biz-001',
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  documento: '12345678',
  tipo: CustomerType.RETAIL,
  activo: true,
  telefono: '+54 11 1234-5678',
  whatsapp: '+54 11 1234-5678',
  esMayorista: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 13: Create order
const createOrderReq: CreateOrderRequest = {
  clienteId: 'cust-001',
  items: [
    { productoId: 'prod-001', cantidad: 2 },
    { productoId: 'prod-002', cantidad: 1 },
  ],
};

const validatedOrder = CreateOrderRequestSchema.parse(createOrderReq);

// ============================================================================
// DASHBOARD & ANALYTICS EXAMPLES
// ============================================================================

import {
  Dashboard,
  DashboardWidget,
  WidgetType,
  ChartType,
  KPI,
  MetricType,
  TimePeriod,
  Report,
  ReportType,
} from './src/dashboard';

// Example 14: KPI definition
const kpi: KPI = {
  id: 'kpi-001',
  nombre: 'Ventas del Mes',
  metricType: MetricType.TOTAL_SALES,
  valor: 150000,
  comparacion: {
    anterior: 120000,
    cambio: 30000,
    porcentaje: 25,
  },
  tendencia: 'UP',
  unidad: 'ARS',
  formatoMuestra: 'currency',
};

// Example 15: Dashboard widget
const widget: DashboardWidget = {
  id: 'widget-001',
  dashboardId: 'dash-001',
  titulo: 'Ventas Mensuales',
  tipo: WidgetType.CHART,
  chartType: ChartType.LINE,
  orden: 1,
  configuracion: {
    periodo: TimePeriod.MONTHLY,
    agruparPor: 'product',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// ADMIN EXAMPLES
// ============================================================================

import {
  AuditLog,
  AuditAction,
  EntityType,
  CreateUserAdminRequest,
  CreateUserAdminRequestSchema,
} from './src/admin';

// Example 16: Audit log
const auditLog: AuditLog = {
  id: 'audit-001',
  empresaId: 'biz-001',
  usuarioId: 'usr-001',
  accion: AuditAction.CREATE,
  entidadAfectada: EntityType.PRODUCT,
  entidadId: 'prod-001',
  valoresPosteriores: {
    nombre: 'Café Premium',
    precio: 150,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Example 17: Create admin user with validation
const createUserReq: CreateUserAdminRequest = {
  nombre: 'Admin User',
  email: 'admin@empresa.com',
  password: 'securePassword123',
  rol: 'ADMIN',
  activo: true,
};

const validatedUser = CreateUserAdminRequestSchema.parse(createUserReq);

// ============================================================================
// COMMON UTILITIES
// ============================================================================

import {
  ApiResponse,
  PaginatedResponse,
  ContactInfo,
  Location,
} from './src/common';

// Example 18: API response
const successResponse: ApiResponse<Sale> = {
  success: true,
  data: completeSale,
  meta: {
    timestamp: new Date().toISOString(),
  },
};

// Example 19: Paginated response
const paginatedSales: PaginatedResponse<Sale> = {
  data: [completeSale],
  meta: {
    page: 1,
    limit: 10,
    total: 100,
    pages: 10,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

// Example 20: Contact info
const contactInfo: ContactInfo = {
  email: 'info@empresa.com',
  phone: '+54 11 1234-5678',
  whatsapp: '+54 11 1234-5678',
};

// Example 21: Location
const location: Location = {
  country: 'Argentina',
  province: 'Buenos Aires',
  city: 'CABA',
  postalCode: '1425',
  address: 'Avenida Paseo Colón 123',
  coordinates: {
    latitude: -34.6037,
    longitude: -58.3816,
  },
};

console.log('All examples compiled successfully!');
