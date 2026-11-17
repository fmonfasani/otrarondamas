import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TOPICS,
  changesOf,
  describeAction,
  isTopic,
  recordAudit,
  redact,
  topicWhere,
} from './audit-catalog';

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 5000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** UTF-8 byte order mark, so Excel opens accents right. */
const BOM = String.fromCodePoint(0xfeff);

export type AuditViewer = { usuarioId: string; todo: boolean };
export type AuditFilters = {
  desde?: string;
  hasta?: string;
  usuarioId?: string;
  tema?: string;
  page?: number;
};

type Row = Prisma.AuditLogGetPayload<{
  include: { Usuario: { select: { id: true; nombre: true; email: true } } };
}>;

/** AAAA-MM-DD and a real calendar day: 2026-13-45 or 2026-02-30 are refused. */
function isCalendarDay(value: string) {
  if (!DAY.test(value)) return false;
  const d = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A day in Argentina (UTC-3, no DST) → its start in UTC. */
const dayStart = (d: string) => new Date(`${d}T03:00:00.000Z`);

/** Dates are real calendar days and in order; the topic is a known one. */
function checkFilters(f: AuditFilters) {
  for (const [name, value] of [
    ['desde', f.desde],
    ['hasta', f.hasta],
  ] as const) {
    // The shape and a real calendar day (2026-13-45 is refused, not a server error).
    if (value && !isCalendarDay(value)) {
      throw new BadRequestException(`${name} va como AAAA-MM-DD`);
    }
  }
  if (f.desde && f.hasta && f.desde > f.hasta) {
    throw new BadRequestException('«desde» tiene que ser anterior a «hasta»');
  }
  if (f.tema && !isTopic(f.tema)) throw new BadRequestException('Tema desconocido');
}

/** Not the Owner: only their own entries, whatever the filter says. */
function whoseEntries(viewer: AuditViewer, f: AuditFilters): Prisma.AuditLogWhereInput {
  if (!viewer.todo) return { usuarioId: viewer.usuarioId };
  return f.usuarioId ? { usuarioId: f.usuarioId } : {};
}

/** One CSV cell, always quoted; a leading = + - @ is neutralised so a spreadsheet never runs it. */
function csvCell(text: string) {
  const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

/** What a row is about, in a few words: the product or person's name when there is one. */
function subjectOf(row: Row) {
  for (const v of [row.valoresPosteriores, row.valoresAnteriores]) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      for (const key of ['nombre', 'email', 'producto', 'persona']) {
        if (typeof o[key] === 'string' && o[key]) return String(o[key]);
      }
    }
  }
  return null;
}

/**
 * Business audit (OR-B4-041): the trail of who did what and what changed. The Owner sees
 * the whole Business (AUDIT_VIEW_ALL); everyone else only their own entries. Read-only:
 * entries are never edited or deleted from the app. Secrets are hidden from every value.
 */
@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  private where(
    companyId: string,
    viewer: AuditViewer,
    f: AuditFilters,
  ): Prisma.AuditLogWhereInput {
    checkFilters(f);
    const fecha: Prisma.DateTimeFilter = {};
    if (f.desde) fecha.gte = dayStart(f.desde);
    if (f.hasta) fecha.lt = new Date(dayStart(f.hasta).getTime() + 24 * 60 * 60 * 1000);
    return {
      empresaId: companyId,
      ...whoseEntries(viewer, f),
      ...(f.desde || f.hasta ? { fechaHora: fecha } : {}),
      ...(f.tema && isTopic(f.tema) ? topicWhere(f.tema) : {}),
    };
  }

  private item(row: Row) {
    const { tema, nombre } = describeAction(row.accion, row.entidadAfectada);
    return {
      id: row.id,
      fecha: row.fechaHora,
      accion: row.accion,
      nombre,
      tema,
      temaNombre: TOPICS[tema],
      sobre: subjectOf(row),
      motivo: row.motivo,
      persona: row.Usuario ? { id: row.Usuario.id, nombre: row.Usuario.nombre } : null,
    };
  }

  private readonly include = {
    Usuario: { select: { id: true, nombre: true, email: true } },
  } as const;

  async list(companyId: string, viewer: AuditViewer, f: AuditFilters) {
    const where = this.where(companyId, viewer, f);
    const page = Math.max(1, Math.floor(f.page ?? 1) || 1);
    const [total, rows, personas] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: this.include,
        orderBy: { fechaHora: 'desc' },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      viewer.todo
        ? this.prisma.usuario.findMany({
            where: { empresaId: companyId },
            select: { id: true, nombre: true },
            orderBy: { nombre: 'asc' },
          })
        : Promise.resolve([]),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      todo: viewer.todo,
      temas: Object.entries(TOPICS).map(([clave, nombre]) => ({ clave, nombre })),
      personas,
      items: rows.map((r) => this.item(r)),
    };
  }

  async detail(companyId: string, viewer: AuditViewer, id: string) {
    const row = await this.prisma.auditLog.findFirst({
      where: { id, empresaId: companyId, ...(viewer.todo ? {} : { usuarioId: viewer.usuarioId }) },
      include: this.include,
    });
    if (!row) throw new NotFoundException('Movimiento no encontrado');
    const antes = redact(row.valoresAnteriores);
    const despues = redact(row.valoresPosteriores);
    return {
      ...this.item(row),
      entidad: row.entidadAfectada,
      entidadId: row.entidadId,
      autorizado: Boolean(row.autorizacionId),
      persona: row.Usuario ?? null,
      antes,
      despues,
      cambios: changesOf(antes, despues),
    };
  }

  /** CSV for a spreadsheet (Excel in Spanish: «;» and UTF-8 with BOM). The download is itself recorded. */
  async exportCsv(companyId: string, viewer: AuditViewer, f: AuditFilters) {
    const where = this.where(companyId, viewer, f);
    const rows = await this.prisma.auditLog.findMany({
      where,
      include: this.include,
      orderBy: { fechaHora: 'desc' },
      take: EXPORT_LIMIT,
    });
    const fmt = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
    const header = [
      'Fecha y hora',
      'Persona',
      'Email',
      'Tema',
      'Qué hizo',
      'Sobre',
      'Motivo',
      'Cambios',
    ];
    const lines = rows.map((r) => {
      const it = this.item(r);
      const cambios = changesOf(redact(r.valoresAnteriores), redact(r.valoresPosteriores))
        .map((c) => `${c.campo}: ${JSON.stringify(c.antes)} → ${JSON.stringify(c.despues)}`)
        .join(' | ');
      return [
        fmt.format(r.fechaHora),
        r.Usuario?.nombre ?? '',
        r.Usuario?.email ?? '',
        it.temaNombre,
        it.nombre,
        it.sobre ?? '',
        r.motivo ?? '',
        cambios,
      ]
        .map(csvCell)
        .join(';');
    });
    await recordAudit(this.prisma, companyId, viewer.usuarioId, {
      accion: 'AUDITORIA_EXPORTADA',
      entidad: 'AuditLog',
      despues: { filtros: { ...f, page: undefined }, filas: rows.length },
    });
    return {
      csv: BOM + [header.map(csvCell).join(';'), ...lines].join('\r\n') + '\r\n',
      filas: rows.length,
      recortado: rows.length === EXPORT_LIMIT,
    };
  }
}
