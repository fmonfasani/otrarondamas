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

// --- Categorización de catálogo (apps/api/src/catalogo) ---
// Jerarquía fija de 4 niveles, todos obligatorios en Producto (se usa el
// nodo "GEN" de Tipo/Subtipo cuando un rubro no necesita más detalle que
// Familia/Subfamilia). Ver la sesión de definición de catálogo.

export interface Familia {
  id: string;
  empresaId: string;
  nombre: string;
  prefijo: string; // 3 letras, usado como segmento del SKU
  activo: boolean;
}

export interface Subfamilia {
  id: string;
  empresaId: string;
  familiaId: string;
  nombre: string;
  prefijo: string;
  activo: boolean;
}

export interface Tipo {
  id: string;
  empresaId: string;
  subfamiliaId: string;
  nombre: string;
  prefijo: string;
  activo: boolean;
}

export interface Subtipo {
  id: string;
  empresaId: string;
  tipoId: string;
  nombre: string;
  prefijo: string;
  activo: boolean;
}

// Shape de GET /catalogo/jerarquia — las 4 tablas completas, para armar
// el árbol en el cliente (selectores en cascada de Producto/
// ReglaFidelizacion) sin pedir un endpoint por nivel.
export interface JerarquiaCatalogo {
  familias: Familia[];
  subfamilias: Subfamilia[];
  tipos: Tipo[];
  subtipos: Subtipo[];
}

export interface Producto {
  id: string;
  empresaId: string;
  nombre: string;
  // SKU interno FAM-SUB-TIP-SUBT-NNNNNNNN — no editable después de
  // creado (ver comentario en UpdateProductoRequest).
  codigoInterno: string;
  codigoBarras: string | null;
  marca: string | null;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  costo: string; // Decimal de Prisma serializa como string en JSON
  precioMinorista: string;
  precioMayorista: string | null;
  // Fase 6 de Tienda Online (RF-06/RF-04): descuento único, global y
  // por porcentaje sobre precioMinorista. null o 0 = sin descuento.
  descuentoPorcentaje: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductoRequest {
  nombre: string;
  codigoInterno: string;
  codigoBarras?: string;
  marca?: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  costo: number;
  precioMinorista: number;
  precioMayorista?: number;
  descuentoPorcentaje?: number;
  activo?: boolean;
}

export type UpdateProductoRequest = Partial<Omit<CreateProductoRequest, 'codigoInterno'>>;

// --- Ventas (apps/api/src/ventas) ---

export type CanalVenta = 'presencial' | 'mayorista' | 'online';

// Inc-1 (C11): enum en vez de String libre
export type EstadoVenta = 'CONFIRMADA' | 'ANULADA';

export interface CreateVentaItemRequest {
  productoId: string;
  cantidad: number;
  descuentoItem?: number;
}

export interface CreateVentaRequest {
  canal: CanalVenta;
  clienteId?: string;
  items: CreateVentaItemRequest[];
  // Inc-1 (INV-VTA-07): UUID v4 generado por el cliente antes de confirmar.
  // Reintento con la misma clave devuelve la venta ya creada.
  idempotencyKey?: string;
}

// Inc-1: búsqueda de productos para el POS — solo activos, con stock.
// Usado por GET /ventas/productos?search=
export interface ProductoBusqueda {
  id: string;
  nombre: string;
  codigoInterno: string;
  codigoBarras: string | null;
  marca: string | null;
  precioMinorista: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  activo: boolean;
  // Familia/Subfamilia para mostrar categoría en resultado
  familia: { id: string; nombre: string } | null;
  subfamilia: { id: string; nombre: string } | null;
  // Stock disponible (suma de todos los lotes vigentes)
  stockDisponible: number;
  stockMinimo: number;
}

export interface VentaItem {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  // Descuento MANUAL cargado por el vendedor.
  descuentoItem: string;
  // Fase 5 del roadmap de Fidelización: descuento AUTOMÁTICO por nivel
  // de fidelidad del cliente, calculado por el backend — null si no
  // aplicó ninguna regla (sin cliente identificado, o ninguna regla
  // matcheó). Se resta sobre el subtotal DESPUÉS de descuentoItem (ver
  // ventas.service.ts) — ambos son independientes y se muestran por
  // separado, nunca sumados en un solo número.
  descuentoFidelizacionPorcentaje: string | null;
  reglaFidelizacionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Venta {
  id: string;
  empresaId: string;
  usuarioId: string;
  clienteId: string | null;
  // Inc-1 (C11): tipado como EstadoVenta
  estado: EstadoVenta;
  canal: CanalVenta;
  total: string;
  descuento: string;
  // Inc-1 (INV-VTA-07): clave de idempotencia
  idempotencyKey: string | null;
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
  // Inc-1/Inc-3 (RF-VTA-15, RF-VTA-16, C19)
  montoRecibido: string | null; // Solo efectivo
  vuelto: string | null; // Solo efectivo
  referencia: string | null; // Transferencia/QR: nro de operación
  createdAt: string;
  updatedAt: string;
}

// Inc-3 (RF-VTA-14, RF-VTA-15): pagos mixtos, efectivo con vuelto
export interface CreatePagoVentaRequest {
  medio: MedioPago;
  monto: number;
  montoRecibido?: number; // Solo efectivo
  referencia?: string; // Transferencia/QR
}

// Inc-2 (RF-VTA-09, RF-VTA-10): cotización previa del total.
// Mismos campos que CreateVentaRequest pero sin idempotencyKey.
export interface CotizarVentaRequest {
  canal: CanalVenta;
  clienteId?: string;
  items: CreateVentaItemRequest[];
}

export interface CotizacionLinea {
  productoId: string;
  precioUnitario: string; // Decimal serializado
  cantidad: string;
  descuentoFidelizacionPorcentaje: string | null;
  reglaFidelizacionId: string | null;
  descuentoItem: string;
  subtotal: string; // redondeado a 2 dec
}

export interface CotizacionResponse {
  lineas: CotizacionLinea[];
  total: string; // suma de subtotales, 2 dec
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
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
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

// --- Compras y proveedores (apps/api/src/compras) — RF-12 ---
// CRUD de Proveedor, orden de compra, recepción, pagos y devoluciones.

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
  totalPagado: string;
  saldo: string;
  numeroFactura: string | null;
  fechaVencimientoPago: string | null;
  fechaOrden: string;
  fechaRecepcionEsperada: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CompraItem[];
  recepciones?: RecepcionCompra[];
  pagos?: PagoProveedor[];
  devoluciones?: DevolucionProveedor[];
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

export interface PagoProveedor {
  id: string;
  empresaId: string;
  compraId: string;
  proveedorId: string;
  usuarioId: string;
  monto: string;
  medioPago: string;
  referencia: string | null;
  fecha: string;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePagoProveedorRequest {
  monto: number;
  medioPago: string;
  referencia?: string;
  notas?: string;
}

export interface DevolucionProveedorItem {
  id: string;
  devolucionId: string;
  productoId: string;
  loteId: string | null;
  cantidad: string;
  costoUnitario: string;
}

export interface DevolucionProveedor {
  id: string;
  empresaId: string;
  compraId: string;
  proveedorId: string;
  usuarioId: string;
  motivo: string;
  fecha: string;
  createdAt: string;
  updatedAt: string;
  items?: DevolucionProveedorItem[];
}

export interface CreateDevolucionProveedorItemRequest {
  productoId: string;
  loteId?: string;
  cantidad: number;
  costoUnitario: number;
}

export interface CreateDevolucionProveedorRequest {
  motivo: string;
  items: CreateDevolucionProveedorItemRequest[];
}

// --- Tienda online (apps/api/src/tienda) — RF-06, Fases 1-3 ---
// Superficie PÚBLICA, consumida por apps/tienda-online (sin login).
// No confundir con Producto/Venta: son formas reducidas pensadas para
// un visitante anónimo, nunca exponen costo ni otros campos internos.

export interface ProductoTienda {
  productoId: string;
  nombre: string;
  codigoInterno: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  unidadBase: 'UNIDAD' | 'KILOGRAMO' | 'LITRO' | 'METRO' | 'PACK' | 'CAJA';
  // Precio final a mostrar/cobrar (ya con el descuento aplicado, si lo
  // tiene) — Fase 6, RF-06/RF-04.
  precio: string; // Decimal de Prisma serializa como string
  // Precio original SIN descontar, solo presente cuando hay descuento
  // activo — para que el frontend pueda mostrar "antes/después" tachado.
  precioSinDescuento: string | null;
  descuentoPorcentaje: number | null;
  disponible: boolean;
  stockTotal: number;
}

// Shape de GET /tienda/jerarquia — Familia/Subfamilia activas, para
// armar los chips de filtro del catálogo público (spec de diseño de
// Tienda Online). Subconjunto de JerarquiaCatalogo (sin Tipo/Subtipo,
// el filtro de tienda no llega tan hondo).
export interface JerarquiaTienda {
  familias: Familia[];
  subfamilias: Subfamilia[];
}

export interface CrearPedidoItemRequest {
  productoId: string;
  cantidad: number;
}

export interface CrearPedidoRequest {
  nombre: string;
  email: string;
  telefono?: string;
  items: CrearPedidoItemRequest[];
}

export type EstadoPedido =
  | 'RECIBIDO'
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ASIGNADO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'PARCIALMENTE_ENTREGADO'
  | 'ENTREGA_FALLIDA'
  | 'CANCELADO';

export interface PedidoCreado {
  id: string;
  empresaId: string;
  clienteId: string;
  usuarioId: string | null;
  estado: EstadoPedido;
  canalOrigen: string;
  total: string;
  descuento: string;
  createdAt: string;
  updatedAt: string;
  pedidoItems: {
    id: string;
    pedidoId: string;
    productoId: string;
    cantidad: string;
    precioUnitario: string;
    descuentoItem: string;
    // Fase 5 del roadmap de Fidelización, extendida a Tienda Online —
    // ver comentario en VentaItem más arriba, mismo criterio.
    descuentoFidelizacionPorcentaje: string | null;
    reglaFidelizacionId: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface SeguimientoPedidoItem {
  producto: string;
  cantidad: string;
  precioUnitario: string;
}

export interface SeguimientoPedido {
  id: string;
  estado: EstadoPedido;
  total: string;
  createdAt: string;
  items: SeguimientoPedidoItem[];
}

// --- Pedidos (apps/api/src/pedidos) — RF-06 Fase 4 ---
// Superficie PRIVADA (pos-admin), contrapartida de /tienda/*. Requiere
// el permiso pedidos.gestionar en TODO (incluidos los GET) — a
// diferencia de Compras/Caja, acá el propio listado expone datos
// personales del cliente.

export interface PedidoItemConProducto {
  id: string;
  pedidoId: string;
  productoId: string;
  producto: { nombre: string };
  cantidad: string;
  precioUnitario: string;
  descuentoItem: string;
  // Fase 5 del roadmap de Fidelización, extendida a Tienda Online — ver
  // comentario en VentaItem más arriba, mismo criterio.
  descuentoFidelizacionPorcentaje: string | null;
  reglaFidelizacionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteResumen {
  nombre: string;
  email: string;
  telefono: string | null;
}

export interface PedidoListado {
  id: string;
  empresaId: string;
  clienteId: string;
  cliente: ClienteResumen;
  usuarioId: string | null;
  estado: EstadoPedido;
  canalOrigen: string;
  total: string;
  descuento: string;
  createdAt: string;
  updatedAt: string;
  pedidoItems: PedidoItemConProducto[];
}

// Solo estas dos transiciones están implementadas hoy — ver
// apps/api/src/pedidos/dto/actualizar-estado-pedido.dto.ts. El resto
// del ciclo de vida (preparación, entrega) es RF-13, sin implementar.
export type TransicionPedido = 'CONFIRMADO' | 'CANCELADO';

export interface ActualizarEstadoPedidoRequest {
  estado: TransicionPedido;
}

// --- Clientes (apps/api/src/clientes) — Fase 1 del roadmap de Fidelización ---
// CRUD mínimo: nombre/email/teléfono/dirección. Sin cuenta corriente
// (RF-10) ni nivel de fidelidad todavía (Fase 3 del roadmap).

// Fase 3 del roadmap de Fidelización: nivel calculado al vuelo por
// historial de compras confirmadas — nunca persistido.
export type NivelFidelidad = 'NUEVO' | 'FRECUENTE' | 'VIP';

export interface Cliente {
  id: string;
  empresaId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  limiteCredito: string | null; // RF-10, sin uso todavía — Decimal de Prisma
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  // Presente en GET /clientes y GET /clientes/:id (se calcula ahí).
  // Ausente en la respuesta de POST/PATCH, que devuelven el registro
  // recién escrito sin recalcular el nivel.
  nivel?: NivelFidelidad;
}

export interface CreateClienteRequest {
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export type UpdateClienteRequest = Partial<CreateClienteRequest>;

// --- Reglas de fidelización (apps/api/src/fidelizacion) — Fase 4 del
// roadmap de Fidelización. CRUD protegido en su totalidad, incluidos
// los GET (política de precios del negocio, mismo criterio que
// Pedidos) — ver fidelizacion.controller.ts.

export interface ReglaFidelizacion {
  id: string;
  empresaId: string;
  nombre: string;
  nivelRequerido: NivelFidelidad;
  descuentoPorcentaje: string; // Decimal de Prisma serializa como string
  // Alcance por jerarquía de catálogo — cada nivel es un filtro
  // independiente y opcional (a diferencia de Producto, acá NO forman
  // necesariamente una cadena completa: una regla puede apuntar a toda
  // una Familia sin acotar Subfamilia/Tipo/Subtipo).
  familiaId: string | null;
  familia: { nombre: string } | null;
  subfamiliaId: string | null;
  subfamilia: { nombre: string } | null;
  tipoId: string | null;
  tipo: { nombre: string } | null;
  subtipoId: string | null;
  subtipo: { nombre: string } | null;
  marca: string | null;
  cantidadMinima: number | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReglaFidelizacionRequest {
  nombre: string;
  nivelRequerido: NivelFidelidad;
  descuentoPorcentaje: number;
  familiaId?: string;
  subfamiliaId?: string;
  tipoId?: string;
  subtipoId?: string;
  marca?: string;
  cantidadMinima?: number;
  activo?: boolean;
}

export type UpdateReglaFidelizacionRequest = Partial<CreateReglaFidelizacionRequest>;
