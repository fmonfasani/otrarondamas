import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

describe('InventoryService.deductStock', () => {
  const batch = {
    id: 'batch-a',
    empresaId: 'company-a',
    productoId: 'product-a',
    cantidad: 5,
    vencimiento: new Date('2030-01-01T00:00:00.000Z'),
  };

  const makeTx = (claimCount: number) => ({
    lote: {
      findMany: jest.fn().mockResolvedValue([batch]),
      updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
    },
    movimientoStock: {
      create: jest.fn().mockResolvedValue({ id: 'movement-a' }),
    },
  });

  const service = new InventoryService({} as never);

  it('rejects a batch claim lost to a concurrent stock change', async () => {
    const tx = makeTx(0);

    await expect(
      service.deductStock(
        tx as never,
        'company-a',
        'product-a',
        3,
        'Venta',
        'sale-a',
        'user-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.lote.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'batch-a',
        empresaId: 'company-a',
        productoId: 'product-a',
        cantidad: { gte: 3 },
      },
      data: { cantidad: { decrement: 3 } },
    });
    expect(tx.movimientoStock.create).not.toHaveBeenCalled();
  });

  it('records a stock movement only after a successful conditional deduction', async () => {
    const tx = makeTx(1);

    await service.deductStock(
      tx as never,
      'company-a',
      'product-a',
      3,
      'Venta',
      'sale-a',
      'user-a',
    );

    expect(tx.movimientoStock.create).toHaveBeenCalledTimes(1);
    expect(tx.movimientoStock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresaId: 'company-a',
        productoId: 'product-a',
        loteId: 'batch-a',
        tipoMovimiento: 'Salida',
        cantidad: 3,
        motivo: 'Venta',
        referenciaId: 'sale-a',
      }),
    });
  });
});
