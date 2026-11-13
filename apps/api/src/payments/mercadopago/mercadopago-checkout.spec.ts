import { createHmac, randomUUID } from 'node:crypto';
import { pagoStateFor, validMercadoPagoSignature } from './mercadopago-checkout.service';

/** Signs like Mercado Pago does (https://www.mercadopago.com.ar/developers — webhooks). */
function mpSignature(secret: string, manifest: string, ts = '1742505638683') {
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`;
}

describe('Mercado Pago webhook signature (real scheme)', () => {
  const secret = randomUUID();

  it('accepts the manifest id;request-id;ts signed with the app secret', () => {
    const signature = mpSignature(secret, 'id:123456;request-id:req-1;ts:1742505638683;');
    expect(validMercadoPagoSignature(signature, 'req-1', '123456', secret)).toBe(true);
  });

  it('lowercases an alphanumeric data.id, as Mercado Pago does', () => {
    const signature = mpSignature(secret, 'id:abc123;request-id:req-1;ts:1742505638683;');
    expect(validMercadoPagoSignature(signature, 'req-1', 'ABC123', secret)).toBe(true);
  });

  it('leaves out of the manifest what the request does not carry', () => {
    const signature = mpSignature(secret, 'id:123456;ts:1742505638683;');
    expect(validMercadoPagoSignature(signature, undefined, '123456', secret)).toBe(true);
  });

  it('refuses another payment id, request id, secret or a missing part', () => {
    const signature = mpSignature(secret, 'id:123456;request-id:req-1;ts:1742505638683;');
    expect(validMercadoPagoSignature(signature, 'req-1', '999999', secret)).toBe(false);
    expect(validMercadoPagoSignature(signature, 'req-2', '123456', secret)).toBe(false);
    expect(validMercadoPagoSignature(signature, 'req-1', '123456', randomUUID())).toBe(false);
    expect(validMercadoPagoSignature('v1=abc', 'req-1', '123456', secret)).toBe(false);
    expect(validMercadoPagoSignature(undefined, 'req-1', '123456', secret)).toBe(false);
    expect(validMercadoPagoSignature(signature, 'req-1', '123456', '')).toBe(false);
  });

  it('maps Mercado Pago payment statuses to the AS-IS Pago states', () => {
    expect(pagoStateFor('approved')).toBe('APROBADO');
    expect(pagoStateFor('in_process')).toBe('EN_PROCESO');
    expect(pagoStateFor('pending')).toBe('PENDIENTE');
    expect(pagoStateFor('rejected')).toBe('RECHAZADO');
    expect(pagoStateFor('cancelled')).toBe('CANCELADO');
    expect(pagoStateFor('refunded')).toBe('REEMBOLSADO_TOTAL');
  });
});
