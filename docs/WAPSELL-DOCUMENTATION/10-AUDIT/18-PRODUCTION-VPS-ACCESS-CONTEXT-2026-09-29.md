# Production VPS Access Context — Otra Ronda Más

**Fecha:** 2026-09-29  
**Estado:** DOCUMENTADO  
**Clasificación:** Infraestructura / Auditoría G5  
**Runtime / DB modification:** NO  
**Execution:** NO

## 1. VPS documentado

La infraestructura de producción de Otra Ronda Más documenta el VPS:

`89.167.96.239`

La referencia se encuentra en `docker-compose.prod.yml`, donde se describe como el VPS compartido que aloja Otra Ronda Más junto con otros proyectos.

**Evidencia:** DOCUMENTADO POR CÓDIGO.

La IP debe considerarse un dato documentado por el repositorio, no una verificación independiente de que continúe vigente.

## 2. Exposición de servicios

Según la configuración documentada:

- Los puertos de los contenedores se publican únicamente sobre `127.0.0.1`.
- Nginx en el host es el componente que expone HTTPS públicamente.
- Nginx realiza el reverse proxy hacia los servicios de los contenedores.
- La configuración de Nginx para Otra Ronda Más se encuentra documentada en:

`/etc/nginx/sites-available/otrarondamas.wapsell.com`

Esto implica que PostgreSQL no debe tratarse como un servicio público directamente accesible desde Internet.

## 3. PostgreSQL de producción verificado

Durante la preparación de la auditoría G5 se accedió por SSH al VPS y se verificó el contenedor PostgreSQL:

`0010-otrarondamas-db-1`

Consulta ejecutada:

```bash
docker exec 0010-otrarondamas-db-1 \
  psql -U otrarondamas -d otrarondamas \
  -c "SELECT current_database(), current_user, version();"
```

Resultado:

- database: `otrarondamas`
- user: `otrarondamas`
- PostgreSQL: `16.14`

**Evidencia:** VERIFICADO POR EJECUCIÓN.

La instancia está publicada en el host mediante:

`127.0.0.1:5501 -> 5432`

por lo que el acceso operativo para la auditoría G5 debe realizarse desde el propio VPS, mediante SSH.

## 4. Acceso operativo para G5

Acceso esperado:

```bash
ssh root@89.167.96.239
```

Una vez dentro del VPS, la auditoría debe ejecutarse contra:

```text
container: 0010-otrarondamas-db-1
database:  otrarondamas
user:      otrarondamas
```

No se deben ejecutar consultas de auditoría desde Internet directamente contra PostgreSQL.

## 5. Estado de verificación de la IP

La IP `89.167.96.239`:

- está DOCUMENTADA en el repositorio;
- corresponde al VPS utilizado durante la verificación de acceso descrita en esta auditoría;
- no fue verificada mediante un proveedor externo;
- no debe asumirse como inmutable.

Si la infraestructura fue migrada a otro VPS, esta referencia deberá actualizarse con nueva evidencia.

## 6. Relación con G5

Este documento establece el contexto de infraestructura para ejecutar la auditoría G5 — User Reconciliation.

No cierra G5 por sí mismo.

El cierre de G5 requiere todavía evidencia de la base de datos de producción, incluyendo las verificaciones de usuarios, emails normalizados, Google IDs, relaciones User→Business, permisos, invitaciones, Customer↔User y volumen histórico definidas en el artefacto de auditoría G5.

## 7. Restricciones

Este documento:

- no modifica infraestructura;
- no modifica PostgreSQL;
- no modifica Prisma;
- no ejecuta migraciones;
- no modifica datos;
- no sustituye el artefacto SQL de G5;
- no declara G5 cerrado.

## 8. Evidencia

| Elemento | Estado |
|---|---|
| VPS documentado | DOCUMENTADO POR CÓDIGO |
| IP `89.167.96.239` | DOCUMENTADO POR CÓDIGO |
| PostgreSQL de producción accesible desde VPS | VERIFICADO POR EJECUCIÓN |
| Base `otrarondamas` | VERIFICADO POR EJECUCIÓN |
| Usuario DB `otrarondamas` | VERIFICADO POR EJECUCIÓN |
| PostgreSQL 16.14 | VERIFICADO POR EJECUCIÓN |
| Contenedor `0010-otrarondamas-db-1` | VERIFICADO POR EJECUCIÓN |
| Contenido actual de producción para G5 | PENDIENTE DE AUDITORÍA |
| G5 | OPEN |
