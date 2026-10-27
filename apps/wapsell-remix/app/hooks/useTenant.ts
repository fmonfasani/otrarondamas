import { useTenant as useTenantContext } from '~/context/TenantContext';

export function useTenant() {
  return useTenantContext();
}

export function useEmpresaId(): string {
  const { empresaId } = useTenantContext();
  return empresaId;
}

export function useEmpresaName(): string {
  const { empresaName } = useTenantContext();
  return empresaName;
}

export function useUserId(): string {
  const { userId } = useTenantContext();
  return userId;
}
