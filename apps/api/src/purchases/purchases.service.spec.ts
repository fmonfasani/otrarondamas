import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PurchasesService } from './purchases.service';

describe('PurchasesService.receivePurchase', () => {
  const tx = {
    recepcionCompra: { create: jest.fn() },
    lote: { create: jest.fn() },
  };
  const db = {
    compra: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'compra-1',
        estado: 'EMITIDA',
        CompraItem: [
          { id: 'item-1', productoId: 'prod-1', cantidadPedida: 10, cantidadRecibida: 0 },
        ],
      }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new PurchasesService({ forCompany: () => db } as never);

  it('answers a reused batch number for the same product as a 409, not a server error', async () => {
    tx.recepcionCompra.create.mockResolvedValue({ id: 'rec-1' });
    tx.lote.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );

    await expect(
      service.receivePurchase(
        'company-a',
        'compra-1',
        {
          items: [
            {
              compraItemId: 'item-1',
              cantidadRecibida: 5,
              vencimiento: '2027-01-01',
              numeroLote: 'L1',
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
