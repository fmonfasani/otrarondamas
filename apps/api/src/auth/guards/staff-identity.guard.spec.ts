import { StaffIdentityGuard } from './staff-identity.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../auth.types';

describe('StaffIdentityGuard', () => {
  let guard: StaffIdentityGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new StaffIdentityGuard(reflector);
    mockContext = {
      getHandler: () => ({ name: 'testHandler' }),
      getClass: () => ({ name: 'TestController' }),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;
  });

  describe('Cliente token rejection', () => {
    it('should REJECT when user.type === "cliente"', () => {
      const clienteUser: AuthenticatedUser = {
        id: 'cliente-1',
        email: 'cliente@test.local',
        nombre: 'Test Cliente',
        empresaId: 'business-1',
        permisos: [],
        rol: 'ASISTENTE_LOCAL',
        estadoLegajo: 'APROBADO',
        type: 'cliente',
        esMayorista: false,
      };

      const request = { user: clienteUser };
      mockContext.switchToHttp = () => ({ getRequest: () => request }) as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Los clientes no pueden acceder a endpoints internos'
      );
    });

    it('should ALLOW when user.type === "usuario"', () => {
      const usuarioUser: AuthenticatedUser = {
        id: 'usuario-1',
        email: 'usuario@test.local',
        nombre: 'Test Usuario',
        empresaId: 'business-1',
        permisos: ['clientes.gestionar'],
        rol: 'OWNER',
        estadoLegajo: 'APROBADO',
        type: 'usuario',
        esMayorista: false,
      };

      const request = { user: usuarioUser };
      mockContext.switchToHttp = () => ({ getRequest: () => request }) as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
