-- Grafana's database user: it can only READ the PerformanceMinute table (how the platform
-- answered, minute by minute: no business data, no personal data). Nothing else: no other
-- table, no writes, every session read-only.
--
-- Run once as the database owner, with the password from /opt/wapsell/secrets:
--   psql -v metrics_password="$(cat /opt/wapsell/secrets/metrics_db_password)" -f metrics-role.sql
-- Idempotent: running it again only resets the password and the permissions.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wapsell_metrics') THEN
    CREATE ROLE wapsell_metrics LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;
END $$;

ALTER ROLE wapsell_metrics PASSWORD :'metrics_password';
ALTER ROLE wapsell_metrics SET default_transaction_read_only = on;
ALTER ROLE wapsell_metrics SET statement_timeout = '10s';
ALTER ROLE wapsell_metrics CONNECTION LIMIT 5;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM wapsell_metrics;
GRANT CONNECT ON DATABASE wapsell_prod TO wapsell_metrics;
GRANT USAGE ON SCHEMA public TO wapsell_metrics;
GRANT SELECT ON "PerformanceMinute" TO wapsell_metrics;
