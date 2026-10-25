/**
 * CartItem Component Specification
 *
 * This file documents the test cases and behavioral specifications for CartItem.
 * Test implementation should use Jest/Vitest + React Testing Library.
 *
 * Component: apps/tienda-online/src/components/CartItem.tsx
 */

export const CART_ITEM_SPECS = {
  // Test Suite 1: Rendering
  rendering: {
    'should render cart item with all elements': {
      given: 'cart item with id, name, price, quantity, maxQuantity',
      when: 'component is rendered',
      then: 'thumbnail, name, price, quantity stepper, remove button are displayed',
    },
    'should render product image thumbnail (64x64)': {
      given: 'cart item with image url',
      when: 'component is rendered',
      then: 'img element with 64x64 dimensions is displayed',
    },
    'should render placeholder image when product image is not provided': {
      given: 'cart item with image: null',
      when: 'component is rendered',
      then: 'SVG placeholder (64x64) is displayed',
    },
  },

  // Test Suite 2: Quantity Controls
  quantity: {
    'should display correct quantity value': {
      given: 'cart item with quantity: 2',
      when: 'component is rendered',
      then: 'quantity display shows "2"',
    },
    'should increment quantity when increment button is clicked': {
      given: 'cart item with quantity: 2, maxQuantity: 10',
      when: 'increment button is clicked',
      then: 'onUpdate is called with 3',
    },
    'should decrement quantity when decrement button is clicked': {
      given: 'cart item with quantity: 2',
      when: 'decrement button is clicked',
      then: 'onUpdate is called with 1',
    },
    'should disable decrement button when quantity is 1': {
      given: 'cart item with quantity: 1',
      when: 'component is rendered',
      then: 'decrement button is disabled and has reduced opacity (0.5)',
    },
    'should disable increment button when quantity equals maxQuantity': {
      given: 'cart item with quantity: 10, maxQuantity: 10',
      when: 'component is rendered',
      then: 'increment button is disabled and has reduced opacity (0.5)',
    },
    'should not call onUpdate if decrement is disabled': {
      given: 'cart item with quantity: 1 and onUpdate handler',
      when: 'decrement button is clicked',
      then: 'onUpdate is not called',
    },
    'should not call onUpdate if increment is disabled': {
      given: 'cart item with quantity: 10, maxQuantity: 10 and onUpdate handler',
      when: 'increment button is clicked',
      then: 'onUpdate is not called',
    },
  },

  // Test Suite 3: Pricing
  pricing: {
    'should display correct unit price': {
      given: 'cart item with price: 100',
      when: 'component is rendered',
      then: 'price display shows "$100 each"',
    },
    'should calculate and display correct total price': {
      given: 'cart item with price: 100, quantity: 2',
      when: 'component is rendered',
      then: 'total price displays "$200.00"',
    },
    'should update total price when quantity changes': {
      given: 'cart item with price: 100, quantity: 3',
      when: 'component is rendered',
      then: 'total price displays "$300.00"',
    },
    'should display quantity multiplier': {
      given: 'cart item with quantity: 2',
      when: 'component is rendered',
      then: 'next to total price, "2x" is displayed',
    },
  },

  // Test Suite 4: Remove Functionality
  remove: {
    'should call onRemove when remove button is clicked': {
      given: 'component with onRemove handler',
      when: 'remove button is clicked',
      then: 'onRemove is called once',
    },
    'should have accessible remove button': {
      given: 'remove button element',
      when: 'component is rendered',
      then: 'button has type="button" and contains text "Remove"',
    },
  },

  // Test Suite 5: Layout and Styling
  layout: {
    'should have flex layout with proper gap': {
      given: 'cart item container',
      when: 'component is rendered',
      then: 'container has display: flex, gap: 12px',
    },
    'should position remove button on the right side': {
      given: 'remove button',
      when: 'component is rendered',
      then: 'remove button has marginLeft: auto',
    },
    'should have rounded corners on thumbnail': {
      given: 'image container',
      when: 'component is rendered',
      then: 'container has borderRadius: var(--radius-sm)',
    },
  },

  // Test Suite 6: Button Styling
  styling: {
    'should display decrement button with minus symbol': {
      given: 'decrement button',
      when: 'component is rendered',
      then: 'button displays "−"',
    },
    'should display increment button with plus symbol': {
      given: 'increment button',
      when: 'component is rendered',
      then: 'button displays "+"',
    },
    'should have red/danger styling on remove button': {
      given: 'remove button',
      when: 'component is rendered',
      then: 'button has color: var(--state-danger) and border: 1px solid var(--state-danger)',
    },
  },

  // Test Suite 7: Edge Cases
  edgeCases: {
    'should handle minimum quantity (1)': {
      given: 'cart item with quantity: 1',
      when: 'component is rendered',
      then: 'decrement button is disabled and total price is correct',
    },
    'should handle maximum quantity': {
      given: 'cart item with quantity: maxQuantity',
      when: 'component is rendered',
      then: 'increment button is disabled',
    },
    'should handle decimal prices correctly': {
      given: 'cart item with price: 19.99, quantity: 3',
      when: 'component is rendered',
      then: 'total price displays "$59.97"',
    },
  },
};

export const CART_ITEM_TEST_CASES = [
  {
    id: 'CI-001',
    name: 'Render cart item with thumbnail and details',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'CI-002',
    name: 'Increment/decrement quantity',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'CI-003',
    name: 'Disable quantity buttons at limits',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'CI-004',
    name: 'Calculate total price correctly',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'CI-005',
    name: 'Remove item from cart',
    priority: 'critical',
    type: 'functional',
  },
  {
    id: 'CI-006',
    name: 'Handle decimal prices',
    priority: 'high',
    type: 'functional',
  },
] as const;
