export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  providerIntentId: string;
  monto: number;
  moneda: string;
  estado: string;
}

export interface PaymentConfirmResult {
  paymentId: string;
  providerPaymentId: string;
  estado: string;
  monto: number;
  ultimos4Digitos?: string;
}

export interface PaymentStatusResult {
  estado: string;
  monto: number;
  moneda: string;
  metodo?: string;
  ultimos4Digitos?: string;
  providerPaymentId: string;
}

export interface RefundResult {
  refundId: string;
  providerRefundId: string;
  monto: number;
  estado: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  payload?: any;
}

export interface IPaymentProvider {
  createPaymentIntent(monto: number, moneda: string, metadata: any): Promise<PaymentIntentResult>;
  confirmPayment(intentId: string, paymentMethod?: string): Promise<PaymentConfirmResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
  refundPayment(paymentId: string, monto: number, razon: string): Promise<RefundResult>;
  verifyWebhookSignature(signature: string, payload: any): Promise<WebhookVerificationResult>;
}
