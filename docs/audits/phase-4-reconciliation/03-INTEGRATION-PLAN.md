# 03 — Plan de integración

## Principio

Integrar cambios lógicos, no directorios ni snapshots completos. Cada cambio debe tener origen, evidencia, propietario, alcance, pruebas y rollback.

## Flujo por cambio

1. Revalidar el cambio en su entorno de origen.
2. Crear backup verificable (bundle/patch/archivo).
3. Confirmar que el cambio no esté ya en el target.
4. Crear rama desde el target actualizado.
5. Aplicar cherry-pick o patch selectivo.
6. Revisar diff y detectar secretos, archivos generados y cambios fuera de alcance.
7. Ejecutar validación escalonada.
8. Abrir PR con evidencia, riesgo y plan de reversión.
9. Obtener revisión independiente y checks obligatorios.
10. Integrar solo mediante el mecanismo protegido del repositorio.

## Orden sugerido

### A. Integridad de dependencias

- Revisar manifests de todos los workspaces.
- Confirmar versión de Node/npm y política de package manager.
- Resolver Prisma y React como cambios independientes.
- Regenerar lockfile desde manifiestos aprobados; no conservar reducciones masivas sin explicación.
- Validar install/build/test en entorno limpio.

### B. EmailModule

- Recuperar el diff exacto de los archivos fuente de Hetzner.
- Verificar providers, imports, exports, módulos y configuración requerida.
- Añadir pruebas de inicialización y endpoints pertinentes.
- Verificar que no se filtren variables ni datos sensibles.
- Integrar vía PR; no editar directamente el checkout desplegado.

### C. Infraestructura

- Separar cambios Compose, Dockerfile y Nginx.
- Comparar puertos, redes, healthchecks, mounts, dependencias y nombres de servicios.
- Validar configuración renderizada en entorno aislado.
- Mantener rutas/servicios existentes hasta que exista plan de migración aprobado.

### D. Documentación

- Comparar documentos históricos con `docs/WAPSELL-DOCUMENTATION/`.
- Mantener una sola fuente canónica por decisión.
- Mover evidencia histórica a auditorías con fecha y clasificación; no duplicar SPEC como si fuera estado implementado.

## No hacer

- No hacer merge de la rama completa de Hetzner.
- No aplicar un patch agregado sin inspeccionar cada hunk.
- No forzar push ni reescribir historia compartida.
- No desplegar desde una rama de auditoría.
- No integrar cambios que dependan de una migración no revisada.
