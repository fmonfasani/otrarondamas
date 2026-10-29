import { Receipt, ReceiptItem } from '@otrarondamas/shared-types';

/**
 * Receipt generator utility
 * Creates printable HTML and text representations of receipts
 */

export interface ReceiptGeneratorOptions {
  businessName: string;
  businessAddress?: string;
  businessTaxId?: string;
  receiptNumber: string;
  locale?: 'es' | 'en';
}

const translations = {
  es: {
    receipt: 'RECIBO',
    receiptNumber: 'Comprobante',
    date: 'Fecha',
    time: 'Hora',
    seller: 'Vendedor',
    customer: 'Cliente',
    phone: 'Teléfono',
    email: 'Email',
    items: 'Artículos',
    quantity: 'Cantidad',
    unitPrice: 'Precio Unitario',
    discount: 'Descuento',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'IVA',
    paymentMethod: 'Medio de Pago',
    amountPaid: 'Monto Pagado',
    change: 'Vuelto',
    cash: 'Efectivo',
    card: 'Tarjeta',
    mixed: 'Mixto',
    qr: 'QR',
    thanks: 'Gracias por su compra',
    line: '─────────────────────────────',
  },
  en: {
    receipt: 'RECEIPT',
    receiptNumber: 'Receipt',
    date: 'Date',
    time: 'Time',
    seller: 'Seller',
    customer: 'Customer',
    phone: 'Phone',
    email: 'Email',
    items: 'Items',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    total: 'Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    paymentMethod: 'Payment Method',
    amountPaid: 'Amount Paid',
    change: 'Change',
    cash: 'Cash',
    card: 'Card',
    mixed: 'Mixed',
    qr: 'QR',
    thanks: 'Thank you for your purchase',
    line: '─────────────────────────────',
  },
};

function getTranslation(locale: 'es' | 'en' = 'es') {
  return translations[locale];
}

function formatCurrency(amount: number, locale: string = 'es-AR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date, locale: 'es' | 'en' = 'es'): string {
  return date.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getPaymentMethodLabel(
  method: string,
  locale: 'es' | 'en' = 'es'
): string {
  const t = getTranslation(locale);
  const methodMap: Record<string, string> = {
    CASH: t.cash,
    CARD: t.card,
    MIXED: t.mixed,
    QR: t.qr,
  };
  return methodMap[method] || method;
}

/**
 * Generate plain text receipt for thermal printer
 */
export function generateTextReceipt(
  receipt: Receipt,
  options: ReceiptGeneratorOptions
): string {
  const locale = options.locale || 'es';
  const t = getTranslation(locale);

  const lines: string[] = [];
  const width = 40;

  // Header
  lines.push('');
  lines.push(options.businessName.padStart(width / 2 + options.businessName.length / 2, ' '));

  if (options.businessAddress) {
    lines.push(options.businessAddress.substring(0, width));
  }

  if (options.businessTaxId) {
    lines.push(`CUIT: ${options.businessTaxId}`);
  }

  lines.push('');
  lines.push(t.line);
  lines.push(`${t.receipt}: ${options.receiptNumber}`);
  lines.push(`${t.date}: ${formatDate(receipt.issuedAt, locale)}`);
  lines.push(`${t.time}: ${formatTime(receipt.issuedAt)}`);
  lines.push('');

  // Customer info
  if (receipt.customerName) {
    lines.push(`${t.customer}: ${receipt.customerName}`);
  }
  if (receipt.customerPhone) {
    lines.push(`${t.phone}: ${receipt.customerPhone}`);
  }
  if (receipt.customerEmail) {
    lines.push(`${t.email}: ${receipt.customerEmail}`);
  }

  lines.push(`${t.seller}: ${receipt.userName}`);
  lines.push('');

  // Items
  lines.push(t.line);
  lines.push(`${t.items}:`);
  lines.push('');

  receipt.items.forEach((item) => {
    const qty = `${item.quantity}x`;
    const price = formatCurrency(item.unitPrice);
    const lineTotal = formatCurrency(item.lineTotal);

    lines.push(`${item.productName.substring(0, width - 12)}`);
    lines.push(
      `  ${qty.padEnd(6)} ${price.padStart(12)} ${lineTotal.padStart(width - 24)}`
    );

    if (item.lineDiscount) {
      lines.push(`  ${t.discount}: -${formatCurrency(item.lineDiscount)}`);
    }
  });

  lines.push('');
  lines.push(t.line);

  // Totals
  if (receipt.subtotal !== receipt.total) {
    lines.push(
      `${t.subtotal}:`.padEnd(width - 15) + formatCurrency(receipt.subtotal).padStart(15)
    );
  }

  if (receipt.discount && receipt.discount > 0) {
    lines.push(
      `${t.discount}:`.padEnd(width - 15) + `-${formatCurrency(receipt.discount)}`.padStart(14)
    );
  }

  if (receipt.tax && receipt.tax > 0) {
    lines.push(`${t.tax}:`.padEnd(width - 15) + formatCurrency(receipt.tax).padStart(15));
  }

  lines.push(t.line);
  lines.push(
    `${t.total}:`.padEnd(width - 15) + formatCurrency(receipt.total).padStart(15)
  );
  lines.push('');

  // Payment
  lines.push(`${t.paymentMethod}: ${getPaymentMethodLabel(receipt.paymentMethod, locale)}`);
  lines.push(
    `${t.amountPaid}:`.padEnd(width - 15) + formatCurrency(receipt.paymentAmount).padStart(15)
  );

  if (receipt.change && receipt.change > 0) {
    lines.push(`${t.change}:`.padEnd(width - 15) + formatCurrency(receipt.change).padStart(15));
  }

  lines.push('');
  lines.push(t.line);
  lines.push(t.thanks.padStart(width / 2 + t.thanks.length / 2, ' '));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate HTML receipt for printing/email
 */
export function generateHTMLReceipt(
  receipt: Receipt,
  options: ReceiptGeneratorOptions
): string {
  const locale = options.locale || 'es';
  const t = getTranslation(locale);

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.receipt} ${options.receiptNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 20px;
        }

        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }

        .business-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .business-info {
            font-size: 12px;
            color: #666;
        }

        .receipt-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 12px;
        }

        .meta-item {
            display: flex;
            justify-content: space-between;
        }

        .meta-label {
            font-weight: bold;
        }

        .customer-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
        }

        .customer-info {
            display: grid;
            gap: 4px;
        }

        .items-section {
            margin-bottom: 20px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 10px;
        }

        .items-table thead {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }

        .items-table th {
            padding: 8px 4px;
            text-align: left;
            font-weight: bold;
            background: #f9f9f9;
        }

        .items-table td {
            padding: 8px 4px;
            border-bottom: 1px solid #eee;
        }

        .item-description {
            font-weight: 500;
        }

        .item-qty,
        .item-price,
        .item-total {
            text-align: right;
        }

        .totals-section {
            margin: 20px 0;
            padding: 20px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-size: 13px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .total-row.grand-total {
            font-weight: bold;
            font-size: 16px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #000;
        }

        .payment-section {
            margin: 20px 0;
            padding: 20px 0;
            font-size: 12px;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }

        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #000;
            font-size: 12px;
            font-weight: bold;
        }

        .print-only {
            display: none;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .receipt-container {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }

            .print-only {
                display: block;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div class="business-name">${options.businessName}</div>
            ${options.businessAddress ? `<div class="business-info">${options.businessAddress}</div>` : ''}
            ${options.businessTaxId ? `<div class="business-info">CUIT: ${options.businessTaxId}</div>` : ''}
        </div>

        <div class="receipt-meta">
            <div class="meta-item">
                <span class="meta-label">${t.receiptNumber}:</span>
                <span>${options.receiptNumber}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">${t.date}:</span>
                <span>${formatDate(receipt.issuedAt, locale)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">${t.time}:</span>
                <span>${formatTime(receipt.issuedAt)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">${t.seller}:</span>
                <span>${receipt.userName}</span>
            </div>
        </div>

        ${
          receipt.customerName
            ? `
        <div class="customer-section">
            <div class="customer-info">
                ${receipt.customerName ? `<div><strong>${t.customer}:</strong> ${receipt.customerName}</div>` : ''}
                ${receipt.customerPhone ? `<div><strong>${t.phone}:</strong> ${receipt.customerPhone}</div>` : ''}
                ${receipt.customerEmail ? `<div><strong>${t.email}:</strong> ${receipt.customerEmail}</div>` : ''}
            </div>
        </div>
        `
            : ''
        }

        <div class="items-section">
            <table class="items-table">
                <thead>
                    <tr>
                        <th>${t.items}</th>
                        <th class="item-qty">${t.quantity}</th>
                        <th class="item-price">${t.unitPrice}</th>
                        <th class="item-total">${t.total}</th>
                    </tr>
                </thead>
                <tbody>
                    ${receipt.items
                      .map(
                        (item) => `
                    <tr>
                        <td class="item-description">${item.productName}</td>
                        <td class="item-qty">${item.quantity}</td>
                        <td class="item-price">${formatCurrency(item.unitPrice)}</td>
                        <td class="item-total">${formatCurrency(item.lineTotal)}</td>
                    </tr>
                    ${
                      item.lineDiscount
                        ? `
                    <tr>
                        <td colspan="3" style="text-align: right; padding-right: 8px;">
                            <span style="font-size: 11px; color: #666;">${t.discount}:</span>
                        </td>
                        <td style="text-align: right; color: #d32f2f;">-${formatCurrency(item.lineDiscount)}</td>
                    </tr>
                    `
                        : ''
                    }
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        <div class="totals-section">
            ${
              receipt.subtotal !== receipt.total
                ? `
            <div class="total-row">
                <span>${t.subtotal}:</span>
                <span>${formatCurrency(receipt.subtotal)}</span>
            </div>
            `
                : ''
            }

            ${
              receipt.discount && receipt.discount > 0
                ? `
            <div class="total-row" style="color: #d32f2f;">
                <span>${t.discount}:</span>
                <span>-${formatCurrency(receipt.discount)}</span>
            </div>
            `
                : ''
            }

            ${
              receipt.tax && receipt.tax > 0
                ? `
            <div class="total-row">
                <span>${t.tax}:</span>
                <span>${formatCurrency(receipt.tax)}</span>
            </div>
            `
                : ''
            }

            <div class="total-row grand-total">
                <span>${t.total}:</span>
                <span>${formatCurrency(receipt.total)}</span>
            </div>
        </div>

        <div class="payment-section">
            <div class="payment-row">
                <span><strong>${t.paymentMethod}:</strong></span>
                <span>${getPaymentMethodLabel(receipt.paymentMethod, locale)}</span>
            </div>
            <div class="payment-row">
                <span><strong>${t.amountPaid}:</strong></span>
                <span>${formatCurrency(receipt.paymentAmount)}</span>
            </div>
            ${
              receipt.change && receipt.change > 0
                ? `
            <div class="payment-row" style="font-weight: bold; padding-top: 8px; border-top: 1px solid #ddd;">
                <span>${t.change}:</span>
                <span>${formatCurrency(receipt.change)}</span>
            </div>
            `
                : ''
            }
        </div>

        <div class="footer">
            ${t.thanks}
        </div>
    </div>

    <script>
        // Auto-print on load if in print mode
        // window.print();
    </script>
</body>
</html>
  `;

  return html;
}

/**
 * Calculate change for cash payments
 */
export function calculateChange(amount: number, received: number): number {
  return received - amount;
}

/**
 * Validate payment is sufficient
 */
export function isPaymentSufficient(payment: any, totalAmount: number): boolean {
  switch (payment.method) {
    case 'CASH':
      return payment.amountReceived ? payment.amountReceived >= totalAmount : payment.amount >= totalAmount;
    case 'CARD':
    case 'QR':
      return payment.amount >= totalAmount;
    case 'MIXED':
      return payment.cashAmount + payment.cardAmount >= totalAmount;
    default:
      return false;
  }
}
