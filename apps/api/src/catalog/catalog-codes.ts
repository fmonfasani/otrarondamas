/**
 * OR-B4-028 — pure helpers for the codes the catalog needs when a business builds its
 * own categories from the panel. No I/O: callers pass what already exists in the scope.
 */

/** Prefix used by the automatic "General" Subfamilia/Tipo/Subtipo nodes. */
export const GENERAL_PREFIX = 'GEN';
export const GENERAL_NAME = 'General';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function lettersOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * A 3-character prefix (the columns are `Char(3)`) derived from the name and not in
 * `taken`: first the first three letters ("Bebidas" → BEB), then the first letter of
 * each word, then the first two letters plus a letter/digit, so it always resolves.
 */
export function derivePrefix(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((p) => p.trim().toUpperCase()));
  const clean = lettersOf(name);
  const words = name.split(/\s+/).map(lettersOf).filter(Boolean);
  const head = (clean + 'XXX').slice(0, 3);
  const candidates = [head];
  if (words.length >= 2)
    candidates.push((words.map((w) => w[0]).join('') + clean.slice(1) + 'XXX').slice(0, 3));
  for (const c of LETTERS + '0123456789') candidates.push(head.slice(0, 2) + c);
  for (const a of LETTERS) for (const b of LETTERS) candidates.push(head[0] + a + b);
  const found = candidates.find((candidate) => !used.has(candidate));
  if (!found) throw new Error('No hay prefijos disponibles');
  return found;
}

/**
 * Next automatic internal code for a Familia prefix: `BEB-0001`, `BEB-0002`, … taking
 * the highest numeric suffix already used with that prefix (codes typed by hand that
 * do not follow the pattern are ignored).
 */
export function nextInternalCode(prefix: string, existingCodes: Iterable<string>): string {
  const pattern = new RegExp(`^${prefix.trim().toUpperCase()}-(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const match = pattern.exec(code.trim().toUpperCase());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix.trim().toUpperCase()}-${String(max + 1).padStart(4, '0')}`;
}
