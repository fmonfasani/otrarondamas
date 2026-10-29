-- K3: Tienda Order Management
-- Adds order, payment, and webhook models for e-commerce fulfillment

-- TiendaOrder: Main order entity
CREATE TABLE "TiendaOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingAddress" TEXT NOT NULL,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "paymentMethod" TEXT,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TiendaOrder_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TiendaOrder_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- TiendaOrderItem: Line items for orders
CREATE TABLE "TiendaOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TiendaOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TiendaOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- TiendaPayment: Payment tracking and verification
CREATE TABLE "TiendaPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL UNIQUE,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" DATETIME,
    "processedAt" DATETIME,
    "externalData" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TiendaPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TiendaOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- TiendaWebhookLog: Webhook event log for audit trail
CREATE TABLE "TiendaWebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TiendaWebhookLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TiendaOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for query performance
CREATE INDEX "TiendaOrder_empresaId_status_idx" ON "TiendaOrder"("empresaId", "status");
CREATE INDEX "TiendaOrder_usuarioId_createdAt_idx" ON "TiendaOrder"("usuarioId", "createdAt");
CREATE INDEX "TiendaOrder_empresaId_createdAt_idx" ON "TiendaOrder"("empresaId", "createdAt");

CREATE INDEX "TiendaOrderItem_orderId_idx" ON "TiendaOrderItem"("orderId");

CREATE INDEX "TiendaPayment_orderId_idx" ON "TiendaPayment"("orderId");
CREATE INDEX "TiendaPayment_paymentId_idx" ON "TiendaPayment"("paymentId");

CREATE INDEX "TiendaWebhookLog_orderId_processed_idx" ON "TiendaWebhookLog"("orderId", "processed");
CREATE INDEX "TiendaWebhookLog_createdAt_idx" ON "TiendaWebhookLog"("createdAt");
