import React, { useState } from 'react';

interface CardPaymentFormProps {
  totalAmount: number;
  onSubmit: (cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    installments: number;
  }) => void;
  disabled?: boolean;
}

export function CardPaymentForm({
  totalAmount,
  onSubmit,
  disabled = false,
}: CardPaymentFormProps) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    installments: '1',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 19);
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    return formatted;
  };

  const maskCardNumber = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length <= 4) return cleaned;
    const last4 = cleaned.slice(-4);
    return '**** **** **** ' + last4;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'cardNumber') {
      const formatted = formatCardNumber(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else if (name === 'cvv') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else if (name === 'cardholderName') {
      const cleaned = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleaned.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const cardNumber = formData.cardNumber.replace(/\s/g, '');

    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.cardNumber = 'Número de tarjeta inválido (13-19 dígitos)';
    }

    if (!formData.cardholderName || formData.cardholderName.length < 2) {
      newErrors.cardholderName = 'Nombre del titular requerido';
    }

    if (!formData.expiryMonth || parseInt(formData.expiryMonth) < 1 || parseInt(formData.expiryMonth) > 12) {
      newErrors.expiryMonth = 'Mes inválido';
    }

    if (!formData.expiryYear || parseInt(formData.expiryYear) < 2024 || parseInt(formData.expiryYear) > 2099) {
      newErrors.expiryYear = 'Año inválido';
    }

    // Check if card is expired
    const now = new Date();
    const expiry = new Date(parseInt(formData.expiryYear), parseInt(formData.expiryMonth) - 1);
    if (expiry <= now) {
      newErrors.expiryMonth = 'Tarjeta vencida';
    }

    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'CVV inválido (3-4 dígitos)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      cardNumber: formData.cardNumber.replace(/\s/g, ''),
      cardholderName: formData.cardholderName,
      expiryMonth: parseInt(formData.expiryMonth),
      expiryYear: parseInt(formData.expiryYear),
      cvv: formData.cvv,
      installments: parseInt(formData.installments),
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Total Display */}
      <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
        <div className="text-sm text-gray-600">Total a pagar</div>
        <div className="text-3xl font-bold text-blue-600">
          ${totalAmount.toFixed(2)}
        </div>
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número de tarjeta
        </label>
        <input
          type="text"
          name="cardNumber"
          value={formData.cardNumber}
          onChange={handleChange}
          placeholder="1234 5678 9012 3456"
          disabled={disabled}
          className={`w-full px-4 py-3 border-2 rounded-lg font-mono text-lg focus:outline-none transition-colors disabled:opacity-50 ${
            errors.cardNumber
              ? 'border-red-500 focus:border-red-600'
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.cardNumber && (
          <p className="mt-2 text-sm text-red-600">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del titular
        </label>
        <input
          type="text"
          name="cardholderName"
          value={formData.cardholderName}
          onChange={handleChange}
          placeholder="JUAN PEREZ"
          disabled={disabled}
          className={`w-full px-4 py-3 border-2 rounded-lg text-lg focus:outline-none transition-colors disabled:opacity-50 ${
            errors.cardholderName
              ? 'border-red-500 focus:border-red-600'
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        {errors.cardholderName && (
          <p className="mt-2 text-sm text-red-600">{errors.cardholderName}</p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-3 gap-4">
        {/* Expiry Month */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mes
          </label>
          <select
            name="expiryMonth"
            value={formData.expiryMonth}
            onChange={handleChange}
            disabled={disabled}
            className={`w-full px-3 py-3 border-2 rounded-lg focus:outline-none transition-colors disabled:opacity-50 ${
              errors.expiryMonth
                ? 'border-red-500 focus:border-red-600'
                : 'border-gray-300 focus:border-blue-500'
            }`}
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              return (
                <option key={month} value={month}>
                  {String(month).padStart(2, '0')}
                </option>
              );
            })}
          </select>
        </div>

        {/* Expiry Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Año
          </label>
          <select
            name="expiryYear"
            value={formData.expiryYear}
            onChange={handleChange}
            disabled={disabled}
            className={`w-full px-3 py-3 border-2 rounded-lg focus:outline-none transition-colors disabled:opacity-50 ${
              errors.expiryYear
                ? 'border-red-500 focus:border-red-600'
                : 'border-gray-300 focus:border-blue-500'
            }`}
          >
            <option value="">YYYY</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* CVV */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CVV
          </label>
          <input
            type="text"
            name="cvv"
            value={formData.cvv}
            onChange={handleChange}
            placeholder="123"
            disabled={disabled}
            maxLength={4}
            className={`w-full px-3 py-3 border-2 rounded-lg font-mono text-lg focus:outline-none transition-colors disabled:opacity-50 ${
              errors.cvv
                ? 'border-red-500 focus:border-red-600'
                : 'border-gray-300 focus:border-blue-500'
            }`}
          />
        </div>
      </div>

      {/* Installments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cuotas
        </label>
        <select
          name="installments"
          value={formData.installments}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((installment) => (
            <option key={installment} value={installment}>
              {installment} {installment === 1 ? 'cuota' : 'cuotas'}
            </option>
          ))}
        </select>
      </div>

      {/* Security Warning */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Por seguridad, el CVV no será almacenado. Los datos de la tarjeta se procesan de
          forma segura.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={disabled || !formData.cardNumber || !formData.cardholderName}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Procesar pago ${totalAmount.toFixed(2)}
      </button>
    </form>
  );
}
