/**
 * C3 — CreateConversationOrderDto is now empty.
 *
 * Order items are sourced from the customer's persistent cart (CartService),
 * not from the request body. The request contains no parameters; the endpoint
 * creates an order using the conversation's associated customer's cart.
 *
 * Example request:
 *   POST /messaging/conversations/:id/orders
 *   Authorization: Bearer <JWT>
 *   Content-Type: application/json
 *
 *   {} (empty body)
 *
 * The cart is cleared on successful order creation.
 */
export class CreateConversationOrderDto {}
