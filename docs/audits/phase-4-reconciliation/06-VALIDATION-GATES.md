# 06 — Gates de validación

| Gate | Validación | Evidencia requerida | Bloquea si |
|---|---|---|---|
| G0 Baseline | SHAs, refs, worktrees, cambios y despliegues inventariados | Snapshot fechado y comandos/resultados | Algún entorno no identificado |
| G1 Preservation | Bundles, patches, untracked y backups verificados | Hashes y prueba de lectura/restauración | Backup ausente o corrupto |
| G2 Classification | Cambios clasificados y propietarios asignados | Matriz sin UNKNOWN sin tratar | Cambio único sin decisión |
| G3 Integration | PR por cambio lógico, diff revisado | PR, commits, revisión | Conflicto sin resolver o secreto detectado |
| G4 CI | Install/build/lint/tests aplicables | URLs y resultados CI, logs | Check requerido fallido |
| G5 Security | AuthN/AuthZ, tenant isolation, secretos, dependencias | Tests y revisión de seguridad | Fuga cross-tenant o vulnerabilidad crítica |
| G6 Data compatibility | Migraciones y compatibilidad de esquema | Plan expand/contract y restore test | Migración destructiva no reversible |
| G7 Staging | Healthchecks y smoke tests | SHA/digest y reportes | Regresión funcional |
| G8 Release readiness | Rollback ensayado, backup válido, ventana aprobada | Runbook y responsables | Rollback no viable |
| G9 Production | Estado real coincide con release aprobado | SHA/digest, métricas y pruebas post-deploy | Servicio degradado o evidencia incompleta |
| G10 Closure | Repos y despliegue sincronizados; pendientes asignados | Informe final y backlog | Divergencia crítica sin tratar |

## Política de evidencia

Cada resultado debe etiquetarse:
- **VERIFICADO:** comando/test ejecutado y evidencia reproducible.
- **INFERENCIA:** conclusión razonada, con premisas explícitas.
- **NO VERIFICADO:** dato pendiente de inspección.

No reportar tests, CI, backup, deploy o rollback como exitosos sin evidencia directa. Un PR merged no equivale a un release completado.
