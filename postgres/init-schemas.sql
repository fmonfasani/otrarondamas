-- PostgreSQL initialization script: create schemas
-- Ejecutado una sola vez al inicializar el contenedor (docker-entrypoint-initdb.d)
--
-- Crea los esquemas y configuración inicial necesarios para Wapsell

-- Conectarse a la BD de producción
\c wapsell_prod

-- ============================================================================
-- ESQUEMA PUBLIC (default para Prisma)
-- ============================================================================
-- Prisma crea las tablas en el esquema 'public' por defecto
-- Este esquema ya existe automáticamente en PostgreSQL

-- ============================================================================
-- ESQUEMA AUDIT (para registros de auditoría)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS 'Registros de auditoría de cambios a datos sensibles';

-- ============================================================================
-- ESQUEMA SEARCH (para índices de búsqueda locales, no ES)
-- ============================================================================
-- Reservado para denormalizaciones o vistas materializadas si es necesario
-- (Elasticsearch maneja la búsqueda principal)
CREATE SCHEMA IF NOT EXISTS search;
COMMENT ON SCHEMA search IS 'Índices de búsqueda y vistas materializadas';

-- ============================================================================
-- EXTENSIONES NECESARIAS
-- ============================================================================
-- Nota: estas se configuran en init-extensions.sql
-- Solo documentar acá que las esperamos

-- uuid-ossp: generar UUIDs v4
-- pgcrypto: funciones criptográficas
-- hstore: key-value storage
-- pg_trgm: búsqueda de texto full-text trigram


-- ============================================================================
-- CONFIGURACIÓN DE SEGURIDAD A NIVEL BD
-- ============================================================================

-- Revocar permisos por defecto en PUBLIC (principio de menor privilegio)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM postgres;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA search FROM public;

-- Crear rol para la aplicación (NestJS)
-- Solo el usuario de Prisma puede modificar datos
CREATE ROLE wapsell_app WITH LOGIN;
GRANT USAGE ON SCHEMA public TO wapsell_app;
GRANT USAGE ON SCHEMA audit TO wapsell_app;
GRANT USAGE ON SCHEMA search TO wapsell_app;

-- Permisos por defecto para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wapsell_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO wapsell_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT, INSERT ON TABLES TO wapsell_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA search GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wapsell_app;

-- (Opcional) Crear rol de lectura solo (para reports/dashboards futuros)
CREATE ROLE wapsell_readonly WITH LOGIN;
GRANT USAGE ON SCHEMA public TO wapsell_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO wapsell_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO wapsell_readonly;
COMMENT ON ROLE wapsell_readonly IS 'Solo lectura para reportes, no puede escribir';


-- ============================================================================
-- ÍNDICES Y CONFIGURACIÓN INICIAL
-- ============================================================================
-- (Los índices principales se crean con Prisma migrations)
-- Esto solo documenta que esperamos:
-- - Índices en tenant_id (para company scoping)
-- - Índices en created_at (para paginación)
-- - Índices en status (para filtrados comunes)
-- - Full-text search en campos de descripción/nombre


-- ============================================================================
-- PROCEDIMIENTOS/FUNCIONES ÚTILES
-- ============================================================================

-- Función: generar UUIDs v4 (usado por Prisma si no usa uuid-ossp)
-- (Con uuid-ossp, usar gen_random_uuid() en las migrations)

-- Función: registrar cambios en la tabla de auditoría
-- CREATE FUNCTION audit.record_change()
-- LANGUAGE plpgsql
-- AS $$ ... $$;
-- (Implementar solo si se usa auditoría centralizada)


-- ============================================================================
-- DATOS INICIALES (Opcional)
-- ============================================================================

-- (NO agregar datos acá; Prisma seed.ts maneja los datos iniciales)
-- Esto mantiene clean la inicialización de BD.

\echo 'PostgreSQL Wapsell initialization complete'
