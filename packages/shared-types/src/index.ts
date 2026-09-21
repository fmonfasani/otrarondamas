// Tipos compartidos entre apps/api y los frontends para los endpoints ya
// implementados. Se mantienen sincronizados a mano con los DTOs/respuestas
// reales de apps/api/src (no son un espejo automático de schema.prisma).

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: AuthenticatedUser;
}

// --- Catálogo (apps/api/src/catalogo) ---

export interface Producto {
  id: string;
  empresaId: string;
  nombre: string;
  codigoInterno: string;
  codigoBarras: string | null;
  marca: string | null;
  categoriaId: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  costo: string; // Decimal de Prisma serializa como string en JSON
  precioMinorista: string;
  precioMayorista: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Ventas (apps/api/src/ventas) ---

export type CanalVenta = 'presencial' | 'mayorista' | 'online';

export interface CreateVentaItemRequest {
  productoId: string;
  cantidad: number;
  descuentoItem?: number;
}

export interface CreateVentaRequest {
  canal: CanalVenta;
  clienteId?: string;
  items: CreateVentaItemRequest[];
}

export interface VentaItem {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  descuentoItem: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venta {
  id: string;
  empresaId: string;
  usuarioId: string;
  clienteId: string | null;
  estado: string;
  canal: CanalVenta;
  total: string;
  descuento: string;
  createdAt: string;
  updatedAt: string;
  ventaItems: VentaItem[];
}

// --- Pagos (apps/api/src/pagos) ---

export type MedioPago = 'efectivo' | 'transferencia' | 'QR';

export interface CreatePagoRequest {
  medio: MedioPago;
  monto: number;
}

export interface Pago {
  id: string;
  empresaId: string;
  usuarioId: string | null;
  ventaId: string | null;
  deudaId: string | null;
  monto: string;
  medio: string;
  estado: string;
  comision: string;
  createdAt: string;
  updatedAt: string;
}

// --- Caja (apps/api/src/caja) ---

export type EstadoCaja = 'CERRADA' | 'ABIERTA' | 'EN_ARQUEO';

export interface Caja {
  id: string;
  empresaId: string;
  nombre: string;
  fondoFijo: string;
  estado: EstadoCaja;
  createdAt: string;
  updatedAt: string;
}

export interface AperturaCaja {
  id: string;
  cajaId: string;
  usuarioId: string;
  montoInicial: string;
  fechaApertura: string;
  fechaCierre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstadoCajaResponse {
  caja: Caja;
  aperturaVigente: AperturaCaja | null;
}

export interface AbrirCajaRequest {
  montoInicial: number;
}

// 'Venta' no está incluido: ese tipo lo genera únicamente el sistema
// desde pagos.service.ts al cobrar en efectivo, nunca se carga a mano
// desde este DTO (ver caja.service.ts, RegistrarMovimientoDto).
export type TipoMovimientoManual = 'Ingreso' | 'Egreso' | 'Gasto' | 'Retiro';

export interface RegistrarMovimientoRequest {
  tipo: TipoMovimientoManual;
  monto: number;
  descripcion?: string;
}

export interface MovimientoCaja {
  id: string;
  cajaId: string;
  aperturaCajaId: string | null;
  usuarioId: string;
  tipo: string;
  monto: string;
  descripcion: string | null;
  referenciaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrarArqueoRequest {
  usuarioEntranteId: string;
  efectivoContado: number;
}

export interface ArqueoCaja {
  id: string;
  cajaId: string;
  aperturaCajaId: string;
  usuarioId: string; // saliente
  usuarioEntranteId: string;
  fondoFijoContado: string;
  efectivoVentasContado: string;
  efectivoDeudasContado: string;
  gastosRetirosRegistrados: string;
  efectivoEsperado: string;
  efectivoContado: string;
  diferencia: string;
  autorizacionId: string | null;
  fechaArqueo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArquearCajaResponse {
  arqueo: ArqueoCaja;
  requiereAutorizacion: boolean;
}

export interface CierreCaja {
  id: string;
  aperturaCajaId: string;
  usuarioId: string;
  fechaCierre: string;
  montoFinal: string;
  createdAt: string;
  updatedAt: string;
}
