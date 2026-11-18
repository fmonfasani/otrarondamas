-- ADR-DAT-019 — table privileges of the API roles. Idempotent. The deploy runs it as
-- wapsell_owner after every `prisma migrate deploy`, so a new table is covered in the same
-- deploy that creates it. Every table gets plain data access (never TRUNCATE, REFERENCES or
-- TRIGGER, and never DDL); the exceptions follow.

GRANT USAGE ON SCHEMA public TO wapsell_app, wapsell_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wapsell_app, wapsell_system;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wapsell_app, wapsell_system;

-- Migration history: only the owner.
REVOKE ALL ON "_prisma_migrations" FROM wapsell_app, wapsell_system;

-- Identity and security (FASE-2-BASE-SEGURA §4.1): never inside one business.
REVOKE ALL ON "Comprador", "CompradorToken", "PasswordResetToken", "MfaFactor" FROM wapsell_app;

-- Audit trail: nobody edits it. Inside a business it is only appended and read; the system
-- role may delete, only for the 5-year retention (OR-B4-041, AuditService.cleanupOldLogs).
REVOKE UPDATE ON "AuditLog" FROM wapsell_app, wapsell_system;
REVOKE DELETE ON "AuditLog" FROM wapsell_app;

-- Global catalogs: read-only inside a business; they change through migrations.
REVOKE INSERT, UPDATE, DELETE ON "Permiso", "CapabilityDefinition", "RoleCapability" FROM wapsell_app;
