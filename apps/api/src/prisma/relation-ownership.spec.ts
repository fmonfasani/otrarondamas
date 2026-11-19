import { Prisma } from '@prisma/client';
import {
  RELATIONS_WITH_OWNERSHIP,
  modelHasRelationsWithOwnership,
  collectRelationalReferences,
} from './relation-ownership';

// Compra and its lines stand in for any registered header -> lines pair; sales and orders
// left the registry in INIT-019 PR 4: their composite keys check ownership in the database.
const item = (productId: string) => ({
  productoId: productId,
  cantidadPedida: 1,
  costoUnitario: 10,
});

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
      expect(modelHasRelationsWithOwnership('CompraItem')).toBe(true);
      // Covered by composite keys since INIT-019 PR 4 (ADR-DAT-020).
      expect(modelHasRelationsWithOwnership('VentaItem')).toBe(false);
      expect(modelHasRelationsWithOwnership('PedidoItem')).toBe(false);
      expect(modelHasRelationsWithOwnership('Venta')).toBe(false);
      expect(modelHasRelationsWithOwnership('Pedido')).toBe(false);
      expect(modelHasRelationsWithOwnership('Producto')).toBe(true);
      expect(modelHasRelationsWithOwnership('Lote')).toBe(true);
    });
  });

  describe('Compra.create con CompraItem anidados', () => {
    it('extrae el Producto referenciado por cada item, sin duplicados', () => {
      const refs = collectRelationalReferences('Compra', 'create', {
        data: {
          numeroFactura: 'x',
          CompraItem: { create: [item('p1'), item('p2'), item('p1')] },
        },
      });
      expect(refs).toEqual([
        { model: 'Producto', where: { id: 'p1' } },
        { model: 'Producto', where: { id: 'p2' } },
      ]);
    });

    it('acepta CompraItem.create como objeto único', () => {
      const refs = collectRelationalReferences('Compra', 'create', {
        data: { CompraItem: { create: item('p1') } },
      });
      expect(refs).toEqual([{ model: 'Producto', where: { id: 'p1' } }]);
    });

    it('extrae también desde createMany anidado y connectOrCreate', () => {
      const refs = collectRelationalReferences('Compra', 'create', {
        data: {
          CompraItem: {
            createMany: { data: [item('p1')] },
            connectOrCreate: { where: { id: 'x' }, create: item('p2') },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['p1', 'p2']);
    });

    it('extrae desde update anidado (con y sin where/data) y upsert anidado', () => {
      const refs = collectRelationalReferences('Compra', 'update', {
        where: { id: 'v1' },
        data: {
          CompraItem: {
            create: item('p1'),
            update: { where: { id: 'i1' }, data: { productoId: 'p2' } },
            updateMany: { where: {}, data: { productoId: 'p3' } },
            upsert: { where: { id: 'i2' }, create: item('p4'), update: { productoId: 'p5' } },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    });

    it('no extrae nada de una Compra sin items ni de operaciones de lectura', () => {
      expect(
        collectRelationalReferences('Compra', 'create', { data: { numeroFactura: 'x' } }),
      ).toEqual([]);
      expect(
        collectRelationalReferences('Compra', 'findMany', {
          where: { CompraItem: { some: { productoId: 'p1' } } },
        }),
      ).toEqual([]);
    });
  });

  describe('CompraItem como modelo raíz', () => {
    it('valida productoId en create, createMany, update y upsert', () => {
      expect(collectRelationalReferences('CompraItem', 'create', { data: item('p1') })).toEqual([
        { model: 'Producto', where: { id: 'p1' } },
      ]);
      expect(
        collectRelationalReferences('CompraItem', 'createMany', {
          data: [item('p1'), item('p2')],
        }).map((r) => r.where.id),
      ).toEqual(['p1', 'p2']);
      expect(
        collectRelationalReferences('CompraItem', 'update', {
          where: { id: 'i1' },
          data: { productoId: { set: 'p9' } },
        }),
      ).toEqual([{ model: 'Producto', where: { id: 'p9' } }]);
      expect(
        collectRelationalReferences('CompraItem', 'upsert', {
          where: { id: 'i1' },
          create: item('p1'),
          update: { productoId: 'p2' },
        }).map((r) => r.where.id),
      ).toEqual(['p1', 'p2']);
    });

    it('trata Producto.connect como una referencia más', () => {
      const refs = collectRelationalReferences('CompraItem', 'create', {
        data: { cantidadPedida: 1, costoUnitario: 1, Producto: { connect: { id: 'p1' } } },
      });
      expect(refs).toEqual([{ model: 'Producto', where: { id: 'p1' } }]);
    });

    it('no valida un update que no toca productoId', () => {
      expect(
        collectRelationalReferences('CompraItem', 'update', {
          where: { id: 'i1' },
          data: { cantidadPedida: 3 },
        }),
      ).toEqual([]);
    });
  });

  describe('falla cerrada ante formas no verificables', () => {
    it.each([
      ['create', { create: { nombre: 'x' } }],
      ['connectOrCreate', { connectOrCreate: { where: { id: 'p1' }, create: {} } }],
      ['disconnect', { disconnect: true }],
    ])('rechaza Producto.%s', (name, operation) => {
      expect(() =>
        collectRelationalReferences('CompraItem', 'create', {
          data: { cantidadPedida: 1, costoUnitario: 1, Producto: operation },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });

    it('rechaza productoId con una forma de valor desconocida', () => {
      expect(() =>
        collectRelationalReferences('CompraItem', 'update', {
          where: { id: 'i1' },
          data: { productoId: { increment: 1 } },
        }),
      ).toThrow(/forma de valor no soportada/);
    });

    it('propaga el rechazo desde un item anidado dentro de Compra.create', () => {
      expect(() =>
        collectRelationalReferences('Compra', 'create', {
          data: { CompraItem: { create: { Producto: { create: {} } } } },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });
  });
});
