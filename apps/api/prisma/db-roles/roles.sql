-- ADR-DAT-019 — database roles of Wapsell. Run as a superuser, once per environment and again
-- to rotate passwords; idempotent. Passwords come from the environment, never from git:
--
--   WAPSELL_OWNER_PW=… WAPSELL_APP_PW=… WAPSELL_SYSTEM_PW=… \
--     psql -v ON_ERROR_STOP=1 -d <database> -f apps/api/prisma/db-roles/roles.sql
--
--   wapsell_owner   owns the schema objects; only the deploy uses it, to run migrations
--   wapsell_app     the API inside one business (DATABASE_URL); row-level security applies
--   wapsell_system  the API across businesses (SYSTEM_DATABASE_URL); skips row-level security
--
-- None of them is a superuser or can create roles or databases. Their table privileges are in
-- grants.sql, which the owner applies after every migration.

\getenv owner_pw WAPSELL_OWNER_PW
\getenv app_pw WAPSELL_APP_PW
\getenv system_pw WAPSELL_SYSTEM_PW
\if :{?owner_pw}
\else
  DO $$ BEGIN RAISE EXCEPTION 'WAPSELL_OWNER_PW is not set'; END $$;
\endif
\if :{?app_pw}
\else
  DO $$ BEGIN RAISE EXCEPTION 'WAPSELL_APP_PW is not set'; END $$;
\endif
\if :{?system_pw}
\else
  DO $$ BEGIN RAISE EXCEPTION 'WAPSELL_SYSTEM_PW is not set'; END $$;
\endif

SELECT 'CREATE ROLE wapsell_owner' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wapsell_owner') \gexec
SELECT 'CREATE ROLE wapsell_app' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wapsell_app') \gexec
SELECT 'CREATE ROLE wapsell_system' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wapsell_system') \gexec

ALTER ROLE wapsell_owner WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'owner_pw';
ALTER ROLE wapsell_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_pw';
ALTER ROLE wapsell_system WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS PASSWORD :'system_pw';

-- Only the owner creates objects in the schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO wapsell_owner;

-- Objects created before the roles existed (by the superuser) move to the owner, so the
-- migrations it runs can alter them. Sequences owned by a column move with their table.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT format('ALTER %s %s OWNER TO wapsell_owner',
                  CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW'
                                 WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
                  c.oid::regclass) AS stmt
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
      AND c.relowner <> 'wapsell_owner'::regrole
      AND NOT (c.relkind = 'S' AND EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i')))
  LOOP
    EXECUTE item.stmt;
  END LOOP;

  FOR item IN
    SELECT format('ALTER TYPE %s OWNER TO wapsell_owner', t.oid::regtype) AS stmt
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd') AND t.typowner <> 'wapsell_owner'::regrole
  LOOP
    EXECUTE item.stmt;
  END LOOP;

  FOR item IN
    SELECT format('ALTER FUNCTION %s OWNER TO wapsell_owner', p.oid::regprocedure) AS stmt
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proowner <> 'wapsell_owner'::regrole
  LOOP
    EXECUTE item.stmt;
  END LOOP;
END $$;
