# POS Components

Reusable React components for the Wapsell POS (Point of Sale) system. These components provide cart management, payment processing, and receipt generation functionality.

## Components Overview

### Cart Components

#### CartItem.tsx
Displays a single item in the shopping cart with quantity controls and removal option.

**Props:**
- `item: CartItemData` - Cart item with product info, quantity, and pricing
- `maxStock?: number` - Maximum allowed quantity (default: 999)
- `onUpdateQuantity: (itemId, newQuantity) => void` - Callback for quantity changes
- `onRemove: (itemId) => void` - Callback for item removal
- `disabled?: boolean` - Disable interactions

**Features:**
- Quantity increment/decrement buttons
- Direct quantity input with validation
- Remove button with trash icon
- Displays product name, unit price, and line total
- Validates quantity against stock limits

**Example:**
```tsx
import { CartItem } from '@/components/pos';

<CartItem
  item={cartItem}
  maxStock={100}
  onUpdateQuantity={(id, qty) => updateCart(id, qty)}
  onRemove={(id) => removeFromCart(id)}
/>
```

#### CartSummary.tsx
Displays cart totals including subtotal, tax, discount, and final total.

**Props:**
- `items: CartItemData[]` - Array of cart items
- `discountType?: 'percentage' | 'fixed'` - Discount type (default: 'fixed')
- `discountValue?: number` - Discount amount or percentage
- `taxRate?: number` - Tax percentage (e.g., 21 for 21% VAT)
- `hideActions?: boolean` - Hide discount application controls
- `onApplyDiscount?: (discount, type) => void` - Callback for discount changes
- `disabled?: boolean` - Disable interactions

**Features:**
- Calculates subtotal from cart items
- Applies fixed or percentage discounts
- Calculates tax on taxable amount
- Displays itemized breakdown
- Optional discount application UI
- Shows item count

**Example:**
```tsx
import { CartSummary } from '@/components/pos';

<CartSummary
  items={cartItems}
  discountType="percentage"
  discountValue={10}
  taxRate={21}
  onApplyDiscount={(amount, type) => setDiscount(amount, type)}
/>
```

### Payment Components

#### PaymentMethodSelector.tsx
Radio button interface for selecting payment method.

**Payment Methods:**
- **CASH** - Cash payment (💵)
- **CARD** - Credit/Debit card (💳)
- **MIXED** - Cash + Card combination (🔀)
- **QR** - Mercado Pago QR code (📱)

**Props:**
- `selectedMethod: PaymentMethodType | null` - Currently selected method
- `onSelectMethod: (method) => void` - Selection callback
- `disabled?: boolean` - Disable selection

**Example:**
```tsx
import { PaymentMethodSelector } from '@/components/pos';

<PaymentMethodSelector
  selectedMethod={paymentMethod}
  onSelectMethod={setPaymentMethod}
/>
```

#### CashPaymentForm.tsx
Form for cash payment with change calculation.

**Props:**
- `totalAmount: number` - Total to collect
- `onSubmit: (amountReceived, change) => void` - Submit callback
- `disabled?: boolean` - Disable form

**Features:**
- Large input field for amount received
- Quick denomination buttons ($100, $200, $500, $1000, $2000, $5000)
- Real-time change calculation
- Clear button to reset
- Validation for sufficient payment

**Example:**
```tsx
import { CashPaymentForm } from '@/components/pos';

<CashPaymentForm
  totalAmount={150.50}
  onSubmit={(received, change) => processCashPayment(received, change)}
/>
```

#### CardPaymentForm.tsx
Secure form for credit/debit card payment.

**Props:**
- `totalAmount: number` - Total to charge
- `onSubmit: (cardData) => void` - Submit callback with card details
- `disabled?: boolean` - Disable form

**Card Data Returned:**
```typescript
{
  cardNumber: string;        // Digits only, no storage
  cardholderName: string;    // Uppercase
  expiryMonth: number;       // 1-12
  expiryYear: number;        // 4-digit year
  cvv: string;               // 3-4 digits, NOT stored
  installments: number;      // 1-12 months
}
```

**Features:**
- Formatted card number input (XXXX XXXX XXXX XXXX)
- Cardholder name with letter-only validation
- Expiry month/year dropdowns
- CVV field (hidden, not stored)
- Installment options (1-12)
- Expiry date validation
- Security warning about CVV handling
- NO card data storage or logging

**Security Notes:**
- Card data is NOT persisted in state after submission
- CVV is validated but never logged or stored
- Card number is masked in display
- Data should be tokenized by payment processor
- Complies with PCI-DSS requirements for frontend

**Example:**
```tsx
import { CardPaymentForm } from '@/components/pos';

<CardPaymentForm
  totalAmount={150.50}
  onSubmit={async (cardData) => {
    // Send to backend for tokenization
    const token = await tokenizeCard(cardData);
    await processPayment(token);
  }}
/>
```

#### MixedPaymentForm.tsx
Form for combined cash and card payment.

**Props:**
- `totalAmount: number` - Total amount to pay
- `onSubmit: (data) => void` - Submit callback
- `disabled?: boolean` - Disable form

**Submission Data:**
```typescript
{
  cashAmount: number;
  cardAmount: number;
  amountReceived?: number;   // Cash received
  cardData?: {               // Only if cardAmount > 0
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    installments: number;
  };
}
```

**Features:**
- Separate inputs for cash and card amounts
- Real-time remaining balance calculation
- Change calculation for cash portion
- Card fields shown only when card amount > 0
- Validates that total equals cart amount
- Shows progress toward total
- Card expiry validation

**Example:**
```tsx
import { MixedPaymentForm } from '@/components/pos';

<MixedPaymentForm
  totalAmount={200}
  onSubmit={(data) => processMixedPayment(data)}
/>
```

#### ReceiptPreview.tsx
Print-friendly receipt display with email and download options.

**Props:**
- `receipt: Receipt` - Receipt data object
- `onPrint?: () => void` - Print button callback
- `onEmail?: () => void` - Email button callback
- `onDownloadPDF?: () => void` - PDF download callback
- `showActions?: boolean` - Show action buttons (default: true)

**Receipt Data Structure:**
```typescript
{
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

**Features:**
- Monospace font for authentic receipt look
- Centered layout with borders
- Business info header with tax ID
- Sale number and date/time
- Itemized list with qty, price, total
- Subtotal, discount, tax breakdown
- Payment method display
- Change amount (if applicable)
- Customer info (optional)
- Print button (uses window.print())
- Email button (implementation dependent)
- Download PDF button (future)

**Print Styles:**
The component uses Tailwind's `@media print` support:
- Hides action buttons during print
- Maintains receipt layout on paper
- Monospace font for readability

**Example:**
```tsx
import { ReceiptPreview } from '@/components/pos';

<ReceiptPreview
  receipt={saleReceipt}
  onPrint={() => window.print()}
  onEmail={() => emailReceipt(saleReceipt)}
  showActions={true}
/>
```

#### PaymentForm.tsx
Master component that orchestrates payment method selection and processing.

**Props:**
- `totalAmount: number` - Total to charge
- `onPaymentComplete: (payment) => Promise<void>` - Payment processor callback
- `disabled?: boolean` - Disable interactions
- `isLoading?: boolean` - Show loading state

**Features:**
- Payment method selection
- Dynamic form rendering based on selected method
- Back button to change method
- Loading spinner during processing
- Error message display
- Consolidated payment data handling

**Example:**
```tsx
import { PaymentForm } from '@/components/pos';

<PaymentForm
  totalAmount={150.50}
  onPaymentComplete={async (payment) => {
    const result = await api.processPayment(payment);
    if (!result.success) throw new Error(result.error);
  }}
  isLoading={isProcessing}
/>
```

## Validation Utilities

### payment.validation.ts
Zod schemas for validating all payment types.

**Exported Schemas:**
- `CashPaymentSchema` - Validates cash payments
- `CardPaymentSchema` - Validates card details and expiry
- `MixedPaymentSchema` - Validates combined payments
- `QRPaymentSchema` - Validates QR payments
- `PaymentSchema` - Discriminated union of all types

**Usage:**
```typescript
import { PaymentSchema } from '@/utils/payment.validation';

const result = PaymentSchema.safeParse(paymentData);
if (!result.success) {
  console.error(result.error.errors);
}
```

### cart.validation.ts
Utility functions for cart and discount validation.

**Functions:**

#### validateCartItemQuantity(quantity, maxStock)
Validates item quantity against stock limits.

```typescript
const { valid, error } = validateCartItemQuantity(5, 100);
```

#### validateDiscount(discount, subtotal, type)
Validates discount amounts and percentages.

```typescript
const { valid, amount } = validateDiscount(10, 100, 'percentage');
```

#### validateCartTotals(subtotal, discount, taxRate, total)
Ensures cart calculations are mathematically correct.

```typescript
const { valid, expectedTotal } = validateCartTotals(100, 10, 21, 108.9);
```

#### validatePaymentAmount(paymentAmount, total)
Validates payment is sufficient and calculates change.

```typescript
const { valid, change } = validatePaymentAmount(150, 100);
```

## TypeScript Types

Import from `@otrarondamas/shared-types`:

```typescript
import {
  CartItemData,
  Payment,
  PaymentMethod,
  Receipt,
  ReceiptItem,
  PaymentResponse,
} from '@otrarondamas/shared-types';
```

## Styling

Components use **Tailwind CSS** with:
- Blue color scheme for primary actions (#2563eb)
- Green for success states
- Red for errors
- Gray for neutral elements
- Responsive grid layouts
- Mobile-first design

**Print Media Queries:**
Components respect `@media print` for receipt printing:
```css
@media print {
  /* Action buttons hidden */
  /* Receipt layout optimized for paper */
}
```

## Integration Examples

### Complete POS Checkout Flow

```tsx
import React, { useState } from 'react';
import {
  CartItem,
  CartSummary,
  PaymentForm,
  ReceiptPreview,
} from '@/components/pos';

export function POSCheckout() {
  const [cart, setCart] = useState<CartItemData[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentComplete = async (payment: Payment) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          payment,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data: PaymentResponse = await response.json();
      if (data.success) {
        setReceipt(data.receipt);
        setCart([]);
      } else {
        throw new Error(data.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (receipt) {
    return (
      <ReceiptPreview
        receipt={receipt}
        onPrint={() => window.print()}
        showActions={true}
      />
    );
  }

  const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <div className="space-y-4">
        {cart.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={(id, qty) => {
              setCart(cart.map(i => i.id === id ? { ...i, quantity: qty } : i));
            }}
            onRemove={(id) => {
              setCart(cart.filter(i => i.id !== id));
            }}
          />
        ))}
      </div>

      {/* Summary */}
      <CartSummary items={cart} taxRate={21} />

      {/* Payment */}
      {total > 0 && (
        <PaymentForm
          totalAmount={total}
          onPaymentComplete={handlePaymentComplete}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
}
```

## Testing

Test files are located alongside components:

- `cart.validation.test.ts` - Cart validation tests
- `payment.validation.test.ts` - Payment validation tests

**Run tests:**
```bash
npm test
```

**Test coverage:**
- Cart item quantity validation (valid, min, max, non-integer)
- Discount calculation (fixed, percentage, edge cases)
- Cart totals with tax and discounts
- Payment amount validation
- All payment method schemas
- Expired card detection
- Mixed payment validation

## Security Considerations

### Card Data Handling
- ❌ Card numbers are never stored
- ❌ CVV is never logged or persisted
- ✅ Card data is validated client-side only
- ✅ All sensitive data must be tokenized server-side
- ✅ Use PCI-DSS compliant payment processor

### Tenant Isolation
- All payments include `empresaId` context
- Cart items must belong to authenticated user's company
- Receipt generation is company-scoped

### Validation
- Client-side validation with Zod schemas
- Server-side re-validation of amounts required
- Idempotency keys prevent duplicate charges

## Roadmap

### Phase 1 (Complete) ✅
- [x] CartItem component
- [x] CartSummary component
- [x] Payment method selector
- [x] Cash payment form
- [x] Card payment form (no storage)
- [x] Mixed payment form
- [x] Receipt preview
- [x] Payment orchestrator
- [x] Validation schemas

### Phase 2 (Future)
- [ ] QR code generation (Mercado Pago integration)
- [ ] Receipt PDF download
- [ ] Email receipt sending
- [ ] Payment history
- [ ] Refund handling
- [ ] Installment management

### Phase 3 (Future)
- [ ] Loyalty points tracking
- [ ] Customer identification
- [ ] Discount rules engine
- [ ] Tax calculation service
- [ ] Multi-currency support

## Support

For issues or questions:
1. Check existing test files for usage patterns
2. Review README examples
3. Inspect component prop interfaces
4. Validate data with provided Zod schemas
