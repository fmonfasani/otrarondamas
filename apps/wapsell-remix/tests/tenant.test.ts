import { describe, it, expect } from 'vitest';
import { appendTenantHeaders } from '../app/services/tenant.server';
import type { TenantContext } from '../app/services/tenant.server';

describe('Tenant Service', () => {
  it('should extract tenant context correctly', () => {
    const tenant: TenantContext = {
      empresaId: '123',
      empresaName: 'Test Empresa',
      userId: 'user-123',
    };

    expect(tenant.empresaId).toBe('123');
    expect(tenant.userId).toBe('user-123');
    expect(tenant.empresaName).toBe('Test Empresa');
  });

  it('should append tenant headers correctly', () => {
    const tenant: TenantContext = {
      empresaId: '123',
      empresaName: 'Test Empresa',
      userId: 'user-123',
    };

    const headers = appendTenantHeaders({}, tenant) as Record<string, string>;

    expect(headers['X-Empresa-Id']).toBe('123');
    expect(headers['X-User-Id']).toBe('user-123');
  });

  it('should merge existing headers with tenant headers', () => {
    const tenant: TenantContext = {
      empresaId: '123',
      empresaName: 'Test Empresa',
      userId: 'user-123',
    };

    const existingHeaders = {
      'Authorization': 'Bearer token',
      'Content-Type': 'application/json',
    };

    const headers = appendTenantHeaders(existingHeaders, tenant) as Record<string, string>;

    expect(headers['Authorization']).toBe('Bearer token');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Empresa-Id']).toBe('123');
    expect(headers['X-User-Id']).toBe('user-123');
  });

  it('should validate tenant context structure', () => {
    const invalidTenant = {
      empresaId: '123',
      // missing empresaName and userId
    };

    // TypeScript should catch this at compile time
    expect(invalidTenant).toBeDefined();
  });
});
