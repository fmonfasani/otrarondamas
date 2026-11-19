import { Prisma } from '@prisma/client';
import {
  RELATIONS_WITH_OWNERSHIP,
  modelHasRelationsWithOwnership,
  collectRelationalReferences,
} from './relation-ownership';

// Products and their categories stand in for any registered relation: sales and orders (PR 4,
// module 1) and purchases and stock (module 2) left the registry, their composite keys check
// ownership in the database (ADR-DAT-020). Only the catalog hierarchy and loyalty rules remain.
const product = (subfamiliaId: string) => ({ nombre: 'Yerba', subfamiliaId });

describe('relation-ownership', () => {
  describe('registro', () => {
    it('cada relación registrada existe en el schema con FK simple', () => {
      for (const [model, relations] of Object.entries(RELATIONS_WITH_OWNERSHIP)) {
        const definition = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
        expect(definition).toBeDefined();
        for (const name of relations) {
          const field = definition!.fields.find((f) => f.name === name);
          expect(field?.kind).toBe('object');
          expect(field?.relationFromFields).toHaveLength(1);
          expect(field?.relationToFields).toHaveLength(1);
        }
      }
    });

    it('registra únicamente modelos opt-in con relaciones de ownership', () => {
      expect(modelHasRelationsWithOwnership('Producto')).toBe(true);
      expect(modelHasRelationsWithOwnership('ReglaFidelizacion')).toBe(true);
      // Covered by composite keys since INIT-019 PR 4 (ADR-DAT-020).
      for (const model of ['VentaItem', 'PedidoItem', 'Venta', 'Pedido', 'CompraItem', 'Lote']) {
        expect(modelHasRelationsWithOwnership(model)).toBe(false);
      }
      for (const model of ['DevolucionProveedorItem', 'ProductoProveedor', 'MovimientoStock']) {
        expect(modelHasRelationsWithOwnership(model)).toBe(false);
      }
    });
  });

  describe('Familia.create con Producto anidados', () => {
    it('extrae la Subfamilia referenciada por cada producto, sin duplicados', () => {
      const refs = collectRelationalReferences('Familia', 'create', {
        data: {
          nombre: 'Almacén',
          Producto: { create: [product('s1'), product('s2'), product('s1')] },
        },
      });
      expect(refs).toEqual([
        { model: 'Subfamilia', where: { id: 's1' } },
        { model: 'Subfamilia', where: { id: 's2' } },
      ]);
    });

    it('acepta Producto.create como objeto único', () => {
      const refs = collectRelationalReferences('Familia', 'create', {
        data: { Producto: { create: product('s1') } },
      });
      expect(refs).toEqual([{ model: 'Subfamilia', where: { id: 's1' } }]);
    });

    it('extrae también desde createMany anidado y connectOrCreate', () => {
      const refs = collectRelationalReferences('Familia', 'create', {
        data: {
          Producto: {
            createMany: { data: [product('s1')] },
            connectOrCreate: { where: { id: 'x' }, create: product('s2') },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['s1', 's2']);
    });

    it('extrae desde update anidado (con y sin where/data) y upsert anidado', () => {
      const refs = collectRelationalReferences('Familia', 'update', {
        where: { id: 'f1' },
        data: {
          Producto: {
            create: product('s1'),
            update: { where: { id: 'p1' }, data: { subfamiliaId: 's2' } },
            updateMany: { where: {}, data: { subfamiliaId: 's3' } },
            upsert: { where: { id: 'p2' }, create: product('s4'), update: { subfamiliaId: 's5' } },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['s1', 's2', 's3', 's4', 's5']);
    });

    it('no extrae nada de una Familia sin productos ni de operaciones de lectura', () => {
      expect(
        collectRelationalReferences('Familia', 'create', { data: { nombre: 'Almacén' } }),
      ).toEqual([]);
      expect(
        collectRelationalReferences('Familia', 'findMany', {
          where: { Producto: { some: { subfamiliaId: 's1' } } },
        }),
      ).toEqual([]);
    });
  });

  describe('Producto como modelo raíz', () => {
    it('valida subfamiliaId en create, createMany, update y upsert', () => {
      expect(collectRelationalReferences('Producto', 'create', { data: product('s1') })).toEqual([
        { model: 'Subfamilia', where: { id: 's1' } },
      ]);
      expect(
        collectRelationalReferences('Producto', 'createMany', {
          data: [product('s1'), product('s2')],
        }).map((r) => r.where.id),
      ).toEqual(['s1', 's2']);
      expect(
        collectRelationalReferences('Producto', 'update', {
          where: { id: 'p1' },
          data: { subfamiliaId: { set: 's9' } },
        }),
      ).toEqual([{ model: 'Subfamilia', where: { id: 's9' } }]);
      expect(
        collectRelationalReferences('Producto', 'upsert', {
          where: { id: 'p1' },
          create: product('s1'),
          update: { subfamiliaId: 's2' },
        }).map((r) => r.where.id),
      ).toEqual(['s1', 's2']);
    });

    it('trata Subfamilia.connect como una referencia más', () => {
      const refs = collectRelationalReferences('Producto', 'create', {
        data: { nombre: 'Yerba', Subfamilia: { connect: { id: 's1' } } },
      });
      expect(refs).toEqual([{ model: 'Subfamilia', where: { id: 's1' } }]);
    });

    it('no valida un update que no toca las categorías', () => {
      expect(
        collectRelationalReferences('Producto', 'update', {
          where: { id: 'p1' },
          data: { nombre: 'Yerba suave' },
        }),
      ).toEqual([]);
    });
  });

  describe('falla cerrada ante formas no verificables', () => {
    it.each([
      ['create', { create: { nombre: 'x' } }],
      ['connectOrCreate', { connectOrCreate: { where: { id: 's1' }, create: {} } }],
      ['disconnect', { disconnect: true }],
    ])('rechaza Subfamilia.%s', (name, operation) => {
      expect(() =>
        collectRelationalReferences('Producto', 'create', {
          data: { nombre: 'Yerba', Subfamilia: operation },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });

    it('rechaza subfamiliaId con una forma de valor desconocida', () => {
      expect(() =>
        collectRelationalReferences('Producto', 'update', {
          where: { id: 'p1' },
          data: { subfamiliaId: { increment: 1 } },
        }),
      ).toThrow(/forma de valor no soportada/);
    });

    it('propaga el rechazo desde un producto anidado dentro de Familia.create', () => {
      expect(() =>
        collectRelationalReferences('Familia', 'create', {
          data: { Producto: { create: { Subfamilia: { create: {} } } } },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });
  });
});
