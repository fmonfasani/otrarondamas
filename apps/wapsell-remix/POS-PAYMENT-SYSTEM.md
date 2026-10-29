# POS Payment and Receipt System

## Overview

Complete payment processing system for the Wapsell POS with multiple payment methods, receipt generation, and thermal printer support.

## Architecture

### Payment Flow

```
User Cart
    ↓
PaymentForm (method selector)
    ↓
Method-specific Form (Cash/Card/Mixed/QR)
    ↓
Validation (Zod schema)
    ↓
Server Action: processPayment()
    ↓
API: POST /ventas/{id}/pagos
    ↓
Receipt Generation
    ↓
Display/Print/Email/PDF
```

## Components

### 1. PaymentMethodSelector
**File**: `app/components/pos/PaymentMethodSelector.tsx`

Allows user to select payment method:
- Cash (Efectivo)
- Card (Tarjeta)
- Mixed (Mixto)
- QR (Mercado Pago)

```tsx
<PaymentMethodSelector
  selectedMethod={selectedMethod}
  onSelectMethod={setSelectedMethod}
  disabled={isLoading}
/>
```

### 2. CashPaymentForm
**File**: `app/components/pos/CashPaymentForm.tsx`

Handles cash payments:
- Displays total amount due
- Input for amount received
- Calculates change automatically
- Quick denomination buttons (100, 200, 500, 1000, 2000, 5000)
- Input validation and error messages

```tsx
<CashPaymentForm
  totalAmount={totalAmount}
  onSubmit={(amountReceived, change) => {
    // Handle cash payment
  }}
  disabled={isLoading}
/>
```

**Key Features**:
- Automatic change calculation
- Error detection for insufficient payment
- Quick denomination buttons for fast input
- Clear/Submit buttons

### 3. CardPaymentForm
**File**: `app/components/pos/CardPaymentForm.tsx`

Handles credit/debit card payments:
- Card number validation (13-19 digits)
- Cardholder name
- Expiry month/year validation
- CVV validation (3-4 digits)
- Installments selection (1-12)
- Security notice

```tsx
<CardPaymentForm
  totalAmount={totalAmount}
  onSubmit={(cardData) => {
    // Handle card payment
  }}
  disabled={isLoading}
/>
```

**Validation**:
- Card number format (spacing, valid length)
- Expiry date (not expired)
- CVV format
- All fields required

### 4. MixedPaymentForm
**File**: `app/components/pos/MixedPaymentForm.tsx`

Handles combined cash + card payments:
- Cash amount input
- Amount received (for change)
- Card amount input
- Conditional card fields (shown when card amount > 0)
- Validates total covers sale amount

```tsx
<MixedPaymentForm
  totalAmount={totalAmount}
  onSubmit={(data) => {
    // Handle mixed payment
  }}
  disabled={isLoading}
/>
```

**Features**:
- Dynamic card field visibility
- Real-time amount validation
- Change calculation for cash portion
- Combined validation for both payment methods

### 5. PaymentForm
**File**: `app/components/pos/PaymentForm.tsx`

Main payment component wrapping all methods:
- Method selection
- Form switching
- Error handling
- Loading state
- Calls processPayment server action

```tsx
<PaymentForm
  totalAmount={totalAmount}
  onPaymentComplete={async (payment) => {
    // Handle successful payment
  }}
  isLoading={isLoading}
/>
```

### 6. ReceiptPreview
**File**: `app/components/pos/ReceiptPreview.tsx`

Displays receipt with:
- Business info (name, address, CUIT)
- Receipt number and timestamp
- Customer details
- Line items with quantities and prices
- Discounts and totals
- Payment method and change
- Action buttons (Print, Download PDF, Email)

```tsx
<ReceiptPreview
  receipt={receipt}
  onPrint={() => window.print()}
  onDownloadPDF={handlePDF}
  onEmail={handleEmail}
  showActions={true}
/>
```

## Validation

### PaymentSchema (Zod)

**File**: `app/utils/payment.validation.ts`

Discriminated union of all payment types:

```typescript
export const PaymentSchema = z.discriminatedUnion('method', [
  CashPaymentSchema,
  CardPaymentSchema,
  MixedPaymentSchema,
  QRPaymentSchema,
]);
```

Each schema validates:
- Method-specific fields
- Amount validation
- Format validation
- Business logic (e.g., card expiry, sufficient payment)

### Type Definitions

**File**: `packages/shared-types/src/payment.types.ts`

```typescript
export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED' | 'QR';

export interface CashPayment {
  method: 'CASH';
  amount: number;
  amountReceived?: number;
  change?: number;
}

export interface CardPayment {
  method: 'CARD';
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  amount: number;
  installments?: number;
}

// ... other payment types
```

## Receipt Generation

### Text Receipt
**Function**: `generateTextReceipt(receipt, options)`

Generates plain text for thermal printers:
- 40-character width
- Business header
- Itemized list
- Totals with alignment
- Payment info
- Footer message

```typescript
const textReceipt = generateTextReceipt(receipt, {
  businessName: 'Otra Ronda Más',
  businessAddress: 'Calle 123',
  businessTaxId: '20-12345678-9',
  receiptNumber: 'REC-001',
  locale: 'es',
});

// Send to thermal printer via Bluetooth
```

### HTML Receipt
**Function**: `generateHTMLReceipt(receipt, options)`

Generates printable/email HTML:
- Responsive design
- Print styles
- Business branding
- Itemized table
- Payment details
- Auto-print trigger (commented out)

```typescript
const htmlReceipt = generateHTMLReceipt(receipt, {
  businessName: 'Otra Ronda Más',
  receiptNumber: 'REC-001',
  locale: 'es',
});

// Display in iframe or send via email
```

### Receipt Properties

```typescript
interface Receipt {
  id: string;
  saleId: string;
  receiptNumber: string;
  businessName: string;
  businessAddress?: string;
  businessTaxId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  change?: number;
  notes?: string;
  issuedAt: Date;
  userName: string;
  cajaId?: string;
}
```

## Server Actions

### processPayment
**File**: `app/actions/payment.server.ts`

```typescript
export async function processPayment(
  saleId: string,
  payment: Payment,
  totalAmount: number,
  idempotencyKey?: string
): Promise<PaymentResponse>
```

**Flow**:
1. Validates payment data with Zod
2. Generates or uses idempotency key
3. Calls API: `POST /ventas/{id}/pagos` with Idempotency-Key header
4. Generates receipt
5. Returns payment response with receipt

**Idempotency**:
- Prevents duplicate charges on network retry
- Uses UUID v4 format
- Sent as `Idempotency-Key` header to API

**Error Handling**:
- Validates payment schema
- Catches API errors
- Returns PaymentResponse with success flag and error message

## Utilities

### Receipt Generator
**File**: `app/utils/receipt.generator.ts`

Functions:
- `generateTextReceipt()` - For thermal printers
- `generateHTMLReceipt()` - For display/email/PDF
- `calculateChange()` - Computes change amount
- `isPaymentSufficient()` - Validates payment covers total
- `formatCurrency()` - Formats numbers as currency
- `formatDate()` - Formats dates by locale
- `getPaymentMethodLabel()` - Translates payment methods

### Payment Validation
**File**: `app/utils/payment.validation.ts`

Zod schemas with validation:
- Card number format and length
- Cardholder name requirement
- Expiry date not expired
- CVV format (3-4 digits)
- Amount validation
- Mixed payment logic (both methods required if amounts > 0)

## Integration Example

```tsx
import { PaymentForm } from '@/components/pos';
import { processPayment } from '@/actions/payment.server';

export function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const total = 1500.00;

  const handlePayment = async (payment: any) => {
    setIsLoading(true);
    try {
      const response = await processPayment(
        saleId,
        payment,
        total,
        generateIdempotencyKey()
      );

      if (response.success) {
        // Display receipt
        setReceipt(response.receipt);
        
        // Print receipt
        handlePrintReceipt(response.receipt);
      } else {
        setError(response.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PaymentForm
      totalAmount={total}
      onPaymentComplete={handlePayment}
      isLoading={isLoading}
    />
  );
}
```

## Thermal Printer Integration

### Bluetooth Printing

```typescript
// 1. Generate text receipt
const textReceipt = generateTextReceipt(receipt, options);

// 2. Send to printer via Bluetooth Web API
async function printToThermalPrinter(text: string) {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['00001101-0000-1000-8000-00805f9b34fb'] }] // SPP
    });
    
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
    
    await characteristic.writeValue(new TextEncoder().encode(text));
    console.log('Receipt printed successfully');
  } catch (error) {
    console.error('Printing failed:', error);
  }
}
```

### Browser Print

```typescript
function handlePrintReceipt(receipt: Receipt) {
  const htmlReceipt = generateHTMLReceipt(receipt, options);
  
  // Method 1: iframe
  const iframe = document.createElement('iframe');
  iframe.innerHTML = htmlReceipt;
  document.body.appendChild(iframe);
  iframe.contentWindow?.print();
  
  // Method 2: window.open
  const printWindow = window.open();
  if (printWindow) {
    printWindow.document.write(htmlReceipt);
    printWindow.document.close();
    printWindow.print();
  }
}
```

## Email Integration

```typescript
async function sendReceiptEmail(receipt: Receipt, email: string) {
  const htmlReceipt = generateHTMLReceipt(receipt, options);
  
  // Send via your email service
  const response = await fetch('/api/email/send-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: email,
      subject: `Recibo ${receipt.receiptNumber}`,
      html: htmlReceipt,
      attachments: [
        {
          filename: `recibo-${receipt.receiptNumber}.pdf`,
          content: generatePDF(receipt), // html2pdf
        }
      ]
    })
  });
  
  return response.json();
}
```

## PDF Generation

Using `html2pdf.js`:

```typescript
import html2pdf from 'html2pdf.js';

function downloadReceiptPDF(receipt: Receipt) {
  const htmlReceipt = generateHTMLReceipt(receipt, options);
  
  const element = document.createElement('div');
  element.innerHTML = htmlReceipt;
  
  const opt = {
    margin: 10,
    filename: `recibo-${receipt.receiptNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };
  
  html2pdf().set(opt).from(element).save();
}
```

## Security Considerations

1. **CVV**: Never store or log CVV
2. **Card Number**: Store only last 4 digits and masked version
3. **Idempotency**: Use for duplicate prevention
4. **HTTPS**: All API calls via secure connection
5. **Environment Variables**: API tokens, business info in .env
6. **Validation**: Client + server validation (defense in depth)

## Testing

### Unit Tests for Validation

```typescript
import { PaymentSchema } from '@/utils/payment.validation';

describe('Payment Validation', () => {
  it('validates cash payment', () => {
    const payment = {
      method: 'CASH',
      amount: 100,
      amountReceived: 150
    };
    expect(PaymentSchema.parse(payment)).toBeDefined();
  });

  it('rejects insufficient cash payment', () => {
    const payment = {
      method: 'CASH',
      amount: 100,
      amountReceived: 50
    };
    expect(() => PaymentSchema.parse(payment)).toThrow();
  });

  it('validates card payment', () => {
    const payment = {
      method: 'CARD',
      cardNumber: '4532015112830366',
      cardholderName: 'JOHN DOE',
      expiryMonth: 12,
      expiryYear: 2025,
      cvv: '123',
      amount: 100
    };
    expect(PaymentSchema.parse(payment)).toBeDefined();
  });

  it('rejects expired card', () => {
    const payment = {
      method: 'CARD',
      cardNumber: '4532015112830366',
      cardholderName: 'JOHN DOE',
      expiryMonth: 1,
      expiryYear: 2020,
      cvv: '123',
      amount: 100
    };
    expect(() => PaymentSchema.parse(payment)).toThrow();
  });
});
```

## Environment Variables

```env
# API
API_URL=http://localhost:3000/api
API_TOKEN=your_api_token

# Business Info
BUSINESS_NAME=Otra Ronda Más
BUSINESS_ADDRESS=Calle 123, Ciudad
BUSINESS_TAX_ID=20-12345678-9

# Payment Processing
MERCADO_PAGO_PUBLIC_KEY=...
MERCADO_PAGO_ACCESS_TOKEN=...
```

## Future Enhancements

1. **Installment Plans**: Full Mercado Pago integration
2. **Receipt Customization**: Per-business branding
3. **Offline Support**: Queue payments when offline
4. **Multi-currency**: Support multiple currencies
5. **Analytics**: Payment method statistics
6. **Refunds**: Partial and full refund processing
7. **Loyalty**: Integration with loyalty system
8. **Split Payments**: Multiple payers (table bill splitting)
