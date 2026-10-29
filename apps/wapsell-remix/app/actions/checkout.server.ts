/**
 * Checkout Server Actions
 * Handles order creation and payment processing
 */

import { json, type ActionFunction } from '@remix-run/node';
import { CheckoutInput, CheckoutSchema } from '~/components/tienda/checkout';

/**
 * Validate checkout data on server
 * Called before submitting to payment processor
 */
export const validateCheckout = (data: unknown) => {
  try {
    return CheckoutSchema.parse(data);
  } catch (error: any) {
    throw new Error(`Validation failed: ${error.message}`);
  }
};

/**
 * Create order via API
 * POST /orders endpoint expects CrearPedidoRequest from @wapsell/types
 */
export const createOrder = async (
  checkoutData: CheckoutInput,
  cartItems: Array<{ productoId: string; cantidad: number }>,
  baseUrl: string
) => {
  try {
    // Prepare order request for API
    const orderPayload = {
      nombre: `${checkoutData.firstName} ${checkoutData.lastName}`,
      email: checkoutData.email,
      telefono: checkoutData.phone,
      items: cartItems,
      // Additional metadata
      direccion: checkoutData.address,
      ciudad: checkoutData.city,
      codigoPostal: checkoutData.zipCode,
      pais: checkoutData.country,
      metodoEnvio: checkoutData.shippingMethod,
      metodosPago: checkoutData.paymentMethod,
    };

    const response = await fetch(`${baseUrl}/api/tienda/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Order creation failed: ${error.message}`);
  }
};

/**
 * Process card payment via payment provider
 * In production, this would integrate with payment processors like Stripe, Square, etc.
 */
export const processCardPayment = async (
  paymentData: {
    amount: number;
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
  },
  orderId: string,
  baseUrl: string
) => {
  try {
    // This would normally call a secure payment processor
    // For now, return success with mock transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, call actual payment processor API
    const response = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pedidoId: orderId,
        monto: paymentData.amount,
        medio: 'CARD',
        transactionId,
        // Card details would be tokenized - NEVER send raw card data
        cardLast4: paymentData.cardNumber.slice(-4),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Payment processing failed: ${error.message}`);
  }
};

/**
 * Process PayPal payment
 * Redirects to PayPal and handles callback
 */
export const processPayPalPayment = async (
  orderId: string,
  amount: number,
  returnUrl: string,
  cancelUrl: string,
  baseUrl: string
) => {
  try {
    const response = await fetch(`${baseUrl}/api/pagos/paypal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pedidoId: orderId,
        monto: amount,
        returnUrl,
        cancelUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate PayPal payment');
    }

    const data = await response.json();
    return data.approvalUrl; // URL to redirect user to PayPal
  } catch (error: any) {
    throw new Error(`PayPal payment initiation failed: ${error.message}`);
  }
};

/**
 * Process Mercado Pago payment
 * Returns payment link for redirect
 */
export const processMercadoPagoPayment = async (
  orderId: string,
  amount: number,
  returnUrl: string,
  baseUrl: string
) => {
  try {
    const response = await fetch(`${baseUrl}/api/pagos/mercadopago/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pedidoId: orderId,
        monto: amount,
        returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate Mercado Pago payment');
    }

    const data = await response.json();
    return data.paymentLink; // URL to redirect user to Mercado Pago
  } catch (error: any) {
    throw new Error(
      `Mercado Pago payment initiation failed: ${error.message}`
    );
  }
};

/**
 * Handle bank transfer payment
 * Creates order in PENDING state awaiting transfer confirmation
 */
export const processBankTransferPayment = async (
  orderId: string,
  amount: number,
  email: string,
  baseUrl: string
) => {
  try {
    const response = await fetch(`${baseUrl}/api/pagos/transferencia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pedidoId: orderId,
        monto: amount,
        email,
        estado: 'PENDING_TRANSFER',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register bank transfer');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Bank transfer registration failed: ${error.message}`);
  }
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (
  email: string,
  orderId: string,
  baseUrl: string
) => {
  try {
    const response = await fetch(`${baseUrl}/api/emails/order-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        orderId,
      }),
    });

    if (!response.ok) {
      // Log but don't throw - email failure shouldn't block order
      console.error('Failed to send confirmation email');
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Email sending failed: ${error.message}`);
    // Don't throw - email is nice-to-have
    return null;
  }
};

/**
 * Main checkout action
 * Handles complete checkout flow
 */
export const checkoutAction: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const formData = await request.json();

    // Validate checkout data
    const validatedData = validateCheckout(formData);

    // Create order
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const order = await createOrder(
      validatedData,
      formData.cartItems || [],
      baseUrl
    );

    // Process payment based on method
    let paymentResult;
    let redirectUrl = null;

    switch (validatedData.paymentMethod) {
      case 'CARD':
        paymentResult = await processCardPayment(
          {
            amount: formData.total,
            cardNumber: validatedData.cardNumber!,
            cardholderName: validatedData.cardholderName!,
            expiryMonth: validatedData.expiryMonth!,
            expiryYear: validatedData.expiryYear!,
            cvv: validatedData.cvv!,
          },
          order.id,
          baseUrl
        );
        break;

      case 'PAYPAL':
        redirectUrl = await processPayPalPayment(
          order.id,
          formData.total,
          `${baseUrl}/checkout/success?orderId=${order.id}`,
          `${baseUrl}/checkout/cancel`,
          baseUrl
        );
        break;

      case 'MERCADOPAGO':
        redirectUrl = await processMercadoPagoPayment(
          order.id,
          formData.total,
          `${baseUrl}/checkout/success?orderId=${order.id}`,
          baseUrl
        );
        break;

      case 'TRANSFER':
        paymentResult = await processBankTransferPayment(
          order.id,
          formData.total,
          validatedData.email,
          baseUrl
        );
        break;

      default:
        throw new Error('Invalid payment method');
    }

    // Send confirmation email
    await sendOrderConfirmationEmail(validatedData.email, order.id, baseUrl);

    return json({
      success: true,
      orderId: order.id,
      redirectUrl,
      paymentResult,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return json(
      { error: error.message || 'Checkout failed' },
      { status: 400 }
    );
  }
};
