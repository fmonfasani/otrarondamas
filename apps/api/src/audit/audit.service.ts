import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
// import { AuditLog } from '@prisma/client'; // TODO: types

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(event: {
    empresaId: string;
    usuarioId?: string;
    accion: string;
    entidadAfectada: string;
    entidadId?: string;
    valoresAnteriores?: Record<string, unknown>;
    valoresPosteriores?: Record<string, unknown>;
    motivo?: string;
    autorizacionId?: string;
    ventaId?: string;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        id: randomUUID(),
        empresaId: event.empresaId,
        usuarioId: event.usuarioId,
        accion: event.accion,
        entidadAfectada: event.entidadAfectada,
        entidadId: event.entidadId,
        valoresAnteriores: event.valoresAnteriores,
        valoresPosteriores: event.valoresPosteriores,
        motivo: event.motivo,
        autorizacionId: event.autorizacionId,
        ventaId: event.ventaId,
        fechaHora: new Date(),
      },
    });
  }

  async logAsync(event: {
    empresaId: string;
    usuarioId?: string;
    accion: string;
    entidadAfectada: string;
    entidadId?: string;
    valoresAnteriores?: any;
    valoresPosteriores?: any;
    motivo?: string;
    autorizacionId?: string;
    ventaId?: string;
  }): Promise<void> {
    this.log(event).catch((err) => {
      console.error('[AuditService] Failed to log async event:', {
        accion: event.accion,
        empresaId: event.empresaId,
        entidadId: event.entidadId,
        error: err.message,
      });
    });
  }

  async logBatch(
    events: Array<{
      empresaId: string;
      usuarioId?: string;
      accion: string;
      entidadAfectada: string;
      entidadId?: string;
      valoresAnteriores?: any;
      valoresPosteriores?: any;
      motivo?: string;
      autorizacionId?: string;
      ventaId?: string;
    }>,
  ): Promise<number> {
    if (events.length === 0) return 0;

    const data = events.map((event) => ({
      id: randomUUID(),
      empresaId: event.empresaId,
      usuarioId: event.usuarioId,
      accion: event.accion,
      entidadAfectada: event.entidadAfectada,
      entidadId: event.entidadId,
      valoresAnteriores: event.valoresAnteriores,
      valoresPosteriores: event.valoresPosteriores,
      motivo: event.motivo,
      autorizacionId: event.autorizacionId,
      ventaId: event.ventaId,
      fechaHora: new Date(),
    }));

    const result = await this.prisma.auditLog.createMany({
      data,
      skipDuplicates: false,
    });

    return result.count;
  }

  async getLogs(filters: {
    empresaId: string;
    accion?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        empresaId: filters.empresaId,
        ...(filters.accion && { accion: filters.accion }),
        ...(filters.startDate || filters.endDate
          ? {
              fechaHora: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
      orderBy: { fechaHora: 'desc' },
      take: Math.min(filters.limit || 100, 1000),
    });
  }

  async countLogs(filters: {
    empresaId: string;
    accion?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        empresaId: filters.empresaId,
        ...(filters.accion && { accion: filters.accion }),
        ...(filters.startDate || filters.endDate
          ? {
              fechaHora: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate }),
              },
            }
          : {}),
      },
    });
  }

  async cleanupOldLogs(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 1);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        fechaHora: {
          lt: retentionDate,
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `[AuditService] Retention cleanup: ${result.count} records deleted older than ${retentionDate.toISOString()}`,
      );
    }
  }

  async getUserActivitySummary(
    empresaId: string,
    usuarioId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, number>> {
    const logs = await this.prisma.auditLog.groupBy({
      by: ['accion'],
      where: {
        empresaId,
        usuarioId,
        ...(startDate || endDate
          ? {
              fechaHora: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      _count: {
        id: true,
      },
    });

    const summary: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.accion) {
        summary[log.accion] = log._count.id;
      }
    });

    return summary;
  }

  async getActionDistribution(
    empresaId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, number>> {
    const logs = await this.prisma.auditLog.groupBy({
      by: ['accion'],
      where: {
        empresaId,
        ...(startDate || endDate
          ? {
              fechaHora: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      _count: {
        id: true,
      },
    });

    const distribution: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.accion) {
        distribution[log.accion] = log._count.id;
      }
    });

    return distribution;
  }

  /**
   * Log a system action (P3-3: RefundQueueService).
   *
   * Simpler interface for background jobs that don't have a user context.
   */
  async logSystemAction(details: {
    empresaId: string;
    accion: string;
    entidadAfectada: string;
    entidadId?: string;
    valoresAnteriores?: any;
    valoresPosteriores?: any;
    motivo?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: randomUUID(),
          empresaId: details.empresaId,
          usuarioId: null,
          accion: details.accion,
          entidadAfectada: details.entidadAfectada,
          entidadId: details.entidadId,
          valoresAnteriores: details.valoresAnteriores,
          valoresPosteriores: details.valoresPosteriores,
          motivo: details.motivo,
          fechaHora: new Date(),
        },
      });
    } catch (err) {
      // Do not throw; audit failure should not block refund processing
      console.error(`[AuditLog] Failed to log ${details.accion}`, err);
    }
  }
}
