import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BusinessContext } from '../business-context/business-context.types';
import type { BusinessContextService } from '../business-context/business-context.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DossierService } from './dossier.service';
import { CustomerDossierController } from './dossier.customer.controller';

describe('CustomerDossierController Owner authorization and tenant context', () => {
  const user = {
    id: 'legacy-user-1',
    email: 'owner@example.com',
    nombre: 'Owner',
    empresaId: 'stale-empresa-from-jwt',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  } as AuthenticatedUser;

  let findMany: jest.Mock;
  let findFirst: jest.Mock;
  let updateMany: jest.Mock;
  let verifyCustomerComplete: jest.Mock;
  let resolveForAuthenticatedUser: jest.Mock;
  let resolveCompanyId: jest.Mock;
  let controller: CustomerDossierController;

  const context = (role: string): BusinessContext => ({
    actorType: 'USER',
    businessId: 'business-current',
    userId: 'canonical-user-1',
    customerId: null,
    membershipId: 'membership-current',
    role,
    permissions: [],
  });

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    findFirst = jest.fn().mockResolvedValue({ id: 'customer-1' });
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    verifyCustomerComplete = jest.fn().mockResolvedValue({ completo: true, faltantes: [] });
    resolveForAuthenticatedUser = jest.fn().mockResolvedValue(context('OWNER'));
    resolveCompanyId = jest.fn().mockResolvedValue('empresa-current');

    const prisma = {
      cliente: { findMany, findFirst, updateMany },
    } as unknown as PrismaService;
    const dossierService = {
      verifyCustomerComplete,
    } as unknown as DossierService;
    const businessContext = {
      resolveForAuthenticatedUser,
      resolveCompanyId,
    } as unknown as BusinessContextService;

    controller = new CustomerDossierController(dossierService, prisma, businessContext);
  });

  it('rejects non-Owner Memberships from the pending dossier inbox', async () => {
    resolveForAuthenticatedUser.mockResolvedValue(context('VENDEDOR'));

    await expect(controller.listPending(user)).rejects.toBeInstanceOf(ForbiddenException);

    expect(findMany).not.toHaveBeenCalled();
  });

  it('uses the current BusinessContext, not the legacy JWT empresaId, for the pending inbox', async () => {
    await controller.listPending(user);

    expect(resolveForAuthenticatedUser).toHaveBeenCalledWith(user);
    expect(resolveCompanyId).toHaveBeenCalledWith('business-current');
    expect(findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-current',
        esMayorista: true,
        estadoLegajo: 'PENDIENTE',
      },
      include: { legajo: true },
    });
  });

  it('rejects non-Owner Memberships from approving a wholesale dossier', async () => {
    resolveForAuthenticatedUser.mockResolvedValue(context('ADMIN'));

    await expect(controller.approve('customer-1', user)).rejects.toBeInstanceOf(ForbiddenException);

    expect(findFirst).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('scopes approval to the current Business and atomically transitions only a pending wholesale customer', async () => {
    const result = await controller.approve('customer-1', user);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        empresaId: 'empresa-current',
        esMayorista: true,
        estadoLegajo: 'PENDIENTE',
      },
    });
    expect(verifyCustomerComplete).toHaveBeenCalledWith('customer-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'customer-1',
        empresaId: 'empresa-current',
        esMayorista: true,
        estadoLegajo: 'PENDIENTE',
      },
      data: { estadoLegajo: 'APROBADO' },
    });
    expect(result).toEqual({ aprobado: true, faltantes: [] });
  });

  it('does not report approval if the pending state changed concurrently', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(controller.approve('customer-1', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
