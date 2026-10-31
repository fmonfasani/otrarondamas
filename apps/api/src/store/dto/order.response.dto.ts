// import { Prisma } from '@prisma/client'; // TODO: types

/**
 * Order response DTOs.
 * Transforms Prisma Decimal fields to numbers for JSON serialization.
 */

interface IPedidoItemData {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: any;
  precioUnitario: any;
  descuentoFidelizacionPorcentaje: any;
  createdAt: Date;
  updatedAt: Date;
}

interface IPedidoData {
  id: string;
  empresaId: string;
  clienteId: string;
  usuarioId: string | null;
  estado: string;
  canalOrigen: string;
  total: any;
  descuento?: any;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  pedidoItems?: IPedidoItemData[];
}

export class PedidoItemResponseDto {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  descuentoFidelizacionPorcentaje: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: IPedidoItemData) {
    this.id = data.id;
    this.pedidoId = data.pedidoId;
    this.productoId = data.productoId;
    this.cantidad = Number(data.cantidad);
    this.precioUnitario = Number(data.precioUnitario);
    this.descuentoFidelizacionPorcentaje = data.descuentoFidelizacionPorcentaje
      ? Number(data.descuentoFidelizacionPorcentaje)
      : null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class PedidoResponseDto {
  id: string;
  empresaId: string;
  clienteId: string;
  usuarioId: string | null;
  estado: string;
  canalOrigen: string;
  total: number;
  descuento: number;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  pedidoItems: PedidoItemResponseDto[];

  constructor(data: IPedidoData) {
    this.id = data.id;
    this.empresaId = data.empresaId;
    this.clienteId = data.clienteId;
    this.usuarioId = data.usuarioId;
    this.estado = data.estado;
    this.canalOrigen = data.canalOrigen;
    this.total = Number(data.total);
    this.descuento = data.descuento ? Number(data.descuento) : 0;
    this.idempotencyKey = data.idempotencyKey;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.pedidoItems = (data.pedidoItems || []).map((item) => new PedidoItemResponseDto(item));
  }
}
