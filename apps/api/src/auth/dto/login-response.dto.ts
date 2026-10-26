export class LoginResponseDto {
  accessToken: string;
  empresaId: string;
  empresa: {
    id: string;
    nombre: string;
    role: string;
  };
  empresas: Array<{
    id: string;
    nombre: string;
    role: string;
  }>;
  usuario: {
    id: string;
    email: string;
    nombre: string;
    empresaNombre: string;
    permisos: string[];
    fotoUrl: string | null;
    metodoLogin: 'google' | 'password';
    createdAt: string;
    rol: string;
    estadoLegajo: string;
  };
}
