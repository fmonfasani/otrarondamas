# Fase 4 — Plan de reconciliación y rollback

**Estado:** PLANIFICADO — ejecución no iniciada  
**Fecha de preparación:** 2026-11-04  
**Base documental:** auditorías forenses de fases anteriores y README del repositorio en `refactor/opcion-6`.

## Objetivo

Definir una reconciliación segura entre LOCAL, GITHUB y HETZNER, preservando trabajo único y evitando que una copia sustituya a otra sin comparación. Esta fase produce el plan; no ejecuta cambios sobre producción, bases de datos ni ramas protegidas.

## Fuente de verdad: regla operativa

No se declara un entorno como fuente de verdad universal. La autoridad se determina por dominio:

- **Código versionado:** GitHub, una vez integrados mediante PR los cambios únicos verificados de LOCAL y HETZNER.
- **Estado desplegado:** Hetzner es evidencia de lo que corre, no autoridad para sobrescribir el código.
- **Datos persistentes:** PostgreSQL de producción es autoridad sobre datos operativos; nunca se reemplaza con datos de repositorio.
- **Especificaciones:** documentación canónica vigente del repositorio. Las auditorías históricas son evidencia fechada, no decisiones actuales.

## Decisiones de arquitectura propuestas

| ID | Propuesta | Condición |
|---|---|---|
| D1 — Source of truth | Reconciliación manual por dominio; GitHub queda como canonical del código tras integrar cambios únicos | Confirmar SHAs actuales y preservar cambios |
| D2 — Identidad | Separar Wapsell (plataforma), Otra Ronda Más (negocio/ERP-POS) y Wapsell SDK (biblioteca) | Contrastar con documentación canónica y repos activos |
| D3 — Repos Hetzner | Mantener repos y servicios hasta completar mapa de dependencias; no consolidar ni archivar todavía | Inventario actual de contenedores, compose, volúmenes y dominios |
| D4 — Naming | No renombrar rutas ni contenedores en esta fase | Requerir plan de migración de infraestructura independiente |

Estas son propuestas para revisión, no decisiones formalmente aprobadas.

## Secuencia

1. R0 — Revalidar baseline y congelar evidencia.
2. R1 — Respaldar repositorios, cambios, worktrees, configuración y datos.
3. R2 — Clasificar cambios por origen, intención, dependencia y riesgo.
4. R3 — Integrar cambios de código mediante ramas y PR.
5. R4 — Validar build, tests, seguridad, contratos y compatibilidad.
6. R5 — Preparar despliegue y rollback; ejecutar solo con autorización de release.
7. R6 — Verificar SHA desplegado, salud, observabilidad y cierre.

## Documentos

- [01 — Estrategia de reconciliación](01-RECONCILIATION-STRATEGY.md)
- [02 — Matriz de preservación](02-CHANGE-PRESERVATION-MATRIX.csv)
- [03 — Plan de integración](03-INTEGRATION-PLAN.md)
- [04 — Plan de rollback](04-ROLLBACK-PLAN.md)
- [05 — Plan de despliegue](05-DEPLOYMENT-PLAN.md)
- [06 — Gates de validación](06-VALIDATION-GATES.md)
- [07 — Registro de ejecución](07-EXECUTION-LOG.md)

## Restricciones

- No ejecutar `git reset --hard`, `git clean`, `push --force`, migraciones destructivas ni borrado de repositorios.
- No sobrescribir cambios locales o de Hetzner antes de respaldarlos y clasificarlos.
- No copiar `.env`, claves privadas, tokens, dumps con datos personales ni credenciales a Git.
- No ejecutar `npm install`, `npm ci`, builds con efectos laterales ni despliegues sobre el servidor como parte de este plan documental.
- No asumir que los datos de auditoría de 2026-11-03 describen el estado actual.

## Criterio de salida

La Fase 4 queda documentalmente preparada. La Fase 5 solo puede comenzar cuando R0/R1 hayan sido ejecutadas y verificadas en los entornos reales, las decisiones D1-D4 estén resueltas y los riesgos bloqueantes tengan responsable y tratamiento.
