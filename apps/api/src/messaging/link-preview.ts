import { lookup as dnsLookup } from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

/**
 * E5 — the title, description and photo of a link sent in the chat, like WhatsApp.
 *
 * The server visits the page itself, so it must never be sent somewhere inside (Owner,
 * 2026-11-26): only public internet addresses, checked AFTER the name is resolved and used for
 * the very connection (a name cannot point somewhere else between the check and the visit),
 * ports 80 and 443, no user:password in the address, at most 3 redirects (each checked again),
 * 4 seconds and 1 MB in all, no compression (no «zip bombs»), and only HTML; the photo is
 * then checked by its bytes like a chat photo.
 */
export const LINK_PREVIEW_MIME = 'application/vnd.wapsell.link+json';
export const LINK_PREVIEW_TIMEOUT_MS = 4000;
export const LINK_PREVIEW_MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_URL = 2048;

export interface LinkPreview {
  url: string;
  titulo: string;
  descripcion: string | null;
  sitio: string;
  imagen: { buffer: Buffer; url: string } | null;
}

/**
 * Addresses that are not the public internet: the server itself, private networks, etc. Two
 * lists: in one list, the IPv6 range of IPv4-mapped addresses would also catch every IPv4.
 */
const INTERNAL_V4 = new BlockList();
const INTERNAL_V6 = new BlockList();
for (const [net, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  INTERNAL_V4.addSubnet(net, bits, 'ipv4');
}
for (const [net, bits] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  INTERNAL_V6.addSubnet(net, bits, 'ipv6');
}

/** Whether an IP address is on the public internet (anything else is refused). */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return isPublicAddress(mapped[1]);
  }
  // Any other IPv4-mapped spelling (::ffff:7f00:1) falls in ::ffff:0:0/96 and is refused.
  return family === 4 ? !INTERNAL_V4.check(address, 'ipv4') : !INTERNAL_V6.check(address, 'ipv6');
}

/** The first web link in a message, without the punctuation that usually follows it. */
export function firstLink(text: string | null | undefined): string | null {
  if (!text) return null;
  const found = /\bhttps?:\/\/[^\s<>"']+/i.exec(text);
  if (!found) return null;
  let link = found[0];
  while (/[.,;:!?)\]}]$/.test(link)) link = link.slice(0, -1);
  return checkedUrl(link)?.toString() ?? null;
}

/** A URL the preview may visit: http(s), a name or public IP, ports 80/443, no credentials. */
export function checkedUrl(raw: string): URL | null {
  if (raw.length > MAX_URL) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== '80' && url.port !== '443') return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local'))
    return null;
  if (isIP(host) && !isPublicAddress(host)) return null;
  return url;
}

/**
 * Resolves the name and refuses it unless EVERY address is public; the connection then uses
 * the address checked here (no second lookup that could answer something else).
 */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const list = addresses;
    if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) {
      return callback(
        Object.assign(new Error('Dirección no pública'), { code: 'ENOTPUBLIC' }),
        '',
        0,
      );
    }
    const wanted = (options as { family?: number }).family;
    const chosen = list.find((a) => !wanted || a.family === wanted) ?? list[0];
    if ((options as { all?: boolean }).all) {
      return (callback as unknown as (e: null, a: typeof list) => void)(null, [chosen]);
    }
    return callback(null, chosen.address, chosen.family);
  });
};

type Fetched = { url: URL; type: string; body: Buffer };

export type FetchOptions = {
  accept: string;
  maxBytes: number;
  deadline: number;
} & TestSite;

/** Only for tests: a local site that plays the public internet (its lookup and its port). */
export type TestSite = { lookup?: LookupFunction; port?: number };

/** One GET with every limit above; follows up to 3 redirects, each one checked again. */
export async function guardedGet(start: URL, options: FetchOptions): Promise<Fetched | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const answer = await getOnce(url, options);
    if (!answer) return null;
    if ('redirect' in answer) {
      const next = answer.redirect ? checkedUrl(new URL(answer.redirect, url).toString()) : null;
      if (!next) return null;
      url = next;
      continue;
    }
    return answer;
  }
  return null;
}

function getOnce(
  url: URL,
  options: FetchOptions,
): Promise<Fetched | { redirect: string | null } | null> {
  const left = options.deadline - Date.now();
  if (left <= 0) return Promise.resolve(null);
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: Fetched | { redirect: string | null } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.destroy();
      resolve(value);
    };
    const request = client.get(
      {
        protocol: url.protocol,
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        path: `${url.pathname}${url.search}`,
        port: options.port ?? (url.port || undefined),
        lookup: options.lookup ?? publicLookup,
        headers: {
          Accept: options.accept,
          'Accept-Encoding': 'identity',
          'Accept-Language': 'es-AR,es;q=0.9',
          'User-Agent': 'Mozilla/5.0 (compatible; WapsellBot/1.0; +https://wapsell.com)',
        },
        agent: false,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume();
          return done({ redirect: response.headers.location ?? null });
        }
        const encoding = String(response.headers['content-encoding'] ?? 'identity').toLowerCase();
        const declared = Number(response.headers['content-length'] ?? 0);
        if (status !== 200 || encoding !== 'identity' || declared > options.maxBytes) {
          response.resume();
          return done(null);
        }
        const type = String(response.headers['content-type'] ?? '').toLowerCase();
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > options.maxBytes) {
            // Enough: a page's head is at its start, keep what fits.
            const room = options.maxBytes - (size - chunk.length);
            if (room > 0) chunks.push(chunk.subarray(0, room));
            return done({ url, type, body: Buffer.concat(chunks) });
          }
          chunks.push(chunk);
        });
        response.on('end', () => done({ url, type, body: Buffer.concat(chunks) }));
        response.on('error', () => done(null));
      },
    );
    request.on('error', () => done(null));
    const timer = setTimeout(() => done(null), left);
  });
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const value =
        code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Plain, one-line text of at most `max` characters (no control characters). */
function clean(value: string | undefined, max: number): string | null {
  if (!value) return null;
  const text = decodeEntities(value)
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (let match = pattern.exec(tag); match; match = pattern.exec(tag)) {
    found[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return found;
}

/** What a page says about itself: Open Graph first, then <title> and the description. */
export function readPageMeta(html: string): {
  titulo: string | null;
  descripcion: string | null;
  sitio: string | null;
  imagen: string | null;
} {
  const head = html.slice(0, 300_000);
  const meta: Record<string, string> = {};
  for (const tag of head.match(/<meta\b[^>]{0,2000}>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase();
    if (key && attrs.content !== undefined && meta[key] === undefined) meta[key] = attrs.content;
  }
  const title = /<title\b[^>]{0,200}>([^<]{0,1000})<\/title>/i.exec(head)?.[1];
  return {
    titulo: clean(meta['og:title'] ?? meta['twitter:title'] ?? title, 200),
    descripcion: clean(
      meta['og:description'] ?? meta['twitter:description'] ?? meta.description,
      300,
    ),
    sitio: clean(meta['og:site_name'], 80),
    imagen: meta['og:image:secure_url'] ?? meta['og:image'] ?? meta['twitter:image'] ?? null,
  };
}

function decode(body: Buffer, type: string) {
  const charset = /charset=([\w-]+)/.exec(type)?.[1]?.toLowerCase();
  const latin = charset === 'iso-8859-1' || charset === 'latin1' || charset === 'windows-1252';
  return new TextDecoder(latin ? 'windows-1252' : 'utf-8').decode(body);
}

/**
 * The preview of one link, or null when the page cannot be read within the limits or says
 * nothing worth showing. Never throws. `isPhoto` checks the image's bytes.
 */
export async function fetchLinkPreview(
  link: string,
  isPhoto: (buffer: Buffer) => boolean,
  testSite: TestSite = {},
): Promise<LinkPreview | null> {
  try {
    const start = checkedUrl(link);
    if (!start) return null;
    const deadline = Date.now() + LINK_PREVIEW_TIMEOUT_MS;
    const page = await guardedGet(start, {
      accept: 'text/html,application/xhtml+xml',
      maxBytes: LINK_PREVIEW_MAX_BYTES,
      deadline,
      ...testSite,
    });
    if (!page || !/text\/html|application\/xhtml\+xml/.test(page.type)) return null;
    const meta = readPageMeta(decode(page.body, page.type));
    if (!meta.titulo) return null;
    let imagen: LinkPreview['imagen'] = null;
    const imageUrl = meta.imagen ? checkedUrl(new URL(meta.imagen, page.url).toString()) : null;
    if (imageUrl) {
      const left = LINK_PREVIEW_MAX_BYTES - page.body.length;
      const photo =
        left > 0
          ? await guardedGet(imageUrl, {
              accept: 'image/jpeg,image/png,image/webp',
              maxBytes: left,
              deadline,
              ...testSite,
            })
          : null;
      // A photo cut at the byte limit would be broken: only a whole one is kept.
      if (photo && photo.body.length < left && isPhoto(photo.body)) {
        imagen = { buffer: photo.body, url: photo.url.toString() };
      }
    }
    return {
      url: start.toString(),
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      sitio: meta.sitio ?? start.hostname.replace(/^www\./, ''),
      imagen,
    };
  } catch {
    return null;
  }
}
