import { Prisma } from '@prisma/client';
import {
  enforceTenantOnUpdateData,
  GLOBAL_MODELS,
  isUniqueReadOwnedByTenant,
  MODELS_WITH_BUSINESS_ID,
  MODELS_WITH_COMPANY_ID,
} from './company-scope.extension';

describe('companyScopeExtension tenant model registry', () => {
  it('keeps globally shared RoleTemplate outside tenant-scoped model registries', () => {
    expect(GLOBAL_MODELS).toContain('RoleTemplate');
    expect([...MODELS_WITH_COMPANY_ID, ...MODELS_WITH_BUSINESS_ID]).not.toContain('RoleTemplate');
  });

  it('includes every Prisma model with a direct tenant identifier', () => {
    const scopedModels = new Set<string>([
      ...MODELS_WITH_COMPANY_ID,
      ...MODELS_WITH_BUSINESS_ID,
    ]);
    const globalModels = new Set<string>(GLOBAL_MODELS);
    const tenantOwnedModels = Prisma.dmmf.datamodel.models
      .filter(
        (model) =>
          !globalModels.has(model.name) &&
          model.fields.some((field) => field.name === 'empresaId' || field.name === 'businessId'),
      )
      .map((model) => model.name);

    expect(tenantOwnedModels.filter((model) => !scopedModels.has(model))).toEqual([]);
  });
});

describe('companyScopeExtension update ownership', () => {
  it('overrides a caller-supplied empresaId in single-record updates', () => {
    expect(
      enforceTenantOnUpdateData(
        { nombre: 'Producto', empresaId: 'empresa-b' },
        'empresaId',
        'empresa-a',
      ),
    ).toEqual({ nombre: 'Producto', empresaId: 'empresa-a' });
  });

  it('overrides a caller-supplied businessId in bulk updates', () => {
    expect(
      enforceTenantOnUpdateData(
        [{ businessId: 'empresa-b' }, { businessId: 'empresa-c' }],
        'businessId',
        'empresa-a',
      ),
    ).toEqual([{ businessId: 'empresa-a' }, { businessId: 'empresa-a' }]);
  });
});

describe('companyScopeExtension unique-read ownership', () => {
  it('rejects a foreign-company record independently of the caller select', async () => {
    const client = {
      cliente: {
        findUnique: jest.fn().mockResolvedValue({ empresaId: 'empresa-b' }),
      },
    };

    await expect(
      isUniqueReadOwnedByTenant(client, 'Cliente', { id: 'cliente-1' }, 'empresa-a'),
    ).resolves.toBe(false);

    expect(client.cliente.findUnique).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      select: { empresaId: true },
    });
  });

  it('checks businessId models through their own tenant field', async () => {
    const client = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({ businessId: 'empresa-b' }),
      },
    };

    await expect(
      isUniqueReadOwnedByTenant(client, 'Cart', { id: 'cart-1' }, 'empresa-a'),
    ).resolves.toBe(false);

    expect(client.cart.findUnique).toHaveBeenCalledWith({
      where: { id: 'cart-1' },
      select: { businessId: true },
    });
  });

  it('accepts a record owned by the authenticated tenant', async () => {
    const client = {
      cliente: {
        findUnique: jest.fn().mockResolvedValue({ empresaId: 'empresa-a' }),
      },
    };

    await expect(
      isUniqueReadOwnedByTenant(client, 'Cliente', { id: 'cliente-1' }, 'empresa-a'),
    ).resolves.toBe(true);
  });

  it('leaves missing records to Prisma so native not-found semantics are preserved', async () => {
    const client = {
      cliente: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    await expect(
      isUniqueReadOwnedByTenant(client, 'Cliente', { id: 'missing' }, 'empresa-a'),
    ).resolves.toBe(true);
  });
});
