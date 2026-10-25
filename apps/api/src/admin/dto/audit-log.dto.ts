export class AuditLogEntryDto {
  id: string;
  empresaId: string;
  usuarioId?: string;
  usuarioNombre?: string;
  fechaHora: Date;
  accion: string;
  entidadAfectada: string;
  entidadId?: string;
  valoresAnteriores?: Record<string, any>;
  valoresPosteriores?: Record<string, any>;
  motivo?: string;
}

export class ListAuditLogsDto {
  data: AuditLogEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditLogFilterDto {
  empresaId?: string;
  usuarioId?: string;
  accion?: string;
  entidadAfectada?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page?: number;
  limit?: number;
}
