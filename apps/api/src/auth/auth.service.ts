import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    if (email && password) {
      const usuario = {
        id: 'demo-user-id',
        nombre: 'Demo User',
        email,
        empresaId: 'demo-company-id',
        permisos: ['ventas.crear', 'clientes.gestionar'],
      };

      return {
        accessToken: 'demo-token-' + Date.now(),
        usuario,
      };
    }

    throw new Error('Credenciales inválidas');
  }
}
