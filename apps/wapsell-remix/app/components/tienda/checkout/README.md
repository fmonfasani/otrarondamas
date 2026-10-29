# E-Commerce Checkout System

Complete multi-step checkout flow for the Wapsell online store. Implements industry-standard checkout patterns with form validation, payment processing, and order management.

## Components

### Core Components

#### `CheckoutFlow`
Main container managing the entire checkout process through 4 steps.

**Props:**
```typescript
interface CheckoutFlowProps {
  items: CartItem[];
  subtotal: number;
  onSubmitOrder: (data: CheckoutInput) => Promise<void>;
  onCancel?: () => void;
  initialStep?: CheckoutStep;
}
```

**Usage:**
```tsx
import { CheckoutFlow, type CartItem } from '~/components/tienda/checkout';

const cartItems: CartItem[] = [
  {
    id: 'prod-1',
    nombre: 'Product Name',
    cantidad: 2,
    precioUnitario: '29.99',
    subtotal: '59.98',
  }
];

<CheckoutFlow
  items={cartItems}
  subtotal={59.98}
  onSubmitOrder={handleSubmitOrder}
  onCancel={() => navigate('/tienda')}
/>
```

### Step 1: Shipping Address
`ShippingAddressForm` - Collects customer name, email, phone, and delivery address.

**Features:**
- Validates email, phone, and address formats
- Country selector with Latin American countries
- Optional "Save as default address" checkbox
- Responsive grid layout

**Validation:**
```typescript
const shippingData = ShippingAddressSchema.parse(formData);
// Fields: firstName, lastName, email, phone, address, city, zipCode, country
```

### Step 2: Shipping Method
`ShippingMethodSelector` - Customer chooses between Standard, Express, or Store Pickup.

**Options:**
- **Standard**: 5-7 business days, $5.99
- **Express**: 2-3 business days, $14.99
- **Pickup**: Today/scheduled, Free

**Features:**
- Radio button selection with visual feedback
- Real-time cost calculation
- Display of estimated delivery timeframe
- Order summary with weight/distance info

### Step 3: Payment Method
`PaymentMethodSelector` - Four payment options with conditional card form.

**Payment Methods:**
1. **Credit/Debit Card** - Full PCI-compliant form
   - Card number (13-19 digits)
   - Cardholder name
   - Expiry month/year
   - CVV (3-4 digits)

2. **PayPal** - Redirect to PayPal checkout

3. **Mercado Pago** - Redirect to Mercado Pago (supports installments in Latin America)

4. **Bank Transfer** - Shows bank details after order confirmation

**Features:**
- Card formatting (spaces every 4 digits)
- Conditional validation (card details only if CARD selected)
- Payment method icons and descriptions
- Security notices for each method

### Step 4: Order Review
`OrderReview` - Complete order summary before confirmation.

**Displays:**
- Cart items with quantities and prices
- Subtotal, shipping, tax, and total
- Shipping address
- Payment method
- Security badge
- Terms acceptance notice

**Features:**
- Sticky pricing summary sidebar
- Clear breakdown of all costs
- Formatted address display
- Action buttons (Back, Confirm & Pay)

### Order Confirmation
`OrderConfirmation` - Success screen after order creation.

**Features:**
- Large success checkmark
- Order number (memorable format)
- Email confirmation notice
- Shipping address
- Estimated delivery date
- Tracking link (if available)
- Continue shopping button

## Schema & Validation

### Zod Schemas

```typescript
// Individual step schemas
ShippingAddressSchema
ShippingMethodSchema
PaymentMethodSchema
CardDetailsSchema
CouponCodeSchema

// Complete checkout
CheckoutSchema
```

### Types

```typescript
type CheckoutInput = {
  // Shipping
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  saveAsDefault?: boolean;
  
  // Shipping method
  shippingMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  
  // Payment
  paymentMethod: 'CARD' | 'PAYPAL' | 'MERCADOPAGO' | 'TRANSFER';
  
  // Card (optional)
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  
  // Coupon
  couponCode?: string;
};
```

## Shipping Configuration

```typescript
const SHIPPING_COSTS = {
  STANDARD: { days: '5-7', cost: 5.99 },
  EXPRESS: { days: '2-3', cost: 14.99 },
  PICKUP: { days: '0', cost: 0 },
};
```

To customize shipping costs, edit `checkout.schema.ts`:

```typescript
const SHIPPING_COSTS = {
  STANDARD: { days: '5-7', cost: YOUR_COST },
  EXPRESS: { days: '2-3', cost: YOUR_COST },
  PICKUP: { days: '0', cost: 0 },
};
```

## Server Actions

Located in `~/actions/checkout.server.ts`

### Core Functions

#### `validateCheckout(data)`
Validates checkout data against schema.

```typescript
const validatedData = validateCheckout(formData);
// Returns CheckoutInput or throws validation error
```

#### `createOrder(checkoutData, cartItems, baseUrl)`
Creates order via API (POST `/api/tienda/pedidos`).

```typescript
const order = await createOrder(
  checkoutData,
  [{ productoId: 'prod-1', cantidad: 2 }],
  baseUrl
);
// Returns: { id: string, estado: string, total: string, ... }
```

#### Payment Processing Functions

```typescript
// Credit card
const payment = await processCardPayment(paymentData, orderId, baseUrl);

// PayPal (returns redirect URL)
const paypalUrl = await processPayPalPayment(orderId, amount, returnUrl, cancelUrl, baseUrl);

// Mercado Pago (returns redirect URL)
const mpUrl = await processMercadoPagoPayment(orderId, amount, returnUrl, baseUrl);

// Bank transfer
const transfer = await processBankTransferPayment(orderId, amount, email, baseUrl);
```

#### `sendOrderConfirmationEmail(email, orderId, baseUrl)`
Sends confirmation email (non-blocking).

## Integration Example

### Route Setup

Create a checkout route at `app/routes/$lang.checkout.tsx`:

```tsx
import { json, type ActionFunction } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { CheckoutFlow, type CartItem } from '~/components/tienda/checkout';
import { checkoutAction } from '~/actions/checkout.server';

export const action: ActionFunction = checkoutAction;

export default function CheckoutRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const cartItems: CartItem[] = [
    // Retrieve from cart state/session
  ];

  const handleSubmitOrder = async (checkoutData) => {
    const formData = new FormData();
    formData.append('json', JSON.stringify({
      ...checkoutData,
      cartItems,
      total: calculateTotal(cartItems, checkoutData.shippingMethod),
    }));

    const response = await fetch('/checkout', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.redirectUrl) {
      // Redirect to payment processor
      window.location.href = result.redirectUrl;
    } else if (result.success) {
      // Show confirmation
      navigateTo(`/checkout/success?orderId=${result.orderId}`);
    }
  };

  return (
    <CheckoutFlow
      items={cartItems}
      subtotal={calculateSubtotal(cartItems)}
      onSubmitOrder={handleSubmitOrder}
      onCancel={() => navigate(-1)}
    />
  );
}
```

## Styling

All components use Tailwind CSS with these color schemes:

- **Primary**: Blue (blue-600, blue-700)
- **Success**: Green (green-600, green-700)
- **Warning**: Amber (amber-600, amber-700)
- **Error**: Red (red-500, red-600)
- **Neutral**: Gray (gray-300 to gray-900)

Customize by editing Tailwind classes in component files.

## Accessibility Features

- ✓ ARIA labels on form inputs
- ✓ Semantic HTML (buttons, forms, etc.)
- ✓ Keyboard navigation support
- ✓ Error messages linked to inputs
- ✓ Focus management between steps
- ✓ Loading state indicators

## Security Considerations

1. **Card Data**
   - Never store raw card data
   - Use tokenization for payment processing
   - CVV not stored after validation
   - Card number masked in display

2. **HTTPS Only**
   - All checkout requests must be HTTPS
   - Enable in production environment

3. **CSRF Protection**
   - Use Remix built-in session handling
   - CSRF tokens in forms (automatic with Remix)

4. **Input Validation**
   - All data validated server-side (in `checkout.server.ts`)
   - Zod schemas enforce type safety
   - No blind trust of client data

5. **PCI Compliance**
   - Don't capture raw card data on client
   - Use payment processor APIs
   - Implement tokenization (Stripe, Square, etc.)

## API Contracts

### Order Creation
**Endpoint**: `POST /api/tienda/pedidos`

**Request**:
```typescript
{
  nombre: string;
  email: string;
  telefono?: string;
  items: { productoId: string; cantidad: number }[];
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  pais?: string;
  metodoEnvio?: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  metodosPago?: string;
}
```

**Response**:
```typescript
{
  id: string;
  empresaId: string;
  clienteId: string;
  estado: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  pedidoItems: PedidoItem[];
}
```

### Payment Processing
Varies by provider:
- **Card**: Custom implementation or Stripe/Square API
- **PayPal**: OAuth 2.0 flow
- **Mercado Pago**: OAuth 2.0 + Checkout API
- **Bank Transfer**: Manual verification workflow

## Customization

### Add Coupon Support
```tsx
const [coupon, setCoupon] = useState('');

const applyCoupon = async (code: string) => {
  const discount = await fetch(`/api/coupons/validate?code=${code}`)
    .then(r => r.json());
  
  // Apply discount to total
  setDiscount(discount.amount);
};

<OrderReview
  {...props}
  couponCode={coupon}
  onApplyCoupon={applyCoupon}
/>
```

### Add Address Autocomplete
```tsx
import { useAutocomplete } from '@react-google-maps-api';

<ShippingAddressForm
  {...props}
  // Integrate autocomplete library
/>
```

### Multi-Language Support
```tsx
const { t } = useTranslation();

// Update labels
<label>{t('checkout.firstName')}</label>
```

## Testing

### Unit Tests
```typescript
import { describe, it, expect } from 'vitest';
import { ShippingAddressSchema } from './checkout.schema';

describe('ShippingAddressSchema', () => {
  it('validates valid address', () => {
    const data = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      // ... other fields
    };
    expect(() => ShippingAddressSchema.parse(data)).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => 
      ShippingAddressSchema.parse({ ...data, email: 'invalid' })
    ).toThrow();
  });
});
```

### E2E Tests
```typescript
test('completes checkout flow', async ({ page }) => {
  await page.goto('/checkout');
  
  // Step 1: Fill address
  await page.fill('#firstName', 'John');
  // ... fill other fields
  await page.click('button:has-text("Continue")');
  
  // Step 2: Select shipping
  await page.click('label:has-text("Express")');
  await page.click('button:has-text("Continue to Payment")');
  
  // Step 3: Select payment
  await page.click('label:has-text("Credit Card")');
  // ... fill card details
  
  // Step 4: Review and confirm
  await page.click('button:has-text("Confirm Order")');
  
  // Success
  await expect(page).toHaveURL(/\/checkout\/success/);
});
```

## Performance

- **Code Splitting**: Each step component can be lazy-loaded
- **Form State**: Minimal re-renders using React Hook Form
- **Validation**: Client-side and server-side (dual validation)
- **API Calls**: Debounced address validation
- **Image Optimization**: ProductCard images use Next.js Image

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### "Invalid card number" error
- Check card format (13-19 digits)
- Ensure spaces removed before submission

### Payment redirect fails
- Verify PayPal/Mercado Pago credentials
- Check return URLs match configured values
- Ensure HTTPS in production

### Email not sent
- Check email service configuration
- Review server logs for SMTP errors
- Non-blocking - order still created

## Future Enhancements

- [ ] Address autocomplete (Google Places API)
- [ ] Real-time shipping cost calculation
- [ ] Save multiple addresses
- [ ] Gift wrapping option
- [ ] Promo code management
- [ ] Subscription orders
- [ ] Split payment (installments)
- [ ] Express checkout (Apple Pay, Google Pay)
