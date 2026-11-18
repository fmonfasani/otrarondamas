import { describe, expect, it } from 'vitest';
import { loader as oldSection } from '../app/routes/$lang.dashboard.$';
import { loader as oldHome } from '../app/routes/$lang.dashboard._index';

type Loader = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => Response;

describe('old /:lang/dashboard links (ADR-IDN-010)', () => {
  it('send the panel home to /panel, keeping the query', () => {
    const response = (oldHome as unknown as Loader)({
      request: new Request('http://app.test/es/dashboard?bienvenida=1'),
      params: { lang: 'es' },
      context: {},
    });
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/panel?bienvenida=1');
  });

  it('send every section to the same section under /panel', () => {
    const response = (oldSection as unknown as Loader)({
      request: new Request('http://app.test/es/dashboard/pedidos/abc?estado=RECIBIDO'),
      params: { lang: 'es', '*': 'pedidos/abc' },
      context: {},
    });
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/panel/pedidos/abc?estado=RECIBIDO');
  });
});
