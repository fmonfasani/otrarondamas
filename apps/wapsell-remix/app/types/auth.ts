export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Empresa {
  id: string;
  name: string;
  slug: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  empresas: Empresa[];
}

export interface Session {
  jwt: string;
  userId: string;
  empresaId: string;
  empresas: Empresa[];
}
