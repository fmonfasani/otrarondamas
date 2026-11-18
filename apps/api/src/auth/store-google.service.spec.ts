import { JwtService } from '@nestjs/jwt';
import { STORE_GOOGLE_COOKIE, StoreGoogleService, readCookie } from './store-google.service';

describe('StoreGoogleService (ADR-IDN-007)', () => {
  const jwt = new JwtService({ secret: 'store-google-spec-secret' });
  const service = new StoreGoogleService(jwt);
  const web = 'abcdefghijklmnopqrstuvwxyz012345';
  const cookieOf = (nonce: string) => `other=1; ${STORE_GOOGLE_COOKIE}=${nonce}`;

  it('returns the store when the state and this browser cookie match', async () => {
    const { state, nonce } = await service.issue({
      kind: 'store',
      slug: 'demo',
      businessId: 'biz-1',
      volver: 'carrito',
      web: web,
    });
    await expect(service.read(state, cookieOf(nonce))).resolves.toEqual({
      kind: 'store',
      slug: 'demo',
      businessId: 'biz-1',
      volver: 'carrito',
      web,
    });
  });

  it('refuses a state used from another browser (login CSRF)', async () => {
    const { state } = await service.issue({
      kind: 'store',
      slug: 'demo',
      businessId: 'biz-1',
      volver: '',
      web: web,
    });
    await expect(service.read(state, undefined)).resolves.toBeNull();
    await expect(service.read(state, cookieOf('someone-else'))).resolves.toBeNull();
  });

  it('refuses a forged or foreign token', async () => {
    const forged = await new JwtService({ secret: 'other' }).signAsync({
      typ: 'store-google',
      kind: 'store',
      slug: 'x',
      businessId: 'y',
      nonce: 'n',
      web,
    });
    await expect(service.read(forged, cookieOf('n'))).resolves.toBeNull();
    const signup = await jwt.signAsync({
      typ: 'signup-google',
      slug: 'x',
      businessId: 'y',
      nonce: 'n',
      web,
    });
    await expect(service.read(signup, cookieOf('n'))).resolves.toBeNull();
  });

  it('refuses a start without the web binding', async () => {
    const { state, nonce } = await service.issue({
      kind: 'store',
      slug: 'demo',
      businessId: 'biz-1',
      volver: '',
      web: 'short',
    });
    await expect(service.read(state, cookieOf(nonce))).resolves.toBeNull();
  });

  it('keeps only known return targets', async () => {
    const { state, nonce } = await service.issue({
      kind: 'store',
      slug: 'demo',
      businessId: 'biz-1',
      volver: 'https://evil.test',
      web: web,
    });
    await expect(service.read(state, cookieOf(nonce))).resolves.toMatchObject({ volver: '' });
  });

  it('reads one cookie out of the header', () => {
    expect(readCookie('a=1; b=two%20words; c=3', 'b')).toBe('two words');
    expect(readCookie(undefined, 'b')).toBeNull();
  });

  it('only treats a non-empty state as a store state', () => {
    expect(service.isStoreState('x')).toBe(true);
    expect(service.isStoreState('')).toBe(false);
    expect(service.isStoreState(undefined)).toBe(false);
  });

  it('finishes the buyer flow only with the web binding, and «Vendé en Wapsell» with the nonce', async () => {
    const buyer = await service.issue({ kind: 'buyer', web });
    await expect(service.read(buyer.state, cookieOf(buyer.nonce))).resolves.toMatchObject({
      kind: 'buyer',
      web,
    });
    const noWeb = await service.issue({ kind: 'buyer' });
    await expect(service.read(noWeb.state, cookieOf(noWeb.nonce))).resolves.toBeNull();
    const sell = await service.issue({ kind: 'vender' });
    await expect(service.read(sell.state, cookieOf(sell.nonce))).resolves.toMatchObject({
      kind: 'vender',
    });
    await expect(service.read(sell.state, cookieOf('other'))).resolves.toBeNull();
  });
});
