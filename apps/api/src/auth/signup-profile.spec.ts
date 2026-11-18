import { BadRequestException } from '@nestjs/common';
import { normalizeCuit, PROVINCIAS, RUBROS } from './signup-catalog';
import { profileFrom } from './signup.service';

jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));

describe('«Vendé en Wapsell» business profile (ADR-IDN-008/009)', () => {
  const valid = {
    direccion: 'Av. Rivadavia 4500',
    ciudad: 'CABA',
    provincia: 'Ciudad Autónoma de Buenos Aires',
    codigoPostal: 'c1406',
    rubro: 'Bebidas',
    subrubro: 'Vinoteca',
  };

  it('keeps the older one-step form working: no profile fields, no profile', () => {
    expect(profileFrom({})).toBeNull();
    expect(profileFrom({ apellido: 'Pérez' })).toBeNull();
  });

  it('stores the address and type, starting at INICIAL without a CUIT', () => {
    expect(profileFrom(valid)).toEqual({
      ...valid,
      codigoPostal: 'C1406',
      cuit: null,
      nivel: 'INICIAL',
    });
  });

  it('accepts a CUIT with a valid check digit, with or without dashes, still INICIAL', () => {
    expect(profileFrom({ ...valid, cuit: '20-12345678-6' })).toMatchObject({
      cuit: '20123456786',
      nivel: 'INICIAL',
    });
  });

  it.each([
    [{ cuit: '20-12345678-9' }, 'CUIT'],
    [{ provincia: 'Narnia' }, 'provincia'],
    [{ rubro: 'Inventado' }, 'rubro'],
    [{ subrubro: 'Bar' }, 'subrubro'],
    [{ codigoPostal: '12' }, 'código postal'],
    [{ ciudad: '' }, 'ciudad'],
    [{ direccion: '' }, 'dirección'],
  ])('refuses %j', (patch, word) => {
    expect(() => profileFrom({ ...valid, ...patch })).toThrow(BadRequestException);
    expect(() => profileFrom({ ...valid, ...patch })).toThrow(new RegExp(word, 'i'));
  });

  it('checks the CUIT digit (mod 11)', () => {
    expect(normalizeCuit('30-71234567-8')).toBeNull();
    expect(normalizeCuit('20123456786')).toBe('20123456786');
    expect(normalizeCuit('2012345678')).toBeNull();
  });

  it('has 24 provinces and every rubro offers «Otro»', () => {
    expect(PROVINCIAS).toHaveLength(24);
    for (const subrubros of Object.values(RUBROS)) expect(subrubros).toContain('Otro');
  });
});
