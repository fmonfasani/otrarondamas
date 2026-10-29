/**
 * Mercado Pago Integration Service
 *
 * Handles:
 * - Payment preference initialization (payment_url, preference_id)
 * - Signature verification (webhook validation)
 * - Payment status queries
 * - Idempotency key management
 */

import { createHmac } from 'crypto';

const MP_BASE_URL = 'https://api.mercadopago.com';
const MP_SANDBOX_URL = 'https://sandbox.mercadopago.com';

interface MPItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

interface MPPaymentPreference {
  items: MPItem[];
  payer?: {
    email?: string;
    name?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: string;
  notification_url?: string;
  external_reference?: string;
  metadata?: Record<string, any>;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  statement_descriptor?: string;
}

interface MPPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  payment_method_id?: string;
  card?: {
    last_four_digits: string;
  };
  amount_refunded?: number;
  date_approved?: string;
  date_created: string;
  date_last_updated: string;
  external_reference?: string;
  metadata?: Record<string, any>;
}

interface IdempotencyEntry {
  order_id: string;
  timestamp: number;
}

// In-memory idempotency key store (should use Redis in production)
const idempotencyStore = new Map<string, IdempotencyEntry>();

// Clean up expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  for (const [key, entry] of idempotencyStore.entries()) {
    if (now - entry.timestamp > twentyFourHours) {
      idempotencyStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

export async function initPaymentPreference(
  order_id: string,
  items: MPItem[],
  shipping_cost: number,
  total: number,
  options: {
    user_email?: string;
    notification_url?: string;
    return_url?: string;
    metadata?: Record<string, any>;
    idempotency_key?: string;
  } = {}
): Promise<{ preference_id: string; payment_url: string }> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new MercadoPagoError(
      'Mercado Pago access token not configured',
      500
    );
  }

  // Check idempotency key
  if (options.idempotency_key) {
    const existing = idempotencyStore.get(options.idempotency_key);
    if (existing) {
      // Return cached order_id
      return {
        preference_id: existing.order_id,
        payment_url: `${MP_SANDBOX_URL}/checkout/v1/redirect?pref_id=${existing.order_id}`,
      };
    }
  }

  const preference: MPPaymentPreference = {
    items,
    payer: {
      email: options.user_email,
    },
    notification_url: options.notification_url,
    back_urls: {
      success: options.return_url,
      failure: options.return_url,
      pending: options.return_url,
    },
    auto_return: 'approved',
    external_reference: order_id,
    metadata: options.metadata,
  };

  try {
    const response = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new MercadoPagoError(
        `Mercado Pago API error: ${error.message || 'Unknown error'}`,
        response.status,
        error
      );
    }

    const data = await response.json() as any;
    const preference_id = data.id;

    // Store in idempotency cache
    if (options.idempotency_key) {
      idempotencyStore.set(options.idempotency_key, {
        order_id: preference_id,
        timestamp: Date.now(),
      });
    }

    return {
      preference_id,
      payment_url: data.init_point || `${MP_SANDBOX_URL}/checkout/v1/redirect?pref_id=${preference_id}`,
    };
  } catch (error) {
    console.error('Failed to initialize Mercado Pago payment:', error);
    if (error instanceof MercadoPagoError) {
      throw error;
    }
    throw new MercadoPagoError(
      'Failed to initialize payment preference',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

export function verifyPaymentSignature(
  signature: string,
  body: Record<string, any>
): boolean {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Mercado Pago webhook secret not configured');
    return false;
  }

  try {
    // Mercado Pago uses x-signature header with format: ts=TIMESTAMP,v1=SIGNATURE
    const [tsHeader, v1Header] = signature.split(',').map((s) => s.trim());

    const [, timestamp] = tsHeader.split('=');
    const [, receivedSignature] = v1Header.split('=');

    // Validate timestamp (not older than 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);

    if (isNaN(signatureTime) || now - signatureTime > 300) {
      console.warn('Signature timestamp too old or invalid');
      return false;
    }

    // Create request string: "ID:TIMESTAMP:SECRET"
    const id = body.id || body.data?.id || '';
    const requestString = `${id}:${timestamp}:${webhookSecret}`;

    // Create HMAC SHA256
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(requestString)
      .digest('hex');

    return receivedSignature === expectedSignature;
  } catch (error) {
    console.error('Error verifying Mercado Pago signature:', error);
    return false;
  }
}

export async function getPaymentStatus(
  payment_id: string
): Promise<{
  status: string;
  amount: number;
  date: string;
  payment_method?: string;
  last_four_digits?: string;
  metadata?: Record<string, any>;
}> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new MercadoPagoError(
      'Mercado Pago access token not configured',
      500
    );
  }

  try {
    const response = await fetch(`${MP_BASE_URL}/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new MercadoPagoError(
        `Failed to fetch payment status: ${response.statusText}`,
        response.status
      );
    }

    const data = (await response.json()) as MPPaymentResponse;

    return {
      status: data.status,
      amount: data.transaction_amount || 0,
      date: data.date_approved || data.date_created,
      payment_method: data.payment_method_id,
      last_four_digits: data.card?.last_four_digits,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Failed to get payment status:', error);
    if (error instanceof MercadoPagoError) {
      throw error;
    }
    throw new MercadoPagoError(
      'Failed to fetch payment status',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

export function getIdempotencyKey(key: string): string | null {
  const entry = idempotencyStore.get(key);
  return entry ? entry.order_id : null;
}

export function storeIdempotencyKey(key: string, order_id: string): void {
  idempotencyStore.set(key, {
    order_id,
    timestamp: Date.now(),
  });
}
