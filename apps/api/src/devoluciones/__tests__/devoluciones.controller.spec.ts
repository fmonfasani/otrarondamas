import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DevolucionClienteController } from '../devoluciones.controller';
import { DevolucionesService } from '../devoluciones.service';
import { BusinessContextService } from '../../business-context/business-context.service';
import { CreateDevolucionDto, ReceiveDevolucionDto } from '../dto';
import type { AuthenticatedUser } from '../../auth/auth.types';

/**
 * OR-B4-034 — the controller resolves the company, checks the role against the matrix in
 * place (so it holds in shadow mode) and delegates. The flow itself is covered by the
 * integration suite (p3-2-devoluciones).
 */
describe('DevolucionClienteController', () => {
  let controller: DevolucionClienteController;
  const service = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    authorize: jest.fn(),
    receive: jest.fn(),
    processRefund: jest.fn(),
  };
  const businessContext = { resolveForAuthenticatedUser: jest.fn(), resolveCompanyId: jest.fn() };
  const user = { id: 'usuario-1', type: 'usuario' } as unknown as AuthenticatedUser;
  const asRole = (role: string) => {
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({ businessId: 'b-1', role });
    businessContext.resolveCompanyId.mockResolvedValue('empresa-1');
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevolucionClienteController],
      providers: [
        { provide: DevolucionesService, useValue: service },
        { provide: BusinessContextService, useValue: businessContext },
      ],
    }).compile();
    controller = module.get(DevolucionClienteController);
  });

  it('lets a Vendedor register a return and delegates with the company and the user', async () => {
    asRole('VENDEDOR');
    const dto = {
      ventaId: 'v-1',
      items: [{ ventaItemId: 'vi-1', cantidad: 1, motivo: 'Fallado' }],
    } as CreateDevolucionDto;
    service.create.mockResolvedValue({ id: 'd-1' });
    await expect(controller.createDevolucione(dto, user)).resolves.toEqual({ id: 'd-1' });
    // OR-B4-035 rule 5: a Vendedor cannot register past the window (canOverride = false).
    expect(service.create).toHaveBeenCalledWith('empresa-1', 'usuario-1', dto, expect.any(Date), false);
  });

  it('refuses a Gestor de stock registering a return', async () => {
    asRole('GESTOR_DE_STOCK');
    await expect(
      controller.createDevolucione({} as CreateDevolucionDto, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('lets only Owner and Admin authorize, receive and refund', async () => {
    asRole('VENDEDOR');
    await expect(
      controller.authorizeDevolucione('d-1', { condition: 'accepted' }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.receiveDevolucione('d-1', { items: [] }, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(controller.processRefund('d-1', {}, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    asRole('ADMIN');
    await controller.authorizeDevolucione('d-1', { condition: 'accepted', notes: 'ok' }, user);
    expect(service.authorize).toHaveBeenCalledWith('empresa-1', 'd-1', 'usuario-1', 'ok');
    await controller.processRefund('d-1', {}, user);
    expect(service.processRefund).toHaveBeenCalledWith('empresa-1', 'd-1', 'usuario-1', {});
  });

  it('lists with the filters given', async () => {
    asRole('VENDEDOR');
    await controller.listDevoluciones(user, 'RECIBIDA', 10, 0);
    expect(service.list).toHaveBeenCalledWith('empresa-1', {
      estado: 'RECIBIDA',
      limit: 10,
      offset: 0,
    });
  });

  it('asks for a destination on every received product', async () => {
    const ok = plainToInstance(ReceiveDevolucionDto, {
      items: [{ itemId: '4f7c2a0e-5b1d-4c3e-9a8f-1d2e3f4a5b6c', destino: 'DESCARTE' }],
    });
    expect(await validate(ok)).toHaveLength(0);
    const bad = plainToInstance(ReceiveDevolucionDto, {
      items: [{ itemId: '4f7c2a0e-5b1d-4c3e-9a8f-1d2e3f4a5b6c', destino: 'TIRAR' }],
    });
    expect(await validate(bad)).not.toHaveLength(0);
    expect(await validate(plainToInstance(ReceiveDevolucionDto, { items: [] }))).not.toHaveLength(
      0,
    );
  });
});
