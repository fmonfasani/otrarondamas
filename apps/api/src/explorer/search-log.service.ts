import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { plain } from './explorer-search';

const MINUTE_MS = 60_000;
const KEEP_DAYS = 90;
/** At most this many different words are kept per minute, so a flood cannot fill the table. */
const MAX_TERMS_PER_MINUTE = 1000;

/** The words of a search as they are counted: plain, at most 6 words and 60 letters. */
export function termOf(q: string): string | null {
  const term = plain(q).split(' ').filter(Boolean).slice(0, 6).join(' ').slice(0, 60).trim();
  return term.length >= 2 ? term : null;
}

const dayOf = (at: Date) => at.toISOString().slice(0, 10);

/**
 * Marketplace, step 3b (Owner, 2026-11-26) — what people search in Wapsell, for «más buscados».
 * Only the words and how many times per day: no person, no store. Counted in memory and written
 * once a minute (one upsert per word), kept 90 days. Platform-wide on purpose (system client,
 * ADR-DAT-019 allowlist).
 */
@Injectable()
export class SearchLogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchLogService.name);
  private pending = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private prunedOn: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), MINUTE_MS);
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  /** One search that found products. */
  record(q: string, at = new Date()) {
    const term = termOf(q);
    if (!term) return;
    const key = `${dayOf(at)}|${term}`;
    if (!this.pending.has(key) && this.pending.size >= MAX_TERMS_PER_MINUTE) return;
    this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
  }

  async flush(now = new Date()) {
    const batch = this.pending;
    this.pending = new Map();
    try {
      for (const [key, times] of batch) {
        const [dia, termino] = key.split('|');
        await this.prisma.$executeRaw`
          INSERT INTO "BusquedaDiaria" ("dia", "termino", "veces")
          VALUES (${dia}::date, ${termino}, ${times})
          ON CONFLICT ("dia", "termino") DO UPDATE SET "veces" = "BusquedaDiaria"."veces" + EXCLUDED."veces"`;
      }
      const today = dayOf(now);
      if (this.prunedOn !== today) {
        this.prunedOn = today;
        const limit = new Date(now.getTime() - KEEP_DAYS * 24 * 3600_000);
        await this.prisma.busquedaDiaria.deleteMany({ where: { dia: { lt: limit } } });
      }
    } catch (error) {
      this.logger.warn(`No se pudieron guardar las búsquedas: ${(error as Error).message}`);
    }
  }

  /** The most searched words of the last days, most searched first. */
  async popular(days = 30, limit = 300, now = new Date()) {
    const since = new Date(now.getTime() - days * 24 * 3600_000);
    const rows = await this.prisma.busquedaDiaria.groupBy({
      by: ['termino'],
      where: { dia: { gte: since } },
      _sum: { veces: true },
      orderBy: { _sum: { veces: Prisma.SortOrder.desc } },
      take: limit,
    });
    return rows.map((r) => ({ termino: r.termino, veces: r._sum.veces ?? 0 }));
  }
}
