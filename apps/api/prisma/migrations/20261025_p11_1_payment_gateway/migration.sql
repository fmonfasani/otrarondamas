-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "proveedor" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDING',
    "metodo" TEXT,
    "ultimosDigitos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentIntent
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "providerIntentId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentWebhook
CREATE TABLE "PaymentWebhook" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable Refund
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "razon" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Payment indexes
CREATE INDEX "Payment_empresaId_estado_idx" ON "Payment"("empresaId", "estado");
CREATE INDEX "Payment_ventaId_idx" ON "Payment"("ventaId");
CREATE INDEX "Payment_empresaId_createdAt_idx" ON "Payment"("empresaId", "createdAt");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex PaymentIntent indexes
CREATE INDEX "PaymentIntent_empresaId_expiresAt_idx" ON "PaymentIntent"("empresaId", "expiresAt");
CREATE INDEX "PaymentIntent_paymentId_idx" ON "PaymentIntent"("paymentId");
CREATE UNIQUE INDEX "PaymentIntent_clientSecret_key" ON "PaymentIntent"("clientSecret");
CREATE UNIQUE INDEX "PaymentIntent_providerIntentId_key" ON "PaymentIntent"("providerIntentId");

-- CreateIndex PaymentWebhook indexes
CREATE INDEX "PaymentWebhook_empresaId_processed_idx" ON "PaymentWebhook"("empresaId", "processed");
CREATE INDEX "PaymentWebhook_empresaId_createdAt_idx" ON "PaymentWebhook"("empresaId", "createdAt");
CREATE UNIQUE INDEX "PaymentWebhook_providerEventId_key" ON "PaymentWebhook"("providerEventId");

-- CreateIndex Refund indexes
CREATE INDEX "Refund_empresaId_estado_idx" ON "Refund"("empresaId", "estado");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
