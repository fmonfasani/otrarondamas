import * as http from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';
import {
  checkedUrl,
  fetchLinkPreview,
  firstLink,
  isPublicAddress,
  publicLookup,
  readPageMeta,
} from './link-preview';

// E5 — the link preview visits pages for the chat; it must never be pointed inside the server.
describe('link preview: which addresses it may visit', () => {
  it('only the public internet', () => {
    for (const inside of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.9',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:7f00:1',
    ]) {
      expect(isPublicAddress(inside)).toBe(false);
    }
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
    expect(isPublicAddress('not-an-ip')).toBe(false);
  });

  it('refuses addresses that are not plain web pages', () => {
    expect(checkedUrl('ftp://example.com/x')).toBeNull();
    expect(checkedUrl('file:///etc/passwd')).toBeNull();
    expect(checkedUrl('http://user:pass@example.com/')).toBeNull();
    expect(checkedUrl('http://example.com:8600/health')).toBeNull();
    expect(checkedUrl('http://localhost/')).toBeNull();
    expect(checkedUrl('http://127.0.0.1/')).toBeNull();
    expect(checkedUrl('http://[::1]/')).toBeNull();
    expect(checkedUrl('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(checkedUrl(`https://example.com/${'a'.repeat(3000)}`)).toBeNull();
    expect(checkedUrl('https://example.com/producto?id=1')?.hostname).toBe('example.com');
  });

  it('refuses a name that resolves inside, after resolving it', async () => {
    const answer = await new Promise<{ error: NodeJS.ErrnoException | null; address: string }>(
      (resolve) =>
        publicLookup('localhost', {}, (error, address) =>
          resolve({ error, address: String(address) }),
        ),
    );
    expect(answer.error?.code).toBe('ENOTPUBLIC');
  });

  it('finds the first link of a message without the punctuation after it', () => {
    expect(firstLink('mirá https://tienda.com/remera-azul. ¿te gusta?')).toBe(
      'https://tienda.com/remera-azul',
    );
    expect(firstLink('(https://example.com/a)')).toBe('https://example.com/a');
    expect(firstLink('sin links')).toBeNull();
    expect(firstLink('http://localhost:3000/admin')).toBeNull();
    expect(firstLink(null)).toBeNull();
  });
});

describe('link preview: what a page says about itself', () => {
  it('prefers Open Graph and decodes the text', () => {
    const meta = readPageMeta(`<html><head>
      <title>Título viejo</title>
      <meta content="Remera &amp; short" property="og:title">
      <meta name="description" content='Algodón &#233;xtra suave'>
      <meta property="og:site_name" content="Tienda">
      <meta property="og:image" content="/fotos/remera.jpg">
    </head></html>`);
    expect(meta).toEqual({
      titulo: 'Remera & short',
      descripcion: 'Algodón éxtra suave',
      sitio: 'Tienda',
      imagen: '/fotos/remera.jpg',
    });
  });

  it('falls back to the title and cuts long text', () => {
    const meta = readPageMeta(`<title>${'x'.repeat(500)}</title>`);
    expect(meta.titulo?.length).toBe(200);
    expect(meta.descripcion).toBeNull();
  });
});

describe('link preview: visiting a page within the limits', () => {
  let server: http.Server;
  let port: number;
  const routes: Record<string, (res: http.ServerResponse) => void> = {};
  // The test site lives on this machine: this lookup plays the part of the public DNS.
  const toTestSite: LookupFunction = (_host, options, callback) => {
    if ((options as { all?: boolean }).all) {
      return (callback as unknown as (e: null, a: unknown[]) => void)(null, [
        { address: '127.0.0.1', family: 4 },
      ]);
    }
    return callback(null, '127.0.0.1', 4);
  };
  const photo = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const route = routes[req.url ?? ''];
      if (route) return route(res);
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it('refuses any port but 80 and 443 before visiting', async () => {
    routes['/ok'] = (res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end('<title>Hola</title>');
    };
    expect(await fetchLinkPreview(`http://tienda.test:${port}/ok`, () => true)).toBeNull();
  });

  describe('on the standard port', () => {
    // The address says port 80; the test site answers on its own port.
    const at = () => ({ lookup: toTestSite, port });

    it('reads the title, description and a real photo', async () => {
      routes['/remera'] = (res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(
          '<meta property="og:title" content="Remera azul"><meta property="og:image" content="/foto.jpg">',
        );
      };
      routes['/foto.jpg'] = (res) => {
        res.setHeader('Content-Type', 'image/jpeg');
        res.end(photo);
      };
      const preview = await fetchLinkPreview(
        'http://tienda.test/remera',
        (b) => b[0] === 0xff,
        at(),
      );
      expect(preview).toMatchObject({ titulo: 'Remera azul', sitio: 'tienda.test' });
      expect(preview?.imagen?.buffer.equals(photo)).toBe(true);
    });

    it('drops a "photo" whose bytes are not a photo', async () => {
      routes['/falsa'] = (res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end('<title>Falsa</title><meta property="og:image" content="/no-es-foto">');
      };
      routes['/no-es-foto'] = (res) => {
        res.setHeader('Content-Type', 'image/jpeg');
        res.end('<svg onload=alert(1)>');
      };
      const preview = await fetchLinkPreview('http://tienda.test/falsa', () => false, at());
      expect(preview?.titulo).toBe('Falsa');
      expect(preview?.imagen).toBeNull();
    });

    it('does not follow a redirect to the inside', async () => {
      routes['/salto'] = (res) => {
        res.statusCode = 302;
        res.setHeader('Location', 'http://127.0.0.1/health');
        res.end();
      };
      routes['/salto-nombre'] = (res) => {
        res.statusCode = 302;
        res.setHeader('Location', 'http://localhost/health');
        res.end();
      };
      expect(await fetchLinkPreview('http://tienda.test/salto', () => true, at())).toBeNull();
      expect(
        await fetchLinkPreview('http://tienda.test/salto-nombre', () => true, at()),
      ).toBeNull();
    });

    it('refuses what is not a page, compressed bodies and slow sites', async () => {
      routes['/json'] = (res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end('{"title":"x"}');
      };
      routes['/zip'] = (res) => {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Encoding', 'gzip');
        res.end('xx');
      };
      routes['/lento'] = () => undefined; // never answers
      expect(await fetchLinkPreview('http://tienda.test/json', () => true, at())).toBeNull();
      expect(await fetchLinkPreview('http://tienda.test/zip', () => true, at())).toBeNull();
      const started = Date.now();
      expect(await fetchLinkPreview('http://tienda.test/lento', () => true, at())).toBeNull();
      expect(Date.now() - started).toBeLessThan(6000);
    }, 10000);

    it('reads at most 1 MB of a huge page', async () => {
      let written = 0;
      routes['/enorme'] = (res) => {
        res.setHeader('Content-Type', 'text/html');
        res.write('<title>Enorme</title>');
        const chunk = 'x'.repeat(64 * 1024);
        const more = () => {
          while (written < 64 && res.write(chunk)) written++;
          if (written < 64) res.once('drain', more);
          else res.end();
        };
        res.on('close', () => undefined);
        more();
      };
      const preview = await fetchLinkPreview('http://tienda.test/enorme', () => true, at());
      expect(preview?.titulo).toBe('Enorme');
      expect(written).toBeLessThan(64); // it stopped reading: the rest was never sent
    });
  });
});
