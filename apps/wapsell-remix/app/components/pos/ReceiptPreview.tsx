import React from 'react';
import { Receipt } from '@otrarondamas/shared-types';

interface ReceiptPreviewProps {
  receipt: Receipt;
  onPrint?: () => void;
  onEmail?: () => void;
  onDownloadPDF?: () => void;
  showActions?: boolean;
}

export function ReceiptPreview({
  receipt,
  onPrint,
  onEmail,
  onDownloadPDF,
  showActions = true,
}: ReceiptPreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Receipt Display */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-lg max-w-2xl mx-auto font-mono text-sm">
        {/* Header */}
        <div className="text-center pb-6 border-b-2 border-gray-300">
          <h2 className="text-2xl font-bold mb-2">{receipt.businessName}</h2>
          {receipt.businessAddress && (
            <p className="text-gray-600 text-xs">{receipt.businessAddress}</p>
          )}
          {receipt.businessTaxId && (
            <p className="text-gray-600 text-xs">CUIT: {receipt.businessTaxId}</p>
          )}
        </div>

        {/* Receipt Info */}
        <div className="my-6 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-600">Comprobante</div>
            <div className="font-bold">{receipt.receiptNumber}</div>
          </div>
          <div>
            <div className="text-gray-600">Fecha</div>
            <div className="font-bold">
              {receipt.issuedAt.toLocaleDateString('es-AR')}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Hora</div>
            <div className="font-bold">
              {receipt.issuedAt.toLocaleTimeString('es-AR')}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Vendedor</div>
            <div className="font-bold">{receipt.userName}</div>
          </div>
        </div>

        {/* Customer Info */}
        {receipt.customerName && (
          <div className="my-6 pb-6 border-b-2 border-gray-300 text-xs">
            <div className="mb-2">
              <span className="text-gray-600">Cliente: </span>
              <span className="font-bold">{receipt.customerName}</span>
            </div>
            {receipt.customerPhone && (
              <div className="mb-1">
                <span className="text-gray-600">Teléfono: </span>
                <span>{receipt.customerPhone}</span>
              </div>
            )}
            {receipt.customerEmail && (
              <div>
                <span className="text-gray-600">Email: </span>
                <span>{receipt.customerEmail}</span>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        <div className="my-6">
          <div className="border-t-2 border-b-2 border-gray-300 py-2 mb-4">
            <div className="grid grid-cols-12 gap-2 font-bold text-xs mb-2">
              <div className="col-span-6">Artículo</div>
              <div className="col-span-2 text-right">Cant</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
          </div>

          {receipt.items.map((item, idx) => (
            <div key={idx} className="mb-2 text-xs">
              <div className="grid grid-cols-12 gap-2 mb-1">
                <div className="col-span-6 font-semibold">{item.productName}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                <div className="col-span-2 text-right font-semibold">
                  {formatCurrency(item.lineTotal)}
                </div>
              </div>
              {item.lineDiscount && (
                <div className="text-right text-red-600 text-xs">
                  Descuento: -{formatCurrency(item.lineDiscount)}
                </div>
              )}
            </div>
          ))}

          <div className="border-t-2 border-gray-300 mt-4 pt-4 text-xs">
            {receipt.subtotal !== receipt.total && (
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
            )}

            {receipt.discount && receipt.discount > 0 && (
              <div className="flex justify-between mb-2 text-red-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(receipt.discount)}</span>
              </div>
            )}

            {receipt.tax && receipt.tax > 0 && (
              <div className="flex justify-between mb-2">
                <span>IVA:</span>
                <span>{formatCurrency(receipt.tax)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-base border-t-2 border-gray-300 pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(receipt.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t-2 border-gray-300 pt-4 text-xs">
          <div className="flex justify-between mb-2">
            <span>Medio de pago:</span>
            <span className="font-bold">
              {receipt.paymentMethod === 'CASH'
                ? 'Efectivo'
                : receipt.paymentMethod === 'CARD'
                  ? 'Tarjeta'
                  : receipt.paymentMethod === 'MIXED'
                    ? 'Mixto'
                    : 'QR'}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Monto pagado:</span>
            <span>{formatCurrency(receipt.paymentAmount)}</span>
          </div>
          {receipt.change && receipt.change > 0 && (
            <div className="flex justify-between font-bold text-green-600">
              <span>Vuelto:</span>
              <span>{formatCurrency(receipt.change)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t-2 border-gray-300 font-bold">
          Gracias por su compra
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 justify-center flex-wrap">
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              Imprimir
            </button>
          )}
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
            >
              Descargar PDF
            </button>
          )}
          {onEmail && receipt.customerEmail && (
            <button
              onClick={onEmail}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
            >
              Enviar por email
            </button>
          )}
        </div>
      )}
    </div>
  );
}
