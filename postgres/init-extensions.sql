-- PostgreSQL initialization script: enable extensions
-- Ejecutado al inicializar el contenedor (docker-entrypoint-initdb.d)

\c wapsell_prod

-- ============================================================================
-- EXTENSIONES CRITICAS
-- ============================================================================

-- uuid-ossp: generar UUIDs (RFC 4122)
-- Necesaria para PRIMARY KEYs y valores por defecto
CREATE EXTENSION IF NOT EXISTS uuid_ossp;
COMMENT ON EXTENSION uuid_ossp IS 'Generar UUIDs v4 con gen_random_uuid()';

-- pgcrypto: hashing, encriptación
-- Útil para: contraseñas, tokens, datos sensibles
CREATE EXTENSION IF NOT EXISTS pgcrypto;
COMMENT ON EXTENSION pgcrypto IS 'Funciones criptográficas: crypt(), hmac(), encrypt()';

-- ============================================================================
-- EXTENSIONES OPCIONALES (Activas para la plataforma)
-- ============================================================================

-- hstore: almacenamiento key-value en una columna
-- Usado por: metadatos, atributos dinámicos, configuración JSON-like
CREATE EXTENSION IF NOT EXISTS hstore;
COMMENT ON EXTENSION hstore IS 'Tipo de dato key-value para metadatos';

-- pg_trgm: trigram search, useful for partial text matching
-- Usado por: búsqueda de productos, clientes, órdenes por nombre/SKU
CREATE EXTENSION IF NOT EXISTS pg_trgm;
COMMENT ON EXTENSION pg_trgm IS 'Búsqueda por trigrama (búsqueda parcial, typo-tolerant)';

-- unaccent: eliminar acentos en búsquedas (á -> a)
-- Crítico para: búsqueda en español (productos: "jamón" match "jamón" y "jamon")
CREATE EXTENSION IF NOT EXISTS unaccent;
COMMENT ON EXTENSION unaccent IS 'Eliminar acentos para búsqueda insensible';

-- ============================================================================
-- EXTENSIONES FUTURAS (Comentadas, disponibles)
-- ============================================================================

-- moddatetime: agregar trigger automático de updated_at
-- CREATE EXTENSION IF NOT EXISTS moddatetime;
-- COMMENT ON EXTENSION moddatetime IS 'Trigger automático para actualizar updated_at';

-- citext: case-insensitive text (útil para emails, usernames)
-- CREATE EXTENSION IF NOT EXISTS citext;
-- COMMENT ON EXTENSION citext IS 'Case-insensitive text type for emails, usernames';

-- intarray: operaciones en arrays de integers (para permisos, roles)
-- CREATE EXTENSION IF NOT EXISTS intarray;

-- range types (ya built-in en PostgreSQL 9.2+): para fechas, números
-- No necesita extensión, solo documentar que podemos usarlos

-- ============================================================================
-- CONFIGURACIÓN POST-EXTENSIONES
-- ============================================================================

-- Crear índices de soporte para full-text search
-- (Los índices específicos por tabla se crean en Prisma migrations)

-- Para búsquedas con trigrama en columnas de texto frecuentes
-- CREATE INDEX CONCURRENTLY idx_trgm_products_name ON products USING GIST (name gist_trgm_ops);
-- CREATE INDEX CONCURRENTLY idx_trgm_customers_name ON customers USING GIST (name gist_trgm_ops);

-- Para búsquedas unaccent en español
-- ALTER TEXT SEARCH CONFIGURATION spanish ALTER MAPPING FOR asciiword WITH unaccent, spanish_stem;

\echo 'PostgreSQL extensions enabled'
