import { describe, expect, it } from 'vitest';
import { navItems } from '../app/components/panel/AppShell';

const labels = (role?: string) => navItems('es', role).map((item) => item.label);

describe('panel menu by role (mirrors the API role matrix)', () => {
  it('shows the Owner every section', () => {
    expect(labels('OWNER')).toEqual([
      'Inicio', 'Mensajes', 'Pedidos', 'Ventas', 'Clientes', 'Caja', 'Catálogo', 'Inventario', 'Compras', 'Equipo', 'Cobros',
    ]);
  });

  it('hides from the Admin only the payment account', () => {
    expect(labels('ADMIN')).not.toContain('Cobros');
    expect(labels('ADMIN')).toContain('Equipo');
  });

  it('shows the Vendedor selling sections, not purchases, team or payments', () => {
    expect(labels('VENDEDOR')).toEqual(['Inicio', 'Mensajes', 'Pedidos', 'Ventas', 'Clientes', 'Caja', 'Catálogo', 'Inventario']);
    expect(labels('ASISTENTE_LOCAL')).toEqual(labels('VENDEDOR'));
  });

  it('shows the Gestor de stock stock sections, not selling, customers or cash', () => {
    expect(labels('GESTOR_DE_STOCK')).toEqual(['Inicio', 'Mensajes', 'Pedidos', 'Catálogo', 'Inventario', 'Compras']);
  });

  it('keeps every section when the role is unknown to the caller', () => {
    expect(labels()).toHaveLength(11);
  });
});
