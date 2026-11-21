/**
 * OR-B4-052 (stage D1) — an Argentine CUIT: 11 digits whose last one is the check digit of the
 * other ten (module 11 with the weights 5 4 3 2 7 6 5 4 3 2). Dashes and spaces are allowed when
 * typed and dropped when kept.
 */
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function normalizeCuit(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function isValidCuit(value: string): boolean {
  const digits = normalizeCuit(value);
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const rest = 11 - (sum % 11);
  const check = rest === 11 ? 0 : rest === 10 ? 9 : rest;
  return check === Number(digits[10]);
}
