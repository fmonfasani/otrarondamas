import { describe, expect, it } from 'vitest';
import { businessFrom, passwordChangeFrom, storeUrl } from '../app/utils/settings';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};

describe('Mi perfil and Ajustes helpers', () => {
  it('checks the new password before sending it', () => {
    expect(passwordChangeFrom(formOf([['actual', 'vieja-123'], ['nueva', 'nueva-1234'], ['repetida', 'nueva-1234']]))).toEqual({
      ok: true,
      actual: 'vieja-123',
      nueva: 'nueva-1234',
    });
    expect(passwordChangeFrom(formOf([['actual', ''], ['nueva', 'nueva-1234'], ['repetida', 'nueva-1234']]))).toMatchObject({ ok: false });
    expect(passwordChangeFrom(formOf([['actual', 'x'], ['nueva', 'corta'], ['repetida', 'corta']]))).toMatchObject({ ok: false, message: expect.stringContaining('8') });
    expect(passwordChangeFrom(formOf([['actual', 'x'], ['nueva', 'nueva-1234'], ['repetida', 'otra-12345']]))).toMatchObject({ ok: false, message: expect.stringContaining('no coinciden') });
    expect(passwordChangeFrom(formOf([['actual', 'misma-123'], ['nueva', 'misma-123'], ['repetida', 'misma-123']]))).toMatchObject({ ok: false, message: expect.stringContaining('distinta') });
  });

  it('reads the Business form', () => {
    expect(businessFrom(formOf([['nombre', ' Almacén Ronda '], ['telefono', ' 11 5555 '], ['direccion', '']]))).toEqual({
      ok: true,
      data: { nombre: 'Almacén Ronda', telefono: '11 5555', direccion: '', horario: '', descripcion: '' },
    });
    expect(businessFrom(formOf([['nombre', 'A']]))).toMatchObject({ ok: false });
  });

  it('builds the store address', () => {
    expect(storeUrl('demo-ronda')).toBe('https://app.wapsell.com/tienda/demo-ronda');
    expect(storeUrl('demo-ronda', 'http://localhost:3399')).toBe('http://localhost:3399/tienda/demo-ronda');
  });
});
