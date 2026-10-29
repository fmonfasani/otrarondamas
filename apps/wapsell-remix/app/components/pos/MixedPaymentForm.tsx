import React, { useState, useEffect } from 'react';

interface MixedPaymentFormProps {
  totalAmount: number;
  onSubmit: (data: {
    cashAmount: number;
    cardAmount: number;
    amountReceived?: number;
    cardData?: {
      cardNumber: string;
      cardholderName: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
      installments: number;
    };
  }) => void;
  disabled?: boolean;
}

export function MixedPaymentForm({
  totalAmount,
  onSubmit,
  disabled = false,
}: MixedPaymentFormProps) {
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [showCardFields, setShowCardFields] = useState(false);
  const [change, setChange] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    installments: '1',
  });

  // Calculate remaining amount and change
  useEffect(() => {
    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const total = cash + card;

    if (total > 0) {
      const remaining = totalAmount - total;
      if (remaining > 0) {
        setErrors((prev) => ({
          ...prev,
          amount: `Falta $${remaining.toFixed(2)}`,
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.amount;
          return newErrors;
        });
      }
    }

    if (cash > 0) {
      const received = parseFloat(amountReceived) || 0;
      if (received < cash) {
        setErrors((prev) => ({
          ...prev,
          amountReceived: `Falta $${(cash - received).toFixed(2)}`,
        }));
        setChange(0);
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.amountReceived;
          return newErrors;
        });
        setChange(received - cash);
      }
    }
  }, [cashAmount, cardAmount, amountReceived, totalAmount]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 19);
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    return formatted;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setCardData((prev) => ({ ...prev, cardholderName: cleaned.toUpperCase() }));
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardData((prev) => ({ ...prev, cvv: cleaned }));
  };

  const handleSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCardData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const newErrors: Record<string, string> = {};

    if (cash < 0 || card < 0) {
      newErrors.amount = 'Los montos no pueden ser negativos';
    }

    if (cash + card < totalAmount) {
      newErrors.amount = 'El total no cubre el monto a pagar';
    }

    if (cash > 0) {
      const received = parseFloat(amountReceived) || 0;
      if (received < cash) {
        newErrors.amountReceived = 'El monto recibido es menor al monto en efectivo';
      }
    }

    // Validate card fields if card amount > 0
    if (card > 0) {
      const cardNumber = cardData.cardNumber.replace(/\s/g, '');
      if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        newErrors.cardNumber = 'Número de tarjeta inválido';
      }
      if (!cardData.cardholderName) {
        newErrors.cardholderName = 'Nombre del titular requerido';
      }
      if (!cardData.expiryMonth || !cardData.expiryYear) {
        newErrors.expiryDate = 'Fecha de vencimiento requerida';
      }
      if (!cardData.cvv || cardData.cvv.length < 3) {
        newErrors.cvv = 'CVV inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    const received = parseFloat(amountReceived) || 0;

    const submitData: any = {
      cashAmount: cash,
      cardAmount: card,
    };

    if (cash > 0) {
      submitData.amountReceived = received;
    }

    if (card > 0) {
      submitData.cardData = {
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        expiryMonth: parseInt(cardData.expiryMonth),
        expiryYear: parseInt(cardData.expiryYear),
        cvv: cardData.cvv,
        installments: parseInt(cardData.installments),
      };
    }

    onSubmit(submitData);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);

  const remaining = totalAmount - (parseFloat(cashAmount) || 0) - (parseFloat(cardAmount) || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Total Display */}
      <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
        <div className="text-sm text-gray-600">Total a pagar</div>
        <div className="text-3xl font-bold text-purple-600">
          ${totalAmount.toFixed(2)}
        </div>
        {remaining > 0 && (
          <div className="mt-2 text-sm text-purple-700">
            Falta: ${remaining.toFixed(2)}
          </div>
        )}
      </div>

      {/* Cash Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pago en efectivo
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-xl font-bold text-gray-700">$</span>
          <input
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={disabled}
            className="w-full pl-10 pr-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Cash Received */}
      {parseFloat(cashAmount) > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Efectivo recibido
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-xl font-bold text-gray-700">$</span>
            <input
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={disabled}
              className="w-full pl-10 pr-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 disabled:opacity-50"
            />
          </div>
          {change > 0 && !errors.amountReceived && (
            <div className="mt-2 text-sm text-green-600 font-semibold">
              Vuelto: ${change.toFixed(2)}
            </div>
          )}
          {errors.amountReceived && (
            <p className="mt-2 text-sm text-red-600">{errors.amountReceived}</p>
          )}
        </div>
      )}

      {/* Card Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pago con tarjeta
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-xl font-bold text-gray-700">$</span>
          <input
            type="number"
            value={cardAmount}
            onChange={(e) => {
              setCardAmount(e.target.value);
              setShowCardFields(parseFloat(e.target.value) > 0);
            }}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={disabled}
            className="w-full pl-10 pr-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Card Fields (shown if card amount > 0) */}
      {showCardFields && parseFloat(cardAmount) > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-4 border-2 border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de tarjeta
            </label>
            <input
              type="text"
              value={cardData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              disabled={disabled}
              className={`w-full px-4 py-3 border-2 rounded-lg font-mono focus:outline-none ${
                errors.cardNumber
                  ? 'border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.cardNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del titular
            </label>
            <input
              type="text"
              value={cardData.cardholderName}
              onChange={handleCardholderNameChange}
              placeholder="JUAN PEREZ"
              disabled={disabled}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errors.cardholderName
                  ? 'border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.cardholderName && (
              <p className="mt-1 text-sm text-red-600">{errors.cardholderName}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select
              name="expiryMonth"
              value={cardData.expiryMonth}
              onChange={handleSelectChange}
              disabled={disabled}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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

            <select
              name="expiryYear"
              value={cardData.expiryYear}
              onChange={handleSelectChange}
              disabled={disabled}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">YYYY</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="cvv"
              value={cardData.cvv}
              onChange={handleCVVChange}
              placeholder="CVV"
              disabled={disabled}
              maxLength={4}
              className={`px-3 py-2 border-2 rounded-lg font-mono focus:outline-none ${
                errors.cvv ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errors.amount && (
        <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
          <p className="text-sm text-red-600">{errors.amount}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          disabled ||
          !cashAmount ||
          !cardAmount ||
          (parseFloat(cashAmount) > 0 && !amountReceived) ||
          !!errors.amount
        }
        className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Procesar pago ${totalAmount.toFixed(2)}
      </button>
    </form>
  );
}
