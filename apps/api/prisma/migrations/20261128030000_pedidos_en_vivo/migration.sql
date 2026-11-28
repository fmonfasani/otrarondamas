-- Fase 3 (OR-B4-054) — pedidos en vivo. The store accepts each paid order choosing how long it
-- takes (10, 20 or 30 minutes), and may stop taking orders for a while; both are kept here.
-- Additive only.

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "listoEstimado" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "pedidosPausadosHasta" TIMESTAMP(3);
