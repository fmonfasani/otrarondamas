/**
 * Tienda Email Notifications
 *
 * Sends:
 * - Order confirmation
 * - Payment successful
 * - Order shipped
 * - Order delivered
 */

import { Resend } from 'resend';
import type { TiendaOrder, TiendaOrderItem } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderEmailData {
  order: TiendaOrder & { items: TiendaOrderItem[] };
  userEmail: string;
  userName?: string;
  companyName?: string;
  baseUrl?: string;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  try {
    const { order, userEmail, userName = 'Customer', companyName = 'Store', baseUrl = '' } = data;

    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
          ${item.productName}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          $${item.price.toFixed(2)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          ${item.discount > 0 ? `-$${item.discount.toFixed(2)}` : '-'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">
          $${(item.quantity * parseFloat(item.price.toString()) - parseFloat(item.discount.toString())).toFixed(2)}
        </td>
      </tr>
    `
      )
      .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; color: #2c3e50; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #2c3e50; font-size: 16px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 12px; }
        .totals-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .totals-table tr td:first-child { text-align: right; }
        .totals-table tr td:last-child { text-align: right; font-weight: bold; }
        .totals-table .total { background-color: #f5f5f5; font-size: 18px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your order! We've received your purchase and are processing it now.</p>

          <div class="section">
            <h2>Order Details</h2>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
          </div>

          <div class="section">
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Totals</h2>
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td>$${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Shipping:</td>
                <td>$${order.shippingCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax:</td>
                <td>$${order.taxAmount.toFixed(2)}</td>
              </tr>
              <tr class="total">
                <td>Total:</td>
                <td>$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Shipping Address</h2>
            <p>
              ${order.shippingAddress}<br>
              ${order.shippingCity ? `${order.shippingCity}, ` : ''}
              ${order.shippingPostalCode || ''}<br>
              ${order.shippingCountry || ''}
            </p>
          </div>

          <p>We'll send you an email when your order ships with tracking information.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const result = await resend.emails.send({
      from: `${companyName} <orders@tienda.app>`,
      to: userEmail,
      subject: `Order Confirmation - ${order.id}`,
      html,
    });

    if (result.error) {
      console.error('Failed to send order confirmation email:', result.error);
      return false;
    }

    console.log('Order confirmation email sent:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
}

export async function sendPaymentSuccessfulEmail(data: OrderEmailData & { paymentMethod: string; paymentAmount: number }): Promise<boolean> {
  try {
    const { order, userEmail, userName = 'Customer', companyName = 'Store', paymentMethod, paymentAmount } = data;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d4edda; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; color: #155724; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #2c3e50; font-size: 16px; margin-top: 0; }
        .success-badge { display: inline-block; background-color: #28a745; color: white; padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Confirmed</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <div class="success-badge">✓ Payment Received</div>

          <div class="section">
            <h2>Payment Details</h2>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Amount Paid:</strong> $${paymentAmount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>What's Next?</h2>
            <p>Your order is being prepared for shipment. We'll send you a shipping confirmation email with tracking information as soon as your items ship.</p>
          </div>

          <p>Thank you for your purchase!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const result = await resend.emails.send({
      from: `${companyName} <orders@tienda.app>`,
      to: userEmail,
      subject: `Payment Confirmed - Order ${order.id}`,
      html,
    });

    if (result.error) {
      console.error('Failed to send payment successful email:', result.error);
      return false;
    }

    console.log('Payment successful email sent:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error sending payment successful email:', error);
    return false;
  }
}

export async function sendOrderShippedEmail(
  data: OrderEmailData & { trackingNumber: string; trackingUrl?: string }
): Promise<boolean> {
  try {
    const { order, userEmail, userName = 'Customer', companyName = 'Store', trackingNumber, trackingUrl } = data;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #cfe9ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; color: #004085; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #2c3e50; font-size: 16px; margin-top: 0; }
        .tracking-badge { background-color: #e7f3ff; padding: 16px; border-left: 4px solid #0066cc; margin-bottom: 16px; }
        .tracking-badge p { margin: 8px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin-top: 8px; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Shipped!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Great news! Your order has been shipped and is on its way to you.</p>

          <div class="tracking-badge">
            <p><strong>Tracking Number:</strong></p>
            <p style="font-size: 18px; font-weight: bold; color: #0066cc;">${trackingNumber}</p>
            ${trackingUrl ? `<a href="${trackingUrl}" class="button">Track Your Package</a>` : ''}
          </div>

          <div class="section">
            <h2>Order Details</h2>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Shipped Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Estimated Delivery:</strong> 5-7 business days</p>
          </div>

          <p>You can track your shipment using the tracking number above.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const result = await resend.emails.send({
      from: `${companyName} <orders@tienda.app>`,
      to: userEmail,
      subject: `Your Order Has Shipped - ${trackingNumber}`,
      html,
    });

    if (result.error) {
      console.error('Failed to send order shipped email:', result.error);
      return false;
    }

    console.log('Order shipped email sent:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error sending order shipped email:', error);
    return false;
  }
}

export async function sendOrderDeliveredEmail(data: OrderEmailData & { deliveryDate: Date }): Promise<boolean> {
  try {
    const { order, userEmail, userName = 'Customer', companyName = 'Store', deliveryDate } = data;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d4edda; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; color: #155724; }
        .content { padding: 20px; border: 1px solid #ddd; border-top: none; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #2c3e50; font-size: 16px; margin-top: 0; }
        .success-badge { display: inline-block; background-color: #28a745; color: white; padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Delivered</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <div class="success-badge">✓ Delivered</div>

          <div class="section">
            <h2>Delivery Confirmation</h2>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Delivered On:</strong> ${new Date(deliveryDate).toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>Your Order</h2>
            <p>We hope you're happy with your purchase! If you have any issues or questions, please don't hesitate to contact us.</p>
          </div>

          <div class="section">
            <h2>Need Help?</h2>
            <p>If you have any questions about your order, please reply to this email or contact our support team.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const result = await resend.emails.send({
      from: `${companyName} <orders@tienda.app>`,
      to: userEmail,
      subject: `Order Delivered - ${order.id}`,
      html,
    });

    if (result.error) {
      console.error('Failed to send order delivered email:', result.error);
      return false;
    }

    console.log('Order delivered email sent:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error sending order delivered email:', error);
    return false;
  }
}
