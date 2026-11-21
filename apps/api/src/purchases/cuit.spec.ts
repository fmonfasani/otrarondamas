import { isValidCuit, normalizeCuit } from './cuit';
import { suggestedQuantity } from './supplier-products.service';

describe('supplier data and the purchase suggestion (OR-B4-052, stage D1)', () => {
  it('accepts a CUIT with its check digit, with or without dashes', () => {
    expect(isValidCuit('20-12345678-6')).toBe(true);
    expect(isValidCuit('30712345671')).toBe(true);
    expect(normalizeCuit('27-28033514-8')).toBe('27280335148');
  });

  it('refuses a wrong check digit or length', () => {
    expect(isValidCuit('20-12345678-0')).toBe(false);
    expect(isValidCuit('2012345678')).toBe(false);
    expect(isValidCuit('20-1234567A-6')).toBe(false);
  });

  it('suggests bringing a product to twice its minimum, at least one unit', () => {
    expect(suggestedQuantity(3, 10)).toBe(17);
    expect(suggestedQuantity(0, 5)).toBe(10);
    expect(suggestedQuantity(9.5, 5)).toBe(1);
    expect(suggestedQuantity(2.5, 4)).toBe(6);
  });
});
