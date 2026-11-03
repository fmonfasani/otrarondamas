import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrdersList } from '../app/components/orders/OrdersList';

describe('OrdersList', () => {
  it('renders order identifiers, customers, totals and statuses', () => {
    const html = renderToStaticMarkup(React.createElement(OrdersList, {
      orders: [{
        id: 'ORD-42',
        customer: 'Ana Pérez',
        total: 12500,
        status: 'processing',
        createdAt: '2026-11-02T12:00:00.000Z',
      }],
    }));
    expect(html).toContain('ORD-42');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('$12500');
    expect(html).toContain('processing');
  });

  it('renders an empty table body when no orders exist', () => {
    const html = renderToStaticMarkup(React.createElement(OrdersList, { orders: [] }));
    expect(html).toContain('<tbody></tbody>');
    expect(html).not.toContain('ORD-');
  });
});
