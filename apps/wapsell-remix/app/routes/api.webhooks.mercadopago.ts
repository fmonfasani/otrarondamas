/**
 * Mercado Pago Webhook Handler
 * POST /api/webhooks/mercadopago
 *
 * Public endpoint (no auth required)
 * Handles payment.completed, payment.failed events
 * Validates signature and idempotency
 * Updates order status and sends notifications
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  verifyPaymentSignature,
  getPaymentStatus,
  MercadoPagoError
} from '~/services/mercadopago.server';
import {
  updateOrderStatus,
  storeWebhookLog,
  markWebhookProcessed,
  getWebhookLog,
} from '~/services/tienda.server';
import { db } from '~/utils/db.server';

interface MPWebhookBody {
  id?: string;
  type?: string;
  data?: {
    id?: string;
  };
  action?: string;
  resource?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  // Only POST allowed
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get signature from header
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');

    if (!signature) {
      console.warn('Missing signature in webhook request');
      return json({ error: 'Missing signature' }, { status: 400 });
    }

    // Parse request body
    const body = (await request.json()) as MPWebhookBody;

    console.log('Received Mercado Pago webhook:', {
      type: body.type,
      action: body.action,
      id: body.id,
      requestId,
    });

    // Verify signature
    const isValid = verifyPaymentSignature(signature, body);
    if (!isValid) {
      console.warn('Invalid signature for webhook');
      return json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Store webhook log for idempotency
    const payment_id = body.data?.id || body.id;
    let webhookLogId: string | null = null;

    // Check if webhook already processed
    if (payment_id) {
      const existingLog = await db.tiendaWebhookLog.findFirst({
        where: {
          signature: signature,
          processed: true,
        },
      });

      if (existingLog) {
        console.log('Webhook already processed, returning cached response');
        return json({ status: 'processed' }, { status: 200 });
      }

      webhookLogId = (await storeWebhookLog(null, body.type || 'payment.webhook', body, signature)).id;
    }

    // Only process payment.completed events
    if (body.type !== 'payment') {
      console.log(`Ignoring webhook type: ${body.type}`);
      return json({ status: 'ignored' }, { status: 200 });
    }

    if (body.action !== 'payment.completed' && body.action !== 'payment.updated') {
      console.log(`Ignoring action: ${body.action}`);
      return json({ status: 'ignored' }, { status: 200 });
    }

    if (!payment_id) {
      console.warn('Missing payment ID in webhook body');
      return json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // Fetch payment details from Mercado Pago
    let paymentData;
    try {
      paymentData = await getPaymentStatus(payment_id);
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
      // Still acknowledge the webhook but don't process
      if (webhookLogId) {
        await markWebhookProcessed(webhookLogId);
      }
      return json({ status: 'acknowledged' }, { status: 200 });
    }

    // Find order by payment_id
    const payment = await db.tiendaPayment.findUnique({
      where: { paymentId: payment_id },
      include: {
        order: true,
      },
    });

    if (!payment || !payment.order) {
      console.warn(`Payment not found for ID: ${payment_id}`);
      if (webhookLogId) {
        await storeWebhookLog(null, body.type || 'payment.webhook', body, signature);
      }
      return json({ status: 'acknowledged' }, { status: 200 });
    }

    const order = payment.order;

    // Update webhook log with order ID
    if (webhookLogId) {
      await db.tiendaWebhookLog.update({
        where: { id: webhookLogId },
        data: { orderId: order.id },
      });
    }

    // Process payment based on status
    if (paymentData.status === 'approved' || paymentData.status === 'completed') {
      // Update payment status
      await db.tiendaPayment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          verifiedAt: new Date(),
        },
      });

      // Update order status to processing
      await updateOrderStatus(order.id, 'processing', order.empresaId);

      console.log(`Order ${order.id} payment approved, status updated to processing`);

      // TODO: Send order confirmation email
      // await sendOrderConfirmationEmail(order);

      // TODO: Trigger fulfillment workflow
      // await triggerFulfillment(order.id);
    } else if (paymentData.status === 'rejected' || paymentData.status === 'failed') {
      // Update payment status
      await db.tiendaPayment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
        },
      });

      // Keep order as pending (can be retried)
      console.log(`Order ${order.id} payment failed`);

      // TODO: Send payment failed email
      // await sendPaymentFailedEmail(order);
    } else if (paymentData.status === 'pending' || paymentData.status === 'in_process') {
      // Update payment status
      await db.tiendaPayment.update({
        where: { id: payment.id },
        data: {
          status: 'pending',
        },
      });

      console.log(`Order ${order.id} payment is pending`);
    } else if (paymentData.status === 'cancelled' || paymentData.status === 'refunded') {
      // Update payment status
      await db.tiendaPayment.update({
        where: { id: payment.id },
        data: {
          status: 'cancelled',
        },
      });

      // Cancel order if not already processed
      if (order.status === 'pending') {
        await updateOrderStatus(order.id, 'cancelled', order.empresaId);
      }

      console.log(`Order ${order.id} payment cancelled`);
    }

    // Mark webhook as processed
    if (webhookLogId) {
      await markWebhookProcessed(webhookLogId, order.id);
    }

    // Return 200 OK to acknowledge receipt
    return json({ status: 'processed' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Log error and still return 200 to prevent retry loop
    if (error instanceof MercadoPagoError) {
      console.error('Mercado Pago error:', {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });
    }

    // Return 200 OK even on error to prevent retries
    // Webhook retry logic is handled by MP side
    return json({ status: 'acknowledged' }, { status: 200 });
  }
}
