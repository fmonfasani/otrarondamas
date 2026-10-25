import { ApiProperty } from '@nestjs/swagger';

export class AuditLogUserDto {
  @ApiProperty({ example: 'user-123' })
  id: string;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;
}

export class AuditLogDto {
  @ApiProperty({ example: 'audit-123' })
  id: string;

  @ApiProperty({ example: 'business-1' })
  businessId: string;

  @ApiProperty({ example: 'VENTA_CREADA' })
  accion: string;

  @ApiProperty({ example: 'Venta' })
  entidad: string;

  @ApiProperty({ example: 'venta-456', required: false })
  entityId?: string;

  @ApiProperty({ example: 'user-789', required: false })
  userId?: string;

  @ApiProperty({ type: AuditLogUserDto, required: false })
  usuario?: AuditLogUserDto;

  @ApiProperty({ example: null, required: false })
  valores_anteriores?: Record<string, unknown>;

  @ApiProperty({
    example: { total: 150.5, items: 3, estado: 'CREADA' },
    required: false,
  })
  valores_nuevos?: Record<string, unknown>;

  @ApiProperty({
    example: 'Venta creada con 3 items, total $150.50',
    required: false,
  })
  cambios_resumidos?: string;

  @ApiProperty({ example: '192.168.1.100', required: false })
  ip_address?: string;

  @ApiProperty({ example: null, required: false })
  motivo?: string;

  @ApiProperty({ example: '2026-10-25T14:32:10.000Z' })
  createdAt: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogDto] })
  items: AuditLogDto[];

  @ApiProperty({ example: 1250 })
  total: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}

export class AuditLogDetailResponseDto extends AuditLogDto {}
