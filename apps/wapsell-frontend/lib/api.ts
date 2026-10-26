const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.wapsell.com';

interface FetchOptions extends RequestInit {
  includeToken?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { includeToken = true, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Agregar JWT si existe
  if (includeToken) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expirado o inválido
      typeof window !== 'undefined' && localStorage.removeItem('jwt');
      typeof window !== 'undefined' && localStorage.removeItem('empresaId');
      typeof window !== 'undefined' && window.location.replace('/auth/login');
    }

    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Empresas API
export const empresasApi = {
  getMyEmpresas: () =>
    apiFetch('/tenants/my-empresas'),

  createEmpresa: (data: {
    nombre: string;
    email: string;
    telefono?: string;
    pais: string;
    sector?: string;
    plan: 'basico' | 'pro' | 'premium';
  }) =>
    apiFetch('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEmpresa: (id: string) =>
    apiFetch(`/tenants/${id}`),

  updateEmpresa: (
    id: string,
    data: Partial<{
      nombre: string;
      email: string;
      telefono: string;
      pais: string;
      sector: string;
      plan: string;
    }>
  ) =>
    apiFetch(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteEmpresa: (id: string) =>
    apiFetch(`/tenants/${id}`, {
      method: 'DELETE',
    }),
};

// Auth API
export const authApi = {
  switchEmpresa: (empresaId: string) =>
    apiFetch(`/auth/switch-empresa/${empresaId}`, {
      method: 'POST',
    }),

  logout: () =>
    apiFetch('/auth/logout', {
      method: 'POST',
    }),
};
