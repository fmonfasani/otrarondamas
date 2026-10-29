/**
 * ProductSpecs - Specifications table for product details
 * Displays product attributes in a clean tabular format
 */

import React from 'react';
import { ProductoTienda } from '@wapsell/types';

export interface Specification {
  label: string;
  value: string | number | React.ReactNode;
  category?: string;
}

export interface ProductSpecsProps {
  product: ProductoTienda;
  additionalSpecs?: Specification[];
}

export const ProductSpecs = React.forwardRef<HTMLDivElement, ProductSpecsProps>(
  ({ product, additionalSpecs = [] }, ref) => {
    const baseSpecs: Specification[] = [
      {
        label: 'Código Interno',
        value: product.codigoInterno,
        category: 'Identificación',
      },
      {
        label: 'Unidad Base',
        value: product.unidadBase,
        category: 'Identificación',
      },
      {
        label: 'Familia',
        value: product.familiaId,
        category: 'Categorización',
      },
      {
        label: 'Subfamilia',
        value: product.subfamiliaId,
        category: 'Categorización',
      },
      {
        label: 'Stock Total',
        value: product.stockTotal,
        category: 'Disponibilidad',
      },
      {
        label: 'Disponible',
        value: product.disponible ? 'Sí' : 'No',
        category: 'Disponibilidad',
      },
      {
        label: 'Precio',
        value: `$${parseFloat(product.precio).toFixed(2)}`,
        category: 'Precio',
      },
    ];

    if (product.descuentoPorcentaje) {
      baseSpecs.push({
        label: 'Descuento',
        value: `${product.descuentoPorcentaje}%`,
        category: 'Precio',
      });
    }

    if (product.precioSinDescuento) {
      baseSpecs.push({
        label: 'Precio Original',
        value: `$${parseFloat(product.precioSinDescuento).toFixed(2)}`,
        category: 'Precio',
      });
    }

    const allSpecs = [...baseSpecs, ...additionalSpecs];
    const categories = Array.from(new Set(allSpecs.map((s) => s.category || 'General')));

    return (
      <div ref={ref} className="py-8">
        <h2 className="text-2xl font-bold mb-6">Características del Producto</h2>

        <div className="space-y-8">
          {categories.map((category) => {
            const categorySpecs = allSpecs.filter((s) => (s.category || 'General') === category);

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {category}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {categorySpecs.map((spec, idx) => (
                        <tr
                          key={`${category}-${idx}`}
                          className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-700 w-1/3">
                            {spec.label}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {typeof spec.value === 'string' || typeof spec.value === 'number'
                              ? spec.value
                              : spec.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Información de Envío</h3>
          <p className="text-sm text-blue-800">
            El envío se realiza dentro de 2-3 días hábiles. Consulta nuestra política de devoluciones
            en la sección de ayuda.
          </p>
        </div>
      </div>
    );
  }
);

ProductSpecs.displayName = 'ProductSpecs';
