-- ============================================================
-- G5 — CONSULTAS DE AUDITORIA PARA PRODUCCION
-- ============================================================
-- Generado: 2026-09-29
-- Destino: base `otrarondamas` en produccion (otrarondamas.wapsell.com)
--
-- SOLO LECTURA. Todas las sentencias son SELECT.
-- No hay INSERT, UPDATE, DELETE, ALTER, DROP ni TRUNCATE.
--
-- COMO EJECUTAR (en el servidor, via SSH):
--
--   docker exec -i <nombre_contenedor_db> \
--     psql -U otrarondamas -d otrarondamas -f - < G5-PROD-AUDIT-QUERIES.sql
--
-- O pegando bloque por bloque en:
--
--   docker exec -it <nombre_contenedor_db> psql -U otrarondamas -d otrarondamas
--
-- Segun docker-compose.prod.yml: POSTGRES_USER=otrarondamas,
-- POSTGRES_DB=otrarondamas, puerto 127.0.0.1:5501.
--
-- PRIVACIDAD: los emails salen OFUSCADOS (local-part + dominio por
-- separado, o con asterisco). Nunca se imprime un email completo,
-- ni passwordHash, ni googleId completo, ni tokens.
-- Podes pegar la salida tal cual sin exponer datos personales.
-- ============================================================


-- ============================================================
-- BLOQUE 0 — IDENTIFICACION DEL ENTORNO
-- Confirma que estas en produccion y no en otra base.
-- ============================================================

\echo '=== BLOQUE 0: ENTORNO ==='

SELECT
  current_database()                        AS base,
  version()                                 AS postgres,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public')         AS tablas,
  pg_size_pretty(pg_database_size(current_database())) AS tamano;


-- ¿Es produccion o un seed? El volumen transaccional lo revela.
-- En el seed local: 4343 productos con 0 ventas, 0 pedidos, 0 auditoria.

\echo '=== BLOQUE 0b: ES PRODUCCION O SEED? ==='

SELECT 'Producto'       AS tabla, count(*) AS filas FROM "Producto"
UNION ALL SELECT 'Venta',          count(*) FROM "Venta"
UNION ALL SELECT 'Pedido',         count(*) FROM "Pedido"
UNION ALL SELECT 'Compra',         count(*) FROM "Compra"
UNION ALL SELECT 'MovimientoCaja', count(*) FROM "MovimientoCaja"
UNION ALL SELECT 'AuditLog',       count(*) FROM "AuditLog"
UNION ALL SELECT 'Cliente',        count(*) FROM "Cliente"
UNION ALL SELECT 'Invitacion',     count(*) FROM "Invitacion"
ORDER BY 1;


-- ============================================================
-- BLOQUE 1 — MIGRACIONES APLICADAS
-- El AS-IS marca como NOT DETERMINABLE si las migraciones 14-17
-- estan aplicadas. Esto lo responde.
-- El repo tiene 17 migraciones (ver apps/api/prisma/migrations/).
-- ============================================================

\echo '=== BLOQUE 1: MIGRACIONES ==='

SELECT
  count(*)                                        AS total_aplicadas,
  count(*) FILTER (WHERE finished_at IS NULL)     AS incompletas,
  count(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS revertidas
FROM "_prisma_migrations";

-- Listado: comparar con las 17 del repo.
SELECT migration_name, finished_at::date AS aplicada, rolled_back_at::date AS revertida
FROM "_prisma_migrations"
ORDER BY finished_at;


-- ============================================================
-- BLOQUE 2 — POBLACION DE USUARIOS  (G5 Fase 2)
-- ============================================================

\echo '=== BLOQUE 2: POBLACION ==='

SELECT 'total_usuarios'              AS metrica, count(*)::text AS valor FROM "Usuario"
UNION ALL SELECT 'activos',            count(*)::text FROM "Usuario" WHERE activo = true
UNION ALL SELECT 'inactivos',          count(*)::text FROM "Usuario" WHERE activo = false
UNION ALL SELECT 'email_null',         count(*)::text FROM "Usuario" WHERE email IS NULL
UNION ALL SELECT 'email_vacio',        count(*)::text FROM "Usuario" WHERE trim(email) = ''
UNION ALL SELECT 'email_no_normalizado', count(*)::text FROM "Usuario" WHERE email <> lower(trim(email))
UNION ALL SELECT 'googleid_informado',  count(*)::text FROM "Usuario" WHERE "googleId" IS NOT NULL
UNION ALL SELECT 'googleid_null',       count(*)::text FROM "Usuario" WHERE "googleId" IS NULL
UNION ALL SELECT 'sin_password',        count(*)::text FROM "Usuario" WHERE "passwordHash" IS NULL
UNION ALL SELECT 'total_empresas',      count(*)::text FROM "Empresa"
UNION ALL SELECT 'usuarios_sin_empresa_valida', count(*)::text
  FROM "Usuario" u LEFT JOIN "Empresa" e ON u."empresaId" = e.id WHERE e.id IS NULL
UNION ALL SELECT 'empresas_sin_usuarios', count(*)::text
  FROM "Empresa" e LEFT JOIN "Usuario" u ON u."empresaId" = e.id WHERE u.id IS NULL;


-- Usuarios por empresa.
\echo '=== BLOQUE 2b: USUARIOS POR EMPRESA ==='

SELECT substring(e.id, 1, 8) AS empresa_id, e.nombre AS empresa,
       count(u.id) AS usuarios,
       count(u.id) FILTER (WHERE u.activo) AS activos
FROM "Empresa" e LEFT JOIN "Usuario" u ON u."empresaId" = e.id
GROUP BY 1, 2 ORDER BY 3 DESC;


-- ============================================================
-- BLOQUE 3 — EMAILS DUPLICADOS  (G5 Fase 3)
-- LA CONSULTA MAS IMPORTANTE DE G5.
-- Normaliza con LOWER(TRIM()) y detecta colisiones que la
-- constraint @unique de Prisma NO detecta (es case-sensitive).
-- ============================================================

\echo '=== BLOQUE 3: EMAILS DUPLICADOS (normalizados) ==='

SELECT lower(trim(email))            AS email_normalizado_ofuscado,
       count(*)                      AS cant_usuarios,
       count(DISTINCT "empresaId")   AS empresas_distintas,
       count(*) FILTER (WHERE activo) AS activos,
       count(DISTINCT "googleId")    AS googleids_distintos
FROM "Usuario"
GROUP BY lower(trim(email))
HAVING count(*) > 1
ORDER BY 2 DESC;
-- NOTA: si esto devuelve filas, reemplazar la primera columna por
--   split_part(lower(trim(email)),'@',2) AS dominio
-- para no exponer el local-part al pegarme la salida.


-- Detalle de cada duplicado, con email ofuscado.
\echo '=== BLOQUE 3b: DETALLE DE DUPLICADOS ==='

WITH dup AS (
  SELECT lower(trim(email)) AS norm
  FROM "Usuario" GROUP BY 1 HAVING count(*) > 1
)
SELECT substring(u.id, 1, 8)                           AS user_id,
       left(split_part(u.email, '@', 1), 2) || '***'   AS local_ofusc,
       split_part(u.email, '@', 2)                     AS dominio,
       substring(u."empresaId", 1, 8)                  AS empresa_id,
       e.nombre                                        AS empresa,
       u.rol::text, u.activo,
       (u."googleId" IS NOT NULL)                      AS tiene_google,
       (u."passwordHash" IS NOT NULL)                  AS tiene_password,
       u."createdAt"::date                             AS creado
FROM "Usuario" u
JOIN dup ON lower(trim(u.email)) = dup.norm
LEFT JOIN "Empresa" e ON u."empresaId" = e.id
ORDER BY dup.norm, u."createdAt";


-- Variantes de capitalizacion: el hallazgo R-01 de la auditoria local.
-- El login NO normaliza (auth.service.ts:46), asi que estos serian
-- usuarios distintos hoy pero la misma persona al normalizar.
\echo '=== BLOQUE 3c: VARIANTES DE CAPITALIZACION ==='

SELECT substring(id, 1, 8) AS user_id,
       left(split_part(email, '@', 1), 2) || '***' AS local_ofusc,
       split_part(email, '@', 2) AS dominio
FROM "Usuario"
WHERE email <> lower(trim(email));


-- ============================================================
-- BLOQUE 4 — GOOGLE IDs  (G5 Fase 4)
-- ============================================================

\echo '=== BLOQUE 4: GOOGLE IDs DUPLICADOS ==='

SELECT left("googleId", 6) || '***'         AS googleid_ofusc,
       count(*)                             AS cant_usuarios,
       count(DISTINCT lower(trim(email)))   AS emails_distintos,
       count(DISTINCT "empresaId")          AS empresas_distintas
FROM "Usuario"
WHERE "googleId" IS NOT NULL
GROUP BY "googleId"
HAVING count(*) > 1;


-- ============================================================
-- BLOQUE 5 — INTEGRIDAD EMPRESA / TENANCY  (G5 Fase 5)
-- ============================================================

\echo '=== BLOQUE 5: INTEGRIDAD REFERENCIAL ==='

SELECT 'usuario_empresa_huerfano' AS chequeo, count(*)::text AS valor
  FROM "Usuario" u LEFT JOIN "Empresa" e ON u."empresaId" = e.id WHERE e.id IS NULL
UNION ALL SELECT 'empresas_nombre_duplicado', count(*)::text FROM (
  SELECT nombre FROM "Empresa" GROUP BY nombre HAVING count(*) > 1) x
UNION ALL SELECT 'empresas_con_typo_Roonda', count(*)::text
  FROM "Empresa" WHERE nombre LIKE '%Roonda%';


-- Todas las empresas: el backfill de Business procesara estas filas.
\echo '=== BLOQUE 5b: EMPRESAS (destino Business) ==='

SELECT substring(id, 1, 8) AS empresa_id, nombre,
       (nombre LIKE '%Roonda%') AS tiene_typo,
       "createdAt"::date AS creada
FROM "Empresa" ORDER BY "createdAt";


-- ============================================================
-- BLOQUE 6 — ROLES  (G5 Fase 6)
-- ============================================================

\echo '=== BLOQUE 6: DISTRIBUCION DE ROLES ==='

SELECT u.rol::text                            AS rol_legacy,
       count(*)                               AS cantidad,
       count(*) FILTER (WHERE u.activo)       AS activos,
       count(DISTINCT u."empresaId")          AS empresas,
       count(*) FILTER (WHERE u."estadoLegajo"::text = 'PENDIENTE') AS legajo_pendiente
FROM "Usuario" u GROUP BY 1 ORDER BY 2 DESC;


-- ============================================================
-- BLOQUE 7 — PERMISOS  (G5 Fase 7)
-- ============================================================

\echo '=== BLOQUE 7: INTEGRIDAD DE PERMISOS ==='

SELECT 'permisos_definidos'  AS metrica, count(*)::text AS valor FROM "Permiso"
UNION ALL SELECT 'asignaciones_total', count(*)::text FROM "UsuarioPermiso"
UNION ALL SELECT 'usuarios_sin_permisos', count(*)::text FROM "Usuario" u
  WHERE NOT EXISTS (SELECT 1 FROM "UsuarioPermiso" up WHERE up."usuarioId" = u.id)
UNION ALL SELECT 'asignacion_huerfana_usuario', count(*)::text
  FROM "UsuarioPermiso" up LEFT JOIN "Usuario" u ON up."usuarioId" = u.id WHERE u.id IS NULL
UNION ALL SELECT 'asignacion_huerfana_permiso', count(*)::text
  FROM "UsuarioPermiso" up LEFT JOIN "Permiso" p ON up."permisoId" = p.id WHERE p.id IS NULL
UNION ALL SELECT 'permisos_sin_usuarios', count(*)::text FROM "Permiso" p
  WHERE NOT EXISTS (SELECT 1 FROM "UsuarioPermiso" up WHERE up."permisoId" = p.id);


-- Permisos por rol: insumo para derivar Role -> RolePermission.
\echo '=== BLOQUE 7b: PERMISOS POR ROL ==='

SELECT u.rol::text AS rol, count(DISTINCT u.id) AS usuarios,
       round(avg(cnt), 1) AS permisos_promedio,
       min(cnt) AS min_permisos, max(cnt) AS max_permisos
FROM "Usuario" u
JOIN (SELECT "usuarioId", count(*) AS cnt FROM "UsuarioPermiso" GROUP BY 1) p
  ON p."usuarioId" = u.id
GROUP BY 1 ORDER BY 2 DESC;
-- Si min <> max dentro de un mismo rol, los permisos NO son derivables
-- del rol: hay asignaciones individuales. Dato critico para D-005.


-- ============================================================
-- BLOQUE 8 — INVITACIONES  (G5 Fase 8)
-- ============================================================

\echo '=== BLOQUE 8: INVITACIONES ==='

SELECT 'total' AS metrica, count(*)::text AS valor FROM "Invitacion"
UNION ALL SELECT 'usadas', count(*)::text FROM "Invitacion" WHERE "usadaEn" IS NOT NULL
UNION ALL SELECT 'pendientes_sin_usar', count(*)::text FROM "Invitacion" WHERE "usadaEn" IS NULL
UNION ALL SELECT 'expiradas_sin_usar', count(*)::text FROM "Invitacion" WHERE "usadaEn" IS NULL AND "expiraEn" < now()
UNION ALL SELECT 'empresa_invalida', count(*)::text
  FROM "Invitacion" i LEFT JOIN "Empresa" e ON i."empresaId" = e.id WHERE e.id IS NULL
UNION ALL SELECT 'invitadoPor_invalido', count(*)::text
  FROM "Invitacion" i LEFT JOIN "Usuario" u ON i."invitadoPorId" = u.id WHERE u.id IS NULL;


-- ============================================================
-- BLOQUE 9 — LINKAGE CLIENTE / USUARIO  (G5 Fase 9)
-- Detecta CANDIDATOS. No fusiona nada.
-- D-002-bis ya decidio que Customer NO se fusiona con User.
-- ============================================================

\echo '=== BLOQUE 9: CLIENTES ==='

SELECT 'total_clientes' AS metrica, count(*)::text AS valor FROM "Cliente"
UNION ALL SELECT 'con_email', count(*)::text FROM "Cliente" WHERE email IS NOT NULL AND trim(email) <> ''
UNION ALL SELECT 'con_password', count(*)::text FROM "Cliente" WHERE "passwordHash" IS NOT NULL
UNION ALL SELECT 'con_googleid', count(*)::text FROM "Cliente" WHERE "googleId" IS NOT NULL
UNION ALL SELECT 'mayoristas', count(*)::text FROM "Cliente" WHERE "esMayorista" = true;


\echo '=== BLOQUE 9b: CANDIDATOS DE LINKAGE (email coincidente) ==='

SELECT count(*) AS candidatos_por_email
FROM "Cliente" c JOIN "Usuario" u
  ON lower(trim(c.email)) = lower(trim(u.email));


-- Detalle, si hay candidatos.
SELECT substring(c.id, 1, 8) AS cliente_id,
       substring(u.id, 1, 8) AS usuario_id,
       split_part(c.email, '@', 2) AS dominio,
       (c."empresaId" = u."empresaId") AS misma_empresa,
       (c."googleId" IS NOT NULL AND c."googleId" = u."googleId") AS mismo_google,
       c."esMayorista", u.rol::text
FROM "Cliente" c JOIN "Usuario" u
  ON lower(trim(c.email)) = lower(trim(u.email))
ORDER BY 3;


\echo '=== BLOQUE 9c: GOOGLE ID COMPARTIDO ENTRE CLIENTE Y USUARIO ==='
-- Linkage DETERMINISTA si aparece: el mismo googleId es la misma
-- cuenta de Google, no una coincidencia de email.

SELECT count(*) AS linkage_determinista
FROM "Cliente" c JOIN "Usuario" u ON c."googleId" = u."googleId"
WHERE c."googleId" IS NOT NULL;


-- ============================================================
-- BLOQUE 10 — HISTORICOS POR USUARIO
-- Cuanto historial cuelga de cada Usuario. Define cuan
-- restrictivo es preservar al actor durante el backfill.
-- ============================================================

\echo '=== BLOQUE 10: VOLUMEN HISTORICO POR USUARIO ==='

SELECT substring(u.id, 1, 8) AS user_id, u.rol::text, u.activo,
       (SELECT count(*) FROM "Venta" v WHERE v."usuarioId" = u.id)           AS ventas,
       (SELECT count(*) FROM "MovimientoCaja" m WHERE m."usuarioId" = u.id)  AS mov_caja,
       (SELECT count(*) FROM "AuditLog" a WHERE a."usuarioId" = u.id)        AS audit,
       (SELECT count(*) FROM "Compra" co WHERE co."usuarioId" = u.id)        AS compras
FROM "Usuario" u
ORDER BY 4 DESC, 5 DESC;


-- ============================================================
-- BLOQUE 11 — CREDENCIALES DE SEED EN PRODUCCION  (TD-006)
-- El AS-IS marca como NOT DETERMINABLE si las 3 cuentas del seed
-- existen en produccion. Esto lo responde SIN revelar passwords.
-- NO comprueba si la password sigue siendo `password123` — eso
-- requeriria intentar autenticar, que no se hace aca.
-- ============================================================

\echo '=== BLOQUE 11: CUENTAS DEL SEED EN PRODUCCION (TD-006) ==='

SELECT split_part(email, '@', 1) AS local_part,
       split_part(email, '@', 2) AS dominio,
       activo,
       "createdAt"::date AS creado,
       "updatedAt"::date AS actualizado,
       ("updatedAt" > "createdAt") AS fue_modificado
FROM "Usuario"
WHERE split_part(email, '@', 1) IN ('owner', 'seller')
ORDER BY 1;
-- Si `fue_modificado` es false en una cuenta creada por el seed,
-- la password probablemente nunca se roto. Es indicio, no prueba.


\echo '=== FIN DE LA AUDITORIA — SOLO SE EJECUTARON SELECT ==='
