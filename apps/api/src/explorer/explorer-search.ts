/**
 * Marketplace, step 3 (Owner, 2026-11-26) — Wapsell's search across every store: the pure rules.
 *
 * It forgives how people type: no accents or capitals («Almacén» = «almacen»), words written
 * together or apart («cocacola» = «Coca-Cola»), how they sound in Spanish («koka» = «coca»,
 * «sapatilla» = «zapatilla», «vino» = «bino») and one or two slips in longer words («fideso»).
 * Every word typed has to be found; a closer match ranks higher.
 */

export const SEARCH_PAGE = 24;
export const SEARCH_ORDERS = [
  'relevancia',
  'vendidos',
  'buscados',
  'precio-asc',
  'precio-desc',
  'nuevos',
] as const;
export type SearchOrder = (typeof SEARCH_ORDERS)[number];

/** Lowercase, without accents, letters and digits only («Coca-Cola 2,25 l» → «coca cola 2 25 l»). */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** How a word sounds in Spanish, so spelling slips that sound the same are the same word. */
export function sound(word: string): string {
  return word
    .replace(/ñ/g, 'ni')
    .replace(/qu([ei])/g, 'k$1')
    .replace(/c([ei])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/w/g, 'u')
    .replace(/ll/g, 'y')
    .replace(/h/g, '')
    .replace(/x/g, 'ks')
    .replace(/(.)\1+/g, '$1');
}

/** Edits (insert, delete, change, swap two letters) to go from a to b; stops past `limit`. */
export function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) rows.push([i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = value;
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
  }
  return rows[a.length][b.length];
}

/**
 * Slips forgiven for a word of this length: none for short words (they are caught by sound),
 * one from 5 letters, two from 8 («cola» never finds «colchón»).
 */
const slipsFor = (word: string) => (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);

/** A text ready to be searched many times. */
export type Searchable = { words: string[]; sounds: string[]; joined: string; joinedSound: string };

export function searchable(text: string): Searchable {
  const words = plain(text).split(' ').filter(Boolean);
  const sounds = words.map(sound);
  return { words, sounds, joined: words.join(''), joinedSound: sounds.join('') };
}

/**
 * How well one typed word is found in the text: 4 a whole word, 3 the start of a word, 2 inside
 * the text (words together or apart), 1 sounds alike or one or two slips; 0 not found.
 */
export function wordScore(typed: string, text: Searchable): number {
  if (text.words.includes(typed)) return 4;
  if (text.words.some((w) => w.startsWith(typed))) return 3;
  if (text.joined.includes(typed)) return 2;
  const said = sound(typed);
  if (
    said.length >= 3 &&
    (text.sounds.some((s) => s.startsWith(said)) || text.joinedSound.includes(said))
  ) {
    return 1;
  }
  const slips = slipsFor(typed);
  if (slips === 0) return 0;
  // A slip anywhere in a word, or in the beginning of a longer one («fideso» → «fideos»).
  const near = (w: string) =>
    distance(typed, w, slips) <= slips ||
    (w.length > typed.length && distance(typed, w.slice(0, typed.length), slips) <= slips);
  return text.words.some(near) || text.sounds.some((s) => distance(said, s, slips) <= slips)
    ? 1
    : 0;
}

/**
 * How well the whole query is found: every word has to be there. The query written together is
 * also tried as one word («coca cola» finds «Cocacola»). 0 = not found; higher is closer.
 */
export function queryScore(query: string, text: Searchable): number {
  const typed = plain(query).split(' ').filter(Boolean);
  if (typed.length === 0) return 1;
  let total = 0;
  for (const word of typed) {
    const score = wordScore(word, text);
    if (score === 0) {
      const together = wordScore(typed.join(''), text);
      return together > 0 ? together * typed.length : 0;
    }
    total += score;
  }
  return total;
}

/** One published product of a store, as Wapsell's search sees it. */
export type SearchRow = {
  productoId: string;
  nombre: string;
  marca: string | null;
  precioCentavos: number;
  vendidos: number;
  /** Step 3b: how many searches of the last 30 days find it (never shown, only orders). */
  buscados: number;
  destacado: boolean;
  createdAt: Date;
  enOferta: boolean;
  tienda: { slug: string; rubro: string | null; abiertoAhora: boolean | null };
  text: Searchable;
};

export type SearchParams = {
  q?: string;
  rubro?: string;
  marcas?: string[];
  min?: number;
  max?: number;
  enOferta?: boolean;
  abierto?: boolean;
  orden?: SearchOrder;
  pagina?: number;
};

const byName = (a: SearchRow, b: SearchRow) => a.nombre.localeCompare(b.nombre, 'es');

/**
 * The search: what matches the words and the rubro, the brands and price range left to choose
 * (facets), then brand, price, «en oferta» and «abierto ahora» narrow, the order applies and one
 * page is cut. Relevance first means closer matches, then what sells more, then featured.
 */
export function search<T extends SearchRow>(rows: T[], params: SearchParams) {
  const scored = rows
    .filter((r) => !params.rubro || r.tienda.rubro === params.rubro)
    .map((r) => ({ r, score: params.q ? queryScore(params.q, r.text) : 1 }))
    .filter((x) => x.score > 0);
  const brands = new Set((params.marcas ?? []).map(plain));
  const minCents = params.min === undefined ? undefined : Math.round(params.min * 100);
  const maxCents = params.max === undefined ? undefined : Math.round(params.max * 100);
  const filtered = scored.filter(
    ({ r }) =>
      (brands.size === 0 || brands.has(plain(r.marca ?? ''))) &&
      (minCents === undefined || r.precioCentavos >= minCents) &&
      (maxCents === undefined || r.precioCentavos <= maxCents) &&
      (!params.enOferta || r.enOferta) &&
      (!params.abierto || r.tienda.abiertoAhora === true),
  );
  type Scored = (typeof filtered)[number];
  const compare: Record<SearchOrder, (a: Scored, b: Scored) => number> = {
    relevancia: (a, b) =>
      b.score - a.score ||
      b.r.vendidos - a.r.vendidos ||
      Number(b.r.destacado) - Number(a.r.destacado) ||
      byName(a.r, b.r),
    vendidos: (a, b) => b.r.vendidos - a.r.vendidos || b.score - a.score || byName(a.r, b.r),
    buscados: (a, b) => b.r.buscados - a.r.buscados || b.score - a.score || byName(a.r, b.r),
    'precio-asc': (a, b) => a.r.precioCentavos - b.r.precioCentavos || byName(a.r, b.r),
    'precio-desc': (a, b) => b.r.precioCentavos - a.r.precioCentavos || byName(a.r, b.r),
    nuevos: (a, b) => b.r.createdAt.getTime() - a.r.createdAt.getTime() || byName(a.r, b.r),
  };
  const sorted = [...filtered].sort(compare[params.orden ?? 'relevancia']).map((x) => x.r);
  const paginas = Math.max(1, Math.ceil(sorted.length / SEARCH_PAGE));
  const pagina = Math.min(Math.max(1, params.pagina ?? 1), paginas);
  const prices = scored.map(({ r }) => r.precioCentavos);
  const brandCount = new Map<string, { nombre: string; cantidad: number }>();
  for (const { r } of scored) {
    const name = r.marca?.trim();
    if (!name) continue;
    const key = plain(name);
    const known = brandCount.get(key);
    if (known) known.cantidad += 1;
    else brandCount.set(key, { nombre: name, cantidad: 1 });
  }
  return {
    productos: sorted.slice((pagina - 1) * SEARCH_PAGE, pagina * SEARCH_PAGE),
    total: sorted.length,
    pagina,
    paginas,
    facetas: {
      marcas: [...brandCount.values()]
        .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, 30),
      precio: prices.length
        ? { min: Math.min(...prices) / 100, max: Math.max(...prices) / 100 }
        : null,
    },
  };
}

/**
 * «¿Quisiste decir…?»: when a typed word is only found by sound or with slips, the closest word
 * that is really in the products. Null when every word was found as typed.
 */
export function didYouMean(query: string, texts: Searchable[]): string | null {
  const typed = plain(query).split(' ').filter(Boolean);
  if (typed.length === 0) return null;
  let changed = false;
  const fixed = typed.map((word) => {
    if (texts.some((t) => wordScore(word, t) >= 2)) return word;
    const said = sound(word);
    const slips = Math.max(1, slipsFor(word));
    let best: { w: string; d: number; n: number } | null = null;
    const seen = new Map<string, number>();
    for (const t of texts) for (const w of t.words) seen.set(w, (seen.get(w) ?? 0) + 1);
    for (const [w, n] of seen) {
      if (w.length < 3) continue;
      const d = sound(w) === said ? 0 : distance(said, sound(w), slips);
      if (d > slips) continue;
      if (!best || d < best.d || (d === best.d && n > best.n)) best = { w, d, n };
    }
    if (!best) return word;
    changed = true;
    return best.w;
  });
  return changed ? fixed.join(' ') : null;
}

/**
 * Step 3b — a counted search word finds the text as typed (whole, start or inside, words together
 * or apart), without the sound and slip allowances: cheap enough to try every popular word
 * against every product each minute.
 */
export function strictlyFound(term: string, text: Searchable): boolean {
  const words = term.split(' ').filter(Boolean);
  return words.length > 0 && words.every((w) => text.joined.includes(w));
}
