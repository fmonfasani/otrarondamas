import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { derivePrefix, nextInternalCode } from './catalog-codes';
import { CatalogStructureService } from './catalog-structure.service';

describe('OR-B4-028 catalog codes', () => {
  it('derives a 3-letter uppercase prefix without accents', () => {
    expect(derivePrefix('Bebidas', [])).toBe('BEB');
    expect(derivePrefix('Almacén', [])).toBe('ALM');
    expect(derivePrefix('té', [])).toBe('TEX');
  });

  it('avoids prefixes already taken in the scope', () => {
    expect(derivePrefix('Bebidas', ['BEB'])).not.toBe('BEB');
    expect(derivePrefix('Bebidas frías', ['BEB'])).toBe('BFE');
    const taken = ['BEB', 'BEA'];
    const next = derivePrefix('Bebidas', taken);
    expect(next).toHaveLength(3);
    expect(taken).not.toContain(next);
  });

  it('numbers codes after the highest suffix and ignores hand-typed codes', () => {
    expect(nextInternalCode('BEB', [])).toBe('BEB-0001');
    expect(nextInternalCode('BEB', ['BEB-0001', 'BEB-0007', 'BEB-LATA', 'ALM-0099'])).toBe(
      'BEB-0008',
    );
  });
});

describe('CatalogStructureService', () => {
  const tx = {
    familia: { findMany: jest.fn(), create: jest.fn() },
    subfamilia: { findMany: jest.fn(), create: jest.fn() },
    tipo: { create: jest.fn() },
    subtipo: { create: jest.fn() },
  };
  const db = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    familia: { findUnique: jest.fn() },
    producto: { findMany: jest.fn() },
  };
  const service = new CatalogStructureService();
  const scoped = db as never;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.familia.findMany.mockResolvedValue([{ prefijo: 'ALM' }]);
    tx.subfamilia.findMany.mockResolvedValue([]);
    tx.familia.create.mockImplementation(({ data }) => ({ id: 'fam-1', activo: true, ...data }));
    tx.subfamilia.create.mockImplementation(({ data }) => ({ id: `sub-${data.nombre}`, ...data }));
    tx.tipo.create.mockResolvedValue({ id: 'tipo-1' });
    tx.subtipo.create.mockResolvedValue({ id: 'subtipo-1' });
  });

  it('creates a category with its General subcategory, type and subtype in the company', async () => {
    const result = await service.createCategory(scoped, 'company-a', ' Bebidas ');

    expect(tx.familia.create).toHaveBeenCalledWith({
      data: { empresaId: 'company-a', nombre: 'Bebidas', prefijo: 'BEB' },
    });
    expect(tx.subfamilia.create).toHaveBeenCalledWith({
      data: { empresaId: 'company-a', familiaId: 'fam-1', nombre: 'General', prefijo: 'GEN' },
    });
    expect(tx.tipo.create).toHaveBeenCalledWith({
      data: {
        empresaId: 'company-a',
        subfamiliaId: 'sub-General',
        nombre: 'General',
        prefijo: 'GEN',
      },
    });
    expect(tx.subtipo.create).toHaveBeenCalledWith({
      data: { empresaId: 'company-a', tipoId: 'tipo-1', nombre: 'General', prefijo: 'GEN' },
    });
    expect(result.subfamilias[0]).toMatchObject({ tipoId: 'tipo-1', subtipoId: 'subtipo-1' });
  });

  it('reports a duplicate category name as a conflict', async () => {
    tx.familia.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );

    await expect(service.createCategory(scoped, 'company-a', 'Bebidas')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('creates a subcategory with a prefix that never collides with GEN', async () => {
    db.familia.findUnique.mockResolvedValue({ id: 'fam-1', activo: true });
    tx.subfamilia.findMany.mockResolvedValue([{ prefijo: 'GEN' }]);

    await service.createSubcategory(scoped, 'company-a', 'fam-1', 'Gaseosas');

    const data = tx.subfamilia.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ familiaId: 'fam-1', nombre: 'Gaseosas', prefijo: 'GAS' });
  });

  it('refuses a subcategory under a category the scoped client cannot see', async () => {
    db.familia.findUnique.mockResolvedValue(null);

    await expect(
      service.createSubcategory(scoped, 'company-a', 'fam-other', 'Gaseosas'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('generates the next product code from the category prefix', async () => {
    db.familia.findUnique.mockResolvedValue({ id: 'fam-1', prefijo: 'BEB' });
    db.producto.findMany.mockResolvedValue([{ codigoInterno: 'BEB-0003' }]);

    await expect(service.nextProductCode(scoped, 'fam-1')).resolves.toBe('BEB-0004');
    expect(db.producto.findMany).toHaveBeenCalledWith({
      where: { codigoInterno: { startsWith: 'BEB-' } },
      select: { codigoInterno: true },
    });
  });
});
