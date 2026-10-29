/**
 * Example POS Checkout Route
 *
 * This file demonstrates how to use the payment system components
 * in a complete checkout flow. Replace with actual implementation
 * when integrating with your sales/cart system.
 *
 * NOTE: This is an EXAMPLE file showing integration patterns.
 * Create your actual route file based on this template.
 */

import { useState } from 'react';
import { PaymentForm, ReceiptPreview } from '~/components/pos';
import { processPayment, generateIdempotencyKey } from '~/actions/payment.server';
import type { Receipt, PaymentResponse } from '@otrarondamas/shared-types';

interface CheckoutPageProps {
  saleId: string;
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export default function CheckoutPage({
  saleId,
  totalAmount,
  items,
  customerName,
  customerEmail,
  customerPhone,
}: CheckoutPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string>('');

  /**
   * Handle payment completion
   * Called when user submits payment form with validated data
   */
  const handlePaymentComplete = async (payment: any) => {
    setIsLoading(true);
    setError('');

    try {
      // Generate idempotency key for duplicate prevention
      const idempotencyKey = generateIdempotencyKey();

      // Process payment via server action
      const response: PaymentResponse = await processPayment(
        saleId,
        payment,
        totalAmount,
        idempotencyKey
      );

      if (response.success && response.receipt) {
        // Populate receipt with full details
        const fullReceipt: Receipt = {
          ...response.receipt,
          items: items.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
          customerName,
          customerEmail,
          customerPhone,
          userName: 'Current User', // Replace with authenticated user
          businessName: 'Otra Ronda Más',
          businessAddress: 'Dirección del negocio',
          businessTaxId: '20-12345678-9',
        };

        setReceipt(fullReceipt);

        // Auto-print receipt (optional)
        // handlePrintReceipt();

        // Send email receipt if email exists (optional)
        // if (customerEmail) {
        //   await sendReceiptEmail(fullReceipt, customerEmail);
        // }
      } else {
        setError(response.error || 'Error processing payment');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Payment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Print receipt
   */
  const handlePrintReceipt = () => {
    if (receipt) {
      window.print();
    }
  };

  /**
   * Download receipt as PDF
   * Note: Requires html2pdf.js - add to package.json if needed
   * npm install html2pdf.js
   */
  const handleDownloadPDF = async () => {
    if (receipt) {
      // Uncomment and use html2pdf.js
      // import html2pdf from 'html2pdf.js';
      // const element = document.getElementById('receipt-content');
      // const opt = {
      //   margin: 10,
      //   filename: `receipt-${receipt.receiptNumber}.pdf`,
      //   image: { type: 'jpeg', quality: 0.98 },
      //   html2canvas: { scale: 2 },
      //   jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      // };
      // html2pdf().set(opt).from(element).save();

      alert('PDF download feature requires html2pdf.js library');
    }
  };

  /**
   * Send receipt via email
   * Note: Implement your email service endpoint
   */
  const handleSendEmail = async () => {
    if (receipt && customerEmail) {
      try {
        const response = await fetch('/api/email/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customerEmail,
            subject: `Recibo ${receipt.receiptNumber}`,
            receipt: receipt,
          }),
        });

        if (response.ok) {
          alert(`Recibo enviado a ${customerEmail}`);
        } else {
          alert('Error al enviar el recibo');
        }
      } catch (err) {
        alert('Error sending email: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    }
  };

  // Show receipt after successful payment
  if (receipt) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Receipt Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Pago Confirmado</h1>
            <p className="text-gray-600">
              Comprobante: <span className="font-semibold">{receipt.receiptNumber}</span>
            </p>
          </div>

          {/* Receipt Preview */}
          <ReceiptPreview
            receipt={receipt}
            onPrint={handlePrintReceipt}
            onDownloadPDF={handleDownloadPDF}
            onEmail={customerEmail ? handleSendEmail : undefined}
            showActions={true}
          />

          {/* Next Steps */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/pos/new-sale'}
              className="py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nueva venta
            </button>

            <button
              onClick={handlePrintReceipt}
              className="py-3 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Imprimir nuevamente
            </button>

            {customerEmail && (
              <button
                onClick={handleSendEmail}
                className="py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Enviar por email
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show payment form
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pagar venta</h1>
          <p className="text-gray-600">ID de venta: {saleId}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen de la compra</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Producto</th>
                  <th className="text-right py-2 px-2">Cantidad</th>
                  <th className="text-right py-2 px-2">Precio</th>
                  <th className="text-right py-2 px-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 px-2">{item.name}</td>
                    <td className="text-right py-3 px-2">{item.quantity}</td>
                    <td className="text-right py-3 px-2">${item.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-3 px-2 font-semibold">
                      ${item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t-2 border-gray-300 pt-4">
            <div className="flex justify-end mb-2">
              <span className="text-gray-700">Subtotal:</span>
              <span className="ml-8 text-gray-700 font-semibold">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-end text-xl">
              <span className="text-gray-800 font-bold">Total:</span>
              <span className="ml-8 text-blue-600 font-bold">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          {(customerName || customerEmail || customerPhone) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Datos del cliente</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {customerName && <p>Nombre: {customerName}</p>}
                {customerEmail && <p>Email: {customerEmail}</p>}
                {customerPhone && <p>Teléfono: {customerPhone}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          <PaymentForm
            totalAmount={totalAmount}
            onPaymentComplete={handlePaymentComplete}
            isLoading={isLoading}
          />
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-200 rounded text-xs text-gray-700">
            <p className="font-mono">
              Sale ID: {saleId}
              <br />
              Total: ${totalAmount.toFixed(2)}
              <br />
              Items: {items.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Usage Notes:
 *
 * 1. Install dependencies (if not already present):
 *    npm install html2pdf.js
 *
 * 2. Replace this example route with actual implementation:
 *    - Get saleId from route params or state
 *    - Get totalAmount from cart/sale data
 *    - Get items from cart/sale items
 *    - Get customer data from authenticated user or form
 *
 * 3. Implement API endpoints:
 *    - POST /api/ventas/:id/pagos - Payment processing
 *    - POST /api/email/send-receipt - Email sending
 *
 * 4. Set environment variables:
 *    API_URL, API_TOKEN, BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_TAX_ID
 *
 * 5. Connect to your backend:
 *    - Update processPayment to use actual API
 *    - Implement receipt email service
 *    - Add thermal printer integration
 *
 * 6. Customize:
 *    - Business name and info
 *    - Receipt logo/branding
 *    - Payment methods (remove QR if not using Mercado Pago)
 *    - Email template
 */
