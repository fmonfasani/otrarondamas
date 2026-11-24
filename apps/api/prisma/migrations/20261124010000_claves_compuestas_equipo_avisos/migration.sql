-- ADR-DAT-020 (INIT-019 PR 4, module 4c: team and notices). Last module of PR 4.
--
-- Role grants, capability grants, staff and customer dossiers, their documents, user permissions,
-- OTP sessions and SMS logs get the business column, filled from their parent. Every remaining
-- reference between business tables becomes composite: it carries the business, so a row can only
-- point to rows of its own business, whichever database role writes it.
-- On delete: RESTRICT (D3), except the header -> lines kept as CASCADE: a membership's role grant,
-- a role grant's capabilities and a payment's intents. On update: RESTRICT (D5).
-- AuditLog.usuarioId stays a plain reference (D8, Owner 2026-11-24): a business's audit log
-- records when Wapsell's platform staff open it.

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_autorizacionId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "CapabilityGrant" DROP CONSTRAINT "CapabilityGrant_roleGrantId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentoLegajo" DROP CONSTRAINT "DocumentoLegajo_legajoId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCampaign" DROP CONSTRAINT "EmailCampaign_templateId_fkey";

-- DropForeignKey
ALTER TABLE "EmailLog" DROP CONSTRAINT "EmailLog_templateId_fkey";

-- DropForeignKey
ALTER TABLE "EmailPreference" DROP CONSTRAINT "EmailPreference_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "EmailPreference" DROP CONSTRAINT "EmailPreference_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Invitacion" DROP CONSTRAINT "Invitacion_invitadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "Legajo" DROP CONSTRAINT "Legajo_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Legajo" DROP CONSTRAINT "Legajo_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationDigest" DROP CONSTRAINT "NotificationDigest_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "OTPSession" DROP CONSTRAINT "OTPSession_phoneNumberId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentIntent" DROP CONSTRAINT "PaymentIntent_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "PhoneNumber" DROP CONSTRAINT "PhoneNumber_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "PhoneNumber" DROP CONSTRAINT "PhoneNumber_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "RoleGrant" DROP CONSTRAINT "RoleGrant_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "SMSAlert" DROP CONSTRAINT "SMSAlert_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "SMSAlert" DROP CONSTRAINT "SMSAlert_phoneNumberId_fkey";

-- DropForeignKey
ALTER TABLE "SMSAlert" DROP CONSTRAINT "SMSAlert_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "SMSLog" DROP CONSTRAINT "SMSLog_phoneNumberId_fkey";

-- DropForeignKey
ALTER TABLE "UserEmpresa" DROP CONSTRAINT "UserEmpresa_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "UsuarioPermiso" DROP CONSTRAINT "UsuarioPermiso_usuarioId_fkey";

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "RoleGrant" ADD COLUMN "businessId" TEXT;
UPDATE "RoleGrant" AS c SET "businessId" = p."businessId" FROM "Membership" AS p WHERE p."id" = c."membershipId";
ALTER TABLE "RoleGrant" ALTER COLUMN "businessId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "CapabilityGrant" ADD COLUMN "businessId" TEXT;
UPDATE "CapabilityGrant" AS c SET "businessId" = p."businessId" FROM "RoleGrant" AS p WHERE p."id" = c."roleGrantId";
ALTER TABLE "CapabilityGrant" ALTER COLUMN "businessId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "Legajo" ADD COLUMN "empresaId" TEXT;
UPDATE "Legajo" AS c SET "empresaId" = COALESCE((SELECT u."empresaId" FROM "Usuario" AS u WHERE u."id" = c."usuarioId"), (SELECT k."empresaId" FROM "Cliente" AS k WHERE k."id" = c."clienteId"));
ALTER TABLE "Legajo" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "DocumentoLegajo" ADD COLUMN "empresaId" TEXT;
UPDATE "DocumentoLegajo" AS c SET "empresaId" = p."empresaId" FROM "Legajo" AS p WHERE p."id" = c."legajoId";
ALTER TABLE "DocumentoLegajo" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "UsuarioPermiso" ADD COLUMN "empresaId" TEXT;
UPDATE "UsuarioPermiso" AS c SET "empresaId" = p."empresaId" FROM "Usuario" AS p WHERE p."id" = c."usuarioId";
ALTER TABLE "UsuarioPermiso" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "OTPSession" ADD COLUMN "empresaId" TEXT;
UPDATE "OTPSession" AS c SET "empresaId" = p."empresaId" FROM "PhoneNumber" AS p WHERE p."id" = c."phoneNumberId";
ALTER TABLE "OTPSession" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its parent, then the column is required
ALTER TABLE "SMSLog" ADD COLUMN "empresaId" TEXT;
UPDATE "SMSLog" AS c SET "empresaId" = p."empresaId" FROM "PhoneNumber" AS p WHERE p."id" = c."phoneNumberId";
ALTER TABLE "SMSLog" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_empresaId_usuarioId_key" ON "EmailPreference"("empresaId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_clienteId_empresaId_key" ON "EmailPreference"("clienteId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_empresaId_id_key" ON "EmailTemplate"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_empresaId_id_key" ON "Legajo"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_empresaId_usuarioId_key" ON "Legajo"("empresaId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_clienteId_empresaId_key" ON "Legajo"("clienteId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_businessId_id_key" ON "Membership"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_empresaId_id_key" ON "Payment"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_empresaId_id_key" ON "PhoneNumber"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleGrant_businessId_id_key" ON "RoleGrant"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleGrant_businessId_membershipId_key" ON "RoleGrant"("businessId", "membershipId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_empresaId_autorizacionId_fkey" FOREIGN KEY ("empresaId", "autorizacionId") REFERENCES "Autorizacion"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CapabilityGrant" ADD CONSTRAINT "CapabilityGrant_businessId_roleGrantId_fkey" FOREIGN KEY ("businessId", "roleGrantId") REFERENCES "RoleGrant"("businessId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DocumentoLegajo" ADD CONSTRAINT "DocumentoLegajo_empresaId_legajoId_fkey" FOREIGN KEY ("empresaId", "legajoId") REFERENCES "Legajo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_empresaId_invitadoPorId_fkey" FOREIGN KEY ("empresaId", "invitadoPorId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RoleGrant" ADD CONSTRAINT "RoleGrant_businessId_membershipId_fkey" FOREIGN KEY ("businessId", "membershipId") REFERENCES "Membership"("businessId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "NotificationDigest" ADD CONSTRAINT "NotificationDigest_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "UsuarioPermiso" ADD CONSTRAINT "UsuarioPermiso_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OTPSession" ADD CONSTRAINT "OTPSession_empresaId_phoneNumberId_fkey" FOREIGN KEY ("empresaId", "phoneNumberId") REFERENCES "PhoneNumber"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_empresaId_phoneNumberId_fkey" FOREIGN KEY ("empresaId", "phoneNumberId") REFERENCES "PhoneNumber"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_empresaId_phoneNumberId_fkey" FOREIGN KEY ("empresaId", "phoneNumberId") REFERENCES "PhoneNumber"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_empresaId_templateId_fkey" FOREIGN KEY ("empresaId", "templateId") REFERENCES "EmailTemplate"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_empresaId_templateId_fkey" FOREIGN KEY ("empresaId", "templateId") REFERENCES "EmailTemplate"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_empresaId_paymentId_fkey" FOREIGN KEY ("empresaId", "paymentId") REFERENCES "Payment"("empresaId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_empresaId_paymentId_fkey" FOREIGN KEY ("empresaId", "paymentId") REFERENCES "Payment"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
