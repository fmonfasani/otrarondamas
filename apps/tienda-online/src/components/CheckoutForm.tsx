import { useState, type ReactNode } from 'react';
import type { ItemCarrito } from '../features/carrito/useCarrito';

export interface CheckoutFormData {
  nombre: string;
  email: string;
  telefono: string;
}

export interface CheckoutFormProps {
  items: ItemCarrito[];
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  isLoading?: boolean;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

/**
 * CheckoutForm: Multi-step form with P5 Input components
 *
 * Features:
 * - Step-by-step validation
 * - Contact information form (nombre, email, telefono)
 * - Responsive input fields with labels
 * - Error handling and display
 * - Loading state management
 * - TypeScript strict types
 */
export function CheckoutForm({
  items,
  onSubmit,
  isLoading = false,
  onError,
  onSuccess,
}: CheckoutFormProps): ReactNode {
  const [formData, setFormData] = useState<CheckoutFormData>({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutFormData, boolean>>>({});

  const validateField = (field: keyof CheckoutFormData, value: string): string | null => {
    switch (field) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 3) return 'Ingresa un nombre válido';
        return null;
      case 'email':
        if (!value.trim()) return 'El email es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
        return null;
      case 'telefono':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) return 'Teléfono inválido';
        return null;
      default:
        return null;
    }
  };

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Partial<CheckoutFormData> = {};
    let isValid = true;

    for (const field of ['nombre', 'email', 'telefono'] as const) {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    if (!isValid) return;

    try {
      await onSubmit(formData);
      onSuccess?.('Pedido confirmado exitosamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al confirmar pedido';
      onError?.(message);
      setErrors({ nombre: message });
    }
  };

  const total = items.reduce((acc, item) => acc + Number(item.producto.precio) * item.cantidad, 0);

  return (
    <form onSubmit={handleSubmit} data-testid="checkout-form">
      {/* Section: Contact Information */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          Tus datos
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Name Input */}
          <div>
            <label
              htmlFor="nombre"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Nombre y apellido *
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Nombre completo"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              onBlur={() => handleBlur('nombre')}
              disabled={isLoading}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${errors.nombre && touched.nombre ? 'var(--state-danger)' : 'var(--border-default)'}`,
                background: '#fff',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              data-testid="input-nombre"
            />
            {errors.nombre && touched.nombre && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--state-danger)',
                  margin: '4px 0 0 0',
                }}
                role="alert"
              >
                {errors.nombre}
              </p>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Email *
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={isLoading}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${errors.email && touched.email ? 'var(--state-danger)' : 'var(--border-default)'}`,
                background: '#fff',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              data-testid="input-email"
            />
            {errors.email && touched.email && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--state-danger)',
                  margin: '4px 0 0 0',
                }}
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Input */}
          <div>
            <label
              htmlFor="telefono"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Teléfono / WhatsApp (opcional)
            </label>
            <input
              id="telefono"
              type="tel"
              placeholder="+54 (123) 456-7890"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              onBlur={() => handleBlur('telefono')}
              disabled={isLoading}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${errors.telefono && touched.telefono ? 'var(--state-danger)' : 'var(--border-default)'}`,
                background: '#fff',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              data-testid="input-telefono"
            />
            {errors.telefono && touched.telefono && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--state-danger)',
                  margin: '4px 0 0 0',
                }}
                role="alert"
              >
                {errors.telefono}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Order Summary */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          Resumen del pedido
        </h3>

        <div
          style={{
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {items.map((item) => (
            <div
              key={item.producto.productoId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {item.producto.nombre} ×{item.cantidad}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                ${(Number(item.producto.precio) * item.cantidad).toFixed(2)}
              </span>
            </div>
          ))}

          <div
            style={{
              height: 1,
              background: 'var(--border-default)',
              margin: '4px 0',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
              Total
            </span>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontSize: 16,
              }}
            >
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          height: 44,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--brand-yellow)',
          color: 'var(--brand-black)',
          fontSize: 14,
          fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s ease-out',
        }}
        data-testid="submit-button"
      >
        {isLoading ? 'Confirmando…' : `Confirmar pedido — $${total.toFixed(2)}`}
      </button>
    </form>
  );
}
