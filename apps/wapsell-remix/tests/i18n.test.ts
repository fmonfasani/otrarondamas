import { describe, it, expect } from 'vitest';
import { getLocaleFromRequest } from '../app/i18n/server';

describe('i18n Server', () => {
  it('should detect es from URL', () => {
    const request = new Request('http://localhost:3000/es/dashboard');
    expect(getLocaleFromRequest(request)).toBe('es');
  });

  it('should detect en from URL', () => {
    const request = new Request('http://localhost:3000/en/products');
    expect(getLocaleFromRequest(request)).toBe('en');
  });

  it('should default to es for root', () => {
    const request = new Request('http://localhost:3000/');
    expect(getLocaleFromRequest(request)).toBe('es');
  });

  it('should detect en from accept-language header', () => {
    const request = new Request('http://localhost:3000/dashboard', {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });
    expect(getLocaleFromRequest(request)).toBe('en');
  });
});
