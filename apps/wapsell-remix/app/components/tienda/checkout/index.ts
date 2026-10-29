/**
 * Checkout Components - Barrel export
 */

// Schema and types
export {
  ShippingAddressSchema,
  ShippingMethodSchema,
  PaymentMethodSchema,
  CardDetailsSchema,
  CouponCodeSchema,
  CheckoutSchema,
  SHIPPING_COSTS,
  type ShippingAddressInput,
  type ShippingMethodInput,
  type PaymentMethodInput,
  type CardDetailsInput,
  type CouponCodeInput,
  type CheckoutInput,
  type ShippingMethod,
  type ShippingMethodInfo,
} from './checkout.schema';

// Components
export { ShippingAddressForm } from './ShippingAddressForm';
export type { ShippingAddressFormProps } from './ShippingAddressForm';

export { ShippingMethodSelector } from './ShippingMethodSelector';
export type { ShippingMethodSelectorProps } from './ShippingMethodSelector';

export { PaymentMethodSelector } from './PaymentMethodSelector';
export type { PaymentMethodSelectorProps } from './PaymentMethodSelector';

export { OrderReview } from './OrderReview';
export type { OrderReviewProps, CartItem } from './OrderReview';

export { CheckoutFlow } from './CheckoutFlow';
export type { CheckoutFlowProps, CheckoutStep } from './CheckoutFlow';

export { OrderConfirmation } from './OrderConfirmation';
export type { OrderConfirmationProps } from './OrderConfirmation';
