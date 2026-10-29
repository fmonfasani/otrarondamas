/**
 * Tienda Components - Barrel Export
 * Product Display, Filters, Search, Cart, and Checkout Components
 */

// Product Display
export { default as ProductGrid } from './ProductGrid';
export { default as ProductCarousel } from './ProductCarousel';
export { default as ProductReviews } from './ProductReviews';
export { default as ProductSpecs } from './ProductSpecs';
export { default as RelatedProducts } from './RelatedProducts';

// Filters
export { default as CategoryFilter } from './CategoryFilter';
export { default as PriceRangeSlider } from './PriceRangeSlider';
export { default as AvailabilityFilter } from './AvailabilityFilter';
export { default as RatingFilter } from './RatingFilter';
export { default as FilterSidebar, type FilterState } from './FilterSidebar';

// Search
export { default as SearchBar } from './SearchBar';
export { default as SearchResults } from './SearchResults';
export { default as SortDropdown } from './SortDropdown';

// Checkout
export { default as CheckoutFlow } from './CheckoutFlow';
export { default as CheckoutProgress } from './CheckoutProgress';
export { default as ShippingAddressForm } from './ShippingAddressForm';
export { default as ShippingMethodSelector } from './ShippingMethodSelector';
export { default as PaymentMethodSelector } from './PaymentMethodSelector';
export { default as OrderReview } from './OrderReview';
export { default as OrderConfirmation } from './OrderConfirmation';
