# 05 — Plan de despliegue

## Estado

Diseño de release solamente. No se ha ejecutado ni autorizado un despliegue mediante este documento.

## Precondiciones

- PR integrado en la rama de release protegida.
- CI requerido en verde y revisión independiente completada.
- Imagen construida desde SHA inmutable y digest registrado.
- Configuración y secretos disponibles mediante mecanismo seguro.
- Backup de base de datos restaurable y backup de configuración.
- Plan de rollback aprobado y responsable operativo asignado.
- Ventana y criterios de abortar comunicados.

## Secuencia

1. **Preflight:** confirmar host, espacio, conectividad, DNS/TLS, dependencias y estado actual.
2. **Backup:** snapshot/backup de datos y configuración; verificar integridad.
3. **Build:** construir imagen etiquetada por SHA; registrar digest y provenance disponible.
4. **Staging:** desplegar en entorno no productivo con configuración equivalente.
5. **Validación:** healthchecks, smoke tests, logs, métricas, flujos críticos y aislamiento multi-tenant.
6. **Producción:** despliegue gradual o por servicio según topología real; no recrear servicios no relacionados.
7. **Post-deploy:** verificar SHA/digest realmente ejecutado, endpoints, errores, latencia, persistencia y tareas background.
8. **Cierre:** registrar release, evidencia, incidencias y decisión de continuar/rollback.

## Reglas de despliegue

- No usar `latest` como identificador de release.
- No compilar código directamente en el host de producción si el proceso aprobado usa imágenes.
- No ejecutar migraciones sin revisar compatibilidad hacia atrás.
- No cambiar nombres de servicios, volúmenes, redes, puertos, dominios o rutas en el mismo release que corrige la divergencia.
- No copiar `.env` ni secretos a GitHub.
- No declarar éxito por estado `running` solamente: exigir healthcheck y pruebas funcionales.

## Evidencia mínima

- SHA de código y digest de imagen.
- Resultado CI y PR.
- Backup ID, timestamp y prueba de restauración.
- Configuración efectiva (redactada, sin secretos).
- Healthchecks antes/después.
- Smoke tests con resultado.
- Logs/métricas del período de observación.
- Decisión final de release y responsable.
