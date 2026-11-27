-- OR-B4-055 (Owner, 2026-11-27) — every order is paid at checkout, before it exists. A checkout
-- (the cart closed to pay it) is kept here, with its frozen lines; Mercado Pago approving the
-- payment turns it into the store's Pedido. Additive only.

-- CreateEnum
CREATE TYPE "EstadoCheckout" AS ENUM ('PENDIENTE', 'PAGADO', 'VENCIDO');

-- CreateTable
CREATE TABLE "CheckoutPedido" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canalOrigen" TEXT NOT NULL,
    "estado" "EstadoCheckout" NOT NULL DEFAULT 'PENDIENTE',
    "lineas" JSONB NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "costoEnvio" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tipoEntrega" "TipoEntrega",
    "direccionEntrega" TEXT,
    "indicacionesEntrega" TEXT,
    "latEntrega" DOUBLE PRECISION,
    "lngEntrega" DOUBLE PRECISION,
    "kmEntrega" DOUBLE PRECISION,
    "conversationId" TEXT,
    "pedidoId" TEXT,
    "venceAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutPedido_estado_venceAt_idx" ON "CheckoutPedido"("estado", "venceAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutPedido_empresaId_id_key" ON "CheckoutPedido"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutPedido_empresaId_pedidoId_key" ON "CheckoutPedido"("empresaId", "pedidoId");

-- AddForeignKey
ALTER TABLE "CheckoutPedido" ADD CONSTRAINT "CheckoutPedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutPedido" ADD CONSTRAINT "CheckoutPedido_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CheckoutPedido" ADD CONSTRAINT "CheckoutPedido_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Fase 2 (ADR-DAT-019): one business per connection, like every business table.
ALTER TABLE "CheckoutPedido" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CheckoutPedido" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));
