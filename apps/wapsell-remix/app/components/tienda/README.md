# Tienda (Online Store) UI Components

Complete set of reusable React components for building an e-commerce storefront. Designed with responsive design, accessibility, and user experience in mind. All components use Tailwind CSS for styling.

## Component Categories

### Product Components

#### ProductCard
Individual product display card with image, name, price, discount, rating, and add-to-cart button.

```tsx
<ProductCard
  product={product}
  onAddToCart={handleAddToCart}
  onViewDetails={handleViewDetails}
  rating={4.5}
  reviewCount={128}
/>
```

**Features:**
- Responsive design with hover effects
- Discount badge display
- Out-of-stock state
- Stock count display
- Rating stars with review count

#### ProductGrid
Responsive grid layout for displaying multiple products. Automatically adjusts columns based on screen size (1 mobile, 2 tablet, 3+ desktop).

```tsx
<ProductGrid
  products={products}
  onAddToCart={handleAddToCart}
  onViewDetails={handleViewDetails}
  loading={isLoading}
  emptyMessage="No products found"
/>
```

**Features:**
- Responsive columns (mobile/tablet/desktop)
- Loading skeleton state
- Empty state handling
- Customizable column counts

#### ProductCarousel
Image slider for product detail views with keyboard/touch navigation and thumbnail selection.

```tsx
<ProductCarousel
  images={productImages}
  productName={product.nombre}
  onImageChange={handleImageChange}
/>
```

**Features:**
- Arrow navigation (keyboard + buttons)
- Thumbnail selection
- Image counter
- Smooth transitions
- Touch-friendly controls

#### ProductReviews
Displays customer reviews with ratings and allows adding new reviews.

```tsx
<ProductReviews
  productId={productId}
  reviews={reviews}
  averageRating={4.2}
  totalReviews={156}
  onSubmitReview={handleSubmitReview}
/>
```

**Features:**
- Rating distribution visualization
- Write review form with validation
- Star rating system
- Helpful/not helpful buttons
- Review sorting and pagination ready

#### ProductSpecs
Specifications table displaying product attributes organized by category.

```tsx
<ProductSpecs
  product={product}
  additionalSpecs={customSpecs}
/>
```

**Features:**
- Category-based organization
- Clean tabular layout
- Additional specs support
- Shipping info box

#### RelatedProducts
Horizontal scrollable carousel for displaying related/recommended products.

```tsx
<RelatedProducts
  products={relatedProducts}
  onAddToCart={handleAddToCart}
  onViewDetails={handleViewDetails}
  title="Related Products"
/>
```

**Features:**
- Smooth horizontal scrolling
- Navigation arrows
- Touch-friendly
- Responsive to viewport changes

### Filter Components

#### CategoryFilter
Multi-select category filtering with familia/subfamilia hierarchy.

```tsx
<CategoryFilter
  familias={familias}
  subfamilias={subfamilias}
  selectedFamilias={selectedFamilias}
  selectedSubfamilias={selectedSubfamilias}
  onFamiliaChange={handleFamiliaChange}
  onSubfamiliaChange={handleSubfamiliaChange}
/>
```

**Features:**
- Expandable family categories
- Nested subfamily structure
- Active filter tags
- Quick removal of filters

#### PriceRangeSlider
Dual slider for min/max price selection with manual input support.

```tsx
<PriceRangeSlider
  minPrice={0}
  maxPrice={5000}
  selectedMin={selectedMin}
  selectedMax={selectedMax}
  onMinChange={handleMinChange}
  onMaxChange={handleMaxChange}
  step={10}
  currency="$"
/>
```

**Features:**
- Dual slider with visual track
- Manual input fields
- Reset button
- Step control
- Currency symbol

#### AvailabilityFilter
In-stock toggle filter with delivery options (placeholder).

```tsx
<AvailabilityFilter
  showInStockOnly={showInStockOnly}
  onToggle={handleToggle}
  onlyInStockCount={342}
/>
```

**Features:**
- In-stock only toggle
- Information box
- Delivery options (future)
- Product count display

#### RatingFilter
Star rating filter with distribution visualization.

```tsx
<RatingFilter
  minRating={minRating}
  onMinRatingChange={handleRatingChange}
  ratingDistribution={ratings}
  totalProducts={562}
/>
```

**Features:**
- 5-star rating selection
- Progress bars per rating
- Rating distribution data
- All ratings option
- Reset functionality

#### FilterSidebar
Combined responsive filter panel with all filters integrated.

```tsx
<FilterSidebar
  familias={familias}
  subfamilias={subfamilias}
  filters={filters}
  minPriceRange={0}
  maxPriceRange={10000}
  onFiltersChange={handleFiltersChange}
  onReset={handleReset}
  isOpen={isSidebarOpen}
  onClose={handleCloseSidebar}
  isMobile={isMobile}
/>
```

**Features:**
- All filters in one panel
- Collapsible sections
- Mobile modal mode
- Desktop sidebar mode
- Reset all filters button
- Active filter summary

### Search Components

#### SearchBar
Product search with debounced autocomplete suggestions.

```tsx
<SearchBar
  onSearch={handleSearch}
  onSuggestionSelect={handleSuggestionSelect}
  suggestions={suggestions}
  loading={isSearching}
  placeholder="Search products..."
  debounceDelay={300}
/>
```

**Features:**
- Debounced search
- Autocomplete suggestions
- Loading state
- Clear button
- Click-outside detection
- "View all results" link

#### SearchResults
Display and manage search results with sorting and empty states.

```tsx
<SearchResults
  query={searchQuery}
  products={results}
  totalCount={totalCount}
  sortBy={sortBy}
  onSortChange={handleSortChange}
  onAddToCart={handleAddToCart}
  onViewDetails={handleViewDetails}
  onClearSearch={handleClearSearch}
/>
```

**Features:**
- Result count display
- Sort integration
- Empty state with suggestions
- Load more button
- Pagination ready

#### SortDropdown
Product sorting selector with multiple options.

```tsx
<SortDropdown
  value={sortBy}
  onChange={handleSortChange}
  options={sortOptions}
  label="Sort by:"
/>
```

**Features:**
- 6 sort options (relevance, price asc/desc, newest, popular, rating)
- Visual icons per option
- Selected indicator
- Responsive width

### Cart Components

#### CartItem
Individual cart item with quantity controls and remove button.

```tsx
<CartItem
  item={cartItem}
  onQuantityChange={handleQuantityChange}
  onRemove={handleRemove}
  imageUrl={productImage}
/>
```

**Features:**
- Product image, name, code
- Price display with discount
- Quantity selector (input + buttons)
- Subtotal calculation
- Remove button

#### CartSummary
Order summary with subtotal, tax, discount, and total.

```tsx
<CartSummary
  subtotal={subtotal}
  taxRate={21}
  discount={discount}
  itemCount={itemCount}
  onPromoCodeChange={handlePromoCode}
  onCheckout={handleCheckout}
  onContinueShopping={handleContinueShopping}
  checkoutText="Checkout"
/>
```

**Features:**
- Subtotal/tax/discount breakdown
- Promo code input with validation
- Total calculation
- Checkout button
- Continue shopping button
- Sticky positioning
- Security info
- Price guarantee info

## Installation & Usage

### Basic Setup

```tsx
import {
  ProductCard,
  ProductGrid,
  SearchBar,
  FilterSidebar,
  CartItem,
  CartSummary,
} from '@/components/tienda';

// Use in your routes
export function TiendaPage() {
  const [products, setProducts] = useState<ProductoTienda[]>([]);
  const [cart, setCart] = useState<CartItemData[]>([]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <FilterSidebar {...filterProps} />
      <ProductGrid products={products} onAddToCart={addToCart} />
    </div>
  );
}
```

### State Management Pattern

```tsx
interface FilterState {
  familias: string[];
  subfamilias: string[];
  minPrice: number;
  maxPrice: number;
  onlyInStock: boolean;
  minRating: number;
}

const [filters, setFilters] = useState<FilterState>({
  familias: [],
  subfamilias: [],
  minPrice: 0,
  maxPrice: 10000,
  onlyInStock: false,
  minRating: 0,
});

const applyFilters = useCallback(() => {
  const filtered = products.filter(p => {
    const priceInRange = p.precio >= filters.minPrice && p.precio <= filters.maxPrice;
    const categoryMatch = filters.familias.length === 0 || 
      filters.familias.includes(p.familiaId);
    const inStock = !filters.onlyInStock || p.disponible;
    
    return priceInRange && categoryMatch && inStock;
  });
  
  setFilteredProducts(filtered);
}, [filters, products]);
```

## Design System

### Responsive Breakpoints
- **Mobile**: `<640px` - 1 column, full-width filters
- **Tablet**: `640px-1024px` - 2 columns, sidebar filters
- **Desktop**: `>1024px` - 3+ columns, full sidebar

### Color Palette
- Primary: Blue (`#2563eb`) - CTAs, highlights
- Success: Green (`#10b981`) - Discounts, available
- Warning: Red (`#ef4444`) - Out of stock, errors
- Neutral: Gray (`#6b7280`) - Text, borders
- Background: White with gray accents

### Typography
- Headings: `font-bold` (18px-24px)
- Body: `text-sm/base` (14px-16px)
- Labels: `text-xs/sm` (12px-14px)

### Spacing
- Gap between components: `gap-6`
- Padding: `p-4` to `p-6`
- Margin: `mb-4` to `mb-6`

## Accessibility

All components follow WCAG 2.1 AA standards:
- Semantic HTML (buttons, labels, inputs)
- ARIA labels for icons
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Alt text for images

## Performance Considerations

1. **Lazy Loading**: Use React.lazy for route-level components
2. **Memoization**: ProductCard uses React.forwardRef for optimization
3. **Debouncing**: SearchBar implements 300ms debounce
4. **Image Optimization**: Use Next.js Image component in routes
5. **Pagination**: Implement server-side pagination for large product lists

## Type Safety

All components are fully typed with TypeScript. Key types:

```tsx
// From @wapsell/types
ProductoTienda, Familia, Subfamilia, etc.

// Component-specific types
CartItemData, FilterState, Review, SearchSuggestion, etc.
```

## Future Enhancements

- [ ] Size/color variant selection
- [ ] Wishlist integration
- [ ] Stock notifications
- [ ] Live chat support
- [ ] Augmented reality preview
- [ ] Customer photos/videos
- [ ] Similar items detection
- [ ] Trending products widget
- [ ] Social proof notifications
- [ ] Advanced analytics

## Contributing

When adding new features:
1. Maintain type safety
2. Follow Tailwind CSS conventions
3. Add accessibility attributes
4. Test responsive layouts
5. Document props and usage
6. Export from index.ts
