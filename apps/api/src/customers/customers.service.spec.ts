import { CustomersService, toCustomerView } from './customers.service';

describe('CustomersService — staff view never exposes customer credentials', () => {
  const stored = {
    id: 'c-1',
    empresaId: 'company-a',
    nombre: 'María',
    email: 'maria@ejemplo.com',
    passwordHash: '$2b$10$secret',
    googleId: 'google-123',
  };
  const db = {
    cliente: {
      findMany: jest.fn().mockResolvedValue([stored]),
      findUnique: jest.fn().mockResolvedValue(stored),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(stored),
      update: jest.fn().mockResolvedValue(stored),
    },
    venta: { count: jest.fn().mockResolvedValue(0) },
    pedido: { count: jest.fn().mockResolvedValue(0) },
  };
  const service = new CustomersService({ forCompany: () => db } as never);

  it('strips passwordHash and googleId', () => {
    expect(toCustomerView(stored)).toEqual({
      id: 'c-1',
      empresaId: 'company-a',
      nombre: 'María',
      email: 'maria@ejemplo.com',
    });
  });

  it.each([
    ['list', () => service.list('company-a').then((rows) => rows[0])],
    ['get', () => service.get('company-a', 'c-1')],
    ['create', () => service.create('company-a', { nombre: 'María' })],
    ['update', () => service.update('company-a', 'c-1', { telefono: '1' })],
  ])('%s answers without credentials', async (_name, call) => {
    const result = (await call()) as Record<string, unknown>;
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('googleId');
    expect(result.nombre).toBe('María');
  });
});
