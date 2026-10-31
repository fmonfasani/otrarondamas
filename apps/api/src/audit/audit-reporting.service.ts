import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogDto, AuditLogListResponseDto } from './dto/audit-log.dto';
import { AuditSummaryDto } from './dto/summary.dto';

@Injectable()
export class AuditReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pattern 1: List audit logs with filters
   */
  async listAuditLogs(
    businessId: string,
    userId: string | null,
    hasAuditLeerOtros: boolean,
    filters: {
      accion?: string;
      entidad?: string;
      filterUserId?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLogListResponseDto> {
    const limit = Math.min(filters.limit || 50, 500);
    const offset = filters.offset || 0;

    // Parse and validate dates
    let dateGte: Date | undefined;
    let dateLte: Date | undefined;

    if (filters.fecha_desde) {
      dateGte = new Date(filters.fecha_desde);
      if (isNaN(dateGte.getTime())) {
        throw new BadRequestException('fecha_desde must be a valid ISO 8601 date');
      }
    }

    if (filters.fecha_hasta) {
      dateLte = new Date(filters.fecha_hasta);
      if (isNaN(dateLte.getTime())) {
        throw new BadRequestException('fecha_hasta must be a valid ISO 8601 date');
      }
      // Include the entire end day
      dateLte.setHours(23, 59, 59, 999);
    }

    if (dateGte && dateLte && dateGte > dateLte) {
      throw new BadRequestException('fecha_desde must be <= fecha_hasta');
    }

    // Build filter: enforce businessId, apply user filter if needed
    const whereFilter:  any = {
      empresaId: businessId,
      accion: filters.accion ? { equals: filters.accion } : undefined,
      entidadAfectada: filters.entidad ? { equals: filters.entidad } : undefined,
      createdAt: {
        gte: dateGte,
        lte: dateLte,
      },
    };

    // If user doesn't have audit.leer_otros, restrict to their own logs
    if (!hasAuditLeerOtros && userId) {
      whereFilter.usuarioId = userId;
    } else if (filters.filterUserId) {
      // Admin can filter by specific user
      whereFilter.usuarioId = filters.filterUserId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereFilter,
        include: {
          Usuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: whereFilter }),
    ]);

    return {
      items: logs.map((log) => this.mapAuditLogToDto(log)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Pattern 2: Get single audit log detail
   */
  async getAuditLogDetail(
    id: string,
    businessId: string,
    userId: string | null,
    hasAuditLeerOtros: boolean,
  ): Promise<AuditLogDto> {
    const log = await this.prisma.auditLog.findFirst({
      where: {
        id,
        empresaId: businessId,
      },
      include: {
        Usuario: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    // Authorization check: user can only see their own logs unless they have leer_otros
    if (!hasAuditLeerOtros && log.usuarioId !== userId) {
      throw new NotFoundException('Audit log not found');
    }

    return this.mapAuditLogToDto(log);
  }

  /**
   * Pattern 3: Summary aggregation (by action, day, or user)
   */
  async getAuditSummary(
    businessId: string,
    filters: {
      fecha_desde: string;
      fecha_hasta: string;
      group_by?: 'dia' | 'accion' | 'usuario';
    },
  ): Promise<AuditSummaryDto> {
    // Parse and validate dates
    const dateGte = new Date(filters.fecha_desde);
    if (isNaN(dateGte.getTime())) {
      throw new BadRequestException('fecha_desde must be a valid ISO 8601 date');
    }

    const dateLte = new Date(filters.fecha_hasta);
    if (isNaN(dateLte.getTime())) {
      throw new BadRequestException('fecha_hasta must be a valid ISO 8601 date');
    }
    dateLte.setHours(23, 59, 59, 999);

    if (dateGte > dateLte) {
      throw new BadRequestException('fecha_desde must be <= fecha_hasta');
    }

    const groupBy = filters.group_by || 'dia';

    const baseWhere:  any = {
      empresaId: businessId,
      createdAt: {
        gte: dateGte,
        lte: dateLte,
      },
    };

    // Get total count
    const totalCount = await this.prisma.auditLog.count({
      where: baseWhere,
    });

    // Build period response
    const desde = dateGte.toISOString().split('T')[0];
    const hasta = dateLte.toISOString().split('T')[0];

    const response: AuditSummaryDto = {
      total_eventos: totalCount,
      periodo: { desde, hasta },
    };

    // Aggregate by selected dimension
    if (groupBy === 'accion') {
      const byAction = await this.prisma.auditLog.groupBy({
        by: ['accion'],
        where: baseWhere,
        _count: true,
        orderBy: {
          _count: {
            accion: 'desc',
          },
        },
      });

      response.por_accion = byAction.map((item) => ({
        accion: item.accion,
        count: item._count,
      }));
    } else if (groupBy === 'usuario') {
      const byUser = await this.prisma.auditLog.groupBy({
        by: ['usuarioId'],
        where: baseWhere,
        _count: true,
        orderBy: {
          _count: {
            usuarioId: 'desc',
          },
        },
      });

      // Fetch user details for non-null userIds
      const userIds = byUser.map((item) => item.usuarioId).filter((id) => id !== null) as string[];

      const users = userIds.length
        ? await this.prisma.usuario.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nombre: true },
          })
        : [];

      const userMap = new Map(users.map((u) => [u.id, u.nombre]));

      response.por_usuario = byUser.map((item) => ({
        userId: item.usuarioId,
        usuario: item.usuarioId ? userMap.get(item.usuarioId) || 'Unknown' : 'Sistema',
        count: item._count,
      }));
    } else {
      // group_by === 'dia' (default)
      const logs = await this.prisma.auditLog.findMany({
        where: baseWhere,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day application-side
      const byDay = new Map<string, number>();
      for (const log of logs) {
        const day = log.createdAt.toISOString().split('T')[0];
        byDay.set(day, (byDay.get(day) || 0) + 1);
      }

      response.por_dia = Array.from(byDay.entries())
        .map(([fecha, count]) => ({ fecha, count }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    return response;
  }

  /**
   * Pattern 4: User activity trail (paginated)
   */
  async getUserActivityTrail(
    targetUserId: string,
    businessId: string,
    currentUserId: string | null,
    hasAuditLeerOtros: boolean,
    filters: {
      fecha_desde?: string;
      fecha_hasta?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLogListResponseDto> {
    // Authorization check: user can only see their own activity unless they have leer_otros
    if (!hasAuditLeerOtros && targetUserId !== currentUserId) {
      throw new NotFoundException('User activity not found');
    }

    // Verify target user exists in this business
    const userExists = await this.prisma.usuario.findFirst({
      where: {
        id: targetUserId,
        empresaId: businessId,
      },
    });

    if (!userExists) {
      throw new NotFoundException('User not found in this business');
    }

    const limit = Math.min(filters.limit || 50, 500);
    const offset = filters.offset || 0;

    // Parse and validate dates
    let dateGte: Date | undefined;
    let dateLte: Date | undefined;

    if (filters.fecha_desde) {
      dateGte = new Date(filters.fecha_desde);
      if (isNaN(dateGte.getTime())) {
        throw new BadRequestException('fecha_desde must be a valid ISO 8601 date');
      }
    }

    if (filters.fecha_hasta) {
      dateLte = new Date(filters.fecha_hasta);
      if (isNaN(dateLte.getTime())) {
        throw new BadRequestException('fecha_hasta must be a valid ISO 8601 date');
      }
      dateLte.setHours(23, 59, 59, 999);
    }

    if (dateGte && dateLte && dateGte > dateLte) {
      throw new BadRequestException('fecha_desde must be <= fecha_hasta');
    }

    const whereFilter:  any = {
      empresaId: businessId,
      usuarioId: targetUserId,
      createdAt: {
        gte: dateGte,
        lte: dateLte,
      },
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereFilter,
        include: {
          Usuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: whereFilter }),
    ]);

    return {
      items: logs.map((log) => this.mapAuditLogToDto(log)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Helper: Map AuditLog record to DTO
   */
  private mapAuditLogToDto(log: Record<string, unknown>): AuditLogDto {
    return {
      id: log.id as any,
      businessId: log.empresaId as any,
      accion: log.accion as any,
      entidad: log.entidadAfectada as any,
      entityId: (log.entidadId as any) || undefined,
      userId: (log.usuarioId as any) || undefined,
      usuario: log.Usuario
        ? {
            id: (log.Usuario as any).id,
            nombre: (log.Usuario as any).nombre,
            email: (log.Usuario as any).email,
          }
        : undefined,
      valores_anteriores: (log.valoresAnteriores as any) || undefined,
      valores_nuevos: (log.valoresPosteriores as any) || undefined,
      cambios_resumidos: undefined,
      ip_address: undefined,
      motivo: (log.motivo as any) || undefined,
      createdAt: (log.createdAt as any).toISOString(),
    };
  }
}
