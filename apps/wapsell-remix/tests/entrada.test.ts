import { describe, expect, it } from 'vitest';
import { buyerHome, workDestination } from '~/utils/entrada';

// Login por rol — where each person goes after signing in with the work key.
describe('after the work key', () => {
  it('asks «¿Cómo querés entrar?» the first time', () => {
    expect(workDestination(null, null)).toBe('/entrar');
  });

  it('goes where the last choice was', () => {
    expect(workDestination(null, 'a=1; wapsell_entrada=negocio')).toBe('/panel');
    expect(workDestination(null, 'wapsell_entrada=cliente')).toBe('/entrar?como=cliente');
  });

  it('enters as a customer when the person was going to a store', () => {
    expect(workDestination('/tienda/almacen-lucia/chat', 'wapsell_entrada=negocio')).toBe(
      '/entrar?como=cliente&volver=%2Ftienda%2Falmacen-lucia%2Fchat',
    );
    expect(workDestination('/cuenta', null)).toBe('/entrar?como=cliente&volver=%2Fcuenta');
  });

  it('goes to what was asked inside the site, never elsewhere', () => {
    expect(workDestination('/panel/pedidos', null)).toBe('/panel/pedidos');
    expect(workDestination('//evil.example', null)).toBe('/entrar');
    expect(workDestination('https://evil.example', null)).toBe('/entrar');
  });
});

describe('a customer home', () => {
  it('only the stores or the account', () => {
    expect(buyerHome('/tienda/x')).toBe('/tienda/x');
    expect(buyerHome('/panel')).toBe('/cuenta');
    expect(buyerHome(null)).toBe('/cuenta');
  });
});
