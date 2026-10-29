// Payment and receipt types for POS system
// Extends apps/api/src payment contracts

export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED' | 'QR';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Cash payment: full amount in cash
 */
export interface CashPayment {
  method: 'CASH';
  amount: number;
  amountReceived?: number; // Actual cash received (may be >= amount for change)
  change?: number; // Change to return
}

/**
 * Card payment: credit/debit card via Mercado Pago or similar
 */
export interface CardPayment {
  method: 'CARD';
  cardNumber: string; // Masked or tokenized
  cardholderName: string;
  expiryMonth: number; // 1-12
  expiryYear: number; // 4-digit year
  cvv: string; // 3-4 digits, not stored after validation
  amount: number;
  installments?: number; // Number of payment installments
}

/**
 * Mixed payment: combination of cash and card
 */
export interface MixedPayment {
  method: 'MIXED';
  cashAmount: number;
  cardAmount: number;
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  installments?: number;
  amountReceived?: number; // Cash received
  change?: number; // Cash change
}

/**
 * QR payment: Mercado Pago or similar QR code
 */
export interface QRPayment {
  method: 'QR';
  amount: number;
  qrReference: string; // Transaction ID from QR provider
  provider: 'MERCADO_PAGO' | 'OTHER';
}

/**
 * Union of all payment types
 */
export type Payment = CashPayment | CardPayment | MixedPayment | QRPayment;

/**
 * Receipt representation
 */
export interface Receipt {
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
  tax?: number; // IVA or similar
  total: number;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  change?: number;
  notes?: string;
  issuedAt: Date;
  userName: string;
  cajaId?: string;
}

export interface ReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
  lineTotal: number;
}

/**
 * Server action response after payment processing
 */
export interface PaymentResponse {
  success: boolean;
  saleId: string;
  receiptId: string;
  receipt: Receipt;
  message?: string;
  error?: string;
}
