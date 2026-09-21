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

// Shape de GET /auth/me — ver apps/api/src/auth/auth.types.ts para el
// porqué de no embeber estos campos en AuthenticatedUser/el JWT.
export interface PerfilUsuario extends AuthenticatedUser {
  empresaNombre: string;
  fotoUrl: string | null;
  metodoLogin: 'google' | 'password';
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: PerfilUsuario;
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
  // Fase 5 de Inventario (D-09): productoId de cada item que se descontó
  // de al menos un lote ya vencido al momento de la venta. La venta NO
  // se bloquea (decisión explícita, ver docs/scaffolding-notas.md) — es
  // solo una advertencia puntual de esta respuesta; el registro
  // permanente queda en MovimientoStock.loteVencidoAlMomento. Solo
  // presente en la respuesta de POST /ventas, no en GET.
  advertenciasStockVencido?: string[];
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

// D-06: credenciales de quien AUTORIZA (dueño/usuario con el permiso
// requerido), no las de la sesión activa que está bloqueada.
export interface AutorizarArqueoRequest {
  email: string;
  password: string;
  motivo?: string;
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

// --- Usuarios (apps/api/src/usuarios) ---
// Listado mínimo de solo lectura, no gestión de usuarios completa — ver
// usuarios.controller.ts. Usado para elegir el "usuario entrante" del
// arqueo de caja.

export interface UsuarioResumen {
  id: string;
  nombre: string;
  email: string;
}

// --- Inventario (apps/api/src/inventario) — Fase 1: solo lectura ---
// Ver docs sección 16.x del roadmap (INV-CONS-*). No implementa un
// segundo mecanismo de descuento de stock: VentasService sigue siendo el
// único que descuenta (ver auth.google.service.ts para el mismo
// principio aplicado a auth).

export interface StockConsolidado {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  categoriaId: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  stockTotal: number;
  // stockMinimo=0 (default de todo el catálogo existente) nunca
  // dispara stockBajo — ver Fase 4 del roadmap de inventario.
  stockMinimo: number;
  stockBajo: boolean;
}

// Fase 4 (INV-AL-*): alertas de bajo stock y vencimiento.
export interface AlertaStockBajo {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  stockTotal: number;
  stockMinimo: number;
}

export interface AlertaLotePorVencer {
  loteId: string;
  productoId: string;
  productoNombre: string;
  codigoInterno: string;
  numeroLote: string;
  vencimiento: string;
  cantidad: string; // Decimal de Prisma serializa como string
}

export interface AlertasInventario {
  diasAnticipacion: number;
  stockBajo: AlertaStockBajo[];
  lotesPorVencer: AlertaLotePorVencer[];
}

export interface Lote {
  id: string;
  empresaId: string;
  productoId: string;
  numeroLote: string;
  vencimiento: string;
  cantidad: string; // Decimal de Prisma serializa como string en JSON
  createdAt: string;
  updatedAt: string;
}

export interface MovimientoStock {
  id: string;
  empresaId: string;
  productoId: string;
  loteId: string | null;
  tipoMovimiento: string; // 'Entrada' | 'Salida' | 'Ajuste'
  cantidad: string;
  motivo: string; // 'Venta' | 'Compra' | 'AjusteManual' | 'Devolucion'
  referenciaId: string | null;
  usuarioId: string | null;
  recepcionCompraId: string | null;
  // Fase 5 de Inventario (D-09): true si el Lote ya estaba vencido al
  // momento de generarse este movimiento. Solo se calcula al vender
  // (motivo 'Venta') — no bloquea la operación, es auditoría. false en
  // todo movimiento que no pasó por ese chequeo (Compra, AjusteManual).
  loteVencidoAlMomento: boolean;
  createdAt: string;
  updatedAt: string;
}

// Fase 2 (INV-AJ-*): ajustes manuales de stock. cantidad es la
// variación (positiva suma, negativa resta), no el total resultante —
// ver apps/api/src/inventario/dto/registrar-ajuste.dto.ts.
export interface RegistrarAjusteRequest {
  loteId: string;
  cantidad: number;
  motivo: string;
}

// --- Compras y proveedores (apps/api/src/compras) — RF-12 Fase 1 ---
// CRUD de Proveedor, orden de compra, recepción (total o parcial).
// Sin pagos a proveedor, facturas ni devoluciones todavía.

export interface Proveedor {
  id: string;
  empresaId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProveedorRequest {
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export type UpdateProveedorRequest = Partial<CreateProveedorRequest>;

export type EstadoCompra = 'BORRADOR' | 'EMITIDA' | 'RECEPCION_PARCIAL' | 'RECIBIDA';

export interface CompraItem {
  id: string;
  compraId: string;
  productoId: string;
  cantidadPedida: string; // Decimal de Prisma serializa como string
  cantidadRecibida: string;
  costoUnitario: string;
  createdAt: string;
  updatedAt: string;
}

export interface Compra {
  id: string;
  empresaId: string;
  proveedorId: string;
  proveedor?: Proveedor;
  usuarioId: string;
  estado: EstadoCompra;
  total: string;
  fechaOrden: string;
  fechaRecepcionEsperada: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CompraItem[];
  recepciones?: RecepcionCompra[];
}

export interface RecepcionCompra {
  id: string;
  empresaId: string;
  compraId: string;
  usuarioId: string;
  fechaRecepcion: string;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  movimientosStock?: MovimientoStock[];
}

export interface CreateCompraItemRequest {
  productoId: string;
  cantidadPedida: number;
  costoUnitario: number;
}

export interface CreateCompraRequest {
  proveedorId: string;
  fechaRecepcionEsperada?: string;
  items: CreateCompraItemRequest[];
}

export interface RecibirCompraItemRequest {
  compraItemId: string;
  cantidadRecibida: number;
  vencimiento: string;
  numeroLote: string;
}

export interface RecibirCompraRequest {
  items: RecibirCompraItemRequest[];
  observaciones?: string;
}
