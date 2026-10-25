import { Decimal } from '@prisma/client/runtime/library';

/* eslint-disable indent */

export class DevolucionItemDto {
  ventaItemId: string;
  cantidad: number;
  precioUnitario: number;
  motivo: string;
  montoRefund: number;

  constructor(data: {
    ventaItemId: string;
    cantidad: number;
    precioUnitario: number | Decimal;
    motivo: string;
  }) {
    this.ventaItemId = data.ventaItemId;
    this.cantidad = data.cantidad;
    this.precioUnitario =
      data.precioUnitario instanceof Decimal ? data.precioUnitario.toNumber() : data.precioUnitario;
    this.motivo = data.motivo;
    this.montoRefund = this.cantidad * this.precioUnitario;
  }
}

export class DevolucionDto {
  id: string;
  businessId: string;
  ventaId: string;
  clienteId: string;
  estado: 'SOLICITADA' | 'AUTORIZADA' | 'RECIBIDA' | 'PROCESADA';
  items: DevolucionItemDto[];
  motivo_general?: string;
  total_solicitado: number;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
  _links?: {
    refund?: {
      href: string;
    };
  };

  constructor(data: {
    id: string;
    empresaId: string;
    ventaId: string;
    clienteId: string;
    estado: string;
    items: Array<{
      ventaItemId: string;
      cantidad: number;
      precioUnitario: number | Decimal;
      motivo: string;
    }>;
    motivo_general?: string;
    total_solicitado: number | Decimal;
    createdAt: Date;
    createdBy?: string;
    updatedAt: Date;
    updatedBy?: string;
  }) {
    this.id = data.id;
    this.businessId = data.empresaId;
    this.ventaId = data.ventaId;
    this.clienteId = data.clienteId;
    this.estado = data.estado as 'SOLICITADA' | 'AUTORIZADA' | 'RECIBIDA' | 'PROCESADA';
    this.items = data.items.map((item) => new DevolucionItemDto(item));
    this.motivo_general = data.motivo_general;
    this.total_solicitado =
      data.total_solicitado instanceof Decimal
        ? data.total_solicitado.toNumber()
        : data.total_solicitado;
    this.createdAt = data.createdAt;
    this.createdBy = data.createdBy;
    this.updatedAt = data.updatedAt;
    this.updatedBy = data.updatedBy;
  }
}

export class RefundDto {
  id: string;
  devolucionId: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO';
  monto: number;
  metodo_pago: string;
  createdAt: Date;
  completedAt?: Date;
  error_message?: string;

  constructor(data: {
    id: string;
    devolucionId: string;
    estado: string;
    monto: number | Decimal;
    metodo_pago: string;
    createdAt: Date;
    completedAt?: Date;
    error_message?: string;
  }) {
    this.id = data.id;
    this.devolucionId = data.devolucionId;
    this.estado = data.estado as 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO';
    this.monto = data.monto instanceof Decimal ? data.monto.toNumber() : data.monto;
    this.metodo_pago = data.metodo_pago;
    this.createdAt = data.createdAt;
    this.completedAt = data.completedAt;
    this.error_message = data.error_message;
  }
}
