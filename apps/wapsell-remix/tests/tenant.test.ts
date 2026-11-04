import { describe, it, expect } from 'vitest';
import { appendTenantHeaders } from '../app/services/tenant.server';
import type { TenantContext } from '../app/services/tenant.server';

const tenant: TenantContext = {
  empresaId: '123',
  empresaName: 'Test Empresa',
  userId: 'user-123',
};

describe('Tenant Service', () => {
  it('should append tenant headers correctly', () => {
    const headers = appendTenantHeaders({}, tenant);

    expect(headers.get('x-empresa-id')).toBe('123');
    expect(headers.get('x-user-id')).toBe('user-123');
  });

  it('should preserve existing headers when adding tenant context', () => {
    const existingHeaders = new Headers({
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    const headers = appendTenantHeaders(existingHeaders, tenant);

    expect(headers.get('authorization')).toBe('Bearer token');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('x-empresa-id')).toBe('123');
    expect(headers.get('x-user-id')).toBe('user-123');
  });

  it('should overwrite caller-provided tenant identifiers with session tenant context', () => {
    const headers = appendTenantHeaders(
      { 'X-Empresa-Id': 'attacker-business', 'X-User-Id': 'attacker-user' },
      tenant,
    );

    expect(headers.get('x-empresa-id')).toBe('123');
    expect(headers.get('x-user-id')).toBe('user-123');
  });

  it('should accept tuple-based HeadersInit values', () => {
    const headers = appendTenantHeaders(
      [['Authorization', 'Bearer token']],
      tenant,
    );

    expect(headers.get('authorization')).toBe('Bearer token');
    expect(headers.get('x-empresa-id')).toBe('123');
    expect(headers.get('x-user-id')).toBe('user-123');
  });
});
