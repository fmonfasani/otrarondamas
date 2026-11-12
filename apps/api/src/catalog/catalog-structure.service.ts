import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { GENERAL_NAME, GENERAL_PREFIX, derivePrefix, nextInternalCode } from './catalog-codes';

type ScopedDb = ReturnType<CompanyScopedPrismaService['forCompany']>;
type ScopedTx = Parameters<Parameters<ScopedDb['$transaction']>[0]>[0];

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * OR-B4-028 — the panel manages category (Familia) and subcategory (Subfamilia); the
 * Tipo/Subtipo levels the model requires are created as "General" (prefix GEN) under
 * every Subfamilia, so a product can always point to the full 4-level chain.
 *
 * Every query runs on the company-scoped client the caller resolved from the actor's
 * Membership: a Familia of another company is simply not found.
 */
@Injectable()
export class CatalogStructureService {
  /** Creates a category with its "General" subcategory, type and subtype. */
  async createCategory(db: ScopedDb, companyId: string, nombre: string) {
    const name = nombre.trim();
    try {
      return await db.$transaction(async (tx) => {
        const taken = await tx.familia.findMany({ select: { prefijo: true } });
        const familia = await tx.familia.create({
          data: {
            empresaId: companyId,
            nombre: name,
            prefijo: derivePrefix(
              name,
              taken.map((f) => f.prefijo),
            ),
          },
        });
        const subfamilia = await this.createGeneralChain(tx, companyId, familia.id, GENERAL_NAME);
        return { ...familia, subfamilias: [subfamilia] };
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Ya existe una categoría con ese nombre');
      throw error;
    }
  }

  /** Creates a subcategory (Subfamilia) inside a category of the same company. */
  async createSubcategory(db: ScopedDb, companyId: string, familiaId: string, nombre: string) {
    const familia = await db.familia.findUnique({ where: { id: familiaId } });
    if (!familia || !familia.activo) throw new NotFoundException('Categoría no encontrada');
    try {
      return await db.$transaction((tx) =>
        this.createGeneralChain(tx, companyId, familia.id, nombre.trim()),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una subcategoría con ese nombre en esta categoría');
      }
      throw error;
    }
  }

  /** Subfamilia + its "General" Tipo + its "General" Subtipo. */
  private async createGeneralChain(
    tx: ScopedTx,
    companyId: string,
    familiaId: string,
    nombre: string,
  ) {
    const taken = await tx.subfamilia.findMany({ where: { familiaId }, select: { prefijo: true } });
    const subfamilia = await tx.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId,
        nombre,
        prefijo:
          nombre === GENERAL_NAME
            ? GENERAL_PREFIX
            : derivePrefix(nombre, [...taken.map((s) => s.prefijo), GENERAL_PREFIX]),
      },
    });
    const tipo = await tx.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamilia.id,
        nombre: GENERAL_NAME,
        prefijo: GENERAL_PREFIX,
      },
    });
    const subtipo = await tx.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: tipo.id,
        nombre: GENERAL_NAME,
        prefijo: GENERAL_PREFIX,
      },
    });
    return { ...subfamilia, tipoId: tipo.id, subtipoId: subtipo.id };
  }

  /**
   * Generates the next free `<Familia prefix>-NNNN` code for the company. The caller
   * retries on a unique violation (two products created at the same instant).
   */
  async nextProductCode(db: ScopedDb, familiaId: string) {
    const familia = await db.familia.findUnique({ where: { id: familiaId } });
    if (!familia) throw new NotFoundException('Familia no encontrada');
    const prefix = familia.prefijo.trim();
    const existing = await db.producto.findMany({
      where: { codigoInterno: { startsWith: `${prefix}-` } },
      select: { codigoInterno: true },
    });
    return nextInternalCode(
      prefix,
      existing.map((p) => p.codigoInterno),
    );
  }
}
