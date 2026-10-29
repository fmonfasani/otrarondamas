# Tienda Components Implementation Guide

Comprehensive React/Next.js component library for product display, filtering, search, cart management, and checkout flow.

## Overview

The Tienda component library provides a complete e-commerce UI solution with:
- **30 reusable components** across 5 feature areas
- **Zod validation** for checkout forms
- **Accessibility** (WCAG AA) and **responsive design** (mobile-first)
- **Internationalization** via next-intl
- **Dark mode compatible** with Tailwind CSS

## Directory Structure

```
components/tienda/
├── ProductGrid.tsx                    # Responsive grid layout
├── ProductCarousel.tsx                # Image carousel with thumbnails
├── ProductReviews.tsx                 # Customer reviews display
├── ProductSpecs.tsx                   # Specifications table
├── RelatedProducts.tsx                # "Customers also viewed" section
├── CategoryFilter.tsx                 # Category checkbox list
├── PriceRangeSlider.tsx              # Dual-handle price range
├── AvailabilityFilter.tsx            # Stock status filter
├── RatingFilter.tsx                  # Star rating filter
├── FilterSidebar.tsx                 # Combined filters (desktop/mobile)
├── SearchBar.tsx                     # Debounced search input
├── SearchResults.tsx                 # Dropdown results
├── SortDropdown.tsx                  # Sort options selector
├── CheckoutFlow.tsx                  # Multi-step orchestrator
├── CheckoutProgress.tsx              # Visual progress indicator
├── ShippingAddressForm.tsx           # Address validation form
├── ShippingMethodSelector.tsx        # Shipping options
├── PaymentMethodSelector.tsx         # Payment methods (4 types)
├── OrderReview.tsx                   # Order summary
├── OrderConfirmation.tsx             # Success screen
├── index.ts                          # Barrel export
└── __tests__/
    ├── FilterSidebar.test.tsx
    └── PriceRangeSlider.test.tsx

lib/validation/
├── checkout.schema.ts               # Zod schemas
└── __tests__/
    └── checkout.schema.test.ts

TIENDA_COMPONENTS.md                # This file
```

## Component Categories

### 1. Product Display Components (5)

#### ProductGrid
Responsive grid layout for product cards.
```tsx
<ProductGrid>
  {products.map(p => <ProductCard key={p.id} producto={p} />)}
</ProductGrid>
```
- **Props**: `children`, `className`
- **Breakpoints**: 1 col mobile, 2 cols tablet, 4 cols desktop
- **Responsive**: ✅

#### ProductCarousel
Image carousel with thumbnail navigation.
```tsx
<ProductCarousel
  images={product.images}
  productName={product.name}
  currentImageIndex={0}
  onImageChange={(index) => console.log(index)}
/>
```
- **Features**:
  - Thumbnail strip with visual feedback
  - Keyboard navigation (arrow keys)
  - Touch swipe support ready
  - Image counter display
  - Aspect ratio 1:1

#### ProductReviews
Customer reviews display with star ratings.
```tsx
<ProductReviews
  reviews={customerReviews}
  averageRating={4.5}
  totalReviews={42}
/>
```
- **Features**:
  - Star rating visualization (1-5 stars)
  - Verified purchase badge
  - Review date display
  - "No reviews" state

#### ProductSpecs
Specifications table for product details.
```tsx
<ProductSpecs
  specs={[
    { key: 'material', label: 'Material', value: 'Cotton' },
    { key: 'size', label: 'Size', value: 'Large' },
  ]}
/>
```
- **Features**:
  - Alternating row colors
  - Responsive on mobile (stacked)
  - Table layout with border

#### RelatedProducts
"Customers also viewed" section.
```tsx
<RelatedProducts
  products={relatedItems}
  title="Related Products"
/>
```
- **Features**:
  - Reuses ProductCard component
  - Optional custom title
  - Responsive grid

---

### 2. Filter Components (5)

#### CategoryFilter
Category selection with checkboxes.
```tsx
<CategoryFilter
  categories={categories}
  selectedCategoryIds={['1', '2']}
  onChange={(ids) => handleFilter(ids)}
  collapsibleOnMobile={true}
/>
```
- **Features**:
  - Checkbox list with counts
  - Collapsible on mobile
  - Clear all action
  - Active selection styling

#### PriceRangeSlider
Dual-handle price range selector.
```tsx
<PriceRangeSlider
  minPrice={0}
  maxPrice={1000}
  currentMin={100}
  currentMax={500}
  onChange={(min, max) => handlePriceChange(min, max)}
  currency="$"
/>
```
- **Features**:
  - Visual dual-handle slider
  - Numeric input fields
  - Range display (e.g., "$100 - $500")
  - Currency symbol
  - Min cannot exceed max

#### AvailabilityFilter
Stock status filter.
```tsx
<AvailabilityFilter
  showOutOfStock={false}
  onChange={(show) => handleAvailability(show)}
/>
```
- **Features**:
  - In stock checkbox
  - Out of stock checkbox
  - Independent toggles

#### RatingFilter
Star rating filter (1-5 stars).
```tsx
<RatingFilter
  selectedRatings={[4, 5]}
  onChange={(ratings) => handleRatings(ratings)}
/>
```
- **Features**:
  - 1+, 2+, 3+, 4+, 5 star options
  - Visual star display
  - Multiple selection
  - Clear all action

#### FilterSidebar
Combined filters container.
```tsx
<FilterSidebar
  categories={categories}
  minPrice={0}
  maxPrice={1000}
  filters={filterState}
  onFilterChange={handleFilterChange}
/>
```
- **Features**:
  - Desktop: Always visible, sticky
  - Mobile: Toggle button with modal
  - Active filter count badge
  - Clear all button
  - Overlay on mobile
- **Filter State**:
  ```ts
  interface FilterState {
    categories: string[];
    minPrice: number;
    maxPrice: number;
    showOutOfStock: boolean;
    ratings: number[];
  }
  ```

---

### 3. Search Components (3)

#### SearchBar
Debounced search input.
```tsx
<SearchBar
  value={query}
  onChange={setQuery}
  onSearch={(q) => performSearch(q)}
  debounceMs={300}
  placeholder="Search products..."
/>
```
- **Features**:
  - 300ms debounce by default
  - Clear button
  - Loading indicator
  - Keyboard support (Enter, Escape)
  - Accessibility (aria-busy)

#### SearchResults
Dropdown with matching products.
```tsx
<SearchResults
  results={searchResults}
  isLoading={isSearching}
  query={searchQuery}
  onSelectResult={(product) => handleSelect(product)}
  maxResults={5}
/>
```
- **Features**:
  - Product thumbnails
  - Loading spinner
  - "No results" message
  - Price display
  - Click handler for selection
  - Scrollable list

#### SortDropdown
Sort options selector.
```tsx
<SortDropdown
  value="newest"
  onChange={(option) => handleSort(option)}
/>
```
- **Sort Options**:
  - `newest` - Most recently added
  - `popularity` - Most popular first
  - `price_asc` - Price: low to high
  - `price_desc` - Price: high to low
  - `rating` - Highest rated first

---

### 4. Cart Components (2)

**Note**: Reuses existing components from the codebase:
- `CartItem.tsx` (already exists)
- `CartSummary.tsx` (already exists)

---

### 5. Checkout Components (8)

#### CheckoutFlow
Multi-step checkout orchestrator.
```tsx
<CheckoutFlow
  cartTotal={299.99}
  cartItems={items}
  onOrderConfirm={async (orderData) => {
    await submitOrder(orderData);
  }}
/>
```
- **4 Steps**:
  1. Shipping address
  2. Shipping method
  3. Payment method
  4. Order review
- **Features**:
  - Form state persistence
  - Step-by-step validation
  - Back/Next navigation
  - Order summary sidebar (sticky on desktop)
  - Cost breakdown (subtotal, tax, shipping, total)

#### CheckoutProgress
Visual progress indicator.
```tsx
<CheckoutProgress
  currentStep={1}
  steps={[
    { id: 'shipping', label: 'Address' },
    { id: 'shippingMethod', label: 'Shipping' },
    { id: 'payment', label: 'Payment' },
    { id: 'review', label: 'Review' },
  ]}
/>
```
- **Features**:
  - Checkmarks for completed steps
  - Current step highlight
  - Connection lines between steps
  - Responsive (labels hidden on mobile)

#### ShippingAddressForm
Address validation form.
```tsx
<ShippingAddressForm
  data={formData.shippingAddress}
  onChange={(address) => handleAddressChange(address)}
/>
```
- **Fields**:
  - Street address (required)
  - Apartment/Suite (optional)
  - City (required)
  - Postal code (required)
  - State (optional)
  - Country dropdown (required)
  - Phone number (required)
- **Validation**: Zod schema with real-time error display
- **Accessibility**: ARIA labels, error descriptions

#### ShippingMethodSelector
Shipping option selector.
```tsx
<ShippingMethodSelector
  selectedMethod="standard"
  onChange={(method) => handleShippingChange(method)}
  costs={{ standard: 10, express: 25, pickup: 0 }}
/>
```
- **Options**:
  - Standard (5-7 days) - $10
  - Express (2-3 days) - $25
  - Pickup in store (Immediate) - Free
- **Features**:
  - Cost display per method
  - Estimated delivery time
  - Radio button selection

#### PaymentMethodSelector
Payment method selection with forms.
```tsx
<PaymentMethodSelector
  selectedMethod={paymentMethod}
  onChange={(method) => handlePaymentChange(method)}
/>
```
- **Payment Methods**:
  1. **Credit/Debit Card**
     - Card number (16 digits)
     - Cardholder name
     - Expiry month/year
     - CVV (3-4 digits)
  2. **PayPal**
     - Email address
  3. **MercadoPago**
     - Hosted payment form
  4. **Bank Transfer**
     - Bank name
     - Account number
- **Validation**: Zod discriminated union
- **Features**:
  - Conditional form display per method
  - Secure payment notice

#### OrderReview
Order summary before confirmation.
```tsx
<OrderReview
  shippingAddress={address}
  shippingMethod="standard"
  paymentMethod={payment}
  cartItems={items}
  subtotal={200}
  tax={42}
  shippingCost={10}
  total={252}
/>
```
- **Displays**:
  - Cart items with images
  - Shipping address summary
  - Shipping method
  - Payment method details
  - Cost breakdown (subtotal, tax, shipping, total)
  - Terms agreement checkbox

#### OrderConfirmation
Success screen after order placement.
```tsx
<OrderConfirmation
  orderNumber="ORD-2024-001234"
  estimatedDelivery="Oct 31, 2024"
  trackingUrl="https://tracking.example.com"
  orderDate="Oct 25, 2024"
  recipientEmail="customer@example.com"
/>
```
- **Features**:
  - Success checkmark icon
  - Order number display
  - Estimated delivery date
  - Email confirmation notice
  - Tracking link
  - What's next steps
  - Support contact link
  - Continue shopping button

---

## Validation Schemas

### Zod Schemas Location
`lib/validation/checkout.schema.ts`

### Schemas

#### ShippingAddressSchema
```ts
{
  street: string (min 5 chars)
  city: string (min 2 chars)
  postalCode: string (min 3 chars)
  phone: string (valid phone regex)
  country: string (2-letter ISO code)
  state?: string (optional)
  apartment?: string (optional)
}
```

#### ShippingMethodSchema
```ts
'standard' | 'express' | 'pickup'
```

#### PaymentMethodSchema
Discriminated union by `type`:
- `card`: { cardNumber, cardholderName, expiryMonth, expiryYear, cvv }
- `paypal`: { email }
- `mercadopago`: {} (no additional fields)
- `bank_transfer`: { bankName, accountNumber }

#### CheckoutSchema
```ts
{
  shippingAddress: ShippingAddressSchema
  shippingMethod: ShippingMethodSchema
  paymentMethod: PaymentMethodSchema
}
```

### Validation Helper
```ts
validateCheckoutStep(step: string, data: any): { valid: boolean; errors?: Record<string, string> }
```

---

## Usage Examples

### Complete Checkout Flow
```tsx
import { CheckoutFlow } from '@/components/tienda';

export default function CheckoutPage() {
  const cart = useCart();

  const handleOrderConfirm = async (orderData) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    // Redirect to confirmation page
  };

  return (
    <CheckoutFlow
      cartTotal={cart.total}
      cartItems={cart.items}
      onOrderConfirm={handleOrderConfirm}
    />
  );
}
```

### Product Listing with Filters
```tsx
import {
  ProductGrid,
  FilterSidebar,
  SortDropdown,
  SearchBar,
} from '@/components/tienda';

export default function ProductsPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({...});
  const [sort, setSort] = useState('newest');

  return (
    <div className="flex gap-6">
      <FilterSidebar
        categories={categories}
        minPrice={0}
        maxPrice={5000}
        filters={filters}
        onFilterChange={setFilters}
      />
      
      <div className="flex-1">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
        />
        
        <SortDropdown value={sort} onChange={setSort} />
        
        <ProductGrid>
          {products.map(p => <ProductCard key={p.id} producto={p} />)}
        </ProductGrid>
      </div>
    </div>
  );
}
```

### Product Detail Page
```tsx
import {
  ProductCarousel,
  ProductSpecs,
  ProductReviews,
  RelatedProducts,
} from '@/components/tienda';

export default function ProductPage({ product }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ProductCarousel
        images={product.images}
        productName={product.name}
      />
      
      <div>
        <h1>{product.name}</h1>
        <p className="text-2xl">${product.price}</p>
        
        <ProductSpecs specs={product.specifications} />
        
        <ProductReviews
          reviews={product.reviews}
          averageRating={product.rating}
        />
        
        <RelatedProducts products={product.relatedProducts} />
      </div>
    </div>
  );
}
```

---

## Styling & Theming

### Design System
- **Brand Color**: `#D97757` (orange-red)
- **Focus Color**: `#D97757` with ring
- **Text**: Gray scale for hierarchy
- **Shadows**: Subtle on hover, hover effects

### Tailwind Configuration
Components use standard Tailwind CSS:
- `grid-cols-{1,2,4}` for responsive grids
- `border`, `rounded-lg` for borders
- `flex`, `items-center`, `justify-between` for layouts
- `bg-*`, `text-*` for colors
- `transition` for smooth interactions

### Dark Mode
Components include dark mode support via:
- `dark:bg-gray-900`, `dark:text-white`
- High contrast maintained
- No hardcoded colors

---

## Accessibility Features

### WCAG AA Compliance
- ✅ Semantic HTML (`<button>`, `<input>`, `<select>`, `<label>`)
- ✅ ARIA labels on form fields
- ✅ Error descriptions linked to inputs (`aria-describedby`)
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus visible (`:focus-ring` on inputs)
- ✅ Color contrast (4.5:1 minimum)
- ✅ Alt text on images

### Keyboard Navigation
- **Tab**: Move between fields
- **Shift+Tab**: Move backwards
- **Enter**: Submit forms, activate buttons
- **Escape**: Close modals/filters
- **Arrow Keys**: Navigate carousel images, sliders

### Screen Readers
- Form fields have associated labels
- Error messages linked to inputs
- Images have alt text
- Buttons have aria-labels
- Live regions for loading states (`aria-busy`)

---

## Responsive Design

### Breakpoints (Tailwind)
- **Mobile**: < 768px (1 column)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (3-4 columns)

### Mobile Optimizations
- Full-width inputs
- Stacked buttons
- Filter sidebar as modal/overlay
- Touch-friendly tap targets (44x44px minimum)
- Horizontal scroll for thumbnails

---

## Testing

### Test Coverage
Located in `__tests__/` directories:
- `FilterSidebar.test.tsx` - Filter state management
- `PriceRangeSlider.test.tsx` - Range logic and constraints
- `checkout.schema.test.ts` - Form validation (Zod schemas)

### Running Tests
```bash
npm run test
npm run test:ui     # Vitest UI
npm run test:watch  # Watch mode
```

### Example Test
```ts
it('validates complete checkout data', () => {
  const checkout = { shippingAddress: {...}, ... };
  const result = CheckoutSchema.safeParse(checkout);
  expect(result.success).toBe(true);
});
```

---

## Internationalization (i18n)

### Translation Keys Used
Components use `next-intl` with these key patterns:

#### Product Display
- `common.stock`, `common.outOfStock`
- `common.added`, `common.adding`
- `common.noImage`, `common.gallery`
- `common.image`, `common.of`, `common.previousImage`, `common.nextImage`
- `common.view`, `common.outOf`, `common.review`, `common.reviews`
- `common.verifiedPurchase`, `common.noReviewsYet`
- `common.specification`, `common.value`, `common.noSpecifications`

#### Filters
- `tienda.categories`, `tienda.filter`, `tienda.priceRange`
- `tienda.availability`, `tienda.inStock`, `tienda.outOfStock`
- `tienda.rating`, `tienda.5stars`, `tienda.4starsAndUp`, etc.
- `tienda.filters`, `tienda.relatedProducts`

#### Search
- `tienda.searchPlaceholder`, `tienda.searchProducts`
- `tienda.noProductsFound`
- `tienda.sortBy`, `tienda.sortNewest`, `tienda.sortPrice*`, etc.

#### Checkout
- `checkout.shippingAddress`, `checkout.street`, `checkout.city`, etc.
- `checkout.shippingMethod`, `checkout.paymentMethod`
- `checkout.creditDebitCard`, `checkout.bankTransfer`
- `checkout.orderReview`, `checkout.confirmOrder`
- `checkout.orderConfirmed`, `checkout.orderNumber`

### Adding Translations
Add to `messages/en.json`, `messages/es.json`:
```json
{
  "tienda": {
    "filters": "Filters",
    "priceRange": "Price Range"
  }
}
```

---

## Performance Considerations

### Debouncing
- SearchBar: 300ms debounce on input
- Real-time validation on form fields

### Lazy Loading
- Images: Use Next.js `<Image>` with `priority=false`
- Components: Dynamic import for heavy modals/popovers

### State Management
- FilterSidebar manages local state
- CheckoutFlow uses local component state
- No global store required (can integrate with Redux/Zustand)

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: Latest versions

---

## Known Limitations

1. **Search Results**: Component is presentational; backend integration needed
2. **Payment Methods**: Forms are UI-only; requires API integration (Stripe, PayPal SDK, etc.)
3. **Image Carousel**: Touch swipe support ready but not implemented (can use react-touch-events)
4. **Price Range**: CSS-only styling may vary across browsers (Safari CSS issues with range inputs)

---

## Future Enhancements

- [ ] Wishlist/Save for later functionality
- [ ] Product comparison view
- [ ] Guest checkout option
- [ ] Address autocomplete (Google Places API)
- [ ] Multi-language support for validation messages
- [ ] Coupon/discount code input
- [ ] Order tracking integration
- [ ] Review submission form
- [ ] Size/color variant selectors
- [ ] Quantity stepper in cart items

---

## Troubleshooting

### Components Not Rendering
- Ensure `next-intl` is configured in `i18n.config.ts`
- Check that translation keys exist in message files
- Verify `@` path alias in `tsconfig.json`

### Validation Errors
- Ensure zod is installed: `npm install zod`
- Check schema versions match expected format
- Use `safeParse()` to catch validation errors

### Styling Issues
- Verify Tailwind CSS is configured in `tailwind.config.ts`
- Check CSS order: globals.css should be imported in layout
- Clear `.next` build cache: `rm -rf .next && npm run build`

### Mobile Filter Sidebar Not Closing
- Ensure `md:` breakpoint is respected in parent layout
- Check z-index stacking context (overlay is `z-30`, sidebar is `z-40`)

---

## Contributing

When adding new components:
1. Follow the established file structure
2. Add TypeScript interfaces for props
3. Include ARIA labels and semantic HTML
4. Test responsive behavior (mobile, tablet, desktop)
5. Add unit tests in `__tests__/` folder
6. Document in this guide
7. Export from `index.ts` barrel file

---

## References

- [Tailwind CSS Docs](https://tailwindcss.com)
- [Zod Docs](https://zod.dev)
- [next-intl Docs](https://next-intl-docs.vercel.app)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## License

Part of the Wapsell Platform - See main repository LICENSE
