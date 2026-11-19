import { productAuditEntry } from './product-audit';

describe('productAuditEntry (OR-B4-041, OR-B4-046)', () => {
  const before = {
    id: 'p1',
    nombre: 'Café',
    precioMinorista: 100,
    activo: true,
    publicado: false,
    destacado: false,
    descripcion: null,
  };

  it('records publishing in the store', () => {
    expect(productAuditEntry(before, { ...before, publicado: true })).toEqual({
      accion: 'PRODUCTO_PUBLICADO',
      entidad: 'Producto',
      entidadId: 'p1',
      antes: { nombre: 'Café', publicado: false },
      despues: { nombre: 'Café', publicado: true },
    });
  });

  it('records taking a product out of the store, with its featured mark', () => {
    const published = { ...before, publicado: true, destacado: true };
    const entry = productAuditEntry(published, {
      ...published,
      publicado: false,
      destacado: false,
    });
    expect(entry?.accion).toBe('PRODUCTO_DESPUBLICADO');
    expect(entry?.despues).toEqual({ nombre: 'Café', publicado: false, destacado: false });
  });

  it('a deactivation wins over the store change it brings along', () => {
    const published = { ...before, publicado: true };
    const entry = productAuditEntry(published, { ...published, activo: false, publicado: false });
    expect(entry?.accion).toBe('PRODUCTO_DESACTIVADO');
  });

  it('a new description or featured mark is an edit', () => {
    expect(productAuditEntry(before, { ...before, descripcion: 'Molido' })?.accion).toBe(
      'PRODUCTO_EDITADO',
    );
    const published = { ...before, publicado: true };
    expect(productAuditEntry(published, { ...published, destacado: true })?.accion).toBe(
      'PRODUCTO_EDITADO',
    );
  });

  it('nothing changed, nothing recorded', () => {
    expect(productAuditEntry(before, { ...before })).toBeNull();
  });
});
