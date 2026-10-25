/**
 * ProductCard Component Specification
 *
 * This file documents the test cases and behavioral specifications for ProductCard.
 * Test implementation should use Jest/Vitest + React Testing Library.
 *
 * Component: apps/tienda-online/src/components/ProductCard.tsx
 */

export const PRODUCT_CARD_SPECS = {
  // Test Suite 1: Rendering
  rendering: {
    'should render product card with all elements': {
      given: 'product with id, name, image, price, rating, stock',
      when: 'component is rendered',
      then: 'card displays name, image, price, rating, and add to cart button',
    },
    'should render product name with truncation to 2 lines': {
      given: 'product with long name',
      when: 'component is rendered',
      then: 'name element has WebkitLineClamp: 2 and overflow: hidden',
    },
    'should render placeholder image when product image is not provided': {
      given: 'product with image: null',
      when: 'component is rendered',
      then: 'SVG placeholder image is displayed',
    },
    'should render actual image when product image is provided': {
      given: 'product with image: "https://example.com/image.jpg"',
      when: 'component is rendered',
      then: 'img element with correct src and alt text is displayed',
    },
  },

  // Test Suite 2: Pricing and Discounts
  pricing: {
    'should display current price and original price when discount is applied': {
      given: 'product with price: 100, discountPrice: 80',
      when: 'component is rendered',
      then: 'current price shows $80 and original price shows $100 with strikethrough',
    },
    'should only display current price when no discount is applied': {
      given: 'product with price: 100, discountPrice: undefined',
      when: 'component is rendered',
      then: 'only $100 is displayed, no strikethrough price',
    },
    'should not show discount badge when discount price is higher than regular price': {
      given: 'product with price: 100, discountPrice: 120',
      when: 'component is rendered',
      then: 'discount badge is not displayed',
    },
    'should display discount badge when discount is applied': {
      given: 'product with price: 100, discountPrice: 80',
      when: 'component is rendered',
      then: 'discount badge with text "Sale" is displayed at top-left',
    },
  },

  // Test Suite 3: Stock Status
  stock: {
    'should display stock badge when stock is less than 5': {
      given: 'product with stock: 2',
      when: 'component is rendered',
      then: '"Low Stock" badge is displayed at bottom-right',
    },
    'should not display stock badge when stock is 5 or more': {
      given: 'product with stock: 5',
      when: 'component is rendered',
      then: 'stock badge is not displayed',
    },
    'should display out of stock message when stock is 0': {
      given: 'product with stock: 0',
      when: 'component is rendered',
      then: '"Out of Stock" message is displayed instead of add button, card opacity is 0.6',
    },
  },

  // Test Suite 4: Rating Display
  rating: {
    'should display rating stars and review count': {
      given: 'product with rating: 4, reviewCount: 10',
      when: 'component is rendered',
      then: '5 stars are displayed (4 filled, 1 empty) and "(10)" is shown',
    },
    'should not display rating when rating is undefined': {
      given: 'product with rating: undefined',
      when: 'component is rendered',
      then: 'rating section is not rendered',
    },
  },

  // Test Suite 5: Button Handlers
  handlers: {
    'should call onAddToCart when add to cart button is clicked': {
      given: 'component with onAddToCart handler',
      when: 'add to cart button is clicked',
      then: 'onAddToCart is called once',
    },
    'should call onClick when product card image is clicked': {
      given: 'component with onClick handler',
      when: 'image container is clicked',
      then: 'onClick is called once',
    },
    'should not show add to cart button when product is out of stock': {
      given: 'product with stock: 0',
      when: 'component is rendered',
      then: 'add to cart button is not displayed',
    },
  },

  // Test Suite 6: Accessibility
  accessibility: {
    'should have proper heading hierarchy with h3': {
      given: 'product name element',
      when: 'component is rendered',
      then: 'product name is wrapped in <h3> tag',
    },
    'should have accessible button with type attribute': {
      given: 'add to cart button',
      when: 'component is rendered',
      then: 'button has type="button" attribute',
    },
    'should have alt text for images': {
      given: 'product image element',
      when: 'component is rendered',
      then: 'image has alt text matching product name',
    },
  },
};

export const PRODUCT_CARD_TEST_CASES = [
  {
    id: 'PC-001',
    name: 'Render basic product card',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'PC-002',
    name: 'Display discount badge and pricing',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'PC-003',
    name: 'Show low stock badge',
    priority: 'high',
    type: 'functional',
  },
  {
    id: 'PC-004',
    name: 'Disable button when out of stock',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'PC-005',
    name: 'Handle click events correctly',
    priority: 'high',
    type: 'functional',
  },
  {
    id: 'PC-006',
    name: 'Display rating and reviews',
    priority: 'medium',
    type: 'functional',
  },
  {
    id: 'PC-007',
    name: 'Accessibility compliance',
    priority: 'high',
    type: 'a11y',
  },
] as const;
