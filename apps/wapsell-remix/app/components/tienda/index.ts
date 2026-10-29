/**
 * Tienda (Online Store) UI Components
 *
 * Product Components:
 * - ProductCard: Individual product display
 * - ProductGrid: Responsive grid layout
 * - ProductCarousel: Image slider for details
 * - ProductReviews: Reviews list and form
 * - ProductSpecs: Specifications table
 * - RelatedProducts: Recommendation carousel
 *
 * Filter Components:
 * - CategoryFilter: Category selection with checkboxes
 * - PriceRangeSlider: Min/max price selector
 * - AvailabilityFilter: In-stock toggle
 * - RatingFilter: Star rating filter
 * - FilterSidebar: Combined filter panel (responsive)
 *
 * Search Components:
 * - SearchBar: Search with autocomplete
 * - SearchResults: Results display and management
 * - SortDropdown: Product sorting selector
 *
 * Cart Components:
 * - CartItem: Individual cart item
 * - CartSummary: Order summary (subtotal, tax, total)
 */

// Product Components
export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';

export { ProductGrid } from './ProductGrid';
export type { ProductGridProps } from './ProductGrid';

export { ProductCarousel } from './ProductCarousel';
export type { ProductCarouselProps } from './ProductCarousel';

export { ProductReviews } from './ProductReviews';
export type { ProductReviewsProps, Review } from './ProductReviews';

export { ProductSpecs } from './ProductSpecs';
export type { ProductSpecsProps, Specification } from './ProductSpecs';

export { RelatedProducts } from './RelatedProducts';
export type { RelatedProductsProps } from './RelatedProducts';

// Filter Components
export { CategoryFilter } from './CategoryFilter';
export type { CategoryFilterProps } from './CategoryFilter';

export { PriceRangeSlider } from './PriceRangeSlider';
export type { PriceRangeSliderProps } from './PriceRangeSlider';

export { AvailabilityFilter } from './AvailabilityFilter';
export type { AvailabilityFilterProps } from './AvailabilityFilter';

export { RatingFilter } from './RatingFilter';
export type { RatingFilterProps, RatingDistribution } from './RatingFilter';

export { FilterSidebar } from './FilterSidebar';
export type { FilterSidebarProps, FilterState } from './FilterSidebar';

// Search Components
export { SearchBar } from './SearchBar';
export type { SearchBarProps, SearchSuggestion } from './SearchBar';

export { SearchResults } from './SearchResults';
export type { SearchResultsProps } from './SearchResults';

export { SortDropdown } from './SortDropdown';
export type { SortDropdownProps, SortOption } from './SortDropdown';

// Cart Components
export { CartItem } from './CartItem';
export type { CartItemProps, CartItemData } from './CartItem';

export { CartSummary } from './CartSummary';
export type { CartSummaryProps } from './CartSummary';
