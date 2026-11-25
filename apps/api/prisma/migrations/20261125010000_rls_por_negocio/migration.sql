-- ADR-DAT-019 / INIT-019 PR 5 — row-level security by business (FASE-2-BASE-SEGURA §5).
--
-- Every table that carries a business gets RLS and one policy: a row is visible and writable only
-- when its business is the one the request fixed with set_config('app.business_id', id, true).
-- Fails closed: with no business fixed, nothing is visible and nothing can be written.
--
-- Who is NOT subject:
-- - wapsell_owner owns the tables and RLS is not FORCEd, so migrations see every row;
-- - wapsell_system has BYPASSRLS by design (system tasks, sign-in, platform).
--
-- wapsell_app runs CompanyScopedPrismaService.forCompany(), which fixes the business per
-- operation and once at the start of every interactive transaction.
-- Special cases:
-- - Empresa: wapsell_app reads and updates only its own business; it cannot create or delete one.
-- - RoleTemplate: global templates (empresaId NULL) are readable by every business; a business
--   writes only its own. One policy per command, so no business can delete a global one (§5.4).

ALTER TABLE "AnalyticsAggregation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AnalyticsAggregation" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "AnalyticsDashboard" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AnalyticsDashboard" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AnalyticsEvent" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "AperturaCaja" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AperturaCaja" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "AplicacionPago" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AplicacionPago" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "ArqueoCaja" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ArqueoCaja" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Attachment" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "AuditLog" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Autorizacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Autorizacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Caja" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Caja" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "CapabilityGrant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CapabilityGrant" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Cart" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CartItem" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "CierreCaja" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CierreCaja" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Cliente" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Compra" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Compra" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "CompraItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CompraItem" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Conversation" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "ConversationAssociation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ConversationAssociation" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ConversationParticipant" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "CuentaCorriente" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CuentaCorriente" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Deuda" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Deuda" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "DevolucionCliente" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "DevolucionCliente" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "DevolucionClienteItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "DevolucionClienteItem" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "DevolucionProveedor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "DevolucionProveedor" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "DevolucionProveedorItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "DevolucionProveedorItem" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "DocumentoLegajo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "DocumentoLegajo" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "EmailCampaign" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "EmailCampaign" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "EmailLog" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "EmailPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "EmailPreference" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "EmailTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "EmailTemplate" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Entrega" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Entrega" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Familia" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Familia" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Invitacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Invitacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Legajo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Legajo" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Lote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Lote" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Membership" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Message" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "MessageReadReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "MessageReadReceipt" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "MessagingReadPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "MessagingReadPreference" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "MovimientoCaja" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "MovimientoCaja" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "MovimientoStock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "MovimientoStock" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Notificacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Notificacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "NotificationDigest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "NotificationDigest" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "NotificationPreference" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Oferta" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Oferta" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "OfertaProducto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "OfertaProducto" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "OTPSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "OTPSession" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Pago" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Pago" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "PagoProveedor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PagoProveedor" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Payment" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "PaymentIntent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PaymentIntent" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "PaymentWebhook" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PaymentWebhook" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Pedido" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Pedido" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "PedidoItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PedidoItem" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "PhoneNumber" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PhoneNumber" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Presentacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Presentacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Producto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Producto" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "ProductoFoto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ProductoFoto" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "ProductoProveedor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ProductoProveedor" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Proveedor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Proveedor" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Reaction" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "RecepcionCompra" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "RecepcionCompra" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Reembolso" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Reembolso" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Refund" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Refund" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "ReglaFidelizacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ReglaFidelizacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "RoleGrant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "RoleGrant" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));

ALTER TABLE "SMSAlert" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "SMSAlert" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "SMSLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "SMSLog" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Subfamilia" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Subfamilia" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Subtipo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Subtipo" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Tipo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Tipo" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Ubicacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Ubicacion" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "UserEmpresa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "UserEmpresa" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Usuario" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "UsuarioPermiso" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "UsuarioPermiso" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "Venta" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "Venta" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

ALTER TABLE "VentaItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "VentaItem" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));

-- Empresa: the business row itself.
ALTER TABLE "Empresa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio_leer ON "Empresa" FOR SELECT USING ("id" = current_setting('app.business_id', true));
CREATE POLICY negocio_modificar ON "Empresa" FOR UPDATE USING ("id" = current_setting('app.business_id', true)) WITH CHECK ("id" = current_setting('app.business_id', true));

-- RoleTemplate: global templates readable, own templates writable.
ALTER TABLE "RoleTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio_leer ON "RoleTemplate" FOR SELECT USING ("empresaId" IS NULL OR "empresaId" = current_setting('app.business_id', true));
CREATE POLICY negocio_crear ON "RoleTemplate" FOR INSERT WITH CHECK ("empresaId" = current_setting('app.business_id', true));
CREATE POLICY negocio_modificar ON "RoleTemplate" FOR UPDATE USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));
CREATE POLICY negocio_borrar ON "RoleTemplate" FOR DELETE USING ("empresaId" = current_setting('app.business_id', true));
