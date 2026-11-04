# 04 — Plan de rollback

## Objetivo

Recuperar el servicio y la integridad de datos ante fallos de integración o despliegue. El rollback debe ser específico para código, infraestructura y datos: no son intercambiables.

## Antes de cualquier release

- Registrar release actual, SHA Git, digest de imagen, configuración activa y hora.
- Guardar la configuración de Compose/Nginx y verificar su restauración.
- Crear backup consistente de PostgreSQL y comprobar restore en entorno aislado.
- Identificar volúmenes persistentes y dependencias externas.
- Confirmar acceso operativo al host y mecanismo de recuperación.
- Definir responsable, ventana, criterio de abortar y comunicación.

## Matriz de rollback

| Fallo | Acción |
|---|---|
| PR introduce regresión antes del deploy | Revertir commit mediante PR; no tocar producción |
| Imagen nueva falla healthcheck | Volver al digest de imagen anterior y recrear solo servicios afectados |
| Compose/Nginx inválido | Restaurar configuración respaldada, validar sintaxis y recargar de forma controlada |
| API incompatible con frontend | Volver a release compatible de ambos componentes |
| Migración aditiva falla | Detener release; corregir hacia adelante o revertir solo si la migración es reversible y probada |
| Migración destructiva o pérdida de datos | Detener escrituras si procede, activar incidente de datos y restaurar según RPO/RTO aprobados |
| Secretos comprometidos | Rotar credenciales por procedimiento dedicado; no restaurar secretos antiguos comprometidos |

## Regla de base de datos

No ejecutar rollback automático de migraciones destructivas. Preferir migraciones expand/contract: agregar compatibilidad, desplegar código compatible, migrar datos, verificar y recién después retirar estructuras antiguas en release posterior.

La restauración de un backup puede sobrescribir transacciones posteriores al backup. Requiere aprobación explícita del responsable de datos y evaluación de pérdida de datos.

## Criterios de activación

Activar rollback cuando ocurra cualquiera de estos eventos:
- Healthcheck crítico no recupera dentro de la ventana definida.
- Errores 5xx superan el umbral acordado.
- Autenticación, ventas o persistencia crítica dejan de funcionar.
- Se detecta corrupción, fuga entre tenants o pérdida de integridad.
- Observabilidad no permite demostrar estado seguro.

Los umbrales numéricos se deben definir con métricas reales antes del release; no se inventan en este plan.

## Verificación posterior

- Confirmar digest/SHA restaurado.
- Healthcheck y smoke tests.
- Verificar autenticación y operaciones críticas.
- Verificar logs y métricas.
- Verificar integridad de datos y colas.
- Registrar incidente, causa, decisiones y evidencia.

## Prohibiciones

No usar `git reset --hard` sobre producción como rollback. No borrar volúmenes, no ejecutar `docker compose down -v`, no restaurar un dump sobre la base activa sin aprobación y no asumir que volver el código revierte los datos.
