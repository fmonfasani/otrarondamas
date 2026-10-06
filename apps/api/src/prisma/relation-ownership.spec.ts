import { Prisma } from '@prisma/client';
import {
  RELATIONS_WITH_OWNERSHIP,
  modelHasRelationsWithOwnership,
  collectRelationalReferences,
} from './relation-ownership';

const item = (productId: string) => ({ productoId: productId, cantidad: 1, precioUnitario: 10 });

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

    it('solo VentaItem tiene relaciones registradas', () => {
      expect(modelHasRelationsWithOwnership('VentaItem')).toBe(true);
      expect(modelHasRelationsWithOwnership('Venta')).toBe(false);
      expect(modelHasRelationsWithOwnership('Pedido')).toBe(false);
    });
  });

  describe('Venta.create con ventaItems anidados', () => {
    it('extrae el Producto referenciado por cada item, sin duplicados', () => {
      const refs = collectRelationalReferences('Venta', 'create', {
        data: {
          canal: 'x',
          ventaItems: { create: [item('p1'), item('p2'), item('p1')] },
        },
      });
      expect(refs).toEqual([
        { model: 'Producto', where: { id: 'p1' } },
        { model: 'Producto', where: { id: 'p2' } },
      ]);
    });

    it('acepta ventaItems.create como objeto único', () => {
      const refs = collectRelationalReferences('Venta', 'create', {
        data: { ventaItems: { create: item('p1') } },
      });
      expect(refs).toEqual([{ model: 'Producto', where: { id: 'p1' } }]);
    });

    it('extrae también desde createMany anidado y connectOrCreate', () => {
      const refs = collectRelationalReferences('Venta', 'create', {
        data: {
          ventaItems: {
            createMany: { data: [item('p1')] },
            connectOrCreate: { where: { id: 'x' }, create: item('p2') },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['p1', 'p2']);
    });

    it('extrae desde update anidado (con y sin where/data) y upsert anidado', () => {
      const refs = collectRelationalReferences('Venta', 'update', {
        where: { id: 'v1' },
        data: {
          ventaItems: {
            create: item('p1'),
            update: { where: { id: 'i1' }, data: { productoId: 'p2' } },
            updateMany: { where: {}, data: { productoId: 'p3' } },
            upsert: { where: { id: 'i2' }, create: item('p4'), update: { productoId: 'p5' } },
          },
        },
      });
      expect(refs.map((r) => r.where.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    });

    it('no extrae nada de una Venta sin items ni de operaciones de lectura', () => {
      expect(collectRelationalReferences('Venta', 'create', { data: { canal: 'x' } })).toEqual([]);
      expect(
        collectRelationalReferences('Venta', 'findMany', {
          where: { ventaItems: { some: { productoId: 'p1' } } },
        }),
      ).toEqual([]);
    });
  });

  describe('VentaItem como modelo raíz', () => {
    it('valida productoId en create, createMany, update y upsert', () => {
      expect(collectRelationalReferences('VentaItem', 'create', { data: item('p1') })).toEqual([
        { model: 'Producto', where: { id: 'p1' } },
      ]);
      expect(
        collectRelationalReferences('VentaItem', 'createMany', {
          data: [item('p1'), item('p2')],
        }).map((r) => r.where.id),
      ).toEqual(['p1', 'p2']);
      expect(
        collectRelationalReferences('VentaItem', 'update', {
          where: { id: 'i1' },
          data: { productoId: { set: 'p9' } },
        }),
      ).toEqual([{ model: 'Producto', where: { id: 'p9' } }]);
      expect(
        collectRelationalReferences('VentaItem', 'upsert', {
          where: { id: 'i1' },
          create: item('p1'),
          update: { productoId: 'p2' },
        }).map((r) => r.where.id),
      ).toEqual(['p1', 'p2']);
    });

    it('trata producto.connect como una referencia más', () => {
      const refs = collectRelationalReferences('VentaItem', 'create', {
        data: { cantidad: 1, precioUnitario: 1, producto: { connect: { id: 'p1' } } },
      });
      expect(refs).toEqual([{ model: 'Producto', where: { id: 'p1' } }]);
    });

    it('no valida un update que no toca productoId', () => {
      expect(
        collectRelationalReferences('VentaItem', 'update', {
          where: { id: 'i1' },
          data: { cantidad: 3 },
        }),
      ).toEqual([]);
    });
  });

  describe('falla cerrada ante formas no verificables', () => {
    it.each([
      ['create', { create: { nombre: 'x' } }],
      ['connectOrCreate', { connectOrCreate: { where: { id: 'p1' }, create: {} } }],
      ['disconnect', { disconnect: true }],
    ])('rechaza producto.%s', (name, operation) => {
      expect(() =>
        collectRelationalReferences('VentaItem', 'create', {
          data: { cantidad: 1, precioUnitario: 1, producto: operation },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });

    it('rechaza productoId con una forma de valor desconocida', () => {
      expect(() =>
        collectRelationalReferences('VentaItem', 'update', {
          where: { id: 'i1' },
          data: { productoId: { increment: 1 } },
        }),
      ).toThrow(/forma de valor no soportada/);
    });

    it('propaga el rechazo desde un item anidado dentro de Venta.create', () => {
      expect(() =>
        collectRelationalReferences('Venta', 'create', {
          data: { ventaItems: { create: { producto: { create: {} } } } },
        }),
      ).toThrow(/no tiene manejo de ownership definido/);
    });
  });
});
