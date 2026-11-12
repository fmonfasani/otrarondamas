import { OrdersService } from './orders.service';

describe('OrdersService.get — customer data in the order detail', () => {
  it('asks only for contact fields of the customer, never store credentials', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'o-1',
      Cliente: { id: 'c-1', nombre: 'María', email: null, telefono: null },
      PedidoItem: [],
    });
    const service = new OrdersService(
      { forCompany: () => ({ pedido: { findUnique } }) } as never,
      {} as never,
    );

    await service.get('o-1', 'company-a');

    const select = findUnique.mock.calls[0][0].include.Cliente.select;
    expect(select).not.toHaveProperty('passwordHash');
    expect(select).not.toHaveProperty('googleId');
    expect(select).toMatchObject({ id: true, nombre: true, email: true, telefono: true });
  });
});
