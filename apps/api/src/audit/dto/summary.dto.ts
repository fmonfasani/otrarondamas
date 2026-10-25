import { ApiProperty } from '@nestjs/swagger';

export class SummaryPeriodDto {
  @ApiProperty({ example: '2026-10-01' })
  desde: string;

  @ApiProperty({ example: '2026-10-31' })
  hasta: string;
}

export class AuditCountByActionDto {
  @ApiProperty({ example: 'VENTA_CREADA' })
  accion: string;

  @ApiProperty({ example: 450 })
  count: number;
}

export class AuditCountByUserDto {
  @ApiProperty({ example: 'user-123', nullable: true })
  userId: string | null;

  @ApiProperty({ example: 'Juan Pérez' })
  usuario: string;

  @ApiProperty({ example: 450 })
  count: number;
}

export class AuditCountByDayDto {
  @ApiProperty({ example: '2026-10-01' })
  fecha: string;

  @ApiProperty({ example: 42 })
  count: number;
}

export class AuditSummaryDto {
  @ApiProperty({ example: 1250 })
  total_eventos: number;

  @ApiProperty({ type: SummaryPeriodDto })
  periodo: SummaryPeriodDto;

  @ApiProperty({ type: [AuditCountByActionDto], required: false })
  por_accion?: AuditCountByActionDto[];

  @ApiProperty({ type: [AuditCountByUserDto], required: false })
  por_usuario?: AuditCountByUserDto[];

  @ApiProperty({ type: [AuditCountByDayDto], required: false })
  por_dia?: AuditCountByDayDto[];
}
